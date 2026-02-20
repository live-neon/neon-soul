# Context: PBD Alignment Implementation (Stages 1-11)

**Generated**: 2026-02-11 (Scout exploration)
**Scout**: haiku
**Mode**: flexible
**Topic**: PBD Alignment Implementation (Stages 1-11)

## Files (17 relevant)

| File | SHA256 (16-char) | Lines | Summary |
|------|------------------|-------|---------|
| docs/plans/2026-02-10-pbd-alignment.md | 65301ff81572f280 | 1987 | Master plan: 17 stages for PBD methodology alignment |
| src/types/signal.ts | 87020711344fdba3 | 194 | Signal types with stance, importance, provenance, elicitationType |
| src/types/principle.ts | f0dbc35b5ac41260 | 77 | Principle types with centrality and provenance tracking |
| src/types/axiom.ts | 6a2585a95feccf0d | 68 | Axiom types with AxiomTension for tension tracking |
| src/types/provenance.ts | ae98775007261640 | 44 | ArtifactProvenance (self/curated/external) and weights |
| src/lib/semantic-classifier.ts | 8aaa1811b8122a8a | 506 | LLM-based classification: dimension, signalType, stance, importance |
| src/lib/signal-extractor.ts | 89585913689c45d8 | 254 | Signal extraction with stance/importance classification integration |
| src/lib/principle-store.ts | 331e59ab5f3b989b | 551 | Principle accumulation with importance weighting and orphan tracking |
| src/lib/tension-detector.ts | 8505c77e780c2bca | 203 | Tension detection between axioms with severity levels |
| src/lib/compressor.ts | 0431f6ce6d070923 | 392 | Axiom synthesis with cascading thresholds and tension integration |
| tests/integration/pbd-alignment.test.ts | a5cd5ea539e866c1 | 511 | Integration tests for stance, importance, tensions, orphans, centrality |
| tests/mocks/llm-mock.ts | 17d06b294e7ba1d7 | 469 | Mock LLM provider with tension detector support |
| docs/architecture/synthesis-philosophy.md | 64731819197d6432 | 157 | Philosophy doc with PBD Alignment section |
| docs/ARCHITECTURE.md | 4c9cd7a024767886 | 534 | Architecture reference with signal metadata and synthesis features |
| docs/guides/single-source-pbd-guide.md | 7b4e98fd501322fd | 315 | Single-source PBD with stance/importance tagging |
| docs/guides/multi-source-pbd-guide.md | c02dbfc818e28d8f | 368 | Multi-source PBD with weighted convergence and tension detection |
| docs/guides/essence-extraction-guide.md | aca39c75ffac7f4f | 369 | Essence extraction with centrality and tension awareness |

## Historical Notes (from Historian)

*No related observations found via automation recall.*

## Relationships

### Type Dependencies
```
signal.ts
  |-- imports ArtifactProvenance from provenance.ts
  |-- exports SignalStance, SignalImportance, SignalElicitationType

principle.ts
  |-- imports SignalSource, GeneralizationProvenance, SignalStance, SignalImportance from signal.ts
  |-- imports ArtifactProvenance from provenance.ts
  |-- defines PrincipleProvenance (includes stance/provenance in signals array)

axiom.ts
  |-- defines AxiomTension (axiomId, description, severity)
  |-- Axiom.tensions?: AxiomTension[]
```

### Implementation Flow
```
signal-extractor.ts
  |-- calls semantic-classifier.ts (classifyStance, classifyImportance)
  |-- produces Signal with stance/importance

principle-store.ts
  |-- receives Signal with stance/importance/provenance
  |-- applies IMPORTANCE_WEIGHT (core=1.5, supporting=1.0, peripheral=0.5)
  |-- computes centrality (foundational/core/supporting)
  |-- tracks orphaned signals (bestSimilarity < threshold)
  |-- persists stance/provenance in PrincipleProvenance.signals

compressor.ts
  |-- receives principles from principle-store
  |-- calls tension-detector.ts (detectTensions)
  |-- attaches tensions to axioms via attachTensionsToAxioms
  |-- applies cascading thresholds (N>=3 -> N>=2 -> N>=1)

tension-detector.ts
  |-- analyzes axiom pairs for value conflicts
  |-- determines severity (high=same dimension, medium=both core, low=other)
```

### Documentation Dependencies
```
docs/plans/2026-02-10-pbd-alignment.md (master plan)
  |-- defines all 17 stages
  |-- Stages 1-11 are core PBD features (current focus)
  |-- Stages 12-16 are cross-project alignment
  |-- Stage 17 is final documentation

docs/ARCHITECTURE.md
  |-- documents signal metadata (stance, importance)
  |-- documents synthesis features (weighted clustering, tensions, orphans, centrality)

docs/architecture/synthesis-philosophy.md
  |-- PBD Alignment section (added in Stage 8)
  |-- explains N-count vs centrality distinction

docs/guides/*.md
  |-- single-source: stance/importance tagging in Step 2
  |-- multi-source: weighted convergence in Step 4, tension detection in Step 8
  |-- essence: centrality awareness in Step 1, tension-aware essence (optional)
```

## Suggested Focus

- **Priority 1**: `src/lib/principle-store.ts` (551 lines) - Core weighted clustering and orphan tracking implementation
- **Priority 2**: `src/lib/semantic-classifier.ts` (506 lines) - Stance and importance classification
- **Priority 3**: `tests/integration/pbd-alignment.test.ts` (511 lines) - Test coverage for all PBD features
- **Priority 4**: `src/lib/tension-detector.ts` (203 lines) - Tension detection between axioms

## Exploration Notes

### Implementation Status (Stages 1-11)

Based on file contents, the following stages appear implemented:

| Stage | Status | Evidence |
|-------|--------|----------|
| 1: Signal Metadata Types | Complete | signal.ts has SignalStance, SignalImportance, SignalElicitationType |
| 2: Stance Classification | Complete | semantic-classifier.ts has classifyStance with self-healing retry |
| 3: Importance Classification | Complete | semantic-classifier.ts has classifyImportance with self-healing retry |
| 4: Weighted Clustering | Complete | principle-store.ts has IMPORTANCE_WEIGHT and applies in addSignal/addGeneralizedSignal |
| 5: Tension Detection | Complete | tension-detector.ts exists with detectTensions and attachTensionsToAxioms |
| 6: Orphaned Content Tracking | Complete | principle-store.ts tracks orphanedSignals and exposes getOrphanedSignals() |
| 7: Centrality Metric | Complete | principle-store.ts has computeCentrality and assigns to principles |
| 8: Documentation Update | Complete | synthesis-philosophy.md has PBD Alignment section |
| 9: Integration Tests | Complete | pbd-alignment.test.ts covers all features |
| 10: Update PBD Guides | Complete | All three guides updated with PBD metadata |
| 11: Project Documentation | Complete | ARCHITECTURE.md documents signal metadata and synthesis features |

### Key Implementation Details

1. **Stance Classification** (Stage 2):
   - Categories: assert, deny, question, qualify (tensioning also defined but not in classification)
   - Uses self-healing retry loop (MAX_CLASSIFICATION_RETRIES = 2)
   - Default fallback: 'assert'

2. **Importance Classification** (Stage 3):
   - Categories: core, supporting, peripheral
   - Uses self-healing retry loop
   - Default fallback: 'supporting'

3. **Weighted Clustering** (Stage 4):
   - IMPORTANCE_WEIGHT: core=1.5, supporting=1.0, peripheral=0.5
   - Applied during addSignal and addGeneralizedSignal
   - Twin I-2 fix: conditionally includes stance/provenance in signal provenance

4. **Tension Detection** (Stage 5):
   - MAX_AXIOMS_FOR_TENSION_DETECTION = 25 (O(n^2) guard)
   - TENSION_DETECTION_CONCURRENCY = 5 (batch processing)
   - Severity: high (same dimension), medium (both core tier), low (other)

5. **Orphan Tracking** (Stage 6):
   - Signals tracked when bestSimilarity < threshold
   - AddSignalResult includes bestSimilarityToExisting
   - getOrphanedSignals() returns OrphanedSignal[]

6. **Centrality Metric** (Stage 7):
   - FOUNDATIONAL_THRESHOLD = 0.5 (50% core signals)
   - CORE_THRESHOLD = 0.2 (20% core signals)
   - Computed via computeCentrality() based on signal importance distribution
