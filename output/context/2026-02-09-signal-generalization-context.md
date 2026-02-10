# Context: Signal Generalization Plan

**Generated**: 2026-02-09 16:30:00
**Scout**: haiku
**Mode**: flexible
**Topic**: Signal Generalization Plan - LLM-based transformation of specific signals to abstract principles

## Files (7 relevant)

| File | SHA256 (16-char) | Lines | Summary |
|------|------------------|-------|---------|
| docs/plans/2026-02-09-signal-generalization.md | 6db2f2ec86bbc164 | 314 | Implementation plan for adding LLM-based signal generalization step to synthesis pipeline |
| docs/issues/missing-signal-generalization-step.md | 7b37d53d8c553de7 | 153 | Issue documenting PBD methodology drift - missing principle synthesis step causes poor clustering |
| docs/guides/single-source-pbd-guide.md | c7223df8fa634dad | 236 | PBD Phase 1 methodology - section-based principle extraction from single documents |
| docs/guides/multi-source-pbd-guide.md | 703b189afffeeec9 | 292 | PBD Phase 2 methodology - axiom extraction via cross-source principle convergence |
| src/lib/principle-store.ts | 1850fb04e8f51c9b | 235 | Principle store with embedding index - handles signal accumulation, matching, and N-count tracking |
| src/lib/reflection-loop.ts | db3c4bc90a944f23 | 314 | Iterative synthesis loop - feeds signals to principle store, compresses to axioms, tracks convergence |
| src/lib/semantic-classifier.ts | 2c924ed03aa03bb1 | 213 | LLM-based classification module - dimension, signal type, section type, and category classification |

## Historical Notes (from Historian)

*No related observations found via automation recall.*

## Relationships

```
                          PBD Guides (methodology reference)
                                    |
                     +-------+------+-------+
                     |                      |
        single-source-pbd-guide    multi-source-pbd-guide
             (Step 4: Synthesis)    (Step 2: Normalization)
                     |                      |
                     +----------+-----------+
                                |
                          Issue Document
                    (missing-signal-generalization-step)
                                |
                                v
                        Implementation Plan
                    (signal-generalization.md)
                                |
                    +--------+--+--+--------+
                    |           |           |
                    v           v           v
            NEW MODULE    principle-store  reflection-loop
        signal-generalizer.ts   |              |
                    |           |              |
                    +-----+-----+              |
                          |                   |
                          v                   v
                  semantic-classifier   (call site for
                    (LLM pattern)       generalization)
```

**Data Flow (Current - Broken)**:
1. `reflection-loop.ts` receives signals
2. Signals fed directly to `principle-store.ts:addSignal()`
3. Principle created with `text = signal.text` (no generalization)
4. Low similarity (0.17-0.63) prevents clustering
5. Result: 50 signals -> 49 principles -> 49 axioms (no compression)

**Data Flow (Planned - After Fix)**:
1. `reflection-loop.ts` receives signals
2. NEW: Signals generalized via LLM (pattern from `semantic-classifier.ts`)
3. Generalized signals fed to `principle-store.ts:addSignal()`
4. Principle created with generalized text
5. Higher similarity (0.85+) enables clustering
6. Result: 50 signals -> ~15 principles -> 5-7 axioms

## Suggested Focus

- **Priority 1**: `docs/plans/2026-02-09-signal-generalization.md` - Implementation plan with 5 stages, acceptance criteria, and risk mitigation
- **Priority 2**: `src/lib/principle-store.ts` (lines 198-218) - Where `text: signal.text` should become `text: generalizedSignal.generalizedText`
- **Priority 3**: `src/lib/reflection-loop.ts` (lines 158-163) - Call site where generalization step should be added before `store.addSignal()`
- **Priority 4**: `src/lib/semantic-classifier.ts` - Pattern reference for LLM classification (batch support, prompt design, sanitization)

## Exploration Notes

**Root Cause**: Implementation drifted from PBD methodology. The guides specify a "principle synthesis" step (single-source) and "normalization" step (multi-source) that transform specific signals into abstract principles. This step was skipped, causing raw signals with different surface language but same semantic meaning to fail similarity matching.

**Key Code Location**: `principle-store.ts:200` - the line `text: signal.text` is where the fix applies. The plan proposes either:
1. Accept `GeneralizedSignal` instead of raw `Signal`
2. Add optional `generalizedText` parameter to `addSignal()`

**LLM Pattern Reference**: `semantic-classifier.ts` shows the established pattern for LLM classification:
- XML delimiters for prompt safety (`<user_content>...</user_content>`)
- `sanitizeForPrompt()` function for input sanitization
- Category-based classification via `llm.classify()`

**Expected Outcome**: Compression ratio from ~1:1 to at least 3:1, N-counts reaching 2+ for common themes, cascade able to use N>=2 or N>=3 thresholds instead of always falling to N>=1.

---

*Context file generated by Scout for Signal Generalization Plan review*
