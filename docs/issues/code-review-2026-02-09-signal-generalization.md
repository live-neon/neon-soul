# Code Review: Signal Generalization Plan

**Created**: 2026-02-09
**Status**: Open
**Priority**: High
**Reviewers**: Codex GPT-5.1 (審碼), Gemini 2.5 Pro (審双)
**Plan**: [`docs/plans/2026-02-09-signal-generalization.md`](../plans/2026-02-09-signal-generalization.md)

---

## Summary

Both reviewers approved the architectural approach (LLM-based generalization before embedding). Key gaps identified relate to robustness, evaluation methodology, and operational policies. Plan should be updated before implementation.

**Overall Status**: Approved with required changes

---

## N=2 Verified Findings (Both Reviewers Flagged)

### 1. Missing Fallback for LLM Failure

**Source**: Codex (minor #8), Gemini (important #1)
**Location**: Plan Stage 1, Risk Mitigation section

Both reviewers noted the plan lacks a fail-closed fallback path:

**Codex**:
> "No rollback/fail-closed path if LLM fails or degrades quality; should default to original signal and flag errors"

**Gemini**:
> "Does not specify runtime behavior if generalization fails (empty, nonsensical, or low-quality result). This could halt the pipeline or introduce corrupted data."

**Verification**: Plan lines 264-286 address risks but no fallback mechanism specified.

**Resolution**: Add to Stage 1:
- If `generalizeSignal()` fails, log warning and use original `signal.text` + `signal.embedding`
- Add basic validation check (non-empty, reasonable length)
- Track fallback rate as metric

---

## Verified in Code (N=1 → N=2)

### 2. Success Metrics Not Tied to Downstream Value

**Source**: Codex (critical #1)
**Location**: Plan lines 199-203, 289-295

**Verification**: Plan success criteria are:
- Compression ratio >= 3:1
- N-counts >= 2
- Cascade selects N>=2 or N>=3

These are cluster metrics, not downstream value metrics (retrieval quality, principle quality, user value).

**Resolution**: Add downstream metrics to Stage 4:
- Principle quality rubric (manual sample review)
- Duplication reduction with maintained coverage
- Retrieval precision if applicable

---

### 3. No A/B Evaluation Methodology

**Source**: Codex (important #2)
**Location**: Plan Stage 4, lines 180-211

**Verification**: Stage 4 runs synthesis and checks metrics but no side-by-side comparison with baseline.

**Resolution**: Add to Stage 4:
- Create small golden set of signals with expected generalizations
- Compare baseline (direct embedding) vs generalized pipeline
- Manual quality assessment on sample

---

### 4. Incomplete Guardrails for Over-Abstraction

**Source**: Codex (important #3)
**Location**: Plan Risk Mitigation, lines 280-286

**Verification**: Risk "Over-generalization loses meaning" is mentioned but mitigations are soft:
- "Prompt constrains output to be actionable" (no format specified)
- "Include dimension context in prompt" (good)
- "Human review of generated SOUL.md" (post-hoc, not preventive)

Missing: format constraints, length cap, refusal handling, confidence fallback.

**Resolution**: Add to Stage 1 prompt design:
- Length cap (e.g., < 150 characters)
- Imperative form required
- "Don't invent policy" constraint
- Keep-original fallback on low confidence/validation failure

---

### 5. Incomplete Provenance Metadata

**Source**: Codex (important #4)
**Location**: Plan lines 132-136

**Verification**: Plan stores `original_signal` but not:
- `model` used for generalization
- `prompt_version`
- `timestamp`
- `confidence` score

**Resolution**: Update Stage 2 provenance to include:
```
{
  original_text: string
  generalized_text: string
  model: string
  prompt_version: string
  timestamp: string
  confidence?: number
}
```

---

### 6. Missing Batching Policy

**Source**: Codex (important #5)
**Location**: Plan lines 162-165

**Verification**: Plan says "Batch generalization (1 LLM call per iteration)" but lacks:
- Max tokens per batch
- Retry/backoff semantics
- Partial failure handling

**Resolution**: Add to Stage 3:
- Batch size limit (e.g., 50 signals or 4000 tokens)
- Exponential backoff on failure (1s, 2s, 4s)
- Partial failure: use original for failed signals, continue with successful

---

### 7. PBD Alignment Risk in Prompt Design

**Source**: Codex (important #6)
**Location**: Plan Prompt Template, lines 242-255

**Verification**: Prompt template exists but lacks PBD-specific constraints:
- No imperative form requirement
- No "don't invent policy" constraint
- No actor-agnostic language requirement

**Resolution**: Update prompt template constraints:
- Output must be imperative form ("Values X", "Prioritizes Y")
- Must not introduce new policies not in original
- Must preserve conditionals from original
- Must be actor-agnostic (no "I", "we", "you")

---

### 8. No Post-Generalization Threshold Tuning

**Source**: Codex (minor #7)
**Location**: Plan Stage 4, lines 180-211

**Verification**: Plan doesn't address threshold adjustment after generalization. If embeddings still disperse, 0.85 may still be too strict.

**Resolution**: Add to Stage 4 acceptance criteria:
- Analyze actual embedding distribution post-generalization
- Consider threshold adjustment if clustering still sparse
- Document recommended threshold for generalized embeddings

---

### 9. No Unit/Integration Tests Defined

**Source**: Codex (minor #9)
**Location**: Plan Stage 1, lines 98-103

**Verification**: Stage 1 acceptance criteria don't include tests:
- No determinism checks
- No format validation tests
- No hallucination detection tests

**Resolution**: Add to Stage 1:
- Unit tests for `generalizeSignal()` with fixed seed for determinism
- Format validation tests (length, non-empty, no policy invention)
- Integration test with mock LLM

---

### 10. Technical Violation of `code_examples: forbidden`

**Source**: Gemini (minor #2)
**Location**: Plan frontmatter line 7, Stage 2 lines 115-125

**Verification**: Frontmatter says `code_examples: forbidden` but Stage 2 contains:
```
principle.text = signal.text
principle.embedding = signal.embedding
```

**Resolution**: Rephrase as prose:
- "The principle.text property is assigned from signal.text"
- "The principle.text property will be assigned from generalizedSignal.generalizedText"

---

### 11. Verification Metrics Could Be Brittle

**Source**: Gemini (minor #3)
**Location**: Plan Stage 4, lines 194-196

**Verification**: Specific similarity values (0.87, 0.89) listed as expected outputs could make tests fragile.

**Resolution**: Change "Expected (after)" to "Illustrative Example (after)" and keep broader metrics as primary success criteria.

---

## Action Items

| # | Item | Priority | Source | Status |
|---|------|----------|--------|--------|
| 1 | Add LLM failure fallback | Important | N=2 | Pending |
| 2 | Add downstream value metrics | Important | N=1 verified | Pending |
| 3 | Add A/B evaluation methodology | Important | N=1 verified | Pending |
| 4 | Add guardrails for over-abstraction | Important | N=1 verified | Pending |
| 5 | Expand provenance metadata | Important | N=1 verified | Pending |
| 6 | Define batching policy | Important | N=1 verified | Pending |
| 7 | Strengthen prompt constraints | Important | N=1 verified | Pending |
| 8 | Add threshold tuning plan | Minor | N=1 verified | Pending |
| 9 | Define unit/integration tests | Minor | N=1 verified | Pending |
| 10 | Fix code_examples violation | Minor | N=1 verified | Pending |
| 11 | Mark verification as illustrative | Minor | N=1 verified | Pending |

---

## Strengths Noted

Both reviewers highlighted:

1. **Root cause correctly identified** - Missing PBD normalization step
2. **Architecture is correct** - LLM generalization before embedding is right approach
3. **PBD alignment is strong** - Directly implements "Principle Synthesis" and "Normalization"
4. **Integration points accurate** - `principle-store.ts:200`, `reflection-loop.ts:158-163`
5. **Reuses existing patterns** - `semantic-classifier.ts` as template

---

## Cross-References

**Reviews**:
- [`docs/reviews/2026-02-09-signal-generalization-codex.md`](../reviews/2026-02-09-signal-generalization-codex.md)
- [`docs/reviews/2026-02-09-signal-generalization-gemini.md`](../reviews/2026-02-09-signal-generalization-gemini.md)

**Plan**:
- [`docs/plans/2026-02-09-signal-generalization.md`](../plans/2026-02-09-signal-generalization.md)

**Related Issue**:
- [`docs/issues/missing-signal-generalization-step.md`](missing-signal-generalization-step.md)

**Implementation Files**:
- `src/lib/signal-generalizer.ts` (to be created)
- `src/lib/principle-store.ts` - Integration point
- `src/lib/reflection-loop.ts` - Call site
- `src/lib/semantic-classifier.ts` - Pattern to follow

---

*Issue created 2026-02-09 from consolidated code review findings*
