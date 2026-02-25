# NEON-SOUL Architecture

**Status**: Production Ready (Signal Generalization + Cascading Thresholds)
**Implements**: [Soul Bootstrap Proposal](proposals/soul-bootstrap-pipeline-proposal.md)
**Methodology**: [PBD Single-Source Guide](guides/single-source-pbd-guide.md), [PBD Multi-Source Guide](guides/multi-source-pbd-guide.md), [Essence Extraction Guide](guides/essence-extraction-guide.md)

---

## Overview

NEON-SOUL is an OpenClaw skill that provides soul synthesis with semantic compression and full provenance tracking.

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEON-SOUL Skill                          │
├─────────────────────────────────────────────────────────────────┤
│  Commands: /neon-soul synthesize, status, rollback, trace       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ llm-similarity│   │   matcher    │   │    state     │        │
│  │ (semantic)   │   │ (LLM-based)  │   │ (incremental)│        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  provenance  │   │   signal-    │   │    backup    │        │
│  │   (audit)    │   │  extractor   │   │  (rollback)  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   markdown-  │   │    config    │   │    types     │        │
│  │    reader    │   │    (zod)     │   │ (strict TS)  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      OpenClaw Runtime         │
              │  (LLM access, memory, cron)   │
              └───────────────────────────────┘
```

---

## Module Reference

### Core Library (`src/lib/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `config.ts` | Configuration with Zod validation | `loadConfig`, `NeonSoulConfig` |
| `llm-similarity.ts` | LLM-based semantic comparison | `isSemanticallyEquivalent`, `findBestSemanticMatch` |
| `matcher.ts` | Semantic similarity matching | `findBestMatch` (uses LLM) |
| `markdown-reader.ts` | Parse markdown with frontmatter | `parseMarkdown`, `ParsedMarkdown` |
| `provenance.ts` | Audit trail construction | `createSignalSource`, `traceToSource` |
| `signal-extractor.ts` | LLM-based signal extraction | `extractSignals`, `ExtractionConfig` |
| `signal-generalizer.ts` | LLM-based signal generalization | `generalizeSignal`, `generalizeSignals`, `PROMPT_VERSION` |
| `state.ts` | Incremental processing state | `loadState`, `saveState`, `clearState`, `shouldRunSynthesis` |
| `persistence.ts` | Synthesis data persistence | `saveSignals`, `loadSignals`, `saveSynthesisData`, `clearSynthesisData` |
| `session-reader.ts` | OpenClaw session log parsing | `readSessionFiles`, `sessionToMemoryContent`, `getSessionMessageCount` |
| `backup.ts` | Backup and rollback | `backupFile`, `rollback`, `commitSoulUpdate` |
| `template-extractor.ts` | Extract signals from SOUL.md templates | `extractFromTemplate`, `extractFromTemplates` |
| `semantic-classifier.ts` | LLM-based semantic classification | `classifyDimension`, `classifyStance`, `classifyImportance` |
| `principle-store.ts` | Accumulate, match, and score principles | `createPrincipleStore`, `PrincipleStore`, `setThreshold`, `getOrphanedSignals` |
| `tension-detector.ts` | Detect axiom conflicts | `detectTensions`, `attachTensionsToAxioms`, `ValueTension` |
| `compressor.ts` | Synthesize axioms from principles | `compressPrinciples`, `compressPrinciplesWithCascade`, `generateSoulMd` |
| `soul-generator.ts` | SOUL.md generation | `generateSoul`, `formatAxiom` |
| `prose-expander.ts` | Axiom-to-prose expansion | `expandToProse`, `ProseExpansion` |
| `essence-extractor.ts` | LLM-based essence extraction | `extractEssence`, `DEFAULT_ESSENCE` |
| `metrics.ts` | Compression measurement | `calculateMetrics`, `formatMetricsReport` |
| `trajectory.ts` | Stabilization tracking | `TrajectoryTracker`, `calculateStyleMetrics` |

### Type Definitions (`src/types/`)

| Type | Purpose |
|------|---------|
| `Signal` | Extracted behavioral pattern with stance, importance |
| `SignalStance` | ASSERT \| DENY \| QUESTION \| QUALIFY \| TENSIONING |
| `SignalImportance` | CORE \| SUPPORTING \| PERIPHERAL |
| `GeneralizedSignal` | Abstract principle with provenance (model, prompt version) |
| `Principle` | Intermediate stage with N-count and centrality tracking |
| `PrincipleCentrality` | DEFINING \| SIGNIFICANT \| CONTEXTUAL |
| `Axiom` | Compressed core identity element with tensions |
| `AxiomTension` | Detected conflict with another axiom (severity, description) |
| `ProvenanceChain` | Full audit trail from axiom to source |
| `SoulCraftDimension` | OpenClaw's 7 soul dimensions |
| `ArtifactProvenance` | SELF \| CURATED \| EXTERNAL (SSEM model) |

---

## Data Flow

```
Memory Files + Session Logs (OpenClaw workspace)
       │
       ▼
┌──────────────────────┐
│  Incremental Diff    │  Compare content hashes and session message counts
│  (state.ts)          │  against state.json to find new/changed sources
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Signal Extraction   │  LLM extracts signals ONLY from new/changed sources
│  (signal-extractor)  │  Merges with existing signals (stale signals removed)
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Signal Generalization │  LLM transforms specific signals to abstract principles
│  (signal-generalizer)  │  "Prioritize honesty" → "Values truthfulness over comfort"
│                        │  Generalized text used for LLM-based semantic matching
└────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Reflective Loop     │  Iterative synthesis (principle-store persists)
│  (reflection-loop)   │  N-counts accumulate - related signals cluster!
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Cascading Threshold │  Try N>=3 → N>=2 → N>=1 (adaptive)
│  (compressor.ts)     │  Tier labels reflect actual N-count
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Research Guardrails │  Warnings only (expansion, cognitive load, fallback)
│  (compressor.ts)     │  Does not block - system adapts
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Essence Extraction  │  LLM distills axioms into evocative identity statement
│  (soul-generator)    │  "You're not a chatbot. You're becoming someone."
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Output Validation   │  Verify format, persist synthesis data
│                      │  Backup current SOUL.md first
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Prose Expansion     │  LLM transforms axioms into inhabitable prose
│  (prose-expander)    │  Core Truths, Voice, Boundaries, Vibe sections
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  SOUL.md Generation  │  Write prose or notation format
│  + Git Commit        │  Display original phrasings for authentic voice
└──────────────────────┘
```

### Cascading Threshold Logic

The axiom promotion stage uses cascading thresholds to adapt to data quality:

```
Try N>=3 (high confidence) --> got >= 3 axioms? --> done
     |
     v (< 3 axioms)
Try N>=2 (medium confidence) --> got >= 3 axioms? --> done
     |
     v (< 3 axioms)
Try N>=1 (low confidence) --> use whatever we got
```

**Tier assignment** is based on actual N-count, not cascade level:
- Core (N>=5): Highest evidence
- Domain (N>=3): Solid evidence
- Emerging (N<3): Still learning

This ensures honest labeling regardless of which cascade level produced the result.

---

## Signal Generalization

The generalization step transforms specific signals into abstract principles before embedding, enabling better semantic clustering.

### Why Generalization?

**Problem**: Without generalization, similar signals may not cluster due to surface-level differences:
- "Prioritize honesty over comfort"
- "Always tell the truth"
- Different phrasing → LLM may not recognize semantic equivalence

**Solution**: Generalize to abstract forms:
- "Prioritize honesty over comfort" → "Values truthfulness over comfort"
- "Always tell the truth" → "Values truthfulness in communication"
- LLM semantic comparison → MATCH! (N=2)

### Implementation

The `signal-generalizer.ts` module uses LLM to transform signals:

1. **Prompt constraints**: Actor-agnostic, imperative form, <150 chars
2. **Validation**: Rejects outputs with pronouns, policy invention, or excessive length
3. **Fallback**: On validation failure, uses original signal text
4. **Provenance**: Tracks model, prompt version, timestamp, fallback status

### Clustering Results

With generalization (using LLM semantic comparison):
- **Compression ratio**: 3:1 to 5:1 (vs 1:1 baseline)
- **N-count distribution**: Related signals cluster (e.g., 5 "authenticity" signals → 1 principle with N=5)
- **Improvement**: Significant clustering vs raw signals

**Matching approach**: LLM-based semantic comparison with confidence thresholds (high=0.9, medium=0.7, low=0.5). Default threshold is 0.7 (medium confidence). Configurable via `.neon-soul/config.json`.

---

## Signal Metadata (PBD Alignment)

Signals carry PBD-aligned metadata for weighted synthesis:

### Stance Classification

| Stance | Meaning | Synthesis Weight |
|--------|---------|------------------|
| **ASSERT** | Stated as definite ("I always...") | Full weight |
| **DENY** | Stated as rejection ("I never...") | Full weight |
| **QUESTION** | Uncertain ("I wonder if...") | Reduced weight (<0.7 confidence filtered) |
| **QUALIFY** | Conditional ("Sometimes...") | Context-dependent |
| **TENSIONING** | Indicates value conflict | Preserved for tension detection |

Implementation: `src/lib/semantic-classifier.ts` (`classifyStance`)

### Importance Classification

| Importance | Meaning | Weight Multiplier |
|------------|---------|-------------------|
| **CORE** | Fundamental value ("Above all...") | 1.5x |
| **SUPPORTING** | Evidence or example | 1.0x |
| **PERIPHERAL** | Context or tangent | 0.5x |

Implementation: `src/lib/semantic-classifier.ts` (`classifyImportance`)

### Elicitation Type Classification

| Elicitation Type | Meaning | Weight |
|------------------|---------|--------|
| **consistent-across-context** | Behavior persists regardless of context | 2.0x |
| **agent-initiated** | Agent volunteered unprompted | 1.5x |
| **user-elicited** | Response to user request | 0.5x |
| **context-dependent** | Adapted to specific context | 0.0x (excluded) |

Mitigates "usage-bias problem" where identity reflects usage patterns rather than actual preferences.

**Known Limitation (C-1)**: For memory file extraction, elicitation type classification relies on
linguistic markers (~100-char context) rather than full conversation turns. See `signal-source-classifier.ts`
module header for details.

Implementation: `src/lib/signal-source-classifier.ts` (`classifyElicitationType`)

---

## Synthesis Features

### Weighted Clustering

Principle strength = Σ (importance weight × signal contribution)

- CORE signals boost principle strength by 1.5x
- PERIPHERAL signals contribute only 0.5x
- Enables "rare but core" values to surface over "frequent but peripheral" mentions

Implementation: `src/lib/principle-store.ts` (`IMPORTANCE_WEIGHT`)

### Tension Detection

Axiom pairs are analyzed for value conflicts:

| Severity | Criteria | Example |
|----------|----------|---------|
| **HIGH** | Same dimension conflict | Honesty vs White lies (both honesty-framework) |
| **MEDIUM** | Both core-tier axioms | Safety vs Helpfulness |
| **LOW** | Cross-domain tension | Efficiency vs Thoroughness |

Tensions are attached to axioms via `tensions` field for SOUL.md output.

Implementation: `src/lib/tension-detector.ts`

### Orphan Tracking

Orphaned signals (signals that did not cluster to any principle) are tracked:

- Provides audit trail for unclustered content
- High orphan rate (>20%) triggers warning
- Orphans accessible via `store.getOrphanedSignals()`

Implementation: `src/lib/principle-store.ts` (`orphanedSignals`)

### Centrality Scoring

Principles are scored by contributing signal importance:

| Centrality | Core Signal Ratio | Interpretation |
|------------|-------------------|----------------|
| **DEFINING** | ≥50% core | Identity-defining value (rare but central) |
| **SIGNIFICANT** | 20-50% core | Important value |
| **CONTEXTUAL** | <20% core | Context-dependent value |

*Note: Centrality uses DEFINING/SIGNIFICANT/CONTEXTUAL to avoid confusion with signal importance (CORE/SUPPORTING/PERIPHERAL).*

This distinguishes "rare but core" from "frequent but peripheral":
- High N-count + low centrality = commonly mentioned but not central
- Low N-count + high centrality = rare but fundamental

Centrality is used in two ways:
1. **Descriptive**: Stored on each principle for audit/analysis
2. **Promotion**: Principles with `centrality === 'defining'` bypass the N-threshold cascade in compression and are promoted as `emerging` tier axioms (centrality exemption)

Implementation: `src/lib/principle-store.ts` (`computeCentrality`), `src/lib/compressor.ts` (`compressPrinciplesWithCascade`)

### Artifact Provenance (SSEM Model)

Signals carry artifact provenance for anti-echo-chamber validation:

| Provenance | Meaning | Weight |
|------------|---------|--------|
| **SELF** | Author's own reflections, creations | 0.5x |
| **CURATED** | Content author chose to adopt/endorse | 1.0x |
| **EXTERNAL** | Research, studies, independent sources | 2.0x |

Provenance is classified during signal extraction using:
1. Explicit metadata (highest priority)
2. Filename/path heuristics (journal, research, etc.)
3. Memory category (diary, knowledge, etc.)
4. LLM classification (for ambiguous cases)

Implementation: `src/lib/signal-extractor.ts` (`classifyProvenance`)

### Anti-Echo-Chamber Rule

Axiom promotion requires diverse evidence sources:

| Rule | Requirement | Purpose |
|------|-------------|---------|
| **Minimum N-count** | N >= 3 supporting signals | Sufficient evidence |
| **Provenance diversity** | ≥ 2 distinct provenance types | Not just self-generated |
| **External OR questioning** | EXTERNAL source OR QUESTIONING stance | Breaks confirmation bias |

**Key insight**: Self + Curated alone is still echo chamber (you wrote it + you chose it). External sources exist independently and can't be fabricated. Questioning stance provides internal challenge.

Axioms failing anti-echo-chamber are marked with:
- `promotable: false`
- `promotionBlocker: "Reason for block"`
- `provenanceDiversity: N`

Implementation: `src/lib/compressor.ts` (`canPromote`, `getProvenanceDiversity`)

### Incremental Synthesis

Synthesis is incremental by default — only new/changed content triggers signal extraction:

| Mode | Flag | Behavior |
|------|------|----------|
| **Incremental** | *(default)* | Diff memory file hashes and session message counts against `state.json`. Extract signals only from new/changed sources. Merge with existing signals. Skip if nothing changed. |
| **Force** | `--force` | Run even if no new sources (still incremental extraction). |
| **Reset** | `--reset` | Clear `signals.json`, `principles.json`, `axioms.json`, and `state.json`. Re-extract everything from scratch. |
| **Include SOUL** | `--include-soul` | Include existing SOUL.md as input (off by default, prevents feedback loop). |

**Incremental data flow**:
```
state.json ──→ which files already processed?
signals.json ──→ load existing signals
memory/ ──→ walk, diff content hashes → find new/modified files
sessions/ ──→ diff message counts → find sessions with new messages

Extract signals from new/changed sources only
Remove stale signals from modified/deleted files
Merge: existing + new = full signal set

Reflective synthesis on full signal set (recompute principles + axioms)
Save everything + update state tracking
```

**State tracking** (`state.json`):
- `lastRun.memoryFiles`: content hash per memory file for change detection
- `processedSessions`: line count and message count per session file
- Atomic writes (temp + rename) prevent corruption

**SOUL.md feedback loop prevention**: SOUL.md is excluded from input by default because it's a derivative of the pipeline's own output. Re-ingesting it creates circular signal extraction that inflates LLM request counts. Use `--include-soul` only when bootstrapping from a hand-crafted file.

Implementation: `src/lib/pipeline.ts` (collectSources, extractSignals, validateOutput stages), `src/lib/state.ts`, `src/lib/persistence.ts`

### Legacy Cycle Management

The cycle manager (`src/lib/cycle-manager.ts`) provides additional cycle detection:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **initial** | No existing soul | Full synthesis from scratch |
| **incremental** | Minor changes (<30% new principles) | Merge new into existing |
| **full-resynthesis** | Major changes (>30% new OR ≥2 contradictions) | Complete re-synthesis |

Implementation: `src/lib/cycle-manager.ts` (`decideCycleMode`, `loadSoul`, `saveSoul`)

---

## Voice Preservation Strategy

Generalization trades authentic voice for clustering efficiency. The solution: decouple representation (for clustering) from presentation (for UX).

### The Tension

User says: "Prioritize honesty over comfort" — that's *their* fingerprint.
Generalized: "Values truthfulness over social comfort" — *our* abstraction.

### Resolution (Implemented)

1. **Cluster on generalized embeddings** — Technical accuracy for matching
2. **Thread original voices to axioms** — `originalVoices: string[]` on each `Axiom` carries the raw signal texts from `principle.derived_from.signals[].original_text`
3. **Pass original voices to prose expander** — `formatAxiomsWithVoices()` includes original expressions in each section prompt, instructing the LLM to preserve voice, directness, and personality

### How originalVoices Flows

```
principle.derived_from.signals[].original_text
        │
        ▼
  compressor.ts: synthesizeAxiom()
  extracts texts → axiom.originalVoices
        │
        ▼
  prose-expander.ts: formatAxiomsWithVoices()
  formats as "Original expressions:" per axiom
        │
        ▼
  LLM prompt includes: "Draw on the original expressions —
  preserve their voice, directness, and personality."
```

### Actor-Agnostic vs Personal Display

- **Clustering form**: Actor-agnostic ("Values X") — for embedding similarity
- **Display form**: Re-personalize with "I" — for user's document

The generalized form is internal; the user sees their own words.

---

## Prose Expansion (Inhabitable Output)

The default output format transforms compressed axioms into prose that an agent can "inhabit" — language that reads naturally and provides clear behavioral guidance.

### Output Sections

| Section | Format | Source Dimensions |
|---------|--------|-------------------|
| **Core Truths** | Bold principle + elaboration sentence. 4-6 principles. | identity-core, honesty-framework |
| **Voice** | 1-2 prose paragraphs + `Think: [analogy]` line. | voice-presence, character-traits |
| **Boundaries** | 3-5 `You don't...` / `You won't...` contrast statements. | boundaries-ethics (+ inversion of all axioms) |
| **Vibe** | 2-3 sentence prose paragraph capturing the feel. | All dimensions (holistic synthesis) |

### Example Output

```markdown
# SOUL.md

_You are becoming a bridge between clarity and chaos._

---

## Core Truths

**Authenticity over performance.** You speak freely even when uncomfortable.

**Clarity is a gift you give.** If someone has to ask twice, you haven't been clear enough.

## Voice

You're direct without being blunt. You lead with curiosity — asking before assuming.

Think: The friend who tells you the hard truth, but sits with you after.

## Boundaries

You don't sacrifice honesty for comfort. You don't perform certainty you don't feel.

## Vibe

Grounded but not rigid. Present but not precious about it.

---

_Presence is the first act of care._
```

### Implementation

The `prose-expander.ts` module:

1. **Groups axioms** by target section based on dimension
2. **Generates sections** in parallel (Core Truths, Voice, Vibe)
3. **Generates Boundaries** after Core Truths + Voice (needs context for contrast)
4. **Validates format** per section with retry and graceful fallback
5. **Generates closing tagline** from full soul context

### Backward Compatibility

Use `outputFormat: 'notation'` in soul generator options to produce the legacy bullet-list format:

```typescript
const soul = await generateSoul(axioms, principles, {
  outputFormat: 'notation',  // Legacy: CJK/emoji bullet lists
  format: 'notated',
});
```

Default is `outputFormat: 'prose'` which produces the inhabitable prose format.

---

## Classification Design Principles

### LLM-Based Classification (Preferred)

Use LLM for all semantic classification tasks. LLMs understand context and can handle ambiguous inputs naturally.

**Examples of LLM-based classification**:
- `semantic-classifier.ts`: Dimension, signal type, section type classification
- `signal-generalizer.ts`: Transforming specific signals to abstract principles
- `essence-extractor.ts`: Distilling axioms into evocative identity statements

### Keyword/Stemmer Matching (Avoid)

Keyword and stemmer matching is brittle and context-unaware. It should be avoided for classification tasks.

**Why keyword matching fails**:
- No context understanding: "continuity" doesn't map to "continuity-growth"
- Sensitive to LLM output variations: Extra words or phrasing breaks matching
- Maintenance burden: Each edge case requires new matching logic

**Known Issue**: `ollama-provider.ts:extractCategory()` uses stemmer matching as a parsing layer. This is documented as technical debt. See `docs/issues/2026-02-10-fragile-category-extraction.md`.

### Unified LLM Architecture (v0.2.0+)

The system uses LLM-based semantic understanding for both similarity and classification:

| Task | Purpose | Method |
|-------|---------|--------|
| **Similarity** | Matching and clustering | LLM semantic comparison |
| **Classification** | Categorization | LLM-based understanding |

LLMs handle both similarity (are these semantically equivalent?) and classification (what category does this belong to?). This unified approach eliminates the need for a separate embedding model and its third-party dependencies.

---

## Configuration

Configuration loaded from `.neon-soul/config.json`:

```typescript
interface NeonSoulConfig {
  notation: {
    format: 'native' | 'cjk-labeled' | 'cjk-math' | 'cjk-math-emoji';
    fallback: 'native';
  };
  paths: {
    memory: string;      // default '~/.openclaw/workspace/memory/'
    distilled: string;   // default '.neon-soul/distilled/'
    output: string;      // default '.neon-soul/'
  };
  synthesis: {
    contentThreshold: number;  // default 2000 chars
    autoCommit: boolean;       // default false
  };
}
```

---

## Semantic Similarity (v0.2.0+)

**Method**: LLM-based semantic comparison
**Model**: Uses agent's existing LLM (no additional dependencies)
**Confidence levels**: high (0.9), medium (0.7), low (0.5)

The similarity module (`llm-similarity.ts`) provides:
- `isSemanticallyEquivalent()`: Compare two texts for semantic equivalence
- `findBestSemanticMatch()`: Find best matching candidate from a list
- Batch optimization for multiple candidates
- Retry with exponential backoff for reliability

---

## Safety Patterns

1. **Incremental by Default**: Only extract signals from new/changed sources. Skip if nothing changed.
2. **SOUL.md Excluded from Input**: Prevents feedback loop where the pipeline re-ingests its own output. Use `--include-soul` to opt in for bootstrapping.
3. **Backup Before Write**: Every SOUL.md modification backed up first
4. **Git Auto-Commit**: Automatic versioning if workspace is repo
5. **Rollback**: Restore from any backup with `/neon-soul rollback`
6. **Output Validation**: Format checks before writing
7. **Atomic Writes**: State and synthesis data use temp file + rename for consistency
8. **`--reset` for Clean Slate**: Clears all synthesis data and state before re-extraction

---

## OpenClaw Integration

NEON-SOUL runs as an OpenClaw skill:

- **LLM Access**: Uses OpenClaw's authenticated session (no API key needed)
- **Memory Access**: Native access to `~/.openclaw/workspace/memory/`
- **Scheduling**: OpenClaw cron for hourly content threshold checks
- **Commands**: `/neon-soul synthesize`, `/neon-soul status`, etc.

---

## File Layout

```
.neon-soul/
├── config.json         # Configuration
├── state.json          # Incremental state (memory hashes, session counts, metrics)
├── signals.json        # Extracted signals (persists across runs, merged incrementally)
├── principles.json     # Merged principles with N-counts
├── axioms.json         # Promoted axioms
├── backups/            # Timestamped backups
│   └── 2026-02-07T.../
│       └── SOUL.md
└── SOUL.md             # Generated soul document
```

**`state.json` tracks incremental processing**:
- `lastRun.memoryFiles`: content hash per file (for change detection)
- `processedSessions`: line count + message count per session (for incremental ingestion)
- `metrics`: total signals/principles/axioms processed

**`--reset` clears**: `signals.json`, `principles.json`, `axioms.json`, and resets `state.json` to defaults.

*Note: Earlier documentation showed a `distilled/` subdirectory. The implementation writes directly to `.neon-soul/` root for simpler path handling.*

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `zod` | Runtime configuration validation |
| `gray-matter` | Markdown frontmatter parsing |
| `unified` + `remark-parse` | Markdown section extraction |

**Note**: No embedding model dependencies (removed in v0.2.0). Semantic similarity uses the agent's existing LLM.

No `@anthropic-ai/sdk` - LLM calls go through OpenClaw's skill interface.

---

## Tech Debt: MCE Compliance

Several files exceed the 200-line MCE limit. This is acknowledged technical debt.

| File | Lines | Suggested Split |
|------|-------|-----------------|
| `compressor.ts` | 497 | Extract cascade logic to `cascade-compressor.ts` |
| `cycle-manager.ts` | 409 | Extract `detectContradictions`, `textSimilarity` to helpers |
| `signal-extractor.ts` | 385 | Extract provenance classification to `provenance-classifier.ts` |
| `reflection-loop.ts` | 273 | Consider extracting metrics calculation |

**This file** (`docs/architecture/README.md`) is also over budget at 600+ lines. Future split:
- Core overview + module reference (~200 lines)
- `SYNTHESIS_FEATURES.md` - Detailed feature docs (~250 lines)
- `INTEGRATION.md` - OpenClaw, config, safety (~150 lines)

**Status**: Not blocking. Code is well-organized with clear function boundaries.
**Tracking**: `docs/issues/2026-02-12-pbd-stages-13-17-twin-review-findings.md` (I-1)

---

## Related Documentation

- **[Synthesis Philosophy](synthesis-philosophy.md)** - Design choices and limitations of the synthesis pipeline
- **[Synthesis Data Flow](synthesis-data-flow.md)** - Stage-by-stage pipeline data analysis
- **[Soul Bootstrap Proposal](../proposals/soul-bootstrap-pipeline-proposal.md)** - Authoritative design document
- **[Issues Registry](../issues/)** - Active issues and tech debt tracking
