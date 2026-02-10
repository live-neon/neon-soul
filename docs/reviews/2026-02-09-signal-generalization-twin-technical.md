# Technical Review: Signal Generalization Plan

**Created**: 2026-02-09
**Reviewer**: Twin 1 (Technical Infrastructure)
**Plan**: `docs/plans/2026-02-09-signal-generalization.md`
**Status**: Approved with suggestions

---

## Verified Files

- docs/plans/2026-02-09-signal-generalization.md (397 lines, MD5: 4634125b)
- docs/issues/code-review-2026-02-09-signal-generalization.md (270 lines)
- src/lib/principle-store.ts (235 lines)
- src/lib/reflection-loop.ts (314 lines)
- src/lib/semantic-classifier.ts (213 lines)
- src/lib/embeddings.ts (119 lines)
- src/types/signal.ts (59 lines)
- src/types/principle.ts (34 lines)
- docs/guides/single-source-pbd-guide.md (partial read)

---

## Executive Summary

The plan correctly identifies the root cause (missing principle synthesis step from PBD methodology) and proposes a sound architectural solution. The 11 code review findings from Codex and Gemini have been addressed in the updated plan. The integration points are accurate, and the staged approach is appropriate.

**Recommendation**: Proceed with implementation. Minor gaps identified below should be addressed during implementation rather than requiring plan revision.

---

## Strengths

1. **Root cause correctly identified**: The 1:1 signal-to-principle ratio stems from missing abstraction, not embedding model quality
2. **PBD alignment is strong**: Directly implements Step 4 (Principle Synthesis) from single-source-pbd-guide.md
3. **Code review findings addressed**: All 11 items from Codex/Gemini review resolved in plan update
4. **Integration points accurate**: principle-store.ts line 200 and reflection-loop.ts lines 158-163 correctly identified
5. **Reuses existing patterns**: semantic-classifier.ts provides good template for LLM classification
6. **Fallback mechanism well-designed**: Graceful degradation preserves pipeline stability
7. **Provenance tracking complete**: Model, prompt version, timestamp, confidence, fallback flag all specified

---

## Issues Found

### Important (Should Fix During Implementation)

#### 1. Batching Token Limit May Be Too Conservative

**Location**: Plan Stage 3, lines 183-185
**Problem**: Batch size of "50 signals OR 4000 tokens" may underutilize context window. With Ollama llama3, context is typically 4096-8192 tokens. 50 signals averaging ~30 tokens each = ~1500 tokens input, leaving headroom.
**Suggestion**: During implementation, measure actual token usage and consider:
- Adaptive batching based on signal lengths
- Higher token limit (e.g., 6000 tokens) with buffer for prompt overhead
- Document actual observed batch sizes in implementation

**Confidence**: MEDIUM - depends on actual signal length distribution

---

#### 2. Missing GeneralizedSignal Type Definition Location

**Location**: Plan Stage 1, lines 80-88
**Problem**: Plan describes GeneralizedSignal interface but doesn't specify where to define it. Options:
- `src/types/signal.ts` (extend existing Signal types)
- `src/types/generalized-signal.ts` (new file)
- `src/lib/signal-generalizer.ts` (co-located with implementation)
**Suggestion**: Define in `src/types/signal.ts` alongside Signal type for type cohesion. Keep under 50-line types.go equivalent limit.

**Confidence**: HIGH - structural decision needed before Stage 1

---

#### 3. Reflection Loop Integration Sequence Not Fully Specified

**Location**: Plan Stage 3, lines 175-180
**Problem**: Plan says generalization happens "before principle store operations" but reflection-loop.ts currently has:
```
Line 160-163:
for (const signal of signals) {
  await store.addSignal(signal, signal.dimension);
}
```
The plan should clarify whether:
- A) Generalize all signals first, then feed to store (batch approach)
- B) Generalize each signal inline before addSignal (sequential approach)

Option A aligns with batching policy (Stage 3) but requires refactoring the loop. Option B is simpler but loses batching benefits.

**Suggestion**: Explicitly specify Option A in plan, with pseudocode flow:
1. `const generalized = await generalizeSignals(llm, signals)`
2. `for (const g of generalized) { await store.addSignal(g, g.original.dimension) }`

**Confidence**: HIGH - architectural decision affects implementation

---

#### 4. setThreshold() Interaction With Generalized Embeddings

**Location**: reflection-loop.ts lines 151-156, Plan Stage 4 lines 235-239
**Problem**: The reflection loop currently tightens threshold by +0.02 per iteration. Plan acknowledges threshold may need adjustment post-generalization but doesn't address how this interacts with the progressive tightening.

If generalized embeddings cluster tighter (higher baseline similarity), the progressive tightening may converge faster (good) or over-cluster (bad).

**Suggestion**: During Stage 4 verification:
- Measure similarity distribution before/after generalization
- Consider whether progressive tightening is still needed with generalized embeddings
- Document recommended initial threshold for generalized embeddings (may differ from 0.85)

**Confidence**: MEDIUM - empirical measurement needed

---

### Minor (Nice to Have)

#### 5. Prompt Template Version Tracking Mechanism Unspecified

**Location**: Plan Stage 1, lines 85-86
**Problem**: Plan includes `promptVersion` in provenance but doesn't specify how versions are tracked (semantic versioning? hash? date?).
**Suggestion**: Use semantic versioning (e.g., "v1.0.0") with a constant in signal-generalizer.ts. Document in comments when version should increment.

**Confidence**: HIGH - simple implementation choice

---

#### 6. Cache Invalidation Strategy Missing

**Location**: Plan Stage 3, lines 191-192
**Problem**: Plan mentions "Cache generalized forms if signals repeat across iterations" but doesn't specify cache key or invalidation. Options:
- Key by signal.id (immutable, safe)
- Key by signal.text hash (allows reuse across different IDs)
- Invalidate on prompt version change (required for consistency)
**Suggestion**: Key by signal.id + promptVersion. Invalidate entire cache on prompt version change.

**Confidence**: MEDIUM - optimization, not critical path

---

#### 7. Debug Log Sample Size Not Specified

**Location**: Plan Stage 3, line 198
**Problem**: "Log sample generalizations at debug level" - how many? 100% at debug? Random 10%?
**Suggestion**: Log first 3 per batch + random 5% of remainder. Prevents log spam while ensuring visibility.

**Confidence**: LOW - minor operational detail

---

## MCE Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Plan length | 397 lines | Within 400-line soft limit for plans |
| No code blocks | Mostly compliant | Diagrams use code fences appropriately |
| Staged commits | 5 stages | Each with clear commit message |
| Types file size | TBD | GeneralizedSignal addition should keep types <50 lines |
| Integration files | Within limits | principle-store.ts (235), reflection-loop.ts (314) |

---

## Alternative Framing Analysis

### Is LLM-based generalization the right solution?

**Alternatives considered**:

1. **Different embedding model**: Use a larger model (e.g., all-mpnet-base-v2, 768-dim) that captures semantic similarity better.
   - **Pro**: No LLM latency, simpler architecture
   - **Con**: Evidence suggests the issue is surface form variance, not embedding quality. PBD guides explicitly require synthesis step.
   - **Verdict**: Unlikely to solve root cause

2. **Lower similarity threshold**: Drop from 0.85 to 0.70 or lower.
   - **Pro**: Immediate fix, no new code
   - **Con**: Would cluster unrelated signals, losing semantic precision. Already tried implicitly via cascade (which falls to N>=1).
   - **Verdict**: Addresses symptom, not cause

3. **Clustering algorithm change**: Use hierarchical clustering or DBSCAN instead of greedy similarity matching.
   - **Pro**: Better cluster discovery
   - **Con**: Still operates on raw signal embeddings. Won't help if embeddings are too specific.
   - **Verdict**: Could be combined with generalization, but doesn't replace it

4. **Manual principle curation**: Human reviews and merges similar signals.
   - **Pro**: Highest quality
   - **Con**: Doesn't scale, defeats automation goal
   - **Verdict**: Useful for golden set validation (Stage 4), not production

**Conclusion**: LLM-based generalization is the right approach. The PBD methodology explicitly requires principle synthesis (Step 4 in single-source-pbd-guide.md), and the root cause is semantic surface variance that only abstraction can resolve. The 1:1 ratio is evidence of missing abstraction, not poor embeddings.

---

## Testing Recommendations

1. **Unit tests for signal-generalizer.ts**:
   - Determinism: Same input + seed = same output
   - Format validation: Length cap, imperative form, no pronouns
   - Fallback: Empty/invalid LLM output triggers fallback
   - Batch: Partial failures don't halt batch

2. **Integration tests**:
   - End-to-end: Signals -> Generalize -> Store -> Match -> Axioms
   - Regression: Existing tests pass with generalization enabled
   - Golden set: 10-15 manually verified signals with expected generalizations

3. **Performance tests**:
   - Latency: Measure generalization overhead per signal and per batch
   - Memory: Verify no embedding leaks in batch processing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Status |
|------|------------|--------|-------------------|
| LLM failure halts pipeline | Low | High | Fallback mechanism specified |
| Over-generalization loses meaning | Medium | Medium | Prompt constraints + validation |
| Latency unacceptable | Low | Medium | Batching + local LLM |
| Threshold still too strict | Medium | Low | Stage 4 analysis planned |
| Prompt injection via signal text | Low | Medium | XML delimiters pattern from semantic-classifier.ts |

---

## Recommended Next Steps

1. **Proceed with Stage 1** - Create signal-generalizer.ts module
2. **Define GeneralizedSignal type** in src/types/signal.ts
3. **Clarify integration sequence** (batch-first approach recommended)
4. **Create golden set** early for Stage 4 validation
5. **Measure baseline** before implementation for comparison

---

## Cross-References

- **Plan**: `docs/plans/2026-02-09-signal-generalization.md`
- **Code Review**: `docs/issues/code-review-2026-02-09-signal-generalization.md`
- **PBD Guide**: `docs/guides/single-source-pbd-guide.md` (Step 4: Principle Synthesis)
- **Integration Points**: `src/lib/principle-store.ts`, `src/lib/reflection-loop.ts`
- **Pattern Template**: `src/lib/semantic-classifier.ts`

---

*Technical review completed 2026-02-09 by Twin 1 (Technical Infrastructure)*
