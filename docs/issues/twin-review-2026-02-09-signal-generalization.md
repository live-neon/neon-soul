# Twin Review: Signal Generalization Plan

**Created**: 2026-02-09
**Status**: ✅ Resolved
**Priority**: Medium
**Reviewers**: Twin 1 (Technical), Twin 2 (Creative)
**Plan**: [`docs/plans/2026-02-09-signal-generalization.md`](../plans/2026-02-09-signal-generalization.md)

---

## Summary

Both twins approved the plan with suggestions. Technical review validated architecture and integration points. Creative review raised philosophical questions about authentic voice preservation. Key N=2 finding relates to prompt template versioning.

**Overall Status**: Approved with suggested improvements

---

## N=2 Verified Findings (Both Reviewers Flagged)

### 1. Prompt Template Versioning Unspecified

**Source**: Technical (minor #5), Creative (minor #4)
**Location**: Plan Stage 1 (lines 85-86), Prompt Design (lines 301-314)

Both reviewers noted the plan mentions tracking `prompt_version` in provenance but doesn't specify:
- Where the canonical prompt template lives
- How versions are tracked (semantic versioning? hash? date?)
- When version should increment

**Technical**:
> "Plan includes `promptVersion` in provenance but doesn't specify how versions are tracked"

**Creative**:
> "The actual prompt template is described conceptually ('The prompt instructs the LLM to...'). For real versioning, we need a canonical prompt file."

**Verification**: Plan lines 85-86 mention `promptVersion: string` in interface, but no versioning mechanism specified.

**Resolution**:
- Create `src/prompts/generalize-signal.md` as canonical versioned prompt
- Use semantic versioning (v1.0.0) with constant in signal-generalizer.ts
- Document version increment triggers in prompt file header

---

## Verified in Plan (N=1 → N=2)

### 2. Voice Preservation Strategy Missing

**Source**: Creative (important #1)
**Location**: Plan overall - not addressed

**Verification**: Searched plan for "voice", "authentic", "personal" - none found. Plan treats generalization as pure technical optimization.

The creative twin raised a philosophical tension:
> "When we transform 'Prioritize honesty over comfort' into 'Values truthfulness over social comfort', what do we lose?"

**Resolution**: Add "Voice Preservation Strategy" subsection to Stage 5 (Documentation) addressing:
- SOUL.md should prioritize original phrasings where possible
- Generalized form used for clustering internally, original form for display
- Consider "most representative original signal" as cluster label instead of abstraction

---

### 3. UX Success Criteria Missing

**Source**: Creative (important #2)
**Location**: Plan Success Criteria (lines 362-377)

**Verification**: Current success criteria are all metrics-focused:
- Cluster-level: compression ratio, N-counts, similarity threshold
- Operational: provenance, fallback rate, latency

No criteria address user experience of reading SOUL.md.

**Resolution**: Add to Success Criteria:
- User recognizes their values in generated SOUL.md (qualitative review)
- Axioms feel personal, not templated
- Original phrasings visible somewhere (provenance or display)

---

### 4. "No Policy Invention" Constraint Underspecified

**Source**: Creative (important #3)
**Location**: Plan Prompt Constraints (lines 291-319)

**Verification**: Plan says "Output must not introduce concepts absent from original signal" but doesn't clarify edge cases.

Example from review:
- Original: "Prioritize honesty over comfort"
- Is "Values truthfulness and directness" policy invention? ("directness" wasn't in original)

**Resolution**: Add examples to Prompt Constraints section:
- Synonym expansion (honesty → truthfulness) = OK
- Related concept addition (honesty → honesty + directness) = Flag for review
- Domain injection (honesty → organizational honesty) = Reject

---

### 5. GeneralizedSignal Type Location Unspecified

**Source**: Technical (important #2)
**Location**: Plan Stage 1 (lines 80-88)

**Verification**: Plan describes GeneralizedSignal interface but doesn't specify where to define it. Three options exist:
- `src/types/signal.ts` (extend existing)
- `src/types/generalized-signal.ts` (new file)
- `src/lib/signal-generalizer.ts` (co-located)

**Resolution**: Define in `src/types/signal.ts` alongside Signal type for type cohesion. Add this to Stage 1 acceptance criteria.

---

### 6. Integration Sequence Unclear (Batch-First vs Sequential)

**Source**: Technical (important #3)
**Location**: Plan Stage 3 (lines 175-180)

**Verification**: Plan says generalization happens "before principle store operations" but current reflection-loop.ts (lines 160-163) processes signals in a for-loop. Plan doesn't clarify:
- Option A: Generalize all signals first, then feed to store (batch)
- Option B: Generalize each signal inline before addSignal (sequential)

**Resolution**: Explicitly specify Option A (batch-first) in Stage 3:
1. `const generalized = await generalizeSignals(llm, signals)`
2. `for (const g of generalized) { await store.addSignal(g, ...) }`

---

### 7. Progressive Threshold Interaction Unaddressed

**Source**: Technical (important #4)
**Location**: Plan Stage 4 (lines 235-239)

**Verification**: reflection-loop.ts currently tightens threshold by +0.02 per iteration. Plan acknowledges threshold may need adjustment but doesn't address how generalization affects progressive tightening.

If generalized embeddings cluster tighter, progressive tightening may:
- Converge faster (good)
- Over-cluster (bad)

**Resolution**: Add to Stage 4 acceptance criteria:
- Measure similarity distribution before/after generalization
- Evaluate whether progressive tightening is still needed
- Document recommended initial threshold for generalized embeddings

---

### 8. Cache Invalidation Strategy Missing

**Source**: Technical (minor #6)
**Location**: Plan Stage 3 (lines 191-192)

**Verification**: Plan mentions caching generalized forms but doesn't specify:
- Cache key (signal.id? text hash?)
- Invalidation (on prompt version change?)

**Resolution**: Add to Stage 3:
- Key by `signal.id + promptVersion`
- Invalidate entire cache on prompt version change

---

### 9. Debug Log Sample Size Unspecified

**Source**: Technical (minor #7)
**Location**: Plan Stage 3 (line 198)

**Verification**: "Log sample generalizations at debug level" - no sample size specified.

**Resolution**: Specify in Stage 3:
- Log first 3 per batch + random 5% of remainder
- Prevents log spam while ensuring visibility

---

### 10. Missing Before/After SOUL.md Examples

**Source**: Creative (minor #5)
**Location**: Plan Stage 4-5

**Verification**: Plan shows before/after for signals but never shows before/after for SOUL.md output.

**Resolution**: Add illustrative examples in Stage 4 showing:
- SOUL.md without generalization (50 near-duplicate axioms)
- SOUL.md with generalization (5-7 meaningful axioms)

---

### 11. Actor-Agnostic Display Tension

**Source**: Creative (minor #6)
**Location**: Plan Prompt Constraints (line 304)

**Verification**: Constraint "No I, we, you - abstract the actor" works for clustering but creates cold axioms.

When SOUL.md displays "Values truthfulness" vs "I value truthfulness", the user is reading *their* soul document.

**Resolution**: Note in Stage 5 (Documentation):
- Clustering form: actor-agnostic (for embedding similarity)
- Display form: can re-personalize with "I" statements when rendering SOUL.md

---

## Action Items

| # | Item | Priority | Source | Status |
|---|------|----------|--------|--------|
| 1 | Add prompt template versioning mechanism | Minor | N=2 | ✅ Resolved |
| 2 | Add Voice Preservation Strategy section | Important | N=1 verified | ✅ Resolved |
| 3 | Add UX success criteria | Important | N=1 verified | ✅ Resolved |
| 4 | Clarify "no policy invention" with examples | Important | N=1 verified | ✅ Resolved |
| 5 | Specify GeneralizedSignal type location | Important | N=1 verified | ✅ Resolved |
| 6 | Specify batch-first integration sequence | Important | N=1 verified | ✅ Resolved |
| 7 | Address progressive threshold interaction | Important | N=1 verified | ✅ Resolved |
| 8 | Add cache invalidation strategy | Minor | N=1 verified | ✅ Resolved |
| 9 | Specify debug log sample size | Minor | N=1 verified | ✅ Resolved |
| 10 | Add before/after SOUL.md examples | Minor | N=1 verified | ✅ Resolved |
| 11 | Note actor-agnostic display tension | Minor | N=1 verified | ✅ Resolved |

**Resolution**: All items addressed in plan update 2026-02-09. See updated plan for details.

---

## Alternative Framing Insight (Creative Twin)

The creative twin proposed a solution to the voice preservation question:

> "Decouple *representation* (for clustering) from *presentation* (for UX)"

**Proposed approach**:
1. Generalize signals for embedding (as plan describes)
2. Cluster on generalized embeddings (as plan describes)
3. For each cluster, select the *most representative original signal* as the display label
4. SOUL.md shows original phrasings with evidence of clustering (N-count, related signals expandable)

This gives:
- Technical win: Good clustering from generalized embeddings
- UX win: Authentic voice in output
- Provenance win: Both forms stored for auditability

Consider adopting this as a variant in Stage 5 or as an optional output mode.

---

## Cross-References

**Reviews**:
- [`docs/reviews/2026-02-09-signal-generalization-twin-technical.md`](../reviews/2026-02-09-signal-generalization-twin-technical.md)
- [`docs/reviews/2026-02-09-signal-generalization-twin-creative.md`](../reviews/2026-02-09-signal-generalization-twin-creative.md)

**Plan**:
- [`docs/plans/2026-02-09-signal-generalization.md`](../plans/2026-02-09-signal-generalization.md)

**Code Review**:
- [`docs/issues/code-review-2026-02-09-signal-generalization.md`](code-review-2026-02-09-signal-generalization.md) (resolved)

**Related Issue**:
- [`docs/issues/missing-signal-generalization-step.md`](missing-signal-generalization-step.md)

---

*Issue created 2026-02-09 from consolidated twin review findings*
