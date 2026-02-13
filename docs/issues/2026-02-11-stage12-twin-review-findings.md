# Stage 12 Signal Source Classification Twin Review Findings

**Date**: 2026-02-11
**Status**: Resolved
**Priority**: Medium
**Plan**: [docs/plans/2026-02-10-pbd-alignment.md](../plans/2026-02-10-pbd-alignment.md) (Stage 12)

---

## Summary

Twin review (N=2: Technical + Creative) of Stage 12 implementation identified 2 important issues, 4 minor improvements, and several philosophical observations. Both twins approved the implementation. All N=1 items verified to establish N=2 consensus.

---

## Source Reviews

- [docs/reviews/2026-02-11-stage12-twin-technical.md](../../docs/reviews/2026-02-11-stage12-twin-technical.md)
- [docs/reviews/2026-02-11-stage12-twin-creative.md](../../docs/reviews/2026-02-11-stage12-twin-creative.md)

---

## Findings

### Important

#### I-1: Weight System Rationale Not Documented

**Consensus**: N=2 (Technical + Creative)

**File**: `src/lib/signal-source-classifier.ts:44-50`

**Issue**: The weight values (2.0, 1.5, 0.5, 0.0) are hardcoded with inline comments describing WHAT but not WHY.

```typescript
export const ELICITATION_WEIGHT: Record<SignalElicitationType, number> = {
  'consistent-across-context': 2.0, // Strongest identity signal
  'agent-initiated': 1.5,           // Strong - agent chose this
  'user-elicited': 0.5,             // Weak - expected behavior
  'context-dependent': 0.0,         // Exclude - not identity
};
```

**Questions**:
- Why is consistent-across-context 4x more valuable than user-elicited?
- Are these values evidence-based or heuristic?
- Should weights be tunable per use case?

**Recommendation**: Add documentation comment explaining:
1. The scale origin (heuristic starting point, to be tuned empirically)
2. The rationale for relative magnitudes
3. Guidance for when weights might need adjustment

---

#### I-2: Test Semantic Validation Gap Not Tracked

**Consensus**: N=2 (Technical + Creative)

**File**: `tests/integration/pbd-alignment.test.ts:13-22`

**Issue**: The M-4 documentation fix acknowledges semantic coverage gaps but doesn't create a tracking mechanism. The mock LLM uses keyword matching, not semantic understanding, so tests cannot verify that:
- "Agent added caveat unprompted" → `agent-initiated`
- "Being helpful when asked" → `user-elicited`

**Recommendation**: Create one of:
1. A `tests/integration/pbd-semantic.test.ts` file with `describe.skip()` or `it.todo()` placeholders
2. A tracking issue specifically for semantic validation tests
3. A `// TODO(semantic-validation):` comment linking to this issue

---

### Minor

#### M-1: Redundant sanitizeForPrompt Definitions

**Consensus**: N=2 (Technical + Manual verification)

**Issue**: `sanitizeForPrompt` is defined in THREE locations:

| File | Line | Exported |
|------|------|----------|
| `generalization-helpers.ts` | 24 | Yes |
| `semantic-classifier.ts` | 48 | Yes |
| `signal-extractor.ts` | 57 | No (local) |

All three have identical implementation. This creates maintenance burden and potential for drift.

**Recommendation**: Export from ONE canonical location (suggest `semantic-classifier.ts` as it's already widely imported) and remove duplicates.

---

#### M-2: ELICITATION_CATEGORIES Duplicates Type Definition

**Consensus**: N=2 (Technical + Manual verification)

**File**: `src/lib/signal-source-classifier.ts:55-60`

**Issue**: The categories array manually duplicates the type definition:

```typescript
// signal.ts:24-28
export type SignalElicitationType =
  | 'agent-initiated'
  | 'user-elicited'
  | 'context-dependent'
  | 'consistent-across-context';

// signal-source-classifier.ts:55-60
const ELICITATION_CATEGORIES = [
  'agent-initiated',
  'user-elicited',
  'context-dependent',
  'consistent-across-context',
] as const;
```

If the type changes, the array must be updated manually.

**Note**: TypeScript cannot derive arrays from union types without runtime cost, so this may be intentional. Consider adding a comment documenting the intentional duplication.

---

#### M-3: Add C-1 Limitation to ARCHITECTURE.md

**Consensus**: N=2 (Technical implied + Creative explicit)

**Issue**: The C-1 context limitation is documented in the module header but not in ARCHITECTURE.md where users learn about PBD alignment features.

**File**: `docs/ARCHITECTURE.md` - Signal Metadata section

**Recommendation**: Add a brief note about the context limitation:
```markdown
**Known Limitation**: For memory file extraction, elicitation type classification relies on
linguistic markers (~100-char context) rather than full conversation turns. See C-1 in
`signal-source-classifier.ts` for details.
```

---

#### M-4: Consider "Usage-Biased" vs "False Soul" Terminology

**Consensus**: N=2 (Creative explicit + Technical implied)

**Issue**: The "false soul" metaphor implies deception when the reality is more nuanced:
- "False soul" suggests the identity is *lying* about who the agent is
- "Usage-biased soul" more accurately describes that identity reflects usage patterns

**Scope**: Documentation only, not code changes.

**Recommendation**: In future documentation (not immediate), consider softening language:
- "false soul problem" → "usage-bias problem" or "context-bias problem"
- "false identity" → "usage-reflective identity"

---

### MCE Warnings (Tracked Separately)

| File | Lines | Limit | Status |
|------|-------|-------|--------|
| `signal-extractor.ts` | 264 | 200 | WARN |
| `signal.ts` | 194 | 50 (types) | WARN |

These are existing technical debt items, not Stage 12-specific.

---

## Philosophical Observations (Not Action Items)

Both twins noted philosophical observations that inform future work but don't require immediate action:

1. **Identity vs Competence**: An agent being helpful when asked is doing its job, not revealing identity. The implementation correctly weights this lower.

2. **"Volunteering" for AI**: The implementation correctly uses observable behavior (did the user ask?) rather than inferred motivation (did the agent "want" to say this?).

3. **Missing Authenticity Dimensions**: Stage 12 captures elicitation but not temporal consistency, resistance to pressure, or coherence with behavior. These are appropriately out of scope.

4. **`consistent-across-context` as Claims**: The module correctly documents that it detects CLAIMS about consistency ("I always...") not VERIFIED cross-context consistency.

---

## Action Items

| ID | Priority | Issue | Status |
|----|----------|-------|--------|
| I-1 | Important | Document weight system rationale | ✅ Resolved |
| I-2 | Important | Track semantic validation gap | ✅ Resolved |
| M-1 | Minor | Consolidate sanitizeForPrompt | ✅ Resolved |
| M-2 | Minor | Document ELICITATION_CATEGORIES duplication | ✅ Resolved |
| M-3 | Minor | Add C-1 to ARCHITECTURE.md | ✅ Resolved |
| M-4 | Minor | Consider terminology in future docs | ✅ Resolved |

---

## Cross-References

- **Plan**: [docs/plans/2026-02-10-pbd-alignment.md](../plans/2026-02-10-pbd-alignment.md) (Stage 12: lines 978-1099)
- **Code Review Findings**: [2026-02-11-stage12-code-review-findings.md](2026-02-11-stage12-code-review-findings.md) (resolved)
- **Implementation Commit**: `2e08344` feat(neon-soul): add signal elicitation type classification

---

## Notes

All N=1 items from twin reviews were manually verified to establish N=2 consensus:

| Finding | Original | Verification |
|---------|----------|--------------|
| sanitizeForPrompt duplication | Technical | ✅ Found 3 definitions via grep |
| ELICITATION_CATEGORIES duplication | Technical | ✅ Confirmed type and array match |
| Terminology suggestion | Creative | ✅ Aligns with honest documentation goal |

Both twins approved the implementation. These findings are improvements, not blockers.
