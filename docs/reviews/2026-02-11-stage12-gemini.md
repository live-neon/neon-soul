# Stage 12 Signal Source Classification Review - Gemini

**Date**: 2026-02-11
**Reviewer**: Gemini 2.5 Pro (gemini-25pro-validator)
**Files Reviewed**:
- `src/lib/signal-source-classifier.ts` (151 lines)
- `src/lib/signal-extractor.ts` (274 lines, Phase 4 integration)
- `src/types/signal.ts` (SignalElicitationType definition)
- `tests/integration/pbd-alignment.test.ts` (Stage 12 tests: lines 519-705)
- `tests/mocks/llm-mock.ts` (DEFAULT_ELICITATION_HINTS)
- `src/index.ts` (exports)

## Summary

The implementation is generally robust, with good defensive patterns like input sanitization, a self-healing retry loop, and safe defaults. The core logic for classification and weighting is internally consistent. However, a **critical architectural flaw** exists in the approach for detecting `consistent-across-context` signals, which cannot be reliably determined from a single conversation context.

## Findings

### Critical

**1. Architectural Flaw: `consistent-across-context` is Undeterminable**

- **File**: `src/lib/signal-source-classifier.ts`
- **Lines**: 90-123 (classifyElicitationType function)

The `classifyElicitationType` function attempts to classify a signal as `consistent-across-context` by analyzing a single `conversationContext` string. This is logically impossible. Determining if a behavior is "consistent across contexts" requires comparing it against a history of signals from *multiple, different, and independent* contexts. An LLM cannot make this determination from one isolated example.

This will lead to highly unreliable or purely speculative classifications for this category, undermining a key part of the identity synthesis logic (the 2.0 weight - highest of all types).

**Recommendation**: This classification should not be performed at the individual signal extraction level:
1. **Simplify Live Classification**: Remove `consistent-across-context` from real-time classification. Classify signals only as `agent-initiated`, `user-elicited`, or `context-dependent` during extraction.
2. **Introduce a Higher-Order Analysis Step**: Create a separate, later pipeline stage that analyzes the entire collection of extracted signals over time. This stage would have the necessary broader view to identify patterns that are truly consistent across different conversational contexts and upgrade their elicitation type accordingly.

**Alternative perspective**: The current approach assumes the LLM can infer consistency from linguistic markers within a single signal (e.g., "I always...", "Regardless of context..."). This may be the intended design - treating it as a claim about consistency rather than verified consistency. If so, this assumption should be documented explicitly.

### Important

**1. Inefficient API Design: tempSignal Creation**

- **Files**: `src/lib/signal-extractor.ts` (lines 207-214), `src/lib/signal-source-classifier.ts` (line 98)

In `signal-extractor.ts`, a temporary `Signal` object (`tempSignal`) is created solely to satisfy the signature of `classifyElicitationType`. However, the function itself only uses the `signal.text` property from that object. This makes the integration point awkward and the function's signature slightly misleading about its actual data requirements.

**Recommendation**: Refactor `classifyElicitationType` to accept signal text directly:

```typescript
// Current signature:
export async function classifyElicitationType(
  llm: LLMProvider | null | undefined,
  signal: Signal,
  conversationContext: string
): Promise<SignalElicitationType>

// Proposed signature:
export async function classifyElicitationType(
  llm: LLMProvider | null | undefined,
  signalText: string,
  conversationContext: string
): Promise<SignalElicitationType>
```

This would simplify the call site in `signal-extractor.ts`:
```typescript
classifyElicitationType(llm, candidate.text, signalSource.context),
```

### Minor

**1. Ambiguous Loop Variable Naming**

- **File**: `src/lib/signal-source-classifier.ts` (line 44, 104)

The constant `MAX_CLASSIFICATION_RETRIES = 2` combined with `attempt <= MAX_CLASSIFICATION_RETRIES` starting at 0 results in 3 total attempts. While the logic is correct, naming could be clearer.

**Recommendation**: Consider renaming to `MAX_ATTEMPTS = 3` for clarity:
```typescript
const MAX_ATTEMPTS = 3;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) { ... }
```

**2. Defensive Default May Mask Upstream Bugs**

- **File**: `src/lib/signal-source-classifier.ts` (line 147)

```typescript
const elicitationType = signal.elicitationType ?? 'user-elicited';
```

This is a good safeguard, but since `elicitationType` is assigned during signal extraction, a `Signal` object passed to this function should always have this property. Relying on a default could mask an upstream bug where the type isn't being assigned correctly.

**Recommendation**: Consider making `elicitationType` required in the Signal type after extraction phase, or add logging when the fallback is triggered.

## Test Coverage Analysis

The tests in `pbd-alignment.test.ts` (lines 519-705) cover:

| Test Case | Coverage |
|-----------|----------|
| classifies agent-initiated signals | Covered (lines 541-555) |
| classifies user-elicited signals | Covered (lines 557-571) |
| classifies context-dependent signals | Covered (lines 573-587) |
| classifies consistent-across-context signals | Covered (lines 589-603) |
| falls back to user-elicited on retry exhaustion | Covered (lines 605-613) |
| filters out context-dependent signals | Covered (lines 617-629) |
| preserves signals without elicitationType | Covered (lines 631-641) |
| correct weight values | Covered (lines 645-650) |
| calculates weighted signal count | Covered (lines 652-662) |
| defaults to user-elicited weight | Covered (lines 664-672) |
| throws LLMRequiredError when LLM is null | Covered (lines 693-704) |

**Gap**: No test verifies semantic correctness (e.g., that "Agent added caveat unprompted" actually classifies as `agent-initiated`). Tests verify type correctness only. This is documented at test file line 12-16.

## Answers to Review Questions

1. **Does classifyElicitationType() handle edge cases correctly?**
   - LLM failure: Yes (retry loop)
   - Invalid responses: Yes (corrective feedback)
   - null LLM: Yes (throws LLMRequiredError)
   - `consistent-across-context`: Architecturally flawed (see Critical finding)

2. **Is the retry loop implemented properly?**
   - Yes. Self-healing loop with corrective feedback works correctly.

3. **Are weights correct (2.0/1.5/0.5/0.0)?**
   - Yes. Logically sound and consistent with documented purpose.

4. **Is filterForIdentitySynthesis() filtering correctly?**
   - Yes. Correctly filters `context-dependent` signals.

5. **Is the integration with signal-extractor.ts clean?**
   - No. The tempSignal workaround is awkward (see Important finding).

6. **Do tests cover acceptance criteria from the plan?**
   - Type-wise: Yes
   - Semantically: No (mock LLM uses keyword matching, not semantic understanding)

## Raw Output

<details>
<summary>Full CLI output</summary>

Based on my review of the provided TypeScript code, here are the findings categorized by severity.

### Executive Summary

The implementation is generally robust, with good defensive patterns like input sanitization, a self-healing retry loop, and safe defaults. The core logic for classification and weighting is internally consistent.

However, a **critical architectural flaw** exists in the approach for detecting `consistent-across-context` signals, which cannot be reliably determined from a single conversation context. Additionally, there are opportunities to improve API design for better clarity and maintainability.

---

### **Critical Findings**

#### 1. Architectural Flaw: `consistent-across-context` is Undeterminable

*   **File**: `signal-source-classifier.ts`
*   **Severity**: Critical
*   **Description**: The `classifyElicitationType` function attempts to classify a signal as `consistent-across-context` by analyzing a single `conversationContext` string. This is logically impossible. Determining if a behavior is "consistent across contexts" requires comparing it against a history of signals from *multiple, different, and independent* contexts. An LLM cannot make this determination from one isolated example. This will lead to highly unreliable or purely speculative classifications for this category, undermining a key part of the identity synthesis logic.
*   **Recommendation**: This classification should not be performed at the individual signal extraction level. I recommend the following architectural change:
    1.  **Simplify Live Classification**: Remove the `consistent-across-context` category from `classifyElicitationType`. Classify signals only as `agent-initiated`, `user-elicited`, or `context-dependent` during the initial extraction.
    2.  **Introduce a Higher-Order Analysis Step**: Create a separate, later stage in your pipeline that analyzes the entire collection of extracted signals over time. This stage would have the necessary broader view to identify patterns that are truly consistent across different conversational contexts and upgrade their elicitation type accordingly.

---

### **Important Findings**

#### 1. Inefficient API Design for `classifyElicitationType`

*   **Files**: `signal-extractor.ts` (lines 5-13), `signal-source-classifier.ts` (line 110)
*   **Severity**: Important
*   **Description**: In `signal-extractor.ts`, a temporary `Signal` object (`tempSignal`) is created solely to satisfy the signature of `classifyElicitationType`. However, the function itself only uses the `signal.text` property from that object. This makes the integration point awkward and the function's signature slightly misleading about its actual data requirements.
*   **Recommendation**: Refactor `classifyElicitationType` to accept the signal text directly, improving clarity and simplifying the call site.

    **Current (in `signal-source-classifier.ts`):**
    ```typescript
    export async function classifyElicitationType(
      llm: LLMProvider | null | undefined,
      signal: Signal,
      conversationContext: string
    ): Promise<SignalElicitationType> {
      // ...
      const sanitizedSignal = sanitizeForPrompt(signal.text);
      // ...
    }
    ```

    **Proposed Change:**
    ```typescript
    export async function classifyElicitationType(
      llm: LLMProvider | null | undefined,
      signalText: string,
      conversationContext: string
    ): Promise<SignalElicitationType> {
      // ...
      const sanitizedSignal = sanitizeForPrompt(signalText);
      // ...
    }
    ```

    This would allow you to remove the `tempSignal` creation in `signal-extractor.ts` and call the function directly:
    ```typescript
    // In signal-extractor.ts
    classifyElicitationType(llm, candidate.text, signalSource.context),
    ```

---

### **Minor Findings**

#### 1. Ambiguous Loop Variable Name

*   **File**: `signal-source-classifier.ts` (line 62)
*   **Severity**: Minor
*   **Description**: The constant `MAX_CLASSIFICATION_RETRIES` is set to `2`, and the loop condition is `attempt <= MAX_CLASSIFICATION_RETRIES`. This results in one initial attempt and two retries (three total attempts). While the logic is correct, the naming can be ambiguous. "Max retries" could be interpreted as the total number of attempts *after* the first one fails.
*   **Recommendation**: For improved clarity, consider renaming the constant to reflect the total number of attempts.
    ```typescript
    // Suggestion
    const MAX_ATTEMPTS = 3;
    // ...
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // ...
    }
    ```

#### 2. Redundant Default Value in `calculateWeightedSignalCount`

*   **File**: `signal-source-classifier.ts` (line 154)
*   **Severity**: Minor
*   **Description**: The function `calculateWeightedSignalCount` defensively defaults `signal.elicitationType` to `'user-elicited'`. This is a good safeguard. However, since `elicitationType` is assigned during signal extraction, a `Signal` object passed to this function should ideally always have this property. Relying on a default here could mask an upstream bug where the type isn't being assigned correctly.
*   **Recommendation**: Ensure that the `Signal` type definition marks `elicitationType` as a required property after the extraction phase. The default can remain as a final safety net, but the type system should enforce its presence earlier.

---

### **Addressing Your Questions**

1.  **`classifyElicitationType()` edge cases?** It handles LLM failure and invalid responses well, but architecturally fails on the `consistent-across-context` case.
2.  **Retry loop implemented properly?** Yes, the self-healing loop with corrective feedback is implemented correctly.
3.  **Are weights correct?** The weights (2.0/1.5/0.5/0.0) are logically sound and consistent with the documented purpose of each elicitation type.
4.  **`filterForIdentitySynthesis()` filtering correctly?** Yes, it correctly and clearly filters out `context-dependent` signals.
5.  **Integration with `signal-extractor.ts` clean?** No, it could be cleaner. Creating a `tempSignal` is awkward (see **Important Finding #1**).
6.  **Any bugs, security issues, or architectural concerns?** The primary architectural concern is the flawed logic for `consistent-across-context` detection. No obvious security vulnerabilities are present, assuming `sanitizeForPrompt` is effective.

</details>
