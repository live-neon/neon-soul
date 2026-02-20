# PBD Alignment (Stages 1-11) Review - Codex

**Date**: 2026-02-11
**Reviewer**: codex-gpt51-examiner (GPT-5.1-codex-max)
**Files Reviewed**:
- `src/types/signal.ts` (194 lines)
- `src/types/principle.ts` (77 lines)
- `src/types/axiom.ts` (68 lines)
- `src/types/provenance.ts` (44 lines)
- `src/lib/semantic-classifier.ts` (506 lines)
- `src/lib/signal-extractor.ts` (254 lines)
- `src/lib/principle-store.ts` (551 lines)
- `src/lib/tension-detector.ts` (203 lines)
- `src/lib/compressor.ts` (392 lines)
- `tests/integration/pbd-alignment.test.ts` (511 lines)
- `docs/architecture/synthesis-philosophy.md` (157 lines)
- `docs/ARCHITECTURE.md` (534 lines)

**Plan**: `docs/plans/2026-02-10-pbd-alignment.md` (Stages 1-11)

---

## Summary

The PBD alignment implementation is largely sound with clean type definitions and good separation of concerns. However, the review identified **1 critical bug** that can cause infinite loops, **4 important issues** affecting data quality and correctness, and **1 minor security concern**. The most pressing issue is the BATCH_SIZE validation gap that can hang the signal extraction pipeline.

---

## Findings

### Critical

- **[signal-extractor.ts:105]** BATCH_SIZE from `NEON_SOUL_LLM_CONCURRENCY` environment variable has no lower bound validation. If set to 0, negative, or NaN, the `for (i += BATCH_SIZE)` loops at lines 168 and 189 become non-terminating, causing signal extraction to hang indefinitely.

  ```typescript
  // Current (line 105)
  const BATCH_SIZE = parseInt(process.env['NEON_SOUL_LLM_CONCURRENCY'] ?? '10', 10);

  // Problem: parseInt('') returns NaN, parseInt('0') returns 0, parseInt('-5') returns -5
  // All cause infinite loops in batched processing
  ```

### Important

- **[semantic-classifier.ts:353]** `STANCE_CATEGORIES` omits 'tensioning' stance even though `SignalStance` type allows it. The classifier can never emit 'tensioning', causing those signals to collapse to the default 'assert', which skews PBD stance data.

  ```typescript
  // Current
  const STANCE_CATEGORIES = ['assert', 'deny', 'question', 'qualify'] as const;

  // Missing: 'tensioning' (defined in SignalStance type at signal.ts:14)
  ```

- **[principle-store.ts:139]** `processedSignalIds` Set is declared for deduplication but never used in `addSignal()` method (only in `addGeneralizedSignal()`). Duplicate signals can still inflate n_count and centrality when using the non-generalized path.

  ```typescript
  // Line 139-140: Set declared
  const processedSignalIds = new Set<string>();

  // addSignal() (lines 153-327) never checks or adds to processedSignalIds
  // Only addGeneralizedSignal() uses it (line 343, 396, 457, 512)
  ```

- **[tension-detector.ts:79]** `checkTensionPair` treats any LLM reply <=10 characters as "no tension". Short but valid affirmative outputs like "conflict", "yes", or "tension" are dropped, causing false negatives in tension detection.

  ```typescript
  // Current logic
  if (text === 'none' || text.length <= 10) {
    return null;
  }

  // "conflict" (8 chars), "yes" (3 chars), "tension" (7 chars) all dropped
  ```

- **[tension-detector.ts:175-178]** `attachTensionsToAxioms` unconditionally clears `axiom.tensions` for every axiom before attaching new tensions. If called on axioms that already have tensions populated, existing tensions are lost.

  ```typescript
  // Line 176-178: Clears all existing tensions
  for (const axiom of axioms) {
    axiom.tensions = [];  // Overwrites any existing tensions
  }
  ```

### Minor

- **[compressor.ts:72]** `generateNotatedForm` interpolates raw principle text directly into the LLM prompt without sanitization (unlike other classifiers that use `sanitizeForPrompt`). This leaves a prompt-injection surface where untrusted principle content could alter the generated notation.

  ```typescript
  // Line 77: Raw text interpolation
  const prompt = `Express this principle in compact notation...

  Principle: "${text}"  // Not sanitized
  ```

---

## Architectural Observations

### Strengths

1. **Clean type hierarchy**: Signal -> Principle -> Axiom with clear provenance tracking
2. **Self-healing retry pattern**: Classifiers use consistent retry with corrective feedback (MAX_CLASSIFICATION_RETRIES = 2)
3. **Batch processing guards**: O(n^2) protection in tension detection (MAX_AXIOMS_FOR_TENSION_DETECTION = 25)
4. **Importance weighting**: Clean implementation with IMPORTANCE_WEIGHT record type
5. **Centrality computation**: Threshold-based approach (FOUNDATIONAL_THRESHOLD = 0.5, CORE_THRESHOLD = 0.2) is transparent

### Areas for Consideration

1. **Mixed deduplication strategy**: `addSignal` vs `addGeneralizedSignal` have different dedup behavior, which may be intentional but is not documented
2. **Mutation in attachTensionsToAxioms**: Function mutates input axioms and returns them, which could surprise callers
3. **Test coverage**: Integration tests verify behavior but don't test edge cases (zero batch size, short LLM responses)

---

## Recommendations by Priority

### Must Fix (Before Production)

1. **Validate BATCH_SIZE**: Add `Math.max(1, ...)` or throw on invalid values
2. **Add 'tensioning' to STANCE_CATEGORIES**: Align with SignalStance type

### Should Fix (Important for Data Quality)

3. **Improve tension detection threshold**: Use semantic matching instead of character count, or lower the threshold significantly
4. **Preserve existing tensions**: Either merge or document the clearing behavior
5. **Extend deduplication to addSignal**: Or document why it's intentionally different

### Nice to Have

6. **Sanitize in generateNotatedForm**: Apply same pattern as other classifiers

---

## Cross-Reference to Plan

The findings map to plan stages:

| Finding | Plan Stage | Impact |
|---------|------------|--------|
| BATCH_SIZE validation | Stage 2-3 (extraction) | Blocks pipeline |
| Missing 'tensioning' | Stage 2 (Stance) | Data quality |
| Dedup gap | Stage 4 (Clustering) | Inflated N-counts |
| Tension threshold | Stage 5 (Tension) | False negatives |
| Tension clearing | Stage 5 (Tension) | Data loss |
| Sanitization | N/A (existing code) | Security |

---

## Raw Output

<details>
<summary>Full CLI output</summary>

```
[critical] src/lib/signal-extractor.ts:168 - BATCH_SIZE is taken directly from NEON_SOUL_LLM_CONCURRENCY with no lower bound; a 0/negative/NaN value makes the `for (i += BATCH_SIZE)` loops non-terminating, hanging signal extraction.

[important] src/lib/semantic-classifier.ts:353 - STANCE_CATEGORIES omits the 'tensioning' stance even though SignalStance allows it, so the classifier can never emit tensioning and those signals collapse to the default 'assert', skewing PBD stance data.

[important] src/lib/principle-store.ts:139 - processedSignalIds is declared for deduplication but never used in addSignal (and addSignal never records ids), so duplicate signals are still counted and later addGeneralizedSignal cannot detect replays, inflating n_count/centrality.

[important] src/lib/tension-detector.ts:79 - checkTensionPair treats any LLM reply ≤10 chars as "no tension"; short affirmative outputs like "conflict" or "yes" are dropped, causing false negatives in tension detection.

[important] src/lib/tension-detector.ts:175 - attachTensionsToAxioms clears `axiom.tensions` for every axiom before attaching new ones, so any existing tensions are lost when the function is called on already-populated axioms.

[minor] src/lib/compressor.ts:72 - generateNotatedForm interpolates raw principle text into the LLM prompt without escaping/sanitizing, leaving a prompt-injection surface where untrusted principle content can alter the generated notation.
```

**Model**: gpt-5.1-codex-max
**Tokens used**: 216,722
**Session ID**: 019c4ed8-e91f-71e0-8029-2ead3a9d9566

</details>
