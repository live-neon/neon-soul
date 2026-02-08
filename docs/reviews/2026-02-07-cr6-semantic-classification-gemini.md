# CR-6 Semantic Classification Refactor Review - Gemini

**Date**: 2026-02-07
**Reviewer**: gemini-2.5-pro (via gemini CLI)
**Files Reviewed**: 15 files (see context file for full list)
**Focus**: Code quality, bugs, security, architecture

## Summary

The CR-6 implementation successfully replaces keyword matching with LLM-based semantic classification following Option C (throw error if LLM not provided). The architecture is clean with proper separation between the LLM interface, semantic classifier module, and consumers. However, there is one severe performance issue that would be a blocker for production use, plus several important design concerns.

## Findings

### Critical

**[signal-extractor.ts:160-204] Sequential LLM calls in loop - Performance Blocker**

The `extractSignalsFromContent` function makes multiple sequential (awaited) LLM calls inside a `for` loop that iterates over every line:

```
for each line:
  await isIdentitySignal(llm, text)      // LLM call 1
  if signal:
    await semanticClassifyDimension(llm, text)  // LLM call 2
    await semanticClassifySignalType(llm, text) // LLM call 3
```

For a 100-line file, this could result in 200-300 sequential API calls taking many minutes. This is a production blocker.

**Suggested approaches**:
1. **Batching**: Process lines in parallel batches using `Promise.all`
2. **Prompt Engineering**: Create a single prompt that returns all information (isSignal, dimension, signalType) in one structured response
3. **Combined batch**: Process entire batch of lines in one LLM call

### Important

**[llm-mock.ts:144-163] Mock uses keyword matching - Undermines semantic testing**

The mock LLM implementation uses `lowerText.includes(keyword)` for inference, which fundamentally undermines testing a semantic classification system. Tests pass/fail based on keyword presence, not semantic understanding.

This means:
- Tests don't validate real LLM behavior
- Tests are brittle to prompt wording changes
- A real LLM could correctly classify text without the keyword, yet test fails

**Suggestion**: Consider snapshot/cassette testing where real LLM responses for fixed inputs are recorded and replayed.

---

**[semantic-classifier.ts:193] Silent fallback hides LLM contract violations**

```typescript
return CJK_ANCHORS[result.category] ?? '理';  // Fallback on unknown
return EMOJI_VOCABULARY[result.category] ?? '📌';  // Same pattern
```

If `llm.classify` returns a category not in the canonical vocabulary, the fallback silently produces potentially incorrect data. The LLM provider contract should guarantee returning only from the provided `categories` array.

**Suggestion**: Remove fallbacks; enforce strict contract. If LLM returns invalid category, throw error to make misbehavior obvious.

---

**[types/llm.ts] LLMProvider interface lacks batch support**

Given the performance issue, the interface could be extended to encourage efficient use:

```typescript
interface LLMProvider {
  classify<T>(...): Promise<ClassificationResult<T>>;
  classifyBatch?<T>(...): Promise<ClassificationResult<T>[]>;  // Optional batch
}
```

### Minor

**[signal-extractor.ts:160] Index-based loop less readable**

```typescript
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]?.trim() ?? '';
```

Could be simplified to:
```typescript
for (const rawLine of lines) {
  const line = rawLine.trim();
```

---

**[signal-extractor.ts:183] Hardcoded confidence threshold**

The `confidence >= 0.5` threshold is hardcoded. Should be configurable or documented how it was determined.

---

**[compressor.ts:30-57] generateMathNotation still uses keyword matching**

The `generateMathNotation` function still uses `.includes()` for patterns like "over", "before", "not", "and", "or". This appears to be intentional (for notation generation, not semantic classification), but should be verified against the "no keyword matching" constraint.

## Design Questions

1. **LLMProvider contract**: What is expected behavior if LLM cannot confidently classify into given categories? Should it throw, or return low confidence? Current implementation assumes valid category always returned.

2. **Option C strictness**: Is there any scenario where keyword-based fallback might be desirable for simple operations, or is LLM-only for all classification tasks moving forward?

3. **Confidence threshold calibration**: How was 0.5 threshold determined? Plan for real-world calibration?

## Alternative Framing

The overall approach is sound - replacing brittle keyword matching with semantic LLM classification is the right direction. However:

**Assumption to question**: Processing line-by-line may not be the right granularity. Memory files are likely structured documents where context matters. Consider:
- Processing by section/paragraph rather than line
- Providing surrounding context in classification prompts
- Using embeddings for initial filtering, LLM for final classification only

This would improve both performance (fewer LLM calls) and accuracy (more context per classification).

## Verification Summary

| Question | Finding |
|----------|---------|
| LLMProvider interface design | Good, but lacks batch support |
| Error handling (LLMRequiredError) | Robust at entry points; silent fallbacks in classifier |
| Race conditions / async issues | Sequential processing is safe but slow |
| semantic-classifier module design | Well-structured, proper separation |
| Test mock adequacy | Keyword-based mock undermines semantic testing |

## Raw Output

<details>
<summary>Full CLI output</summary>

Excellent, I've reviewed the provided code for the semantic classification refactor. Here is my assessment, broken down by severity.

### 1. Critical Issues

There are no bugs that I would classify as immediately critical (e.g., guaranteed to crash or produce incorrect data on every run). However, the following performance issue is severe enough to be a blocker for any real-world use.

*   **File**: `src/lib/signal-extractor.ts`
*   **Location**: `extractSignalsFromContent` function
*   **Issue**: The function makes multiple sequential (awaited) LLM calls inside a `for` loop that iterates over the lines of a file (`isIdentitySignal`, `semanticClassifyDimension`, etc.). This will result in extremely poor performance, as each line will trigger several independent network round-trips. For a file with 100 lines, this could easily result in 200-300 sequential API calls, taking many minutes to complete.
*   **Suggestion**: This process should be re-architected. Consider one of two approaches:
    1.  **Batching**: Process lines in parallel batches using `Promise.all`. This would be a moderate improvement.
    2.  **Prompt Engineering**: Create a single, more complex prompt that instructs the LLM to analyze a single line and return all the required information (isSignal, dimension, signalType) in a single structured response (e.g., JSON). This would reduce N calls per line to 1 call per line. An even more advanced version could process an entire batch of lines in one call.

### 2. Important Issues

These are significant architectural and design concerns that should be addressed.

*   **File**: `tests/mocks/llm-mock.ts`
*   **Location**: `inferCategory` function
*   **Issue**: The mock LLM implementation relies on simple keyword matching (`lowerText.includes(keyword)`). This fundamentally undermines the purpose of testing a **semantic** classification system. The tests will pass or fail based on the presence of specific keywords, not on semantic understanding. This means the tests do not accurately validate the behavior of a real LLM and are brittle. A real LLM could correctly classify text without the keyword, yet the test would fail.
*   **Suggestion**: While testing LLMs is hard, a better approach is needed. Consider using a snapshot-based or "cassette" testing model where real LLM responses for a fixed set of inputs are recorded and replayed during tests. This ensures the tests are validating against realistic, semantically-driven outputs.

*   **File**: `src/lib/semantic-classifier.ts`
*   **Location**: `mapToCJKAnchor` function
*   **Issue**: The function includes a fallback (`?? '理'`). This implies that `llm.classify` might return a `result.category` that is not a key in `CJK_ANCHORS`. However, the `categories` option is passed to the LLM, which should constrain its output. If the LLM provider returns a value outside the specified categories, this fallback will hide the error silently, potentially leading to incorrect data. The contract of `LLMProvider.classify` is not explicitly defined to be this strict.
*   **Suggestion**: The contract for `LLMProvider` should be clarified. It should be required to *only* return a value from the `categories` array. If it can't, it should throw a specific error. The fallback should be removed in favor of stricter error handling to make provider misbehavior obvious.

### 3. Minor Issues

These are smaller items related to code style and potential improvements.

*   **File**: `src/types/llm.ts`
*   **Location**: `LLMProvider` interface
*   **Issue**: The current interface only supports classifying a single prompt at a time. Given the performance issue in `signal-extractor.ts`, the interface itself could be extended to encourage more efficient use.
*   **Suggestion**: Consider adding an optional `classifyBatch` method to the `LLMProvider` interface to make batch processing a first-class feature of the abstraction.

*   **File**: `src/lib/signal-extractor.ts`
*   **Location**: `extractSignalsFromContent` function
*   **Issue**: The line processing loop can be written more cleanly. The expression `lines[i]?.trim() ?? ''` is slightly redundant.
*   **Suggestion**: Use a `for...of` loop for better readability and safety, which avoids manual index management.

### 4. Questions

*   **Regarding `LLMRequiredError`**: The design correctly implements "Option C" by throwing an error if the LLM is missing. Is there any scenario where a non-LLM, keyword-based fallback might be desirable for certain simple operations, or is the intention to be LLM-only for all classification tasks moving forward?
*   **Regarding `LLMProvider` contract**: As mentioned in the "Important Issues," what is the expected behavior of an `LLMProvider` implementation if it cannot confidently classify the prompt into one of the given `categories`? Should it throw an error, or return a result with very low confidence? Defining this will be crucial for robust error handling.
*   **Regarding Confidence Scores**: The `isIdentitySignal` function uses a `confidence >= 0.5` threshold. How was this threshold determined? Is there a plan to make this configurable or to calibrate it based on real-world performance evaluation?

</details>
