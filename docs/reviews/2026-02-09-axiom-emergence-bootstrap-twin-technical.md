# Technical Review: Axiom Emergence Bootstrap Plan (v3)

**Reviewer**: Twin 1 (Technical Infrastructure)
**Date**: 2026-02-09
**Plan Version**: Revision 3 (Cascading Thresholds)
**Status**: Approved with suggestions

---

## Verified Files

| File | Lines | MD5 (first 8) |
|------|-------|---------------|
| docs/plans/2026-02-09-axiom-emergence-bootstrap.md | 270 | b7a7dfcc |
| src/lib/reflection-loop.ts | 314 | deb21707 |
| src/lib/compressor.ts | 233 | e93877f2 |
| src/lib/principle-store.ts | 218 | c2aae0ba |
| src/lib/pipeline.ts | 811 | (not hashed - support file) |

---

## Summary

The plan correctly addresses the root cause identified in the code review: N-count resets due to store recreation on each iteration. The cascading threshold approach is technically sound and aligns with the greenfield principle of emergent thresholds. However, several implementation details need clarification.

**Overall Assessment**: The architecture is correct. The plan should proceed with minor clarifications.

---

## Question 1: Is the cascading threshold approach technically sound?

**Yes, with one caveat.**

The cascade logic (try N>=3, fallback to N>=2, then N>=1) is sound because:

1. **It preserves signal integrity**: Higher thresholds are tried first, ensuring well-supported axioms are preferred
2. **It adapts to data quality**: Sparse input naturally cascades to lower thresholds
3. **Tier labels remain honest**: An axiom produced at N>=1 threshold still gets "Emerging" tier (from `determineTier()` in compressor.ts:77-81)

**Caveat**: The minimum 3 axioms target (lines 119-124) is arbitrary. Per the research in `docs/research/optimal-axiom-count.md`, Core tier targets 3-7 axioms, but this minimum doesn't account for inputs that genuinely have fewer than 3 distinct themes. Consider:
- Allow 0 axioms if N>=3 cascade produces 0 (honest result)
- Or require at least 1 axiom (system must produce something)
- Minimum 3 seems like it's optimizing for a specific outcome rather than letting thresholds emerge

**Severity**: Minor
**Location**: Plan lines 119-124

---

## Question 2: Will preserving PrincipleStore across iterations work?

**Yes, but the design in Stage 1 needs more specificity.**

Current architecture (reflection-loop.ts:156-164):
```
// Iteration 2+: Creates NEW store, loses all N-counts
store = createPrincipleStore(llm, principleThreshold + i * 0.02);
```

The plan proposes keeping the same store but adjusting the threshold. Two approaches are possible:

### Option A: Expose threshold setter (simpler)

Add `setThreshold(threshold: number)` to PrincipleStore interface. Requires:
- New method on PrincipleStore (principle-store.ts)
- Modify `addSignal()` to use instance threshold
- Keep store across iterations, just update threshold

### Option B: Pass threshold per-signal (plan's stated approach)

Per plan line 101: "Pass iteration-specific threshold to `addSignal()`"

This would require:
- Modify `addSignal(signal, dimension, threshold?)` signature
- Each signal match uses passed threshold instead of store's threshold
- More flexible but changes interface contract

**Recommendation**: Option A is simpler and sufficient. The plan's Option B works but adds complexity without clear benefit.

**Severity**: Important (clarification needed)
**Location**: Plan Stage 1 (lines 87-108)

---

## Question 3: Edge cases and failure modes not considered

### 3.1 Centroid Drift with Preserved N-counts

**File**: reflection-loop.ts:176-188

When store persists, centroid embedding changes differently than with re-clustering. The current convergence detection compares axiom set embeddings:

```typescript
const similarity = cosineSimilarity(previousAxiomEmbedding, axiomSetEmbedding);
iterationConverged = similarity >= convergenceThreshold;
```

With N-count accumulation, axiom sets will stabilize faster (signals reinforce existing principles rather than creating new ones). This is probably good but should be validated.

**Severity**: Minor (likely beneficial)
**Recommendation**: Add acceptance criterion to Stage 5 to verify convergence behavior.

---

### 3.2 Threshold Tightening + Preserved Store Interaction

The plan preserves the store but doesn't mention what happens to the threshold tightening logic (reflection-loop.ts:160):

```typescript
principleThreshold + i * 0.02
```

If we keep the same store, new signals in iteration 2+ will use stricter thresholds for matching. This means:
- Iteration 1: Signal matches principle at 0.85 similarity
- Iteration 2: Same signal might NOT match (needs 0.87)
- Result: Signal creates new principle instead of reinforcing

This could cause principle fragmentation. Two options:

1. **Keep tightening**: Accept that later iterations require stricter matches (intentional)
2. **Remove tightening**: All iterations use same threshold (simpler)

The plan's Stage 1 says "Similarity threshold still tightens each iteration" (line 99), which suggests option 1. This should work but will produce different clustering than the original design.

**Severity**: Important (design decision)
**Location**: Plan lines 97-100
**Recommendation**: Document expected behavior explicitly. Is fragmentation acceptable?

---

### 3.3 Empty Input Edge Case

**File**: compressor.ts:141-182

If input has zero signals:
- principles = []
- Cascade tries N>=3: 0 axioms
- Cascade tries N>=2: 0 axioms
- Cascade tries N>=1: 0 axioms
- Result: 0 axioms (correct, but plan says "minimum 3" on line 124)

The cascade logic needs to handle this gracefully. Currently `compressPrinciples()` would return empty array, which is correct but conflicts with "minimum 3" goal.

**Severity**: Minor
**Recommendation**: Clarify that minimum 3 is a target, not a hard requirement.

---

### 3.4 Single Principle Edge Case

If input produces 1 principle with N=1:
- Cascade N>=3: 0 axioms (principle has N=1)
- Cascade N>=2: 0 axioms
- Cascade N>=1: 1 axiom

Tier assignment: "Emerging" (correct per determineTier())

This is correct behavior. No issue.

---

## Question 4: Is the stage ordering correct?

**Yes, the ordering is correct.**

Stage dependencies:

| Stage | Depends On | Why |
|-------|------------|-----|
| 1 (N-count carryover) | None | Foundation for cascade |
| 2 (Cascading threshold) | Stage 1 | Needs accumulated N-counts to cascade |
| 3 (Remove GreenfieldMode) | Stage 2 | Mode removal depends on cascade working |
| 4 (Guardrails) | Stage 2 | Guardrails validate cascade output |
| 5 (Validate/Document) | All | Integration verification |

**Stage 1 must precede Stage 2**: Without N-count accumulation, cascade always falls to N>=1 (the original problem).

---

## Alternative Framing Check

**Are we solving the right problem?**

**Yes.** The root cause is correctly identified: store recreation resets N-counts. The plan fixes this directly.

The cascading threshold is a good addition because it:
1. Removes manual mode configuration
2. Adapts to input quality automatically
3. Aligns with greenfield principles ("thresholds emerge")

The removal of GreenfieldMode is appropriate. The mode abstraction was premature - we're still learning what good thresholds look like.

---

## MCE Compliance Check

| File | Lines | Limit | Status |
|------|-------|-------|--------|
| reflection-loop.ts | 314 | 200 | OVER (needs attention) |
| compressor.ts | 233 | 200 | OVER (needs attention) |
| principle-store.ts | 218 | 200 | OVER (needs attention) |
| pipeline.ts | 811 | 200 | OVER (separate refactor) |

**Note**: The plan will add code to reflection-loop.ts and compressor.ts. Consider MCE refactoring as a follow-up to avoid exceeding limits further.

**Severity**: Minor (not blocking)
**Recommendation**: Create follow-up issue for MCE compliance refactoring.

---

## Plan Review: Frontmatter Compliance

| Check | Status |
|-------|--------|
| `code_examples: forbidden` | Not violated (plan uses pseudocode in quotes, not code blocks) |
| Review principles followed | Yes (no implementation details) |
| Plan describes WHAT/WHY | Yes |

---

## Findings Summary

### Critical

None.

### Important

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 1 | Stage 1 design needs clarification | Plan lines 87-108 | Specify Option A (setter) vs Option B (param) |
| 2 | Threshold tightening + preserved store interaction | Plan lines 97-100 | Document expected fragmentation behavior |

### Minor

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 3 | Minimum 3 axioms target is arbitrary | Plan lines 119-124 | Consider minimum 1 or 0 |
| 4 | Empty input edge case | Stage 2 | Clarify minimum is target, not requirement |
| 5 | Convergence behavior may change | reflection-loop.ts:176-188 | Add validation to Stage 5 |
| 6 | MCE compliance | Multiple files | Follow-up refactoring issue |

---

## Strengths

1. **Root cause correctly addressed**: Store preservation is the right fix
2. **Cascading threshold is elegant**: Autonomous adaptation without configuration
3. **Tier labels remain honest**: N-count determines tier, not cascade level
4. **Research-backed guardrails**: Warnings instead of arbitrary failures
5. **GreenfieldMode removal simplifies**: Mode abstraction was premature

---

## Next Steps

1. **Clarify Stage 1 design** (Important): Which approach for threshold handling?
2. **Document fragmentation behavior** (Important): Is it acceptable?
3. **Proceed with implementation**: Plan is architecturally sound
4. **Add convergence validation** to Stage 5 acceptance criteria
5. **Create MCE refactoring issue** after implementation

---

## Confidence Assessment

| Aspect | Confidence | Basis |
|--------|------------|-------|
| N-count carryover fix | HIGH | Verified in code (reflection-loop.ts:156-164) |
| Cascading threshold logic | HIGH | Simple fallback logic, well-defined |
| Tier assignment correctness | HIGH | Verified in code (compressor.ts:77-81) |
| Stage ordering | HIGH | Clear dependencies |
| Threshold tightening interaction | MEDIUM | Need to verify empirically |
| Convergence behavior change | MEDIUM | Likely beneficial but should validate |

---

**Recommendation**: Proceed with implementation after clarifying Important findings (Stage 1 design, fragmentation behavior).

---

*Review completed 2026-02-09 by Twin 1 (Technical Infrastructure)*
