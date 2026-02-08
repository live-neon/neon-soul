# Phase 3: Memory Ingestion Pipeline

**Date**: 2026-02-07
**Status**: ✅ Complete
**Master Plan**: [soul-bootstrap-master.md](./2026-02-07-soul-bootstrap-master.md)
**Proposal**: [soul-bootstrap-pipeline-proposal.md](../proposals/soul-bootstrap-pipeline-proposal.md#phase-3-memory-ingestion-pipeline)
**Depends on**: [Phase 1](./2026-02-07-phase1-template-compression.md) (validated compression), [Phase 2](./2026-02-07-phase2-openclaw-environment.md) (data landscape)

---

## Objective

Build the complete memory ingestion pipeline that extracts signals from OpenClaw memory, matches them to principles, promotes to axioms, and generates an enhanced SOUL.md. This is the core differentiating feature.

**Blocks**: Production release

---

## Stage 3.1: Pipeline Orchestrator

**Files to create**:
```
src/lib/
├── pipeline.ts            # Orchestration layer
└── reflection-loop.ts     # Iterative synthesis
src/commands/
└── synthesize.ts          # Main synthesis command
```

**Research Foundation**: See [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md) for the iterative synthesis approach and trajectory tracking methodology.

**Tasks**:
- [ ] Design pipeline stages with **iterative reflection loop**:
  ```typescript
  interface PipelineStage {
    name: string;
    execute: (context: PipelineContext) => Promise<PipelineContext>;
    rollback?: (context: PipelineContext) => Promise<void>;
  }

  interface ReflectiveLoop {
    maxIterations: number;           // 3-7 based on research
    convergenceThreshold: number;    // 0.95 cosine similarity
    currentIteration: number;
    trajectoryHistory: Embedding[];  // Track path through space
    hasConverged: boolean;
  }

  const stages: PipelineStage[] = [
    { name: 'check-threshold', execute: checkContentThreshold }, // Skip if not enough new memory
    { name: 'read-memory', execute: readMemoryFiles },
    { name: 'extract-signals', execute: extractSignals },
    { name: 'reflective-synthesis', execute: iterativeSynthesis },
    { name: 'attractor-validation', execute: validateConvergence },
    { name: 'validate-output', execute: validateSoulOutput },    // Reject empty/malformed
    { name: 'backup-current', execute: backupCurrentSoul },      // Safety: backup before write
    { name: 'generate-soul', execute: generateSoulMd },
    { name: 'git-commit', execute: commitIfRepo },               // Auto-commit if git repo
  ];
  ```
- [ ] Implement **trajectory tracking**:
  ```typescript
  interface TrajectoryTracker {
    embeddings: number[][];           // Embedding at each iteration
    distances: number[];              // Distance traveled per step
    variance: number;                 // Spread of trajectory
    attractorDetected: boolean;       // Stable basin found
    stabilizationIteration?: number;  // When convergence occurred
  }
  ```
- [ ] Add **geometric metrics** (from research):
  ```typescript
  interface GeometricMetrics {
    curvature: number;                // Path smoothness
    dimensionalReduction: number;     // Effective dimensions used
    clusterDensity: number;           // Axiom grouping tightness
  }
  ```
- [ ] Implement progress reporting with iteration tracking
- [ ] Add checkpoint/resume capability for long runs
- [ ] Implement dry-run mode for preview
- [ ] Create OpenClaw skill command `/neon-soul synthesize`
- [ ] **Content threshold check** (from Self-Learning Agent):
  ```typescript
  // Skip if not enough new memory since last run
  if (!shouldRunSynthesis(state, 2000) && !options.force) {
    return { skipped: true, reason: 'insufficient-new-content' };
  }
  ```
- [ ] **Output validation** (from Self-Learning Agent):
  ```typescript
  function validateSoulOutput(soul: GeneratedSoul): ValidationResult {
    if (!soul.content || soul.content.length < 100) {
      return { valid: false, reason: 'output-too-short' };
    }
    if (soul.axioms.length === 0) {
      return { valid: false, reason: 'no-axioms-generated' };
    }
    if (!soul.dimensions.every(d => d.coverage > 0)) {
      return { valid: false, reason: 'missing-dimension-coverage' };
    }
    return { valid: true };
  }
  ```
- [ ] **No-op exit** when nothing meaningful changed

**Acceptance criteria (Bootstrap Phase)**:
- [ ] Pipeline runs iterative synthesis (capture all iterations)
- [ ] Trajectory data logged comprehensively
- [ ] Geometric metrics measured (not enforced)
- [ ] Progress shows iteration count (no "convergence" judgment)
- [ ] Dry-run shows what would be measured
- [ ] Errors logged for pattern analysis
- [ ] Content threshold respects `--force` flag
- [ ] Invalid output rejected with clear error message
- [ ] Backup created before any write operation

**Note**: During Bootstrap phase (current), we accept ALL souls regardless of convergence. See [Greenfield Guide](../guides/greenfield-guide.md) for phase transition criteria.

---

## Stage 3.2: Input Source Collection

**Files to create**:
```
src/lib/
└── source-collector.ts    # Collect all input sources
```

**Architecture Note**: OpenClaw never updates SOUL.md after initial bootstrap (it's read-only). Therefore, we use a **single-track architecture** - no dual-track merge needed. NEON-SOUL generates a new compressed SOUL.md that **replaces** the original.

**Input Sources**:
```
~/.openclaw/workspace/
├── memory/*.md           # Primary: accumulated memory files
├── SOUL.md               # Bootstrap: initial soul (high-signal input)
├── USER.md               # Context: user preferences
└── interview responses   # Supplement: for sparse dimensions
```

**Tasks**:
- [ ] Implement source collector:
  ```typescript
  interface SourceCollection {
    memorySources: MemoryFile[];      // memory/*.md files
    initialSoul: ParsedSoul | null;   // Existing SOUL.md as input
    userContext: UserContext | null;  // USER.md for context
    interviewResponses: Signal[];     // Optional supplement
  }

  async function collectSources(workspacePath: string): Promise<SourceCollection> {
    // 1. Scan memory/ directory for .md files
    // 2. Parse existing SOUL.md as high-priority input source
    // 3. Extract signals from USER.md for context
    // 4. Load any interview responses
    return sources;
  }
  ```
- [ ] Treat initial SOUL.md as first memory file:
  ```typescript
  // Initial SOUL.md gets higher signal weight (established identity)
  const soulSignals = await extractSignals(initialSoul, {
    sourceType: 'existing-soul',
    confidenceBoost: 0.2,  // Boost confidence for established beliefs
  });
  ```
- [ ] Track provenance for all sources including initial SOUL.md

**Acceptance criteria**:
- [ ] All memory files discovered and queued
- [ ] Initial SOUL.md parsed as input source (not output template)
- [ ] Source provenance tracked from collection
- [ ] Empty memory directories handled gracefully

---

## Stage 3.3: Cross-Source Axiom Emergence

**Files to create**:
```
src/lib/
└── axiom-emergence.ts     # Cross-source axiom detection
```

**Tasks**:
- [ ] Detect axioms that emerge across multiple memory sources:
  ```typescript
  interface EmergentAxiom {
    axiom: Axiom;
    sources: string[];  // Memory categories where signals appeared
    strength: number;   // Higher when crossing more sources
  }
  ```
- [ ] Weight cross-source signals higher (I-2 fix):
  ```typescript
  function calculateStrength(principle: Principle): number {
    // Aggregate by category (directory) not individual file
    const categories = new Set(principle.derived_from.signals.map(s => {
      const parts = s.source.file.split('/');
      return parts[parts.length - 2];  // Get parent directory (e.g., 'diary', 'preferences')
    }));
    const crossSourceBonus = Math.log2(categories.size + 1);
    return principle.n_count * crossSourceBonus;
  }
  ```
- [ ] Identify dimension-spanning axioms (core identity)
- [ ] Generate report of emergent patterns

**Acceptance criteria**:
- [ ] Cross-source axioms identified
- [ ] Strength calculation accounts for source diversity
- [ ] Core identity axioms (spanning 3+ dimensions) flagged
- [ ] Report shows axiom emergence patterns

---

## Stage 3.4: SOUL.md Generator

**Files to create**:
```
src/lib/
├── soul-generator.ts      # Generate SOUL.md output
└── notation-formatter.ts  # Format per user preference
templates/
├── soul.md.hbs            # SOUL.md template
└── sections/              # Section templates
    ├── identity.hbs
    ├── traits.hbs
    └── ...
```

**Tasks**:
- [ ] Design SOUL.md structure:
  ```markdown
  # SOUL.md

  ## Identity Core
  [axioms and principles for this dimension]

  ## Character Traits
  ...

  ## Provenance
  [compressed provenance section]
  ```
- [ ] Implement notation formatter:
  ```typescript
  function formatAxiom(axiom: Axiom, format: NotationFormat): string {
    switch (format) {
      case 'native':
        return axiom.canonical.native;
      case 'cjk-labeled':
        return `${axiom.canonical.cjk} (${axiom.canonical.native})`;
      case 'cjk-math':
        return `${axiom.canonical.cjk}: ${axiom.canonical.math}`;
      case 'cjk-math-emoji':
        // Handle optional emoji (M-2)
        const emoji = axiom.canonical.emoji ?? '';
        return `${emoji} ${axiom.canonical.cjk}: ${axiom.canonical.math}`.trim();
    }
  }
  ```
- [ ] Generate all 7 SoulCraft dimension sections
- [ ] Add provenance summary (expandable)
- [ ] Include compression metrics in footer
- [ ] Support custom template override

**Acceptance criteria**:
- [ ] SOUL.md generated with all dimensions
- [ ] Notation format matches user preference
- [ ] Provenance traceable from any axiom
- [ ] Compression ratio displayed
- [ ] Valid markdown output

---

## Stage 3.5: Audit Trail & Evolution History

**Files to create**:
```
src/lib/
├── audit.ts               # Audit trail generation
└── evolution.ts           # Soul evolution tracking
src/commands/
└── audit.ts               # Audit command
output/souls/history/      # Historical soul versions
└── {timestamp}/
    ├── soul.md            # Generated soul
    ├── soul-embedding.json # 384-dim embedding
    ├── metrics.json       # Semantic & geometric metrics
    ├── trajectory.json    # Path through embedding space
    ├── attractor.json     # Convergence analysis
    └── provenance.json    # Full audit trail
```

**Research Foundation**: Implement evolution tracking based on trajectory analysis detailed in [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md).

**Tasks**:
- [ ] Implement audit logging:
  ```typescript
  interface AuditEntry {
    timestamp: string;
    action: 'signal_extracted' | 'principle_matched' | 'axiom_promoted' |
            'soul_generated' | 'iteration_complete' | 'attractor_detected';
    subject: string;  // ID of affected entity
    details: Record<string, unknown>;
    provenance: ProvenanceChain;
  }
  ```
- [ ] **Add trajectory storage**:
  ```typescript
  interface TrajectoryRecord {
    iterations: Array<{
      number: number;
      embedding: number[];         // 384-dim
      distanceFromPrevious: number;
      distanceFromOrigin: number;
      timestamp: string;
    }>;
    convergencePoint?: number[];    // Final attractor embedding
    stabilizationIteration: number; // When convergence detected
    totalPathLength: number;        // Sum of all distances
  }
  ```
- [ ] **Add evolution metrics**:
  ```typescript
  interface EvolutionMetrics {
    versionToVersionSimilarity: number;  // vs previous soul
    axiomRetentionRate: number;          // % axioms preserved
    semanticDrift: number;                // Distance from v0
    styleCoherence: number;               // Voice preservation
  }
  ```
- [ ] Store historical versions with symlink to latest
- [ ] Log all pipeline operations including iterations
- [ ] Implement `/neon-soul audit <axiom>` command:
  ```
  Axiom: 誠 (honesty over performance)
  ├── Principle: "be honest about capabilities" (N=4)
  │   ├── Signal: "I prefer honest answers" (memory/preferences/communication.md:23)
  │   ├── Signal: "Don't sugarcoat feedback" (memory/diary/2024-03-15.md:45)
  │   ├── Signal: "Value directness" (memory/relationships/work.md:12)
  │   └── Signal: "Honest > polite" (interview:honesty-q2)
  └── Created: 2024-03-20T14:30:00Z
  ```
- [ ] Generate summary statistics:
  - Signals per source
  - Principles per dimension
  - Axiom tier distribution
  - Compression achieved

**Acceptance criteria**:
- [ ] All operations logged to audit trail
- [ ] `audit` command traces any axiom to signals
- [ ] Statistics generated per run
- [ ] JSONL format for machine processing

---

## Stage 3.6: Integration Tests

**Files to create**:
```
test/
├── integration/
│   ├── pipeline.test.ts       # Full pipeline test
│   ├── dual-track.test.ts     # Both tracks work
│   └── e2e-synthesis.test.ts  # End-to-end test
└── fixtures/
    └── memory/                # Synthetic memory fixtures
        ├── preferences/
        ├── relationships/
        └── ...
```

**Tasks**:
- [ ] Create synthetic memory fixtures covering all categories
- [ ] Test full pipeline with fixtures:
  ```typescript
  test('synthesizes SOUL.md from memory', async () => {
    const result = await synthesize({
      memoryPath: 'test/fixtures/memory',
      outputPath: 'test/output/soul.md',
    });

    expect(result.signals.length).toBeGreaterThan(20);
    expect(result.principles.length).toBeGreaterThan(5);
    expect(result.axioms.length).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThan(6);
  });
  ```
- [ ] Test dual-track merge produces valid output
- [ ] Test audit trail completeness
- [ ] Test notation format switching
- [ ] Test error recovery and checkpointing

**Acceptance criteria**:
- [ ] All integration tests pass
- [ ] Pipeline handles edge cases gracefully
- [ ] Synthetic fixtures cover all dimensions
- [ ] Tests validate semantic correctness, not just structure

---

## Stage 3.7: Documentation Update

**Goal**: Complete documentation for production release.

**Reference**: Follow [Documentation Update Workflow](../workflows/documentation-update.md)

**Tasks**:
- [ ] Update README.md with all skill commands and examples
- [ ] Finalize `docs/ARCHITECTURE.md` with complete system reference:
  - Full module diagram (all phases)
  - End-to-end data flow (memory → signals → principles → axioms → SOUL.md)
  - Configuration reference
  - Audit trail documentation
- [ ] Document synthesis workflow in proposal (validate against implementation)
- [ ] Update master plan with final architecture and metrics
- [ ] Document audit trail usage in README
- [ ] Create user guide for running synthesis
- [ ] Run all verification commands from workflow:
  ```bash
  grep -r "npx neon-soul" docs/ README.md       # Should return nothing
  grep -r "@anthropic-ai/sdk" docs/             # Should return nothing
  grep -r "Phase [0-9]" docs/plans/             # Verify cross-references
  ```
- [ ] Final review: proposal, master plan, ARCHITECTURE.md, phase plans, README all consistent
- [ ] Commit documentation updates with implementation

**Acceptance criteria**:
- [ ] ARCHITECTURE.md is complete system reference
- [ ] All documentation reflects production implementation
- [ ] User can follow README to run synthesis
- [ ] Verification commands pass
- [ ] No stale references to old architecture

---

## Quality Gate: QG-Pipeline

Before production release:

| Metric | Target | Measured |
|--------|--------|----------|
| Compression ratio | ≥6:1 | On real memory |
| Dimension coverage | 7/7 | All dimensions represented |
| Provenance completeness | 100% | Every axiom traces to source |
| Audit trail | Complete | All operations logged |
| Error recovery | Graceful | No data corruption on failure |
| Performance | <5 min | For 100 memory files (~50K tokens) on M1 MacBook (I-6) |

---

## Deliverables

- [ ] `src/lib/pipeline.ts` - Orchestration layer
- [ ] `src/lib/source-collector.ts` - Input source collection
- [ ] `src/lib/axiom-emergence.ts` - Cross-source detection
- [ ] `src/lib/soul-generator.ts` - SOUL.md output (replaces original)
- [ ] `src/lib/notation-formatter.ts` - Format per preference
- [ ] `src/lib/audit.ts` - Audit trail
- [ ] `src/commands/synthesize.ts` - Main command
- [ ] `src/commands/audit.ts` - Audit command
- [ ] Integration test suite
- [ ] Synthetic memory fixtures
- [ ] Documentation for running synthesis
- [ ] All documentation updated per [workflow](../workflows/documentation-update.md)

> **Architecture**: Single-track (no dual-track merge). Initial SOUL.md treated as input source, output SOUL.md replaces it.

> **Shared modules from Phase 0**: Uses all shared infrastructure (`embeddings.ts`, `matcher.ts`, `llm.ts`, `signal-extractor.ts`, `markdown-reader.ts`, `provenance.ts`)
> **Shared modules from Phase 1**: Uses `principle-store.ts`, `compressor.ts`, `metrics.ts`
> **Shared modules from Phase 2**: Uses `memory-walker.ts`, `memory-extraction-config.ts`, `interview.ts`

---

## OpenClaw Skill Commands (Phase 3)

After Phase 3 completion, available as OpenClaw skills:

```bash
# Full synthesis (on-demand)
/neon-soul synthesize                        # Run if enough new memory (content threshold)
/neon-soul synthesize --force                # Run regardless of threshold
/neon-soul synthesize --dry-run              # Preview changes without writing
/neon-soul synthesize --diff                 # Show what would change
/neon-soul synthesize --format cjk-math-emoji

# Safety & recovery (from Self-Learning Agent patterns)
/neon-soul rollback                          # Restore from most recent backup
/neon-soul rollback --list                   # List available backups
/neon-soul status                            # Show last run, pending memory size

# Audit trail
/neon-soul audit <axiom-id>
/neon-soul audit --stats

# Interview (supplements memory)
/neon-soul interview
/neon-soul interview --dimension identity

# Template compression (from Phase 1)
/neon-soul compress <template.md>
```

**Content-driven thresholds** (from Self-Learning Agent):
```typescript
// Only run synthesis when enough new memory has accumulated
const THRESHOLD_CHARS = 2000;  // ~20 turns of conversation

// Check before synthesis
if (!shouldRunSynthesis(state, THRESHOLD_CHARS) && !options.force) {
  console.log('Not enough new memory. Use --force to run anyway.');
  return;
}
```

**HEARTBEAT.md integration** (automatic scheduled runs):
```markdown
## HEARTBEAT.md addition
- [ ] Run `/neon-soul synthesize` (auto-detects if enough new memory accumulated)
```

**Scheduled execution** (OpenClaw cron):
```yaml
# Example: Weekly soul compression
schedule: "0 0 * * 0"  # Sunday midnight
skill: /neon-soul synthesize --format cjk-math
```

---

## Notes

- This phase depends on validated compression (Phase 1) and data landscape (Phase 2)
- **Single-track architecture**: OpenClaw never updates SOUL.md after bootstrap, so no merge needed
- Initial SOUL.md treated as high-priority input source, output replaces it
- Focus on provenance - every axiom must trace to source
- Human validation available via `approvalMode: 'interactive'` config option

**Patterns adopted from Self-Learning Agent proposal**:
- Content-driven thresholds (don't run unless enough new memory)
- Incremental processing via `state.ts` (only process new content)
- Safety patterns: backup before write, git auto-commit, rollback capability
- Output validation: reject empty/malformed souls
- No-op exit when nothing changed
- HEARTBEAT.md integration for automated runs

---

*Phase 3 is the core feature. Successful completion means NEON-SOUL delivers on its promise.*
