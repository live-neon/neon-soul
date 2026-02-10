# Signal Generalization Plan Review - Codex

**Date**: 2026-02-09
**Reviewer**: Codex GPT-5.1-codex-max
**Files Reviewed**:
- `docs/plans/2026-02-09-signal-generalization.md`
- `docs/issues/missing-signal-generalization-step.md`
- `docs/guides/single-source-pbd-guide.md`
- `docs/guides/multi-source-pbd-guide.md`
- `src/lib/principle-store.ts`
- `src/lib/reflection-loop.ts`
- `src/lib/semantic-classifier.ts`

## Summary

The plan correctly identifies the root cause (missing PBD normalization step) and proposes a sound architectural solution (LLM-based generalization before embedding). However, the plan lacks evaluation methodology, robust guardrails for over-abstraction, and concrete operational policies. Success criteria focus on cluster metrics rather than downstream value.

## Findings

### Critical

1. **Objective clarity gap** (`docs/plans/2026-02-09-signal-generalization.md:199-203`)
   - Success metrics ("compression ratio >= 3:1", "N-counts reaching 2+") are not tied to user-value or acceptance criteria
   - Should measure downstream performance (retrieval precision/recall, principle quality, reduced duplication with maintained coverage)
   - Risk: Optimizing for cluster size may degrade actual principle quality

### Important

2. **Validation gap** (`docs/plans/2026-02-09-signal-generalization.md:180-212`)
   - No plan to A/B test generalized embedding pipeline vs. current baseline
   - Without side-by-side evaluation on held-out signals, risk of silent regressions
   - Potential loss of nuance or hallucinated principles could go undetected

3. **Data integrity risk** (`docs/plans/2026-02-09-signal-generalization.md:234-260`)
   - Generalization step can distort or over-abstract signals
   - Plan does not specify guardrails:
     - Style/format constraints
     - Length/constraint checks
     - Refusal handling
     - "Keep original if confidence low" fallback path
   - Need preservation of key qualifiers (who/when/conditions)

4. **Provenance incomplete** (`docs/plans/2026-02-09-signal-generalization.md:132-136`)
   - Plan mentions keeping original signal but not generalization metadata
   - Should store: `{original, generalized, model, prompt_version, timestamp}`
   - Critical for audits and rollbacks

5. **Batch cost control missing** (`docs/plans/2026-02-09-signal-generalization.md:162-165`)
   - Stage 3 calls for batching but lacks concrete policy:
     - Max tokens per batch
     - Retry/backoff semantics
     - Partial failure handling
   - Risk: High latency or partial writes leading to inconsistent store

6. **PBD alignment risk** (`docs/plans/2026-02-09-signal-generalization.md:242-260`)
   - PBD stresses "actionable, explicit relationships"
   - Generalization could drift to vague principles unless constrained
   - Need prompt template enforcing:
     - Imperative form
     - Actor-agnostic language
     - Include conditionals from original
     - "Don't invent policy" constraint

### Minor

7. **Clustering threshold static** (`docs/plans/2026-02-09-signal-generalization.md:180-197`)
   - 0.85 threshold mentioned as blocker
   - Plan doesn't propose threshold tuning after generalization
   - If embeddings still disperse, clusters may not form
   - Consider feedback loop or hierarchical clustering

8. **No rollback path** (`docs/plans/2026-02-09-signal-generalization.md:266-278`)
   - No fail-closed fallback to direct signal embedding if LLM fails
   - Should default to original signal and flag errors

9. **Testing undefined** (`docs/plans/2026-02-09-signal-generalization.md:98-103`)
   - No unit/integration tests defined for `signal-generalizer`
   - Need: determinism checks, format validation, redlines for hallucinated entities

## Architectural Assessment

**The approach is correct**. Adding an LLM normalization step before embedding is the right direction to address synonym dispersion. This aligns with PBD "principle normalization" (multi-source-pbd-guide.md:44-59) if properly constrained to actionable outputs.

**Key architectural recommendations**:
1. Must pair with evals and guardrails to avoid losing specificity
2. Consider dual-embedding (original + generalized) or storing both vectors
3. Need prompt template that enforces PBD constraints

## Recommendations

### Priority 1: Define Evaluation (blocks implementation)

Create manual rubric + small golden set to compare:
- Baseline vs. generalized pipeline on retrieval
- Duplication reduction with maintained coverage
- Qualitative principle quality assessment

### Priority 2: Prompt/Contract Specification

Specify in Stage 1:
- Format constraints (imperative, 1 sentence, no policy invention)
- Length cap (e.g., < 150 chars)
- Required field preservation
- Keep-original fallback on low confidence

### Priority 3: Enhanced Provenance

In Stage 2, store:
```
{
  original_text: string,
  generalized_text: string,
  model: string,
  prompt_version: string,
  timestamp: string,
  confidence?: number
}
```

Optionally: dual embeddings for both original and generalized forms.

### Priority 4: Operational Policies

In Stage 3, specify:
- Batch size limits (max tokens, max signals)
- Retry semantics with exponential backoff
- Partial failure handling (what happens if 3/50 signals fail?)
- Fail-closed path (use original on LLM failure)

### Priority 5: Post-Generalization Tuning

In Stage 4, add:
- Threshold adjustment based on actual embedding distribution
- Centroid strategy or hierarchical clustering option
- Metric collection for iterative improvement

## Alternative Approaches Considered

1. **Threshold lowering**: Simply lowering 0.85 threshold would increase false positives
2. **Embedding model change**: Different embedding model might help but doesn't address surface form variation
3. **Pure clustering post-hoc**: K-means or similar on embeddings without generalization - loses semantic meaning

**Conclusion**: LLM generalization is the correct approach, but needs guardrails and evaluation to succeed.

---

## Raw Output

<details>
<summary>Full CLI output</summary>

```
**Findings**
- Critical – Objective clarity: "compression ratio ≥ 3:1" and "N-counts reaching 2+" are not tied to user-value or acceptance criteria (e.g., improved retrieval precision/recall or better principle quality). Success metric should be about downstream performance (e.g., hit-rate on reflection retrieval, reduced duplication with maintained coverage), not just cluster size.
- Important – Validation gap: No plan to A/B the generalized embedding pipeline vs. current baseline (e.g., run both paths on held-out signals, compare retrieval quality or manual ratings). Without side-by-side evaluation, risk of silent regressions (loss of nuance, hallucinated principles).
- Important – Data integrity: Generalization step can distort or over-abstract signals; plan does not specify guardrails (style prompt, length/constraint checks, refusal handling, or a "keep original if confidence low" path). Need deterministic format and preservation of key qualifiers (who/when/conditions).
- Important – Provenance & auditability: Storing only `generalizedText` in `principle.text` risks losing traceability. Plan mentions keeping original signal, but no mention of storing the generalization prompt, model, or intermediate rationale for audits/rollbacks. Recommend saving `{original, generalized, model, prompt_version}`.
- Important – Batch/LMM cost control: Stage 3 calls for batching but lacks concrete batching policy (max tokens per batch, retry/backoff, partial failure handling). Risk: high latency or partial writes leading to inconsistent store.
- Important – PBD alignment: PBD stresses actionable, explicit relationships. Generalization could drift to vague principles unless constrained (e.g., "normalize into imperative, actor-agnostic, include conditionals, avoid policy invention"). Need prompt template to enforce actionability and maintain scope.
- Minor – Clustering threshold: The 0.85 threshold is mentioned as a blocker, but plan doesn't propose threshold tuning after generalization. If embeddings still disperse, clusters may not form. Include a feedback loop to adjust threshold or use hierarchical clustering/centroiding.
- Minor – Rollback/fail-closed: No path to fall back to direct signal embedding if LLM fails or degrades quality; should default to original signal and flag errors.
- Minor – Testing: No unit/integration tests defined for `signal-generalizer` (e.g., determinism with seed, format checks, redlines to ensure no hallucinated entities).

**Architectural notes**
- Adding an LLM normalization step before embedding is the right direction to address synonym dispersion; aligns with PBD "principle normalization" if constrained to actionable outputs.
- Must pair with evals and guardrails to avoid losing specificity; consider dual-embedding (original + generalized) or storing both vectors if space permits.

**Suggestions / Next steps**
1) Define eval: manual rubric + small golden set to compare baseline vs. generalized pipeline on retrieval and duplication reduction.
2) Prompt/contract: specify format, length cap, required fields, and "don't invent policy" constraints; decide keep-original fallback on low confidence.
3) Provenance: store original text, generalized text, model, prompt version, timestamp; optionally dual embeddings.
4) Ops: set batching/token limits and retry semantics; add fail-closed path.
5) Clustering: plan a threshold tuning or centroid strategy once generalized embeddings are produced.
```

</details>

---

*Review generated 2026-02-09 by Codex GPT-5.1-codex-max*
