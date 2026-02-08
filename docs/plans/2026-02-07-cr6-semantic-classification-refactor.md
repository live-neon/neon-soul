---
created: 2026-02-07
type: implementation-plan
status: Complete
language: typescript
code_examples: forbidden
review_principles: |
  1. No Code: Do NOT add code examples. Plans describe WHAT/WHY, not HOW.
  2. No Hardcoding: Do NOT add values that depend on implementation.
  3. Suggest Intent: File paths, interfaces, acceptance criteria instead.
  4. Flag, Don't Fix: If plan has code, flag for removal.
proposal: docs/proposals/soul-bootstrap-pipeline-proposal.md
issue: docs/issues/neon-soul-implementation-code-review-findings.md#CR-6
trigger: think harder
---

# Plan: CR-6 Semantic Classification Refactor

## Problem Statement

The proposal explicitly requires: "Implementation MUST be language-agnostic using semantic matching/similarity (embeddings + cosine similarity). NO regex, string contains, or keyword matching."

Currently, 6 files use keyword matching (`.includes()`) for semantic classification, violating this CRITICAL CONSTRAINT.

**Root cause**: Early implementation used keyword matching as a quick solution for dimension inference and signal detection, with the intent to replace it later. This technical debt was never addressed.

**Solution**: Create a new `semantic-classifier.ts` module that provides LLM-based classification for all semantic categorization tasks, replacing all keyword matching throughout the codebase.

## Proposed Solution

Implement a two-track semantic architecture:

1. **Track 1 (Similarity)**: Already exists in `matcher.ts` - embeddings + cosine similarity for matching signals to principles (keep as-is)

2. **Track 2 (Classification)**: New `semantic-classifier.ts` - LLM-required classification for dimension, signal type, section type, CJK anchor, and emoji mapping

**Design decision**: Option C fallback - throw error if LLM not provided. No degraded fallback to keywords.

**Note**: This plan follows the no-code pattern - file paths and acceptance criteria only.

---

## Stages

### Stage 0: Verify Current State

**Purpose**: Confirm assumptions and map all keyword matching locations

**Files to check**:
- `src/lib/principle-store.ts` - Verify `inferDimension()` at lines 65-115
- `src/lib/metrics.ts` - Verify `inferDimensionFromSignal()` at lines 81-104
- `src/lib/signal-extractor.ts` - Verify `signalKeywords` at lines 201-229
- `src/lib/template-extractor.ts` - Verify section detection at lines 81-146
- `src/lib/compressor.ts` - Verify `generateCJKAnchor()` and `generateEmoji()` at lines 51-119
- `src/lib/memory-extraction-config.ts` - Verify `inferDimension()` at lines 330-377

**Acceptance Criteria**:
- [ ] All 6 files confirmed to use keyword matching
- [ ] No additional files with keyword matching discovered
- [ ] Existing `classifyDimension()` in signal-extractor.ts confirmed to use embeddings correctly

**Commit**: `chore(neon-soul): verify CR-6 keyword matching locations`

---

### Stage 1: Create LLM Provider Interface

**File(s)**: `src/types/llm.ts` (new)

**Purpose**: Define the LLM provider interface that classification functions require

**Changes**:
- Define `LLMProvider` interface with `classify()` method
- Define `ClassificationResult` type for structured responses
- Define error types for missing LLM provider
- Export types for use by semantic-classifier and consumers

**Interface design notes**:
- `classify(prompt: string, schema: ZodSchema)` - Returns typed result matching schema
- Zod schema parameter allows type-safe JSON parsing of LLM responses
- Provider is responsible for retry/error handling internally

**Acceptance Criteria**:
- [ ] `LLMProvider` interface exported
- [ ] `ClassificationResult` type covers dimension, signal type, section type, CJK, emoji
- [ ] `LLMRequiredError` class defined for Option C fallback
- [ ] TypeScript compiles without errors

**Commit**: `feat(neon-soul): add LLM provider interface for semantic classification`

---

### Stage 2: Create Semantic Classifier Module

**File(s)**: `src/lib/semantic-classifier.ts` (new)

**Purpose**: Central module for all LLM-based semantic classification

**Changes**:
- Create classification functions that require LLM provider as first argument
- Implement `classifyDimension(llm, text)` returning `SoulCraftDimension`
- Implement `classifySignalType(llm, text)` returning `SignalType`
- Implement `classifySectionType(llm, title, content)` returning section category
- Implement `mapToCJKAnchor(llm, principleText)` returning CJK character
- Implement `mapToEmoji(llm, principleText)` returning emoji
- Implement `classifyCategory(llm, text)` returning `MemoryCategory`
- All functions throw `LLMRequiredError` if llm is null/undefined

**Prompt design notes**:
- Dimension classification: Provide the 7 SoulCraft dimensions with descriptions
- Signal type classification: Provide the 10 signal types with examples
- CJK/emoji mapping: Provide the canonical vocabulary and ask LLM to select best match
- Include "unknown" fallback for edge cases

**Acceptance Criteria**:
- [ ] All 6 classification functions implemented
- [ ] Each function throws `LLMRequiredError` if LLM not provided
- [ ] Functions are pure (no side effects, no caching)
- [ ] Unit tests with mock LLM provider pass
- [ ] TypeScript compiles without errors

**Commit**: `feat(neon-soul): add semantic-classifier module with LLM-required classification`

---

### Stage 3: Refactor principle-store.ts

**File(s)**: `src/lib/principle-store.ts`

**Purpose**: Replace `inferDimension()` keyword matching with semantic classification

**Changes**:
- Add `llm` parameter to `createPrincipleStore()` function signature
- Replace `inferDimension(text)` calls with `classifyDimension(llm, text)`
- Import `classifyDimension` from semantic-classifier
- Update `addSignal()` to use the LLM provider
- Update function signatures to be async (LLM calls are async)

**Migration notes**:
- `addSignal` becomes async: `async addSignal(signal, dimension?)`
- Callers must be updated to await the result
- If dimension is provided as argument, skip classification (optimization)

**Acceptance Criteria**:
- [ ] No `.includes()` keyword matching in file
- [ ] `createPrincipleStore()` requires LLM provider parameter
- [ ] Existing tests updated to provide mock LLM
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass with mock LLM

**Commit**: `refactor(neon-soul): replace keyword matching in principle-store with LLM classification`

---

### Stage 4: Refactor metrics.ts

**File(s)**: `src/lib/metrics.ts`

**Purpose**: Remove duplicate `inferDimensionFromSignal()` and use semantic-classifier

**Changes**:
- Remove `inferDimensionFromSignal()` function entirely (lines 81-104)
- Use signal's existing `dimension` field (already set by signal-extractor)
- If signal lacks dimension, use `classifyDimension()` from semantic-classifier
- Add `llm` parameter to `calculateDimensionCoverage()` function
- Update function signature to async

**Design notes**:
- Signals should already have dimension set during extraction
- This function should primarily read existing dimensions, not re-classify
- LLM classification only needed as fallback for legacy signals without dimension

**Acceptance Criteria**:
- [ ] `inferDimensionFromSignal()` function removed
- [ ] No `.includes()` keyword matching in file
- [ ] `calculateDimensionCoverage()` uses signal's existing dimension field
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass

**Commit**: `refactor(neon-soul): remove duplicate dimension inference from metrics`

---

### Stage 5: Refactor signal-extractor.ts

**File(s)**: `src/lib/signal-extractor.ts`

**Purpose**: Replace `signalKeywords` array with semantic signal detection

**Changes**:
- Remove `signalKeywords` constant (lines 201-205)
- Add `llm` parameter to `extractSignalsFromContent()` function
- Replace keyword-based signal detection with LLM-based classification
- Use `classifySignalType()` from semantic-classifier (already using embeddings for dimension)
- Update `extractSignalsFromMemoryFiles()` to pass LLM provider

**Signal detection approach**:
- Instead of keywords, ask LLM "Is this line an identity signal?" with yes/no + confidence
- LLM can understand semantic intent, not just keyword presence
- "Prefer concise responses" matches even without keyword "prefer"

**Acceptance Criteria**:
- [ ] `signalKeywords` constant removed
- [ ] No `.includes()` keyword matching for signal detection
- [ ] `extractSignalsFromContent()` requires LLM provider parameter
- [ ] Signal type classification uses semantic-classifier
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass with mock LLM

**Commit**: `refactor(neon-soul): replace keyword-based signal detection with LLM classification`

---

### Stage 6: Refactor template-extractor.ts

**File(s)**: `src/lib/template-extractor.ts`

**Purpose**: Replace section type detection keywords with LLM classification

**Changes**:
- Add `llm` parameter to `extractSectionSignals()` function
- Replace `normalizedTitle.includes('core')` etc. with LLM section classification
- Add `classifySectionType()` call from semantic-classifier
- Update `extractFromTemplate()` to accept and pass LLM provider
- Update `extractFromTemplates()` to accept LLM provider

**Section type categories**:
- core-truths (values, beliefs)
- boundaries (limits, constraints)
- vibe-tone (communication style)
- examples (good/bad patterns)
- other (unknown sections)

**Acceptance Criteria**:
- [ ] No `.includes()` keyword matching for section detection
- [ ] `extractFromTemplate()` requires LLM provider parameter
- [ ] Section type determined by LLM, not keywords
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass with mock LLM

**Commit**: `refactor(neon-soul): replace section type keywords with LLM classification`

---

### Stage 7: Refactor compressor.ts

**File(s)**: `src/lib/compressor.ts`

**Purpose**: Replace CJK anchor and emoji keyword mapping with LLM classification

**Changes**:
- Add `llm` parameter to `synthesizeAxiom()` function
- Replace `generateCJKAnchor()` keyword lookup with `mapToCJKAnchor()` from semantic-classifier
- Replace `generateEmoji()` keyword lookup with `mapToEmoji()` from semantic-classifier
- Update `compressPrinciples()` to accept and pass LLM provider
- Keep `CJK_ANCHORS` and emoji vocabulary as reference data for LLM prompts

**Design notes**:
- LLM selects from canonical CJK/emoji vocabulary (not free-form generation)
- Prompt includes vocabulary options and asks for best semantic match
- This is still constrained selection, just LLM-guided instead of keyword-based

**Acceptance Criteria**:
- [ ] `generateCJKAnchor()` removed or refactored to use LLM
- [ ] `generateEmoji()` removed or refactored to use LLM
- [ ] No `.includes()` keyword matching in file
- [ ] `compressPrinciples()` requires LLM provider parameter
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass with mock LLM

**Commit**: `refactor(neon-soul): replace CJK/emoji keyword mapping with LLM classification`

---

### Stage 8: Refactor memory-extraction-config.ts

**File(s)**: `src/lib/memory-extraction-config.ts`

**Purpose**: Replace category inference keywords with LLM classification

**Changes**:
- Remove `inferDimension()` function (lines 330-377)
- Add `llm` parameter to `extractFromSections()` function
- Replace section title keyword matching with LLM section classification
- Update `extractSignalsFromMemory()` to accept and pass LLM provider
- Update `batchExtractSignals()` to accept LLM provider

**Pattern notes**:
- Section titles like "I Prefer", "Boundaries", "Goals" should be classified semantically
- "My Favorites" and "Things I Like" should both map to preferences
- LLM understands synonyms and variations that keywords miss

**Acceptance Criteria**:
- [ ] `inferDimension()` function removed
- [ ] No `.includes()` keyword matching for section classification
- [ ] `extractSignalsFromMemory()` requires LLM provider parameter
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass with mock LLM

**Commit**: `refactor(neon-soul): replace memory extraction keywords with LLM classification`

---

### Stage 9: Update Pipeline and Entry Points

**File(s)**:
- `src/lib/pipeline.ts`
- `src/commands/*.ts` (affected commands)

**Purpose**: Thread LLM provider through the pipeline to all classification points

**Changes**:
- Add `llm` field to `PipelineOptions` interface
- Update pipeline stages that use refactored modules to pass LLM provider
- Update command handlers to accept LLM provider from OpenClaw skill context
- Add validation: throw `LLMRequiredError` at pipeline entry if LLM not provided

**Entry point pattern**:
- OpenClaw skill provides LLM via skill context
- Commands extract LLM from context and pass to pipeline
- Pipeline passes to all stages
- No global/singleton LLM state

**Acceptance Criteria**:
- [ ] `PipelineOptions` includes `llm: LLMProvider` field
- [ ] Pipeline validates LLM presence at entry
- [ ] All affected commands updated
- [ ] Integration tests pass with mock LLM
- [ ] TypeScript compiles without errors

**Commit**: `feat(neon-soul): thread LLM provider through pipeline`

---

### Stage 10: Update Tests

**File(s)**:
- `tests/unit/*.test.ts`
- `tests/integration/*.test.ts`
- `tests/e2e/*.test.ts`

**Purpose**: Update all tests to provide mock LLM and verify semantic classification

**Changes**:
- Create `tests/mocks/llm-mock.ts` with deterministic mock responses
- Update unit tests for all refactored modules to use mock LLM
- Update integration tests to use mock LLM
- Add specific tests for LLMRequiredError when LLM not provided
- Add tests verifying semantic equivalence (e.g., "be concise" and "prefer brevity" classify same)

**Mock LLM design**:
- Deterministic responses for reproducible tests
- Configurable response map for different test scenarios
- Fast (no actual LLM calls)

**Acceptance Criteria**:
- [ ] Mock LLM provider created and exported
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Tests verify LLMRequiredError is thrown when expected
- [ ] No test failures

**Commit**: `test(neon-soul): update tests for semantic classification refactor`

---

### Stage 11: Verify CRITICAL CONSTRAINT Compliance

**Purpose**: Final verification that no keyword matching remains in semantic classification paths

**Files to verify**:
- All files in `src/lib/*.ts`
- All files in `src/commands/*.ts`

**Verification method**:
- Search for `.includes(` in all TypeScript files
- Review each occurrence to confirm it's not semantic classification
- Allowed uses: path matching, error messages, non-semantic checks

**Acceptance Criteria**:
- [ ] No `.includes()` calls in semantic classification code paths
- [ ] All classification flows through semantic-classifier.ts
- [ ] All classification requires LLM provider
- [ ] Manual review confirms proposal CRITICAL CONSTRAINT satisfied

**Commit**: `docs(neon-soul): verify CR-6 CRITICAL CONSTRAINT compliance`

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert to previous commit using git
2. **LLM unavailable**: Cannot gracefully degrade - system requires LLM (by design)
3. **Performance issues**: Add caching layer for repeated classifications (new Stage)
4. **Accuracy issues**: Tune prompts in semantic-classifier.ts without architecture changes

**Rollback triggers**:
- LLM response latency > 2s average
- Classification accuracy < 90% on validation set
- Integration test failures in production

**Mitigation for LLM dependency**:
- Document LLM requirement clearly in README
- Add health check endpoint that verifies LLM connectivity
- Consider future Stage: optional embedding-only fallback for dimension classification only (not other classification types)

---

## Success Criteria

1. Zero `.includes()` calls in semantic classification paths
2. All classification functions require LLM provider (no silent fallback)
3. "be concise" and "prefer brevity" classify to same dimension (semantic equivalence)
4. All existing tests pass with mock LLM
5. TypeScript compiles without errors
6. CR-6 issue can be marked resolved

## Effort Estimate

- Stage 0: 15 min (verification)
- Stage 1: 30 min (LLM interface)
- Stage 2: 60 min (semantic-classifier module)
- Stage 3: 45 min (principle-store refactor)
- Stage 4: 30 min (metrics refactor)
- Stage 5: 60 min (signal-extractor refactor)
- Stage 6: 45 min (template-extractor refactor)
- Stage 7: 45 min (compressor refactor)
- Stage 8: 45 min (memory-extraction-config refactor)
- Stage 9: 60 min (pipeline threading)
- Stage 10: 90 min (test updates)
- Stage 11: 30 min (verification)

**Total**: ~9 hours active work (can be parallelized with multiple agents on Stages 3-8)

## Testing Strategy

**Unit tests**: Mock LLM with deterministic responses
- Each classification function tested in isolation
- LLMRequiredError thrown when LLM is null
- Correct types returned for valid inputs

**Integration tests**: Mock LLM, real module interactions
- Pipeline processes signals through all stages
- Classification results flow through correctly
- No keyword matching in any path

**Semantic equivalence tests**: Verify language-agnostic behavior
- "be concise" and "prefer brevity" → same dimension
- "honest" and "truthful" → same dimension
- Non-English text (if applicable) → correct classification

## Related

- **Proposal**: `docs/proposals/soul-bootstrap-pipeline-proposal.md`
- **Parent Issue**: `docs/issues/neon-soul-implementation-code-review-findings.md#CR-6`
- **Post-implementation review**: `docs/issues/cr6-refactor-code-review-findings.md`
- **Twin review findings**: `docs/issues/cr6-twin-review-findings.md`
- **Follow-up plan**: `docs/plans/2026-02-07-notation-simplification.md` (simplifies notation from TR-0)
- **Existing infrastructure**: `src/lib/embeddings.ts`, `src/lib/matcher.ts`
- **Signal types**: `src/types/signal.ts`
