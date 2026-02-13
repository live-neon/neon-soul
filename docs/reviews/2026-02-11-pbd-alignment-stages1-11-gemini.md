# PBD Alignment (Stages 1-11) Review - Gemini

**Date**: 2026-02-11
**Reviewer**: gemini-25pro-validator
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

## Summary

The PBD alignment implementation (Stages 1-11) is structurally sound and well-documented. The implementation correctly adds signal metadata (stance, importance) and synthesis features (weighted clustering, tension detection, orphan tracking, centrality scoring) to the neon-soul pipeline. However, there are two important issues requiring attention: an incomplete stance category list and insufficient prompt injection protection. Several minor improvements around documentation and fallback behavior could also enhance maintainability.

## Findings

### Critical

*None identified.*

### Important

#### I-1: Incomplete Stance Categories Prevents 'tensioning' Classification

**File**: `src/lib/semantic-classifier.ts:353`

**Issue**: The `STANCE_CATEGORIES` constant omits the `'tensioning'` category, despite it being a valid `SignalStance` type defined in `src/types/signal.ts:14`.

```typescript
// In semantic-classifier.ts:353
const STANCE_CATEGORIES = ['assert', 'deny', 'question', 'qualify'] as const;

// But in signal.ts:14
export type SignalStance = 'assert' | 'deny' | 'question' | 'qualify' | 'tensioning';
```

**Impact**: The `classifyStance` function will never classify a signal as `'tensioning'`, creating a functional gap where value-conflict signals cannot be identified during extraction.

**Recommendation**: Either:
1. Add `'tensioning'` to `STANCE_CATEGORIES` if LLM-based detection is desired, OR
2. Document that `'tensioning'` is derived post-hoc (e.g., during tension detection stage) rather than classified during extraction

---

#### I-2: Insufficient Prompt Injection Sanitization

**File**: `src/lib/semantic-classifier.ts:47-50`

**Issue**: The `sanitizeForPrompt` function only escapes `<` and `>` characters:

```typescript
export function sanitizeForPrompt(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

**Impact**: While this prevents XML/HTML tag confusion, it does not protect against broader prompt injection attacks (e.g., "Ignore all previous instructions..."). Malicious input could manipulate LLM classification behavior.

**Recommendation**:
1. Strengthen with delimiter-based separation (e.g., `"""..."""` blocks with instructions to only process content within)
2. Reinforce LLM role constraints at prompt end
3. Consider input length limits to reduce attack surface

---

### Minor

#### M-1: Undocumented Magic Numbers for Weights and Thresholds

**File**: `src/lib/principle-store.ts:19-30`

**Issue**: Critical values that drive system behavior lack explanatory comments:

```typescript
const IMPORTANCE_WEIGHT: Record<SignalImportance, number> = {
  core: 1.5,      // Why 1.5x?
  supporting: 1.0,
  peripheral: 0.5,
};

const FOUNDATIONAL_THRESHOLD = 0.5; // 50% - origin?
const CORE_THRESHOLD = 0.2;         // 20% - origin?
```

**Impact**: Makes the system harder to maintain and tune. Future developers cannot assess whether values are arbitrary or empirically derived.

**Recommendation**: Add code comments explaining value origins (e.g., "Derived from PBD_VOCABULARY.md recommendations" or "Empirically tuned based on X synthesis runs").

---

#### M-2: Default Fallback May Introduce Systematic Bias

**File**: `src/lib/semantic-classifier.ts:427`

**Issue**: When classification retries are exhausted, `classifyStance` defaults to `'assert'`:

```typescript
// All retries exhausted - use default
return 'assert';
```

**Impact**: If LLM classification errors occur frequently, this could introduce a systematic bias toward `'assert'` stance signals, skewing synthesis results.

**Recommendation**: Consider:
1. A more neutral fallback like `'qualify'` (conditional stance), OR
2. Return `null` and handle explicitly in calling code, making failures visible in metrics

---

#### M-3: Test Assertions Are Overly Permissive

**File**: `tests/integration/pbd-alignment.test.ts:23-53`

**Issue**: Stance and importance tests verify only that results are valid categories, not that classification is semantically correct:

```typescript
it('classifies assertions correctly', async () => {
  const llm = createMockLLM();
  const result = await classifyStance(llm, 'I always tell the truth');
  const validStances: SignalStance[] = ['assert', 'deny', 'question', 'qualify', 'tensioning'];
  expect(validStances).toContain(result);  // Always passes for any valid stance
});
```

**Impact**: Tests pass even if mock returns wrong category (e.g., `'deny'` for an assertion). Does not catch classification regressions.

**Recommendation**: Either:
1. Configure mock to return expected categories for specific inputs, OR
2. Add integration tests with real LLM for semantic validation (marked as slow/optional)

---

#### M-4: Centrality Calculation Silent Default for Empty Signals

**File**: `src/lib/principle-store.ts:37-38`

**Issue**: When `signals.length === 0`, centrality defaults silently to `'supporting'`:

```typescript
function computeCentrality(signals: Array<{ importance?: SignalImportance }>): PrincipleCentrality {
  if (signals.length === 0) return 'supporting';
  // ...
}
```

**Impact**: A principle with zero signals (edge case) receives a centrality assignment without warning. While the code handles this gracefully, it may mask data integrity issues upstream.

**Recommendation**: Add debug-level log when this edge case is hit to aid troubleshooting.

---

## Clarifications

**Q: What happens when axiom count equals exactly 25?**

A: Tension detection **will execute**. The check at `tension-detector.ts:110` is `axioms.length > MAX_AXIOMS_FOR_TENSION_DETECTION`, so 25 axioms (not > 25) passes the guard.

**Q: Is the O(n^2) guard (25 axioms) appropriate?**

A: Yes. With 25 axioms producing 300 pair comparisons, and a concurrency limit of 5, this results in 60 batches - reasonable for LLM latency. The limit aligns with `COGNITIVE_LOAD_CAP` in compressor.ts.

**Q: Are there race conditions in batched processing?**

A: No. The pattern at `tension-detector.ts:139-148` processes each batch sequentially (`for` loop with `await Promise.all`) and axioms are read-only during comparison. No shared mutable state.

---

## Architecture Assessment

### Strengths

1. **Clean separation of concerns**: Types, classification, storage, and detection are properly modularized
2. **Self-healing patterns**: LLM classification uses retry loops with corrective feedback
3. **Observable guardrails**: O(n^2) guards and cognitive load caps with logging
4. **Provenance preservation**: Signal metadata (stance, provenance, importance) persisted through pipeline
5. **Comprehensive documentation**: ARCHITECTURE.md and synthesis-philosophy.md explain design decisions

### Areas for Improvement

1. **Type-implementation alignment**: `tensioning` stance type exists but cannot be classified
2. **Security hardening**: Prompt injection protection is minimal
3. **Weight justification**: Magic numbers lack documented rationale
4. **Test coverage depth**: Mock-based tests verify types but not semantics

---

## Raw Output

<details>
<summary>Full CLI output</summary>

```
Based on my review of the PBD alignment implementation, here is an analysis of the codebase, addressing your specific questions and highlighting key findings.

### Direct Answers to Your Questions

1.  **Is 'tensioning' missing from `STANCE_CATEGORIES`?**
    Yes, this appears to be a bug. The `SignalStance` type defines `'tensioning'` as a valid stance, but it is absent from the `STANCE_CATEGORIES` array in `src/lib/semantic-classifier.ts`. This means the `classifyStance` function, which likely uses this array to constrain the LLM's output, will never classify a signal as `'tensioning'`.

2.  **Is `sanitizeForPrompt` sufficient for protection?**
    No, it is not sufficient. While escaping `<` and `>` helps prevent injection into XML/HTML-like prompt structures, it does not defend against broader prompt injection attacks. A user could still provide input that manipulates the LLM's behavior (e.g., "Ignore all previous instructions..."). This is a notable security risk.

3.  **Is the O(n^2) guard (25 axioms) appropriate?**
    Yes, it seems appropriate. An axiom count of 25 results in 300 pair-wise comparisons, which is a reasonable upper bound to prevent excessive latency and cost from LLM calls. This limit aligns well with the `COGNITIVE_LOAD_CAP` of 25 mentioned in `src/lib/compressor.ts`, suggesting the final axiom count is expected to be within this range. The warning log for exceeding the limit is also good practice.

4.  **Are there any race conditions in the batched processing?**
    Based on the provided snippets, race conditions are unlikely. The task (detecting tension between pairs of axioms) is highly parallelizable. Standard asynchronous patterns for batching independent operations (e.g., using `Promise.all`) are thread-safe and would not introduce race conditions.

5.  **Is the centrality calculation robust for edge cases?**
    Yes, the implementation appears robust for the main edge cases. It correctly handles an empty signal array by returning a default value ('supporting') and implicitly handles signals missing an `importance` property by not counting them towards the `coreCount`.

6.  **Are the weight values (1.5/1.0/0.5) well-justified?**
    The justification for these specific weights is not present in the code. They are "magic numbers" whose effectiveness depends on the specific dynamics of the synthesis model. Without documentation or empirical evidence, their appropriateness cannot be fully determined from a code review alone.

7.  **What happens when axiom count is exactly 25?**
    Tension detection **will execute**. The check is `axioms.length > MAX_AXIOMS_FOR_TENSION_DETECTION` (i.e., `25 > 25`), which evaluates to `false`. The process will be skipped only for 26 or more axioms.

---

### Review Findings

Here are the detailed findings from the code review, categorized by severity.

#### **Important**

*   **Finding 1: Incomplete Stance Categories Limits Classification**
    *   **Severity**: Important
    *   **File**: `src/lib/semantic-classifier.ts`
    *   **Description**: The `STANCE_CATEGORIES` constant omits the `'tensioning'` category, even though it is a valid `SignalStance` type. This prevents the `classifyStance` function from ever assigning this stance, creating a functional bug where a dimension of signal analysis is missing.
    *   **Recommendation**: Add `'tensioning'` to the `STANCE_CATEGORIES` array to allow the LLM to utilize the full range of defined stances.

*   **Finding 2: Insufficient Prompt Injection Sanitization**
    *   **Severity**: Important
    *   **File**: `src/lib/semantic-classifier.ts`
    *   **Description**: The `sanitizeForPrompt` function is too narrow to provide effective protection against prompt injection. It only mitigates issues related to XML/HTML tag confusion and does not address common injection techniques that can cause the LLM to ignore its primary instructions.
    *   **Recommendation**: Implement stronger defenses, such as using delimiter-based input separation (e.g., instructing the LLM to only consider text within `"""..."""`) and reinforcing the LLM's role and constraints at the end of the prompt.

#### **Minor**

*   **Finding 3: Undocumented Magic Numbers for Weights and Thresholds**
    *   **Severity**: Minor
    *   **File**: `src/lib/principle-store.ts`
    *   **Description**: The file hardcodes several critical values that drive the logic of the principle store: `IMPORTANCE_WEIGHT`, `FOUNDATIONAL_THRESHOLD`, and `CORE_THRESHOLD`. The rationale for these specific numbers is not documented, making the system harder to maintain and debug.
    *   **Recommendation**: Add code comments explaining the origin and justification for these values (e.g., "Values derived from empirical testing in Q4 2025...").

*   **Finding 4: Default Fallback May Introduce Bias**
    *   **Severity**: Minor
    *   **File**: `src/lib/semantic-classifier.ts`
    *   **Description**: In the event of a persistent failure, the `classifyStance` function defaults to returning `'assert'`. While this ensures a value is always returned, it may introduce a systemic bias towards this stance if classification errors occur frequently, potentially skewing the results of the synthesis.
    - **Recommendation**: Consider a more neutral fallback, such as `'qualify'`, or returning `null` to be handled by the calling function. This would make classification failures more explicit in the data.
```

</details>

---

## Cross-References

- Plan: `docs/plans/2026-02-10-pbd-alignment.md`
- Prior twin review (same plan): `docs/reviews/2026-02-11-pbd-alignment-twin-technical.md`
- Prior external reviews (plan stage): `docs/reviews/2026-02-10-pbd-alignment-gemini.md`
