# Twin Review: Axiom Emergence Bootstrap Plan (v3)

**Created**: 2026-02-09
**Status**: Resolved (Implementation Complete)
**Priority**: Medium
**Reviewers**: twin-technical (双技), twin-creative (双創)
**Plan**: [`docs/plans/2026-02-09-axiom-emergence-bootstrap.md`](../plans/2026-02-09-axiom-emergence-bootstrap.md)

---

## Summary

Both twin reviewers approved the cascading threshold approach with suggestions. The plan is architecturally sound and philosophically aligned. Key items to address before implementation focus on design clarification and documentation completeness.

**Overall Status**: Approved with suggestions (not blocking)

---

## N=2 Verified Findings (Both Reviewers Flagged)

### 1. Research Citation for "3 Axioms Minimum"

**Source**: Technical (minor #3), Creative (important #1)
**Location**: Plan Stage 2, line 124

Both reviewers noted that "Minimum viable output: 3 axioms (aligns with Core tier research minimum)" lacks justification.

**Technical**:
> "The minimum 3 axioms target is arbitrary... Consider minimum 1 or 0"

**Creative**:
> "Link or summarize the research supporting '3 axioms minimum' in the plan. This makes the threshold justified rather than arbitrary."

**Research exists**: `docs/research/optimal-axiom-count.md` documents the cognitive load research (Miller's Law, Jim Collins 3-6 values, etc.) but the plan doesn't link to it in the cascade logic section.

**Resolution**: Add inline reference to research document in Stage 2.

---

### 2. Stage 1 Design Needs Clarification

**Source**: Technical (important #1)
**Location**: Plan Stage 1, lines 87-108
**Verification**: Confirmed in code - `PrincipleStore` interface has no `setThreshold()` method

The plan says "Pass iteration-specific threshold to `addSignal()`" but doesn't specify the approach clearly.

**Two options**:
- **Option A (simpler)**: Add `setThreshold()` method to PrincipleStore
- **Option B (plan's stated approach)**: Modify `addSignal(signal, dimension, threshold?)` signature

**Code context** (`principle-store.ts:71-74`):
```typescript
export function createPrincipleStore(
  llm: LLMProvider,
  similarityThreshold: number = 0.85
): PrincipleStore {
```

The threshold is captured in closure at creation time. Either approach requires interface changes.

**Resolution**: Plan should specify which option to use. Recommend Option A (less parameter threading).

---

## Verified in Code (N=1 → N=2)

### 3. MCE Compliance - Multiple Files Over Limit

**Source**: Technical (minor #6)
**Verification**: Confirmed via line count

| File | Lines | Limit | Over By |
|------|-------|-------|---------|
| reflection-loop.ts | 314 | 200 | 114 |
| compressor.ts | 233 | 200 | 33 |
| principle-store.ts | 218 | 200 | 18 |
| pipeline.ts | 811 | 200 | 611 |

The plan will add code to reflection-loop.ts and compressor.ts, pushing them further over limit.

**Resolution**: Create follow-up issue for MCE refactoring after implementation.

---

### 4. No Tests Reference GreenfieldMode (Migration Risk Low)

**Source**: Creative (minor #4)
**Verification**: Grep found 0 test files referencing GreenfieldMode

Creative raised: "Removing `GreenfieldMode` type may break tests that use mode configuration"

**Finding**: No `.test.ts` files currently reference GreenfieldMode. Migration risk is theoretical, not actual.

**Resolution**: Note in plan that migration is low-risk. Stage 3 can proceed without special test handling.

---

## N=1 Items (Single Reviewer)

### 5. Threshold Tightening + Preserved Store Interaction

**Source**: Technical (important #2)
**Location**: Plan lines 97-100

When store persists but threshold tightens each iteration (+0.02), later iterations may not match existing principles (stricter threshold). This could cause principle fragmentation.

**Question**: Is fragmentation acceptable, or should threshold tightening be removed?

**Resolution**: Document expected behavior explicitly in plan. Either approach works, but decision should be stated.

---

### 6. User-Facing Documentation in Stage 5

**Source**: Creative (important #2)
**Location**: Plan Stage 5, lines 203-215

Stage 5 focuses on internal docs (ARCHITECTURE.md, issues) but doesn't address:
- CLI help text (remove mode flags)
- Tier label explanation for users
- Cascade fallback message in CLI output

**Resolution**: Add "User Communication" acceptance criteria to Stage 5.

---

### 7. Cascade Diagram Should Show Tier Assignment

**Source**: Creative (minor #3)
**Location**: Plan lines 46-52

The cascade diagram shows threshold logic but not tier assignment. Users might misunderstand that falling to N>=1 still assigns "Emerging" tier (not Core).

**Resolution**: Expand diagram or add clarifying note about tier assignment.

---

### 8. Empty Input Edge Case

**Source**: Technical (minor #4)
**Location**: Stage 2

If input has zero signals, cascade produces 0 axioms at all levels. This conflicts with "minimum 3" goal.

**Resolution**: Clarify that minimum 3 is a target, not a hard requirement. Empty input = empty output (correct behavior).

---

### 9. Convergence Behavior May Change

**Source**: Technical (minor #5)
**Location**: `reflection-loop.ts:176-188`

With preserved store, convergence detection (axiom set embedding similarity) may behave differently. Likely beneficial (faster stabilization) but should be validated.

**Resolution**: Add convergence validation to Stage 5 acceptance criteria.

---

## Action Items

| # | Item | Priority | Source | Status |
|---|------|----------|--------|--------|
| 1 | Add research citation for "3 axioms minimum" | Important | N=2 | **Done** - Stage 2 updated |
| 2 | Clarify Stage 1 design (Option A vs B) | Important | N=2 | **Done** - Stage 1 specifies `setThreshold()` |
| 3 | Document threshold tightening behavior | Important | N=1 | **Done** - Stage 1 documents fragmentation |
| 4 | Add user-facing docs to Stage 5 | Important | N=1 | **Done** - Stage 5 updated |
| 5 | Create MCE refactoring follow-up | Minor | N=2 | **Deferred** - Separate concern |
| 6 | Clarify cascade diagram with tier assignment | Minor | N=1 | **Done** - Diagram expanded |
| 7 | Clarify empty input edge case | Minor | N=1 | **Done** - Stage 2 updated |
| 8 | Add convergence validation to Stage 5 | Minor | N=1 | **Done** - Stage 5 updated |

**Plan revision**: v4 addresses all items except MCE compliance (deferred).

---

## Strengths Noted

Both reviewers highlighted:

1. **Root cause correctly addressed** - Store preservation is the right fix
2. **Cascading threshold is elegant** - Autonomous adaptation without configuration
3. **Tier labels remain honest** - N-count determines tier, not cascade level
4. **GreenfieldMode removal simplifies** - Mode abstraction was premature
5. **Philosophy alignment** - "Thresholds emerge, they aren't declared"
6. **UX improvement** - Removes cognitive burden of mode switching

---

## Cross-References

**Reviews**:
- [`docs/reviews/2026-02-09-axiom-emergence-bootstrap-twin-technical.md`](../reviews/2026-02-09-axiom-emergence-bootstrap-twin-technical.md)
- [`docs/reviews/2026-02-09-axiom-emergence-bootstrap-twin-creative.md`](../reviews/2026-02-09-axiom-emergence-bootstrap-twin-creative.md)

**Plan**:
- [`docs/plans/2026-02-09-axiom-emergence-bootstrap.md`](../plans/2026-02-09-axiom-emergence-bootstrap.md)

**Research**:
- [`docs/research/optimal-axiom-count.md`](../research/optimal-axiom-count.md)

**Code Review Issue**:
- [`docs/issues/code-review-2026-02-09-axiom-emergence-bootstrap.md`](code-review-2026-02-09-axiom-emergence-bootstrap.md)

**Implementation Files**:
- `src/lib/reflection-loop.ts` - N-count carryover, convergence
- `src/lib/compressor.ts` - Cascading threshold
- `src/lib/principle-store.ts` - Store interface (Stage 1 design)
- `src/lib/pipeline.ts` - GreenfieldMode removal

---

*Issue created 2026-02-09 from consolidated twin review findings*
