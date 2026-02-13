# Stage 12 Signal Source Classification Code Review Findings

**Date**: 2026-02-11
**Status**: Resolved
**Priority**: High
**Plan**: [docs/plans/2026-02-10-pbd-alignment.md](../plans/2026-02-10-pbd-alignment.md) (Stage 12)

---

## Summary

External code review (N=2: Codex + Gemini) of the Stage 12 Signal Source Classification implementation identified 1 critical architectural issue, 2 important issues, and 4 minor improvements. All N=1 items have been manually verified to establish N=2 consensus.

---

## Source Reviews

- [docs/reviews/2026-02-11-stage12-codex.md](../reviews/2026-02-11-stage12-codex.md)
- [docs/reviews/2026-02-11-stage12-gemini.md](../reviews/2026-02-11-stage12-gemini.md)
- Scout context: `output/context/2026-02-11-stage12-code-review-context.md`

---

## Findings

### Critical

#### C-1: Insufficient Conversation Context for Classification

**Files**: `src/lib/signal-extractor.ts:199-224`, `src/lib/signal-source-classifier.ts:90-123`
**Consensus**: N=2 (Codex + Gemini)

**Issue**: Stage 12 was designed for conversation context analysis, but the integration passes only a 100-char single-line snippet (`signalSource.context`) instead of actual user/agent conversation turns.

```typescript
// signal-extractor.ts:202 - context is just the original line truncated
candidate.originalLine.slice(0, 100)

// signal-extractor.ts:224 - passed as "conversationContext"
classifyElicitationType(llm, tempSignal, signalSource.context),
```

**Impact**: Without actual conversation context (user's question, agent's preceding response), the classifier cannot meaningfully distinguish:
- "agent-initiated" (agent volunteered unprompted)
- "user-elicited" (direct response to user request)

Classification likely defaults to "user-elicited" (conservative fallback), losing the intended signal differentiation.

**Additionally** (Gemini): `consistent-across-context` is logically undeterminable from a single context - it requires comparing signals across *multiple independent contexts*.

**Options**:
1. **Document limitation** (recommended): Stage 12 classification is limited for memory file extraction; full classification requires live conversation or interview pipeline
2. **Defer classification**: Move elicitation classification to a later stage where conversation context exists
3. **Enrich context**: Store surrounding lines (N lines before/after) in SignalSource when extracting from memory files
4. **Reframe `consistent-across-context`**: Document that it detects *claims* about consistency (linguistic markers like "I always...") rather than *verified* consistency

---

### Important

#### I-1: Awkward API Design - tempSignal Creation

**Files**: `src/lib/signal-extractor.ts:207-214`, `src/lib/signal-source-classifier.ts:98`
**Consensus**: N=2 (Gemini + Manual verification)

**Issue**: A temporary `Signal` object is created solely to satisfy `classifyElicitationType`'s signature, but the function only uses `signal.text`.

```typescript
// signal-extractor.ts:207-214 - creates full Signal just for one property
const tempSignal = {
  id: '',
  type: 'value' as const,
  text: candidate.text,  // Only this is used
  confidence: 0,
  embedding: [],
  source: signalSource,
};

// signal-source-classifier.ts:98 - only uses .text
const sanitizedSignal = sanitizeForPrompt(signal.text);
```

**Fix**: Refactor to accept signal text directly:

```typescript
// Proposed signature
export async function classifyElicitationType(
  llm: LLMProvider | null | undefined,
  signalText: string,
  conversationContext: string
): Promise<SignalElicitationType>

// Simplified call site
classifyElicitationType(llm, candidate.text, signalSource.context),
```

---

#### I-2: Retry Loop Loses Self-Healing Benefit

**File**: `src/lib/signal-source-classifier.ts:116-117`
**Consensus**: N=2 (Codex + Manual verification)

**Issue**: When `result.category` is null but `result.reasoning` is also undefined, `previousResponse` remains undefined. Subsequent retry attempts use the exact same prompt (no corrective feedback).

```typescript
// Line 116-117: If reasoning is undefined, previousResponse stays undefined
previousResponse = result.reasoning?.slice(0, 50);
```

**Fix**: Store a sentinel value when reasoning is absent:

```typescript
previousResponse = result.reasoning?.slice(0, 50) ?? 'NO_VALID_RESPONSE';
```

---

### Minor

#### M-1: Unguarded Weight Lookup Can Produce NaN

**File**: `src/lib/signal-source-classifier.ts:147-148`
**Consensus**: N=2 (Codex + Gemini)

**Issue**: If a signal has an unexpected/legacy `elicitationType` string value not in the weight map (due to data migration), `weight` becomes `undefined`, and `sum + undefined` produces `NaN`.

```typescript
const elicitationType = signal.elicitationType ?? 'user-elicited';
const weight = ELICITATION_WEIGHT[elicitationType];  // Could be undefined
return sum + weight;  // NaN if undefined
```

**Fix**: Add fallback:

```typescript
const weight = ELICITATION_WEIGHT[elicitationType] ?? ELICITATION_WEIGHT['user-elicited'];
```

---

#### M-2: Ambiguous Loop Variable Naming

**File**: `src/lib/signal-source-classifier.ts:44, 104`
**Consensus**: N=2 (Gemini + Manual verification)

**Issue**: `MAX_CLASSIFICATION_RETRIES = 2` with `attempt <= MAX_CLASSIFICATION_RETRIES` starting at 0 results in 3 total attempts. "Max retries" could be interpreted as attempts *after* the first one fails.

**Fix**: Rename for clarity:

```typescript
const MAX_ATTEMPTS = 3;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) { ... }
```

---

#### M-3: Defensive Default May Mask Upstream Bugs

**File**: `src/lib/signal-source-classifier.ts:147`
**Consensus**: N=2 (Gemini + Manual verification)

**Issue**: `signal.elicitationType ?? 'user-elicited'` is a good safeguard, but since `elicitationType` is assigned during signal extraction, a `Signal` object passed to this function should always have this property. Relying on a default could mask an upstream bug.

**Fix**: Consider logging when fallback is triggered:

```typescript
const elicitationType = signal.elicitationType ?? (() => {
  logger.warn('[calculateWeightedSignalCount] Signal missing elicitationType, using default');
  return 'user-elicited';
})();
```

---

#### M-4: Test Coverage Gap - Semantic Correctness

**File**: `tests/integration/pbd-alignment.test.ts:541-672`
**Consensus**: N=2 (Codex + Gemini)

**Issue**: Tests verify type correctness (results are valid categories) but not semantic correctness (e.g., that "Agent added caveat unprompted" actually classifies as `agent-initiated`). The mock LLM uses keyword matching, not semantic understanding.

**Note**: This is documented at test file lines 12-16 as a known limitation. No immediate fix required, but consider adding integration tests with real LLM marked as slow/optional.

---

## Action Items

| ID | Priority | Issue | Status |
|----|----------|-------|--------|
| C-1 | **Critical** | Document context limitation | ✅ resolved |
| I-1 | Important | Simplify API to accept signalText | ✅ resolved |
| I-2 | Important | Add sentinel for retry loop | ✅ resolved |
| M-1 | Minor | Add fallback for weight lookup | ✅ resolved |
| M-2 | Minor | Rename MAX_CLASSIFICATION_RETRIES | ✅ resolved |
| M-3 | Minor | Add logging for fallback trigger | ✅ resolved |
| M-4 | Minor | Document test semantic coverage gap | ✅ resolved |

---

## What Works Well (Both Reviewers Agreed)

- Input sanitization prevents prompt injection (escaping, truncation, explicit ignore instructions)
- Self-healing retry loop with corrective feedback pattern is sound
- Conservative default (`user-elicited`) when classification fails
- Clear weight values with documented rationale (2.0/1.5/0.5/0.0)
- Explicit filtering (I-5 FIX) is more readable than zero-weight multiplication
- Good test coverage for type correctness
- 320 tests passing, type check passes

---

## Cross-References

- **Plan**: [docs/plans/2026-02-10-pbd-alignment.md](../plans/2026-02-10-pbd-alignment.md) (Stage 12: lines 978-1099)
- **Prior Stages Review**: [2026-02-11-pbd-alignment-stages1-11-code-review-findings.md](2026-02-11-pbd-alignment-stages1-11-code-review-findings.md) (resolved)
- **Session Transfer**: `output/context/2026-02-11-session-xfer.md`
- **Implementation Commit**: `2e08344` feat(neon-soul): add signal elicitation type classification for identity validity

---

## Notes

All N=1 items from external reviewers were manually verified to establish N=2 consensus:

| Finding | Original | Verification |
|---------|----------|--------------|
| tempSignal API awkwardness | Gemini | Manual: Confirmed only `signal.text` used |
| Retry loop loses benefit | Codex | Manual: Confirmed `previousResponse` stays undefined |
| MAX_CLASSIFICATION_RETRIES naming | Gemini | Manual: Confirmed 3 attempts with "2 retries" naming |
| Weight lookup NaN risk | Codex | Manual: TypeScript catches at compile, but runtime data could bypass |

The critical architectural issue (C-1) is fundamental to Stage 12's design. Options should be discussed before proceeding with Stages 13+.
