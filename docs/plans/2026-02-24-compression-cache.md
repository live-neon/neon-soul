# Plan: Compression Cache for Axiom Notation and Tension Detection

**Date**: 2026-02-24
**Status**: Complete
**Impact**: Fully-cached runs drop from 27 to 6 LLM requests (78% reduction), 238s to 78s (67% faster)

---

## Problem

The persistent signal cache (see `2026-02-24-persistent-signal-cache.md`) eliminated redundant generalization and matching calls, but the compression phase still ran fully every time — even when the principle set hadn't changed.

On a fully-cached run with 0 new signals, compression accounted for ALL remaining synthesis calls:

```
6 axiom notation calls (generateNotatedForm in compressor.ts)
15 tension pair checks (checkTensionPair in tension-detector.ts)
= 21 synthesis calls out of 27 total
```

The other 6 calls (5 prose expansion + 1 soul generation) are the true irreducible floor — they synthesize cross-referencing prose output that depends on section ordering and full axiom context.

### Why not cache prose expansion?

Prose expansion uses a progressive dependency chain:

```
Phase 1 (parallel):  CoreTruths(grouped axioms)  Voice(grouped)  Vibe(grouped)
Phase 2 (sequential): Boundaries(ALL axioms + CoreTruths + Voice output)
Phase 3 (sequential): Tagline(all 4 section outputs)
```

Boundaries and Tagline depend on previously-generated section text, so any axiom change cascades. The voice preservation system also uses `originalVoices` (raw signal quotes) as primary source material, which can shift even when axiom text stays the same. At 5 calls / ~72s, the cost is small relative to the savings already achieved.

---

## What's cacheable

| Call | Input | Deterministic? | Cache key |
|------|-------|---------------|-----------|
| `generateNotatedForm(llm, text)` | `principle.text` only | Yes | `hash(text + model)` |
| `checkTensionPair(llm, a1, a2)` | `axiom1.text` + `axiom2.text` | Yes | `hash(sorted(text1, text2) + model)` |

Both calls depend only on text content + model. N-counts, tiers, and dimensions don't affect the LLM call inputs (tier is computed locally via `determineTier()`, severity via `determineSeverity()`).

---

## Solution: Two-Layer Compression Cache

### Layer 1: Full skip when principles unchanged

When `addedCount === 0` in `runReflectiveLoop()`, all signals were dedup-skipped (already in cache). The principle set is identical to the previous run. Load previous axioms from `axioms.json` instead of recompressing.

**Saves**: ALL compression LLM calls (21 in our test case).

**Safety**: Only triggers when both conditions are met:
- `addedCount === 0` (every signal was already in the cached principle store)
- `cachedAxioms` exists with `length > 0` (valid axiom file from previous run)

### Layer 2: Per-call disk cache for incremental runs

When some new signals are added, the principle set changes partially. Cache individual notation and tension results so only new/changed items need fresh LLM calls.

**Notation cache**: `hash(text + model)` → notated string. Unchanged principles reuse cached CJK/emoji notation.

**Tension cache**: `hash(sorted(text1, text2) + model)` → `{ hasTension, description }`. Unchanged axiom pairs reuse cached tension results. Order-agnostic key ensures A↔B = B↔A.

**Note on axiom IDs**: Axiom IDs are regenerated each run (`ax_${randomUUID()}`), so the tension cache keys on text content, not IDs. On cache hit, the `ValueTension` is reconstructed with current axiom IDs and severity is recalculated locally via `determineSeverity()`.

### Invalidation

| Condition | Action |
|-----------|--------|
| `--reset` | Clear compression + tension cache files, full rebuild |
| Model changed | Cache miss (model in key) |
| Principle text changed | Notation cache miss (text hash differs) |
| Axiom text changed in pair | Tension cache miss for that pair |
| `addedCount > 0` | Skip full-skip path, use per-call cache instead |

---

## Test Results

### Before compression cache (fully cached, 0 new signals)

```
[synthesis] 12 principles formed
Synthesis requests: 21 (6 notation + 15 tension pairs)
Prose + generation: 6
Total: 27 requests, 238s
```

### After compression cache (fully cached, 0 new signals)

```
[synthesis] Principles unchanged, reusing 6 cached axioms (skipping compression)
[synthesis] Complete: 25 signals → 12 principles → 6 axioms (4.2:1 compression) in 1ms
Synthesis requests: 0
Prose + generation: 6
Total: 6 requests, 78s
```

### Full Pipeline Progression (cumulative caching)

| Scenario | Requests | LLM Time | vs Reset |
|----------|----------|----------|----------|
| Reset (no cache) | 82 | 747s | baseline |
| Incremental (3 new signals) | 38 | 330s | **54% fewer, 56% faster** |
| Incremental (2 new signals) | 35 | 314s | **57% fewer, 58% faster** |
| Signal cache only (0 new) | 27 | 238s | **67% fewer, 68% faster** |
| Signal + compression cache (0 new) | 6 | 78s | **93% fewer, 90% faster** |

### Irreducible floor

The 6 remaining requests are:
- 5 prose expansion (CoreTruths, Voice, Vibe, Boundaries, Tagline)
- 1 soul generation (final SOUL.md assembly)

These run every time because they produce the final human-readable output and depend on cross-section context.

---

## Changes

### 1. Notation cache in compressor

**File**: `src/lib/compressor.ts`

Added module-level LRU cache (`max: 500`) with `hash(text + ':' + model)` key. `generateNotatedForm()` checks cache before LLM call. On miss, stores result. Model parameter threaded through: `compressPrinciplesWithCascade` → `compressPrinciples` → `synthesizeAxiom` → `generateNotatedForm`.

New exports: `saveCompressionCache()`, `loadCompressionCache()`, `deleteCompressionCacheFile()`, `clearNotationCache()`.

Cache file: `.neon-soul/compression-cache.json` — `{ version: 1, model: string, notations: Record<hash, string> }`.

### 2. Tension pair cache in tension detector

**File**: `src/lib/tension-detector.ts`

Added module-level LRU cache (`max: 1000`) with order-agnostic `hash(sorted(text1, text2) + ':' + model)` key. `checkTensionPair()` checks cache before LLM call. Stores both positive results (`{ hasTension: true, description }`) and negative results (`{ hasTension: false, description: null }`). On cache hit, reconstructs `ValueTension` with current axiom IDs.

New exports: `saveTensionCache()`, `loadTensionCache()`, `clearTensionCache()`.

Cache file: `.neon-soul/tension-cache.json` — `{ version: 1, entries: Record<hash, CachedTensionResult> }`.

### 3. Full compression skip in reflection loop

**File**: `src/lib/reflection-loop.ts`

Added `cachedAxioms?: Axiom[]` to `ReflectiveLoopConfig`. When `addedCount === 0` and `cachedAxioms` has entries, skips `compressPrinciplesWithCascade()` entirely and reuses the cached axioms.

### 4. Pipeline cache orchestration

**File**: `src/lib/pipeline.ts`

`reflectiveSynthesis` stage: loads all 3 caches from disk before synthesis (generalization, compression, tension). Loads cached axioms from `axioms.json` when principle store cache is valid. Passes `cachedAxioms` to `runReflectiveLoop`. Saves all 3 caches after synthesis. Clears all on `--reset`.

---

## Files Modified

| File | Description |
|------|-------------|
| `src/lib/compressor.ts` | Notation LRU cache, disk persistence, cache check in `generateNotatedForm`, model threading |
| `src/lib/tension-detector.ts` | Tension LRU cache, disk persistence, cache check in `checkTensionPair`, model parameter |
| `src/lib/reflection-loop.ts` | `cachedAxioms` config, full compression skip when `addedCount === 0` |
| `src/lib/pipeline.ts` | Load/save/clear compression + tension caches, pass cached axioms |

---

## Related

- Persistent signal cache (`2026-02-24-persistent-signal-cache.md`) — Layer 1 caching for generalization + matching
- Adaptive time budget (`2026-02-24-adaptive-time-budget.md`) — cache-aware budget estimation
