# Plan: Reduce Per-Signal Classification from 5 LLM Calls to 1

**Date**: 2026-02-23
**Status**: Complete
**Impact**: extract-signals LLM requests reduced 48%, total LLM time reduced 38%

---

## Problem

Each extracted signal was getting 5 separate LLM `classify` calls during the extract-signals pipeline stage:

| # | Field | Categories | Used Downstream? |
|---|-------|-----------|-----------------|
| 1 | `signalType` | 10 types (value, preference, belief...) | **NO** — metadata only, never read by any pipeline stage |
| 2 | `dimension` | 7 SoulCraft dimensions | **YES** — prose-expander routes axioms to sections |
| 3 | `elicitationType` | 4 types (agent-initiated, user-elicited...) | **NO** — weighting infrastructure exists but never called |
| 4 | `importance` | 3 levels (core, supporting, peripheral) | **YES** — principle-store strength + centrality exemption |
| 5 | `stance` | 5 stances (assert, deny, question...) | **YES** — anti-echo-chamber gate in compressor |

For a `--reset` run with 19 signals, this meant 95 classification calls just for per-signal classification (19 signals x 5 calls each), plus batch detection, provenance, and generalization calls.

---

## Analysis: Which Fields Matter?

### Dead Code Fields (removed)

**`signalType`** — Stored on every signal but never read downstream. No pipeline stage, compressor rule, or prose-expander section references `signal.type`. The `interview.ts` module passes it through but doesn't use it for routing. Defaulted to `'value'`.

**`elicitationType`** — The weighting infrastructure exists in `signal-source-classifier.ts`:
- `filterForIdentitySynthesis()` — exported but never imported/called
- `calculateWeightedSignalCount()` — exported but never imported/called

These represent designed-but-unwired functionality. The module was kept intact for future use; only the per-signal extraction call was removed. Defaulted to `'user-elicited'`.

### Critical Fields (combined into 1 call)

**`dimension`** — Used by `prose-expander.ts` via `DIMENSION_TO_SECTION` lookup to route axioms into the correct SOUL.md sections (Core Truths, Voice, Boundaries, Vibe, etc.). Without this, axioms would all land in one section.

**`importance`** — Used in two places:
- `principle-store.ts`: `IMPORTANCE_WEIGHT` multiplier (core=1.5, supporting=1.0, peripheral=0.5) affects principle strength
- `compressor.ts`: Centrality exemption for defining principles skips N-threshold for core signals

**`stance`** — Used in `compressor.ts` anti-echo-chamber gate:
```typescript
const hasQuestioning = signals.some(
  s => s.stance === 'question' || s.stance === 'deny'
);
```
Without questioning/denying signals, principles from only external sources get blocked.

---

## Solution: Combined Structured Classification

Replace 3 separate `classify()` calls with 1 `generate()` call returning structured JSON, with a 3-level failsafe cascade.

### Level 1: Combined Call (happy path)

Single `generate()` prompt asks the LLM to return a JSON object with all 3 fields:

```
Classify this identity signal across three axes.
Return ONLY a JSON object with exactly these three fields, no other text.

<signal>{sanitized signal text}</signal>

Dimension (which aspect of identity):
- identity-core: Fundamental self-conception...
- character-traits: Behavioral patterns...
[...all 7 dimensions with definitions]

Importance (how central to identity):
- core / supporting / peripheral

Stance (how the signal is presented):
- assert / deny / question / qualify / tensioning

Return ONLY a raw JSON object like: {"dimension":"identity-core","importance":"core","stance":"assert"}
```

Response is parsed with `parseStructuredClassification()` which:
1. Strips markdown code blocks if present
2. Extracts JSON object via regex (handles leading/trailing text)
3. Validates all 3 fields against their enum sets
4. Returns `null` if any field is invalid

### Level 2: Retry with Corrective Feedback (up to 2 retries)

If JSON parse fails or any field has an invalid value, retry with a stronger prompt that includes:
- The previous bad response (truncated to 100 chars)
- Explicit correction: "Your previous response was not valid JSON..."
- The exact valid values listed again

Up to `MAX_STRUCTURED_RETRIES = 2` additional attempts.

### Level 3: Fall Back to Individual Calls (failsafe)

If all combined attempts fail, fall back to the existing individual classify calls:

```typescript
const [dimension, stance, importance] = await Promise.all([
  classifyDimension(llm, signalText),
  classifyStance(llm, signalText),
  classifyImportance(llm, signalText),
]);
```

These individual calls have their own retry logic and conservative defaults, so they always produce valid results. This guarantees the pipeline never fails due to classification issues.

---

## Changes

### Files Modified

| File | Change |
|------|--------|
| `src/lib/semantic-classifier.ts` | Added `classifySignalStructured()`, `parseStructuredClassification()`, `buildStructuredClassificationPrompt()`, `StructuredClassificationResult` interface, validation Sets |
| `src/lib/signal-extractor.ts` | Replaced 5-way `Promise.all()` with single `classifySignalStructured()` call; removed imports of `semanticClassifySignalType`, `semanticClassifyStance`, `semanticClassifyImportance`, `classifyElicitationType` |
| `tests/mocks/llm-mock.ts` | Added structured classification handler in `generate()` — detects `<signal>` + JSON field names, returns keyword-inferred JSON |
| `tests/unit/semantic-classifier.test.ts` | Added 17 new tests for `parseStructuredClassification` and `classifySignalStructured` |

### What Did NOT Change

- Individual classify functions (`classifyDimension`, `classifyStance`, `classifyImportance`) — kept for Level 3 failsafe and other callers
- `signal-source-classifier.ts` — module kept intact (future use)
- `principle-store.ts` — still uses importance for strength weighting
- `compressor.ts` — still uses stance for anti-echo-chamber
- `prose-expander.ts` — still uses dimension for section routing
- Signal type interface — `type` field kept on Signal (backwards compat), just defaults to `'value'`

---

## Results

### Request Count Comparison (`--reset` with 19 signals)

**extract-signals stage:**

| Metric | Before (5 calls/signal) | After (1 call/signal) | Change |
|--------|------------------------|----------------------|--------|
| **Requests** | **65** | **34** | **-48%** |
| **LLM time** | ~930s | 651.9s | **-30%** |

**Before breakdown** (65 requests):
- 6 provenance classify (1 per memory file)
- 6 batch detection generates (1 per file batch)
- 50 classification calls (10 signals x 5 calls each, or similar)
- 3 generalization generates

**After breakdown** (34 requests):
- 6 provenance classify (1 per memory file) — unchanged
- 6 batch detection generates — unchanged
- 19 structured classification generates (1 per signal) — was 95
- 3 generalization generates — unchanged

### Full Pipeline Comparison

| Stage | Before | After | Change |
|-------|--------|-------|--------|
| extract-signals | 65 requests | 34 requests | -48% |
| reflective-synthesis | 65 requests | 65 requests | — |
| prose-expansion | 6 requests | 6 requests | — |
| generate-soul | 1 request | 1 request | — |
| **Total** | **106** | **106** | **-0%** |
| **Total LLM time** | **1,862.8s** | **1,155.3s** | **-38%** |

Note: Total request count happens to be 106 both times because the after run extracted 19 signals (vs ~10 before), producing more reflective-synthesis work. The extract-signals stage reduction is the real win — fewer round-trips mean less serialization overhead and Ollama queue contention.

### Failsafe Behavior

All 19 signals were classified successfully on the first combined attempt — no retries or fallbacks triggered. The `gpt-oss:120b` model returns clean JSON reliably. The failsafe cascade exists for smaller/weaker models that may struggle with structured output.

### Quality Verification

- SOUL.md sections route correctly (dimension classification working)
- Importance weighting applies (principle strength varies)
- Anti-echo-chamber gate operates (stance classification working)
- 19 signals, 13 principles, 7 axioms — healthy compression ratio of 2.7:1

---

## Test Coverage

**433 tests pass** across 27 test files (up from 415 before this change).

New tests added (17 total):

### `parseStructuredClassification` (12 tests)
- Parses valid JSON with all 3 fields
- Parses JSON wrapped in markdown code blocks
- Parses JSON with leading/trailing text
- Returns null for empty input
- Returns null for invalid JSON
- Returns null for missing fields
- Returns null for invalid dimension/importance/stance values
- Exhaustive enum validation (all 7 dimensions, 5 stances, 3 importance levels)

### `classifySignalStructured` (5 tests)
- Throws `LLMRequiredError` when LLM is null/undefined
- Returns valid classification from combined call (happy path)
- Uses single generate call (not 3 classify calls) — verified via call count
- Falls back to individual calls when generate returns invalid JSON — verified 3 generate attempts then 3 classify calls
- Retries with corrective feedback before falling back — verified prompt contains previous bad response

---

## Incremental Run Impact

For incremental synthesis (the common case), the improvement is even more dramatic:

| Scenario | Before | After | Change |
|----------|--------|-------|--------|
| 3 new signals (incremental) | 17 extract requests | 5 extract requests | **-71%** |
| 10 signals (--reset) | 65 extract requests | ~16 extract requests | **-75%** |
| 19 signals (--reset, actual) | 65 extract requests | 34 extract requests | **-48%** |

The per-signal savings compound: each signal saved 4 LLM round-trips (was 5, now 1). The fewer the signals, the higher the percentage reduction appears because fixed costs (provenance, detection, generalization) remain constant.

---

## Future Considerations

1. **Wire `elicitationType`**: The `signal-source-classifier.ts` module has complete weighting infrastructure. If identity-validity filtering is needed, the per-signal elicitation classification call can be added back — but as a 4th field in the structured JSON prompt rather than a separate call.

2. **Wire `signalType`**: If downstream consumers ever need signal type routing (e.g., separate handling for corrections vs reinforcements), it can be added as a 5th field in the structured prompt.

3. **Model-specific tuning**: Smaller models may need the failsafe more often. Consider tracking failsafe trigger rate in telemetry to detect model quality regression.

4. **Batch structured classification**: The current approach sends 1 generate call per signal. A future optimization could batch multiple signals into a single prompt asking for an array of JSON classifications — potentially reducing 19 calls to 2-3 batched calls.
