# Context: Stage 12 Signal Source Classification

**Generated**: 2026-02-11 17:45:00
**Scout**: haiku (偵)
**Mode**: flexible
**Topic**: Stage 12 Signal Source Classification implementation from docs/plans/2026-02-10-pbd-alignment.md

## Files (8 relevant)

| File | SHA256 (16-char) | Lines | Summary |
|------|------------------|-------|---------|
| src/lib/signal-source-classifier.ts | 4a8cad9080caf6d3 | 151 | Core Stage 12 module - classifies signal elicitation type (agent-initiated/user-elicited/context-dependent/consistent-across-context) |
| src/lib/signal-extractor.ts | ce8af5fe559200b9 | 274 | Integrates elicitationType classification during signal extraction (Phase 4 parallel classification) |
| src/index.ts | cbf6b7b8b63805cb | 163 | Library exports - exports Stage 12 functions: classifyElicitationType, filterForIdentitySynthesis, calculateWeightedSignalCount, ELICITATION_WEIGHT |
| tests/integration/pbd-alignment.test.ts | d4688a5cda7325d0 | 705 | Integration tests for Stage 12 - covers elicitation classification, filtering, and weighting |
| tests/mocks/llm-mock.ts | 9b0d0d60444dbe2a | 521 | Mock LLM with Stage 12 elicitation hints (DEFAULT_ELICITATION_HINTS) for testing |
| src/types/signal.ts | 87020711344fdba3 | 194 | SignalElicitationType type definition and Signal interface with elicitationType field |
| docs/plans/2026-02-10-pbd-alignment.md | 65301ff81572f280 | 1987 | Plan file - Stage 12 specification at lines 978-1097 |
| src/lib/semantic-classifier.ts | 9c5f92b4c3a4fb60 | 518 | Provides sanitizeForPrompt and requireLLM helpers used by signal-source-classifier |

## Historical Notes (from Historian 史)

No related observations found via `automation recall` (index may need refresh).

## Relationships

```
signal-source-classifier.ts
    ├── imports: LLMProvider, requireLLM (from types/llm.ts)
    ├── imports: Signal, SignalElicitationType (from types/signal.ts)
    ├── imports: sanitizeForPrompt (from semantic-classifier.ts)
    └── exports: classifyElicitationType, filterForIdentitySynthesis, calculateWeightedSignalCount, ELICITATION_WEIGHT

signal-extractor.ts
    ├── imports: classifyElicitationType (from signal-source-classifier.ts)
    ├── imports: classifyStance, classifyImportance (from semantic-classifier.ts)
    └── calls: classifyElicitationType() in Phase 4 parallel with other classifiers

index.ts
    └── re-exports: Stage 12 functions for library consumers

pbd-alignment.test.ts
    ├── imports: classifyElicitationType, filterForIdentitySynthesis, calculateWeightedSignalCount, ELICITATION_WEIGHT
    ├── imports: createMockLLM, createNullCategoryMockLLM (from llm-mock.ts)
    └── tests: Stage 12 acceptance criteria

llm-mock.ts
    ├── defines: DEFAULT_ELICITATION_HINTS for keyword-based test responses
    └── used by: pbd-alignment.test.ts for deterministic testing
```

## Suggested Focus

- **Priority 1**: `src/lib/signal-source-classifier.ts` (151 lines) - The core Stage 12 implementation. Review classifyElicitationType logic, ELICITATION_WEIGHT constants, and filterForIdentitySynthesis function.

- **Priority 2**: `tests/integration/pbd-alignment.test.ts` (705 lines, Stage 12 section: lines 519-705) - Tests for Stage 12 acceptance criteria. Verify coverage of all elicitation types and edge cases.

- **Priority 3**: `src/lib/signal-extractor.ts` (274 lines) - Integration point. Review Phase 4 parallel classification at lines 218-226 where elicitationType is classified alongside stance/importance.

## Exploration Notes

**Stage 12 Purpose**: Mitigates "false soul" problem by distinguishing agent-initiated vs user-elicited signals. An agent mostly asked to write code will produce signals about precision - but that reflects usage, not identity.

**Implementation Status**: Stage 12 appears complete based on:
1. signal-source-classifier.ts implements all 4 elicitation types
2. signal-extractor.ts integrates classification in Phase 4
3. index.ts exports all Stage 12 functions
4. pbd-alignment.test.ts has dedicated Stage 12 test section

**Key Design Decisions**:
- Self-healing retry loop with MAX_CLASSIFICATION_RETRIES = 2
- Conservative default: 'user-elicited' (low identity weight)
- Explicit filtering via filterForIdentitySynthesis() rather than zero-weight multiplication (I-5 FIX)
- Elicitation weights: consistent-across-context=2.0, agent-initiated=1.5, user-elicited=0.5, context-dependent=0.0

**Related Plan Sections**:
- Stage 12 spec: Plan lines 978-1097
- M-2 FIX (Provenance x Elicitation Matrix): Plan lines 1009-1032
- Stage 16 (Weight Composition): Plan lines 1586-1681 - combines importance x provenance x elicitation
