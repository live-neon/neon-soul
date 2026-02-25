# Plan: Persistent Cache for Downstream Signal Processing

**Date**: 2026-02-24
**Status**: Complete
**Impact**: 69% reduction in LLM time on incremental runs (1594s → 496s), 39% fewer LLM requests (97 → 59)

---

## Problem

The synthesis pipeline runs three phases after signal extraction:
1. **Generalize** — 1 LLM call per signal (abstract to actor-agnostic principle statement)
2. **Match** — ~1 LLM call per signal (find best matching principle or create new)
3. **Compress** — 1 LLM call per axiom (CJK/emoji notation) + tension detection

On every run, ALL signals (existing + new) went through the full pipeline from scratch. With 21 signals from a reset run, that meant 62 reflective-synthesis LLM calls. On an incremental run with only 4 new signals, the other 21 were re-processed identically — wasting ~40 LLM calls and ~700s of GPU time.

### Before (every run)

```
21 signals → 21 generalize calls + 21 match calls + compression = 62 synthesis requests
Total: 97 requests, 1594s LLM time
```

---

## Solution: Two-Layer Persistent Cache

### Layer 1: Generalization Cache on Disk

The existing in-memory LRU cache in `signal-generalizer.ts` already had a well-designed cache key (`signalId:contentHash:promptVersion:model`) but was process-local — empty on each cron invocation. We added disk persistence:

- **Save**: After synthesis, serialize LRU entries to `.neon-soul/generalization-cache.json`
- **Load**: Before synthesis, populate the LRU from disk
- **Invalidation**: Prompt version mismatch → discard entire cache. Content hash in key → stale entries automatically miss.

**Saves**: 1 LLM `generate()` call per unchanged signal.

### Layer 2: Principle Store Rehydration

The `PrincipleStore` (created fresh each run) maintains `principles: Map` and `processedSignalIds: Set`. By persisting these between runs, `addGeneralizedSignal()` skips already-processed signals via its existing dedup check.

- **Save**: After synthesis, write `processedSignalIds` + model + threshold to `state.json`
- **Load**: Before synthesis, load previous principles from `principles.json` and processedSignalIds from `state.json`, pass to `createPrincipleStore()` as initial state
- **Invalidation**: Model changed, threshold changed, or signals removed → full rebuild

**Saves**: ~1-1.5 LLM calls per unchanged signal (matching + dimension classification).

### Invalidation Strategy

| Condition | Action |
|-----------|--------|
| `--reset` or `--force` with reset | Clear both caches, full rebuild |
| Signal text changed | Generalization cache miss (content hash in key) |
| Prompt version bumped | Generalization cache fully invalidated |
| Model changed | Both caches invalidated (model tracked in state) |
| Signals removed (source deleted/modified) | Full principle store rebuild |
| Only new signals added | Use cached store, process only new signals |

---

## Test Results

### Run 1: Reset (baseline, no cache)

```
Reset mode: clearing all synthesis data and caches
[synthesis] Reset mode: skipping cache, full rebuild
[synthesis] Starting single-pass synthesis with 21 signals
[generalizer] Processed 21 signals, 0 used fallback (0.0%)
[synthesis] Generalized 21 signals in 173771ms
[synthesis] Added 21 signals to principle store (0 skipped)
[synthesis] 10 principles formed
[generalizer] Saved 21 cache entries to disk
```

| Metric | Value |
|--------|-------|
| Sessions processed | 3 / 7 |
| Signals | 21 |
| Principles | 10 |
| Axioms | 6 |
| Total LLM requests | 97 (0 failures) |
| Reflective synthesis requests | 62 |
| Total LLM time | 1594s |

### Run 2: Incremental (with cache)

```
[generalizer] Loaded 21 cache entries from disk
[synthesis] Rehydrated store: 10 principles, 21 cached signals, 4 new to process
[principle-store] Rehydrated: 10 principles, 21 processed signals
[generalizer] Processed 4 signals, 0 used fallback (0.0%)
[synthesis] Generalized 25 signals in 29993ms
[synthesis] Added 4 signals to principle store (21 skipped, cache-rehydrated)
[synthesis] 12 principles formed
[generalizer] Saved 25 cache entries to disk
```

| Metric | Value |
|--------|-------|
| New sessions processed | 4 new + 1 changed |
| Signals | 25 (21 cached + 4 new) |
| Principles | 12 |
| Axioms | 8 |
| Total LLM requests | 59 (0 failures) |
| Reflective synthesis requests | 44 |
| Total LLM time | 496s |

### Comparison

| Metric | Run 1 (reset) | Run 2 (cached) | Savings |
|--------|--------------|----------------|---------|
| Total LLM requests | 97 | 59 | **39% fewer** |
| Reflective synthesis requests | 62 | 44 | **29% fewer** |
| Total LLM time | 1594s | 496s | **69% faster** |
| Generalization time | 174s (21 signals) | 30s (25 signals) | **83% faster** |

The remaining 44 synthesis requests come from: 4 new generalizations, 4 new matchings, 8 axiom notations, and 28 tension pair checks. Compression runs on the full principle set every time (not cacheable per-signal).

---

## Changes

### 1. Generalization cache disk persistence

**File**: `src/lib/signal-generalizer.ts`

Added `saveGeneralizationCache()`, `loadGeneralizationCache()`, and `deleteGeneralizationCacheFile()`. Serializes the module-level LRU cache to `.neon-soul/generalization-cache.json` with atomic writes. Handles Date serialization (ISO strings) and corrupt/missing files gracefully.

### 2. Reflection cache in state

**File**: `src/lib/state.ts`

Added `reflectionCache?` field to `SynthesisState` with `processedSignalIds`, `model`, and `principleThreshold`. Updated `loadState()` to preserve it across load/save cycles.

### 3. Principle store initial state

**File**: `src/lib/principle-store.ts`

Added `PrincipleStoreInitialState` interface and optional `initialState` parameter to `createPrincipleStore()`. Seeds `principles` Map and `processedSignalIds` Set from previous run. Added `getProcessedSignalIds()` for cache persistence.

### 4. Reflection loop cache config

**File**: `src/lib/reflection-loop.ts`

Extended `ReflectiveLoopConfig` with `cachedPrinciples` and `cachedProcessedSignalIds`. When present, passes to `createPrincipleStore()` as initial state. Added `processedSignalIds` to result for pipeline persistence.

### 5. Pipeline cache orchestration

**File**: `src/lib/pipeline.ts`

`reflectiveSynthesis` stage: loads generalization cache from disk, validates principle store cache (model + threshold match, no signal removal), passes cache to `runReflectiveLoop()`, saves generalization cache after synthesis. `validateOutput` stage: persists `reflectionCache` in state.json. `collectSources` stage: clears caches on `--reset`.

---

## Files Modified

| File | Lines Changed | Description |
|------|--------------|-------------|
| `src/lib/signal-generalizer.ts` | +105 | Disk save/load/delete for generalization cache |
| `src/lib/state.ts` | +10/-2 | `reflectionCache` field + loadState preservation |
| `src/lib/principle-store.ts` | +25/-2 | Initial state parameter + getProcessedSignalIds |
| `src/lib/reflection-loop.ts` | +20/-5 | Cache config + store rehydration + result IDs |
| `src/lib/pipeline.ts` | +45/-5 | Cache load/save/invalidation orchestration |

---

## Related

- Adaptive time budget (2026-02-24-adaptive-time-budget.md) — controls how many sessions are extracted per run
- State tracking fix (commit 236ec90) — ensures budget-skipped sessions are picked up on next run
- The `DOWNSTREAM_CALLS_PER_SIGNAL` constant (2.5) in the budget equation could be reduced for cached signals, allowing more sessions to be processed within the same time budget
