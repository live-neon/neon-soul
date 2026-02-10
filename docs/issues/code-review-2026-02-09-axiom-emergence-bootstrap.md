# Code Review: Axiom Emergence Bootstrap Plan

**Created**: 2026-02-09
**Status**: Resolved (Implementation Complete)
**Priority**: High
**Reviewers**: codex-gpt51-examiner (gpt-5.1-codex-max), gemini-2.5-pro
**Plan**: [`docs/plans/2026-02-09-axiom-emergence-bootstrap.md`](../plans/2026-02-09-axiom-emergence-bootstrap.md)

---

## Summary

Both external reviewers (Codex and Gemini) identified critical architectural concerns with the axiom emergence bootstrap plan. The core issue is that the plan addresses the symptom (0 axioms) rather than the root cause (N-count resets on re-clustering). Multiple N=2 verified findings require plan revision before implementation.

---

## N=2 Verified Findings (Both Reviewers Flagged)

### 1. Root Cause Unaddressed

**Source**: Codex Important #2, Gemini Critical #2
**Location**: `src/lib/reflection-loop.ts:156-169`

Re-clustering resets N-counts each iteration. The plan lowers the threshold to work around this rather than fixing the underlying evidence loss.

```
// Line 160: Store recreation discards N-count history
store = createPrincipleStore(llm, principleThreshold + i * 0.02);
```

**Reviewer Position**:
- Codex: "Lowering the threshold masks the loss of evidence rather than fixing it"
- Gemini: "Working around rather than solving root cause seems to invalidate N-count thresholds entirely"

**Recommendation**: Consider N-count carryover (Option A) or clarify why workaround is preferred long-term.

---

### 2. Fix Incomplete for Learn/Enforce Modes

**Source**: Codex Important #3, Gemini Critical #1
**Location**: Plan Stage 2-3

The plan only addresses bootstrap mode. Learn and Enforce modes will continue to produce 0 axioms because:
- They use higher thresholds (N>=3 or learned value)
- Re-clustering still resets N-counts

**Reviewer Position**:
- Gemini: "This does not solve the problem for `learn` or `enforce` modes"
- Codex: "Mode propagation strategy conflicts with current layering"

**Recommendation**: Add explicit section on how other modes will function, or document as known limitation with follow-up plan.

---

### 3. Stage 4 Underspecified

**Source**: Codex Important #4, Gemini Important #3
**Location**: Plan lines 202-218

"Track N-count distribution for Learn phase" lacks concrete implementation:
- No histogram schema specified
- No storage location for persisted data
- `TrajectoryTracker` doesn't emit N-count histograms
- `runReflectiveLoop` doesn't capture N-count per iteration
- No analysis tooling specified

**Reviewer Position**:
- Codex: "Without concrete metric/logging path, you won't be able to confirm the fix or Learn-phase readiness"
- Gemini: "The mechanism for logging, storing, and analyzing this data is missing"

**Recommendation**: Add histogram schema, storage path, and `scripts/analyze-*` stub to Stage 4.

---

## Verified in Code (N=1 → N=2)

### 4. LLM Cost Spike from N=1 Promotion

**Source**: Codex Critical #1
**Location**: `src/lib/compressor.ts:141-182`
**Verification**: Confirmed in code

Setting `nThreshold = 1` means ALL principles become axioms. Each axiom triggers:

```typescript
// compressor.ts:107 - Each axiom needs LLM call
const notated = await generateNotatedForm(llm, principle.text);
```

With 46 principles → 46 axioms → 46 `generateNotatedForm()` LLM calls.

**Recommendation**: Add LLM call budget to abort conditions, or document expected cost increase.

---

### 5. Convergence Detection Affected by Noisy Axioms

**Source**: Codex Minor #5
**Location**: `src/lib/reflection-loop.ts:179-188`
**Verification**: Confirmed in code

Convergence is based on axiom set embedding similarity:

```typescript
// reflection-loop.ts:180-182
const similarity = cosineSimilarity(previousAxiomEmbedding, axiomSetEmbedding);
iterationConverged = similarity >= convergenceThreshold;
```

If N=1 means every principle becomes an axiom, noisy singletons may cause:
- Oscillating embeddings between iterations
- False convergence or extended timeouts

**Recommendation**: Add minimum iteration before allowing convergence claim, or document expected behavior.

---

## N=1 Items (Single Reviewer)

### 6. Arbitrary 200 Abort Condition → Research-Backed Framework

**Source**: Gemini Important #4
**Location**: Plan lines 69-71
**Research**: [`docs/research/optimal-axiom-count.md`](../research/optimal-axiom-count.md)

The 200 axiom abort threshold lacked rationale. Research across cognitive science, organizational design, and legal frameworks provides evidence-based alternatives.

**Research Findings**:

| Source | Core Tier | Rationale |
|--------|-----------|-----------|
| Miller's Law (modern) | 3-4 chunks | Working memory limit |
| Jim Collins | 3-6 values | "Keep them few and meaningful" |
| Ten Commandments | 10 items | One per finger, memorability |
| Agile Manifesto | 4 values → 12 principles | 3:1 expansion ratio |
| Apple/Google Design | 3 principles each | Clarity through constraint |
| Anthropic Constitutional AI | 4 priority levels | Safety > Ethics > Guidelines > Helpful |

**Proposed Framework**:

| Tier | N-count | Max Count | Rationale |
|------|---------|-----------|-----------|
| Core | N≥5 | 3-7 | Working memory, highest evidence |
| Domain | N≥3 | 15-20 | ~3:1 ratio from core |
| Emerging | N<3 | Uncapped | Learning buffer |

**Principled Abort Condition** (replaces arbitrary 200):
```
if (axioms.length > signals.length) {
  abort("Expansion instead of compression - check clustering")
}
```

Axioms must always be fewer than signals (compression, not expansion).

**Ratio-Based Limit**:
```
max_axioms = min(signals * 0.5, 30)
```
- 47 signals → max 23 axioms
- Hard cap of 30 aligns with cognitive load research

---

### 7. Expectation Setting for Bootstrap Output

**Source**: Gemini Minor #5
**Location**: Plan Stage 2

Promoting all principles (N=1) creates unfiltered axiom set. Plan should explicitly state bootstrap axioms are "raw draft" candidates, not production-ready.

**Recommendation**: Add note to Stage 2 acceptance criteria.

---

## Alternative Framing (Both Reviewers)

Both reviewers questioned whether we're solving the right problem:

**Codex**:
> "Re-clustering design is fundamentally incompatible with N-count accumulation... If N-count doesn't matter in Bootstrap, why track it at all?"

**Gemini**:
> "This approach seems to invalidate the purpose of having an N-count threshold in the first place."

**Unquestioned assumptions** (per Codex):
1. "All principles should become axioms in Bootstrap" - Is this true?
2. "47 signals → 46 principles is correct" - Is clustering too loose?
3. "Re-clustering design is non-negotiable" - Is this tradeoff still valid?

---

## Action Items

### Final Direction (Cascading Thresholds)

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Fix N-count carryover | Critical | **Planned** (Stage 1) |
| 2 | Implement cascading threshold (3→2→1) | Critical | **Planned** (Stage 2) |
| 3 | Remove GreenfieldMode entirely | Important | **Planned** (Stage 3) |
| 4 | Add research-backed guardrails (warnings) | Important | **Planned** (Stage 4) |
| 5 | Validate and document | Important | **Planned** (Stage 5) |

**Key insight**: System should be autonomous. Cascading thresholds adapt to data quality automatically - no manual mode switching needed.

**Plan revised (v3)**: Cascading thresholds replace all mode complexity.

### Superseded Items (from original plan review)

The following items from the original review are **no longer applicable** because we're fixing the root cause rather than working around it:

| # | Original Item | Why Superseded |
|---|---------------|----------------|
| 3 | Stage 4 histogram schema | Not needed if N-count accumulates naturally |
| 4 | LLM cost abort conditions | N>=3 limits axiom count naturally |
| 5 | Convergence behavior with N=1 | N>=3 means fewer, stable axioms |
| 6 | 200 abort limit rationale | **Addressed**: Research-backed framework in `docs/research/optimal-axiom-count.md` |
| 7 | Bootstrap output expectation | Axioms will be filtered by N>=3 |

---

## Resolution Path

### Rejected Approaches

**Option A (Original Plan)**: Lower N-threshold to 1 in bootstrap mode
- Workaround, not fix
- Doesn't address Learn/Enforce modes
- Makes N-count threshold meaningless

**Option B**: Implement workaround with documented limitations
- Defers the real problem
- Creates technical debt

### Proposed Path (Fix Root Cause)

Both reviewers and team discussion converged on fixing the actual problem rather than working around it.

**The core issue**: Re-clustering was a deliberate tradeoff (CR-2 note):
> "This design choice trades N-count accumulation for cleaner final clustering"

But this tradeoff completely breaks axiom emergence. If N-counts never accumulate, the N-threshold is meaningless. The "cleaner clustering" isn't worth it if the system produces 0 axioms.

**Simplest fix**: Don't recreate the store each iteration. Currently:
```
// Iteration 2+: Creates NEW store, loses all N-counts
store = createPrincipleStore(llm, principleThreshold + i * 0.02);
```

Instead, keep the same store and let signals naturally accumulate. If a signal matches an existing principle, increment N-count. If not, create new principle.

**Remove All Modes - Use Cascading Thresholds**:

Instead of manual mode switching, the system adapts autonomously:

```
Try N>=3 → got >= 3 axioms? → done (high confidence)
     ↓ no (< 3 axioms)
Try N>=2 → got >= 3 axioms? → done (medium confidence)
     ↓ no (< 3 axioms)
Try N>=1 → use whatever we got (low confidence)
```

| Removed | Why |
|---------|-----|
| GreenfieldMode type | No modes needed - system adapts |
| Bootstrap/Learn/Enforce | Autonomous behavior replaces manual switching |
| Arbitrary 200 limit | Cascade IS the safeguard |
| User configuration | System just works |

**Action Plan**:

1. **Fix N-count carryover** - Preserve PrincipleStore across iterations
2. **Implement cascading threshold** - 3→2→1 based on axiom yield
3. **Remove GreenfieldMode** - No modes needed
4. **Add research-backed guardrails** - Warnings only, no hard failures
5. **Validate and document** - Confirm autonomous behavior works

**Benefits**:
- Fully autonomous - no user configuration needed
- Adapts to data quality automatically
- Tier labels honestly reflect evidence strength
- Aligns with greenfield: "thresholds emerge, they aren't declared"

**Next Step**: ~~Draft revised plan.~~ **Done** - Plan revised (v3) with cascading thresholds.

---

## Cross-References

**Research**:
- [`docs/research/optimal-axiom-count.md`](../research/optimal-axiom-count.md) - Evidence-based axiom count limits

**Reviews**:
- [`docs/reviews/2026-02-09-axiom-emergence-bootstrap-codex.md`](../reviews/2026-02-09-axiom-emergence-bootstrap-codex.md)
- [`docs/reviews/2026-02-09-axiom-emergence-bootstrap-gemini.md`](../reviews/2026-02-09-axiom-emergence-bootstrap-gemini.md)

**Plan**:
- [`docs/plans/2026-02-09-axiom-emergence-bootstrap.md`](../plans/2026-02-09-axiom-emergence-bootstrap.md)

**Related Issues**:
- [`docs/issues/greenfield-bootstrap-mode-enforcement.md`](greenfield-bootstrap-mode-enforcement.md) - Validation fix (resolved)

**Implementation Files**:
- `src/lib/reflection-loop.ts` - Re-clustering, convergence detection
- `src/lib/compressor.ts` - Axiom promotion, LLM calls

---

*Issue created 2026-02-09 from consolidated code review findings*
