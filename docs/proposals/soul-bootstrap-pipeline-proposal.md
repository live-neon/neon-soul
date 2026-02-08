# Soul Bootstrap Pipeline Proposal

> **CRITICAL CONSTRAINT**: Implementation MUST be language-agnostic using semantic matching/similarity (embeddings + cosine similarity). NO regex, string contains, or keyword matching. Principles like "be concise" and "prefer brevity" must match semantically, not syntactically.

**Date**: 2026-02-07
**Status**: Draft
**Purpose**: Define the three-phase approach to building NEON-SOUL's extraction and compression pipeline

**Cross-references**:
- [Master Plan](../plans/2026-02-07-soul-bootstrap-master.md) - Master plan with phase sub-plans
- [Single-Source PBD Guide](../guides/single-source-pbd-guide.md) - Extraction methodology
- [Multi-Source PBD Guide](../guides/multi-source-pbd-guide.md) - Axiom distillation
- [OpenClaw Soul Generation Skills](../research/openclaw-soul-generation-skills.md) - Existing approaches
- [OpenClaw Self-Learning Agent](../research/openclaw-self-learning-agent.md) - Evolution mechanics
- [Hierarchical Principles Architecture](../research/hierarchical-principles-architecture.md) - Target schema

---

## Executive Summary

NEON-SOUL's value proposition is **dynamic soul compression from accumulated memory**—not static template generation. To build and validate this capability, we need:

1. **Test fixtures** from public SOUL.md templates (validate compression works)
2. **Local OpenClaw environment** (understand the data landscape)
3. **Memory ingestion pipeline** (the differentiating feature)

This proposal outlines all three phases as a cohesive development path.

---

## Technology Decision: Node/TypeScript

### Why Node/TypeScript Over Go

OpenClaw is built entirely in TypeScript/Node.js. Building NEON-SOUL in the same language provides:

| Benefit | Rationale |
|---------|-----------|
| **Same runtime** | Node.js already installed on every OpenClaw machine |
| **Same package manager** | pnpm, consistent tooling |
| **Shared config parsing** | Read `~/.openclaw/openclaw.json` directly with same patterns |
| **OpenClaw skill integration** | Uses OpenClaw's authenticated LLM access, no separate API key |
| **Native skill invocation** | `/neon-soul synthesize` works as OpenClaw skill |
| **Cron scheduling** | OpenClaw cron can run compression on schedule |
| **Upstream potential** | Could become PR to OpenClaw core |

### Why Not Go

| Go Argument | Counter |
|-------------|---------|
| Single binary distribution | Users have Node anyway (OpenClaw requires it) |
| Web app with HTMX | No longer needed—UX is chat-native |
| Personal preference | Ecosystem alignment outweighs preference |

### Embedding-Based Principle Matching

**Problem**: LLMs are non-deterministic. If we rely on the LLM to group signals into principles:
- Run 1: Groups signals into "Prefer conciseness"
- Run 2: Groups same signals into "Be brief and direct"
- Run 3: Splits them into two separate principles

N-count tracking becomes meaningless if we can't consistently identify "is this the same principle?"

**Solution**: Use embeddings for matching, LLM for extraction/synthesis.

```
Memory file → LLM extracts signal text (creative, one-time)
                    ↓
Signal text → Embedding model → 384-dim vector
                    ↓
Compare to existing principle embeddings (deterministic)
                    ↓
If cosine similarity > 0.85 → reinforce existing principle
If cosine similarity < 0.85 → create new principle candidate
                    ↓
When N≥3 signals cluster → LLM synthesizes principle statement (creative, one-time)
```

**Why this works**:
- **Embeddings are deterministic** for same input text
- **Cosine similarity** gives consistent numeric scores
- **Thresholds are tunable** (0.85 can be adjusted based on validation)
- **LLM creativity** only used at extraction and synthesis time, not matching

**Tech stack**:

```typescript
import { pipeline } from "@xenova/transformers";

// Initialize once at startup (downloads ~30MB model on first run)
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

// Generate embedding for a signal
async function embed(text: string): Promise<number[]> {
  const result = await extractor([text], { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

// Compare two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // Already normalized, so dot product = cosine similarity
}
```

**Model choice**: `all-MiniLM-L6-v2`
- 384 dimensions (compact)
- ~30MB download (one-time, cached)
- No API costs (runs locally via ONNX/WebAssembly)
- Good general-purpose semantic similarity
- Same approach OpenClaw uses for memory search

**Storage**: Embeddings stored alongside signals/principles in JSON:

```json
{
  "id": "sig_abc123",
  "text": "user prefers concise responses",
  "embedding": [0.023, -0.114, ...],  // 384 floats
  "source": { "file": "memory/2026-02-07.md", "line": 156 }
}
```

**Note**: Package is migrating from `@xenova/transformers` to `@huggingface/transformers` in newer versions. Check current LangChain docs for latest integration patterns.

---

### Notation Format Configuration

Principles and axioms can be expressed in multiple notation formats. The **semantic meaning is identical**—only the display format differs.

**Available formats**:

| Format | Example | Use Case |
|--------|---------|----------|
| `native` | "honesty over performance" | Plain English, accessible |
| `cjk-labeled` | "誠 (honesty over performance)" | CJK anchor with explanation |
| `cjk-math` | "誠: honesty > performance" | Compact, mathematical |
| `cjk-math-emoji` | "🎯 誠: honesty > performance" | Richest, visual indicators |

**Configuration** (in `.neon-soul/config.json`):

```json
{
  "notation": {
    "format": "cjk-math-emoji",
    "fallback": "native"
  }
}
```

**Format selection logic**:
1. If user has configured format → use it
2. If existing `compass.md` found → auto-detect format from it
3. Otherwise → default to `cjk-math` (good balance of density and readability)

**Internal storage**: Always store the **canonical form** (all components):

```typescript
interface Axiom {
  // ... other fields
  canonical: {
    emoji?: string;        // "🎯"
    cjk: string;           // "誠"
    math: string;          // "honesty > performance"
    native: string;        // "honesty over performance"
  };
}
```

**Rendering**: Format function generates output based on user preference:

```typescript
function renderAxiom(axiom: Axiom, format: NotationFormat): string {
  switch (format) {
    case "native":
      return axiom.canonical.native;
    case "cjk-labeled":
      return `${axiom.canonical.cjk} (${axiom.canonical.native})`;
    case "cjk-math":
      return `${axiom.canonical.cjk}: ${axiom.canonical.math}`;
    case "cjk-math-emoji":
      return `${axiom.canonical.emoji} ${axiom.canonical.cjk}: ${axiom.canonical.math}`;
  }
}
```

**Why store canonical form**:
- User can switch formats without re-extraction
- Embedding is computed from `native` text (language-agnostic matching)
- CJK anchors provide semantic density for token efficiency
- Emoji provides visual categorization

---

### Chat-Native UX Decision

OpenClaw's primary interface is **messaging apps** (Telegram, Discord, Slack, etc.). Rather than building a separate web app, NEON-SOUL integrates into the existing chat flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw Chat (Telegram/Discord/etc)        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🦞 Agent: I've analyzed your recent interactions and extracted │
│     new principles. Here's what I found:                        │
│                                                                 │
│     **Proposed Soul Update:**                                   │
│     - Add: "Prefer direct, concise responses"                   │
│     - Strengthen: "Declare uncertainty before proceeding"       │
│                                                                 │
│     Approve? Reply /approve-soul or /reject-soul                │
│                                                                 │
│  👤 User: /approve-soul                                         │
│                                                                 │
│  🦞 Agent: ✅ Soul updated. Backed up to                        │
│     .identity-backups/2026-02-07-124532/                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Architecture

### Directory Structure

```
neon-soul/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # OpenClaw skill entry point
│   ├── commands/
│   │   ├── extract.ts              # Extract principles from memory
│   │   ├── compress.ts             # Compress principles to axioms
│   │   ├── merge.ts                # Merge NEON-SOUL + OpenClaw outputs
│   │   ├── diff.ts                 # Show proposed changes
│   │   ├── apply.ts                # Write enhanced soul
│   │   ├── rollback.ts             # Restore backup
│   │   ├── audit.ts                # Trace axiom provenance
│   │   └── interview.ts            # Interactive Q&A for gaps
│   ├── lib/
│   │   ├── config.ts               # Read OpenClaw config
│   │   ├── memory-reader.ts        # Parse memory/*.md files
│   │   ├── openclaw-reader.ts      # Parse OpenClaw's SOUL.md output
│   │   ├── extractor.ts            # Single-source PBD implementation
│   │   ├── embeddings.ts           # @xenova/transformers wrapper for semantic matching
│   │   ├── matcher.ts              # Cosine similarity matching for signals→principles
│   │   ├── compressor.ts           # Multi-source PBD → axioms
│   │   ├── merger.ts               # Merge OpenClaw + NEON-SOUL
│   │   ├── distiller.ts            # Store distilled artifacts
│   │   ├── llm.ts                  # OpenClaw skill LLM interface
│   │   ├── diff.ts                 # Generate human-readable diff
│   │   └── backup.ts               # Backup + git commit
│   └── types/
│       └── index.ts                # TypeScript types
├── skill/
│   └── SKILL.md                    # OpenClaw skill definition
├── test/
│   ├── fixtures/
│   │   ├── souls/                  # Downloaded SOUL.md templates
│   │   └── memory/                 # Synthetic memory files
│   └── *.test.ts                   # Test files
└── docs/                           # Documentation
```

### Runtime Artifact Structure (in OpenClaw workspace)

```
~/.openclaw/workspace/
├── SOUL.md                           # Enhanced output (NEON-SOUL writes)
├── memory/                           # OpenClaw daily logs
│   ├── 2026-02-07.md
│   └── ...
└── .neon-soul/                       # NEON-SOUL artifacts
    ├── distilled/
    │   ├── memory/                   # Per-memory-file extractions
    │   │   ├── 2026-02-07.json
    │   │   └── ...
    │   └── openclaw/                 # OpenClaw SOUL.md snapshots
    │       ├── 2026-02-07.json
    │       └── ...
    ├── axioms.json                   # Accumulated axioms
    ├── principles.json               # Accumulated principles
    ├── state.json                    # Processing state
    └── history/                      # SOUL.md versions
        └── ...
```

### OpenClaw Skill Commands

```bash
# Core synthesis pipeline (hybrid C+D workflow)
/neon-soul synthesize                    # Full pipeline: extract → merge → apply
/neon-soul synthesize --dry-run          # Preview changes without writing

# Individual steps (for debugging/manual control)
/neon-soul extract --memory ~/.openclaw/workspace/memory/
/neon-soul capture-openclaw              # Snapshot current OpenClaw SOUL.md
/neon-soul compress --principles ./output/principles/
/neon-soul merge                         # Merge NEON-SOUL + OpenClaw
/neon-soul diff                          # Show proposed changes
/neon-soul apply                         # Write enhanced SOUL.md
/neon-soul rollback                      # Restore previous version

# Interview for missing dimensions
/neon-soul interview --gaps identity,boundaries

# Transparency & debugging
/neon-soul status                        # Current state, last sync
/neon-soul audit <axiom>                 # Trace axiom provenance
/neon-soul audit --principle "conciseness"  # Find source of principle
/neon-soul compare                       # Diff NEON-SOUL vs OpenClaw extraction
/neon-soul history                       # Show SOUL.md version history
/neon-soul metrics --verbose             # Compression ratios, growth stats
```

### OpenClaw Skill Integration

```yaml
# skill/SKILL.md
---
name: neon-soul
description: Compressed soul extraction and evolution from memory
user-invocable: true
metadata:
  openclaw:
    homepage: https://github.com/your-org/neon-soul
---

## Commands

- `/soul-sync` - Full synthesis: extract from memory + merge with OpenClaw + compress
- `/soul-interview` - Start guided interview for missing dimensions
- `/approve-soul` - Approve pending soul update
- `/reject-soul` - Reject pending soul update
- `/rollback-soul` - Restore previous soul version
- `/soul-status` - Show current state, compression metrics, last sync
- `/soul-audit <topic>` - Trace why a belief/axiom exists (provenance)
- `/soul-compare` - Compare NEON-SOUL extraction vs OpenClaw extraction

## How It Works

NEON-SOUL **enhances** OpenClaw's soul synthesis with compression and transparency.
It doesn't replace OpenClaw—it layers on top.

**Dual-track synthesis**:
1. OpenClaw extracts from memory → verbose SOUL.md (captured + distilled)
2. NEON-SOUL extracts from memory → axioms + principles (stored for audit)
3. Merge engine combines both → enhanced compressed SOUL.md

**Compression is a multiplier**: A 7:1 ratio means your soul holds 7x more wisdom
in the same token budget. Over time, your soul GROWS denser, not smaller.

**Full transparency**: Every axiom traces back to source memory files.
Run `/soul-audit "honesty"` to see exactly where that value came from.

When you run `/soul-sync`:

1. Captures OpenClaw's current SOUL.md → stores in `.neon-soul/distilled/openclaw/`
2. Reads new memory since last sync → stores in `.neon-soul/distilled/memory/`
3. Extracts principles using PBD (both tracks)
4. Merges OpenClaw content + NEON-SOUL compression
5. Shows diff and waits for approval
6. If approved, writes enhanced SOUL.md + backup

Run `/neon-soul --help` for available commands.
```

---

## Integration Architecture: Four Options

NEON-SOUL must integrate with OpenClaw's existing self-learning agent, which already rewrites SOUL.md daily. There are four integration strategies, plus a recommended hybrid.

### Option A: NEON-SOUL Replaces OpenClaw Synthesis

```
memory/*.md → NEON-SOUL PBD → compressed SOUL.md

(OpenClaw synthesis disabled)
```

| Pros | Cons |
|------|------|
| Clean ownership | Lose OpenClaw's synthesis logic |
| Full compression control | Must replicate all OpenClaw features |
| Single source of truth | Breaking change for existing users |

**When to use**: Greenfield deployments, users who want maximum compression.

---

### Option B: NEON-SOUL Post-Processes OpenClaw Output

```
memory/*.md → OpenClaw synthesis → verbose SOUL.md
                                        ↓
                               NEON-SOUL compresses
                                        ↓
                               compressed SOUL.md
```

| Pros | Cons |
|------|------|
| Leverages OpenClaw's work | Two synthesis passes |
| Non-breaking | May compress already-distilled content |
| Simple mental model | Coordination timing needed |

**When to use**: Quick integration, trust OpenClaw's extraction.

---

### Option C: Parallel Merge (Enhance, Don't Replace)

```
memory/*.md ──┬──→ OpenClaw synthesis → verbose SOUL.md ──┐
              │                                           │
              └──→ NEON-SOUL PBD → axioms + principles ───┤
                                                          ↓
                                                    MERGE ENGINE
                                                          ↓
                                               enhanced SOUL.md
```

| Pros | Cons |
|------|------|
| No regression of OpenClaw features | Merge complexity |
| Both systems contribute | Potential conflicts |
| Can compare outputs | Two codepaths to maintain |
| Graceful degradation (if NEON-SOUL fails, OpenClaw still works) | |

**When to use**: Production deployments, risk-averse adoption.

---

### Option D: NEON-SOUL Primary with Full Audit Trail

```
memory/*.md → NEON-SOUL reads directly
                    ↓
         Store: .neon-soul/distilled/YYYY-MM-DD.json
                    ↓
         Merge into axioms.json + principles.json
                    ↓
         Generate compressed SOUL.md
                    ↓
         Store: .neon-soul/history/SOUL.md.timestamp
```

| Pros | Cons |
|------|------|
| Full transparency | NEON-SOUL must handle all extraction |
| Audit trail for every change | More storage |
| Debug/diagnose capability | Complexity |
| Traceable axiom provenance | |

**When to use**: When transparency and debugging are priorities.

---

### Recommended: Hybrid C+D (Enhance with Audit Trail)

Combine Option C's non-regression guarantee with Option D's transparency:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-TRACK SYNTHESIS                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────┐                   ┌───────────────────┐
│ OpenClaw Track    │                   │ NEON-SOUL Track   │
├───────────────────┤                   ├───────────────────┤
│ memory/*.md       │                   │ memory/*.md       │
│       ↓           │                   │       ↓           │
│ OpenClaw synth    │                   │ PBD extraction    │
│       ↓           │                   │       ↓           │
│ verbose SOUL.md   │                   │ signals → principles │
│       ↓           │                   │       ↓           │
│ STORE: distilled/ │                   │ STORE: distilled/ │
│ openclaw-YYYY.json│                   │ memory-YYYY.json  │
└────────┬──────────┘                   └────────┬──────────┘
         │                                       │
         └──────────────────┬────────────────────┘
                            ▼
                   ┌─────────────────┐
                   │  MERGE ENGINE   │
                   ├─────────────────┤
                   │ OpenClaw content│
                   │ + NEON-SOUL     │
                   │   compression   │
                   │ + axiom layer   │
                   └────────┬────────┘
                            ↓
                   ┌─────────────────┐
                   │ enhanced SOUL.md│
                   │ (compressed)    │
                   └────────┬────────┘
                            ↓
                   ┌─────────────────┐
                   │ STORE: history/ │
                   │ + state.json    │
                   └─────────────────┘
```

**Key insight**: We store distilled versions of BOTH:
1. Each memory file → `.neon-soul/distilled/memory-YYYY-MM-DD.json`
2. OpenClaw's SOUL.md output → `.neon-soul/distilled/openclaw-YYYY-MM-DD.json`

This enables:
- **Audit**: Trace any axiom back to source memory AND see what OpenClaw extracted
- **Debug**: Compare NEON-SOUL extraction vs OpenClaw extraction
- **Transparency**: Move away from "magic black box" - every change is traceable
- **No regression**: OpenClaw's full functionality preserved as baseline

---

### Artifact Storage Structure

```
~/.openclaw/workspace/
├── SOUL.md                           # Final enhanced output (written by NEON-SOUL)
├── memory/
│   ├── 2026-02-07.md                 # Ephemeral daily logs (OpenClaw writes)
│   └── ...
└── .neon-soul/                       # NEON-SOUL artifacts
    ├── distilled/
    │   ├── memory/                   # Per-memory-file extractions
    │   │   ├── 2026-02-07.json       # Signals + principles from that day
    │   │   └── ...
    │   └── openclaw/                 # OpenClaw SOUL.md snapshots (distilled)
    │       ├── 2026-02-07.json       # What OpenClaw generated that day
    │       └── ...
    ├── axioms.json                   # Accumulated axioms (grows over time)
    ├── principles.json               # Accumulated principles (grows)
    ├── state.json                    # Last processed files, timestamps
    └── history/                      # SOUL.md version history
        ├── 2026-02-07T12:34:56.md    # Full snapshots for rollback
        └── ...
```

### Provenance-First Data Model

The magic of PBD is **full auditability**. Every axiom traces back to exact source lines.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROVENANCE CHAIN                             │
└─────────────────────────────────────────────────────────────────┘

Memory Line → Signal → Principle → Axiom
     ↓           ↓          ↓          ↓
 (source)    (extract)   (distill)  (converge N≥3)

Example trace for axiom "誠 (honesty > performance)":

  memory/2026-02-01.md:156  "User said: be honest even if uncomfortable"
           ↓
  Signal: { type: "value", text: "honesty > comfort" }
           ↓
  Principle: "Prioritize honesty over social comfort"
           ↓
  memory/2026-02-03.md:89   "User corrected: don't sugarcoat bad news"
           ↓
  Signal: { type: "correction", text: "no sugarcoating" }
           ↓
  Principle: "Direct communication preferred"
           ↓
  memory/2026-02-05.md:234  "User praised: thanks for being straight with me"
           ↓
  Signal: { type: "reinforcement", text: "directness valued" }
           ↓
  Principle: "Directness builds trust"
           ↓
  ══════════════════════════════════════════════════════════
  N=3 convergence detected → AXIOM PROMOTED
  ══════════════════════════════════════════════════════════
           ↓
  Axiom: "誠 (honesty > performance)"
         subsumes: ["Prioritize honesty...", "Direct communication...", "Directness builds..."]
         sources: 3 memory files, 3 signals, first seen: 2026-02-01
```

### Data Structures with Full Provenance

**Signal** (atomic unit of extraction):

```typescript
interface Signal {
  id: string;                    // Unique ID for reference
  type: "preference" | "correction" | "boundary" | "value" | "reinforcement";
  text: string;                  // The extracted signal
  confidence: number;            // 0-1 extraction confidence

  // EMBEDDING (for deterministic matching)
  embedding: number[];           // 384-dim vector from all-MiniLM-L6-v2

  // PROVENANCE (required)
  source: {
    file: string;                // "memory/2026-02-07.md"
    line: number;                // 156
    context: string;             // Surrounding text for verification
    extracted_at: string;        // ISO timestamp
  };
}
```

**Principle** (distilled from signals):

```typescript
interface Principle {
  id: string;                    // Unique ID
  text: string;                  // The principle statement
  dimension: string;             // SoulCraft dimension (identity, boundaries, etc.)
  strength: number;              // How strongly evidenced (frequency × recency)

  // EMBEDDING (centroid of all signal embeddings)
  embedding: number[];           // 384-dim vector, updated when signals added
  similarity_threshold: number;  // Default 0.85, can be tuned per-principle

  // PROVENANCE (required)
  derived_from: {
    signals: string[];           // Signal IDs that created this principle
    first_seen: string;          // When first extracted
    last_reinforced: string;     // Most recent supporting signal
    reinforcement_count: number; // How many times seen
  };

  // AUDIT LOG
  history: Array<{
    event: "created" | "reinforced" | "weakened" | "merged";
    timestamp: string;
    signal_id?: string;          // Which signal caused this event
    details?: string;
  }>;
}
```

**Axiom** (converged from principles, N≥3):

```typescript
interface Axiom {
  id: string;                    // Unique ID
  text: string;                  // The axiom (may include CJK anchor)
  cjk_anchor?: string;           // e.g., "誠" for honesty
  tier: "core" | "domain" | "emerging";

  // PROVENANCE (required)
  derived_from: {
    principles: string[];        // Principle IDs that converged
    convergence_count: number;   // N-count (must be ≥3 for axiom status)
    first_convergence: string;   // When N≥3 was reached
    sources_summary: {
      memory_files: string[];    // All source files
      date_range: { from: string; to: string };
      total_signals: number;
    };
  };

  // AUDIT LOG
  history: Array<{
    event: "promoted" | "strengthened" | "weakened" | "demoted" | "merged";
    timestamp: string;
    from_n: number;              // Previous N-count
    to_n: number;                // New N-count
    principle_id?: string;       // Which principle caused change
    details?: string;
  }>;
}
```

### Distilled File Formats

**Memory distillation** (`.neon-soul/distilled/memory/2026-02-07.json`):

```json
{
  "source": "memory/2026-02-07.md",
  "processed_at": "2026-02-07T14:32:00Z",
  "lines_processed": { "from": 142, "to": 500 },

  "signals": [
    {
      "id": "sig_2026020701",
      "type": "preference",
      "text": "User prefers TypeScript over Go",
      "confidence": 0.9,
      "source": {
        "file": "memory/2026-02-07.md",
        "line": 156,
        "context": "...discussed language choice, user said 'let's use TypeScript for ecosystem alignment'...",
        "extracted_at": "2026-02-07T14:32:01Z"
      }
    },
    {
      "id": "sig_2026020702",
      "type": "correction",
      "text": "Be more concise",
      "confidence": 0.95,
      "source": {
        "file": "memory/2026-02-07.md",
        "line": 201,
        "context": "...user interrupted: 'shorter please, get to the point'...",
        "extracted_at": "2026-02-07T14:32:01Z"
      }
    }
  ],

  "principles_affected": [
    {
      "principle_id": "prin_typescript_preference",
      "event": "reinforced",
      "by_signal": "sig_2026020701"
    },
    {
      "principle_id": "prin_conciseness",
      "event": "reinforced",
      "by_signal": "sig_2026020702",
      "new_reinforcement_count": 5
    }
  ],

  "axioms_affected": [
    {
      "axiom_id": "ax_efficiency",
      "event": "strengthened",
      "by_principle": "prin_conciseness",
      "new_n_count": 4
    }
  ]
}
```

**OpenClaw distillation** (`.neon-soul/distilled/openclaw/2026-02-07.json`):

```json
{
  "source": "SOUL.md (OpenClaw output)",
  "captured_at": "2026-02-07T03:00:00Z",
  "openclaw_version": "0.2.45",
  "checksum": "sha256:abc123...",
  "token_count": 3247,

  "sections": {
    "core_truths": ["Be genuinely helpful", "Honest beats polite", "..."],
    "boundaries": ["Private things stay private", "..."],
    "vibe": ["Direct, competent", "..."],
    "continuity": ["This document evolves through reflection"]
  },

  "neon_soul_analysis": {
    "mapped_to_principles": [
      {
        "openclaw_text": "Honest beats polite",
        "maps_to_principle": "prin_honesty_priority",
        "confidence": 0.95
      }
    ],
    "compression_opportunities": [
      {
        "openclaw_items": ["Honest beats polite", "Don't pretend emotions", "Be direct"],
        "could_compress_to": "誠 (honesty > performance)",
        "estimated_savings": "45 tokens"
      }
    ],
    "unmapped_items": [
      {
        "text": "Remember you're a guest",
        "reason": "No matching principle in NEON-SOUL - may need interview"
      }
    ]
  }
}
```

**Accumulated axioms** (`.neon-soul/axioms.json`):

```json
{
  "version": "1.0",
  "last_updated": "2026-02-07T14:32:00Z",

  "axioms": [
    {
      "id": "ax_honesty",
      "text": "誠 (honesty > performance)",
      "cjk_anchor": "誠",
      "tier": "core",

      "derived_from": {
        "principles": ["prin_honesty_priority", "prin_direct_communication", "prin_no_sugarcoating"],
        "convergence_count": 5,
        "first_convergence": "2026-02-05T10:00:00Z",
        "sources_summary": {
          "memory_files": ["memory/2026-02-01.md", "memory/2026-02-03.md", "memory/2026-02-05.md", "memory/2026-02-06.md", "memory/2026-02-07.md"],
          "date_range": { "from": "2026-02-01", "to": "2026-02-07" },
          "total_signals": 8
        }
      },

      "history": [
        { "event": "created", "timestamp": "2026-02-01T10:00:00Z", "details": "First signal extracted" },
        { "event": "promoted", "timestamp": "2026-02-05T10:00:00Z", "from_n": 2, "to_n": 3, "details": "Reached axiom threshold" },
        { "event": "strengthened", "timestamp": "2026-02-07T14:32:00Z", "from_n": 4, "to_n": 5 }
      ]
    }
  ]
}
```

### Future Enhancement: Cryptographic Integrity (v2+)

The v1 implementation focuses on **provenance** (where did this come from?). For future versions, we could add **cryptographic integrity** (has this been tampered with?) using patterns from the production audit system in `obviously-not/writer`.

| Feature | v1 (Provenance) | v2+ (Integrity) |
|---------|-----------------|-----------------|
| Source tracking | file, line, context | Same |
| History logging | event, timestamp, signal_id | Same |
| Derivation chains | signals → principles → axioms | Same |
| Hash linking | - | Each entry hashes previous |
| Chain verification | - | `/neon-soul verify-chain` |
| Privacy mode | - | PII sanitization for memory |
| Tamper detection | - | Cryptographic proof |

**When to upgrade to v2+**:
- Legal/compliance requirements for tamper-proof records
- Multi-user editing where unauthorized changes must be detected
- External audit requirements

**Reference**: See [Cryptographic Audit Chains](../research/cryptographic-audit-chains.md) for full pattern analysis and implementation checklist.

For v1, simple provenance tracking is sufficient for debugging and transparency goals.

---

### Audit Query Examples

```bash
# "Why do I have this axiom?"
$ /neon-soul audit ax_honesty

Axiom: 誠 (honesty > performance)
Status: Core axiom (N=5)
First seen: 2026-02-01
Last reinforced: 2026-02-07

Provenance chain:
├── Principle: "Prioritize honesty over social comfort"
│   └── Signal: "be honest even if uncomfortable" (memory/2026-02-01.md:156)
├── Principle: "Direct communication preferred"
│   └── Signal: "don't sugarcoat bad news" (memory/2026-02-03.md:89)
├── Principle: "Directness builds trust"
│   └── Signal: "thanks for being straight with me" (memory/2026-02-05.md:234)
└── 2 more reinforcing signals...

# "What changed today?"
$ /neon-soul audit --since today

Changes on 2026-02-07:
  [REINFORCED] ax_honesty: N=4 → N=5
    └── New signal from memory/2026-02-07.md:312
  [CREATED] prin_ecosystem_alignment
    └── From signal "let's use TypeScript" (memory/2026-02-07.md:156)
  [WEAKENED] prin_verbose_explanations: strength 0.8 → 0.6
    └── Contradicted by 3 "be concise" signals

# "Where did this principle come from?"
$ /neon-soul audit prin_conciseness --full

Principle: "Conciseness valued over thoroughness"
Strength: 0.9 (high)
Reinforcement count: 7

All source signals:
  1. memory/2026-02-01.md:201 - "shorter please"
  2. memory/2026-02-02.md:45  - "get to the point"
  3. memory/2026-02-03.md:178 - "too wordy"
  4. memory/2026-02-04.md:92  - "summarize"
  5. memory/2026-02-05.md:301 - "bullet points preferred"
  6. memory/2026-02-06.md:67  - "skip the preamble"
  7. memory/2026-02-07.md:445 - "concise response appreciated"
```

### Why This Matters: Transparency Over Magic

Current state: AI identity is a "black box" - changes happen, users don't know why.

With hybrid C+D:
- Every principle has **provenance** (which memory file, which line)
- Every axiom has **convergence evidence** (N=3 from these sources)
- OpenClaw's reasoning is **captured and comparable**
- Users can **audit** why their agent behaves a certain way
- Rollback is **granular** (undo specific learnings, not just dates)

This aligns with the broader goal: **AI systems should be transparent about how they form beliefs and identity.**

---

## Core Insight: Compression as Multiplier

**The wrong mental model**: Compression minimizes the soul (35K → 500 tokens, cap at 5-7 axioms).

**The right mental model**: Compression is a **multiplier** that allows the soul to grow denser over time.

### The Math

| Scenario | Tokens | Semantic Content | Multiplier |
|----------|--------|------------------|------------|
| Default SOUL.md (uncompressed) | 5,000 | 5,000 tokens worth | 1x |
| Compressed soul (7:1 ratio) | 5,000 | 35,000 tokens worth | 7x |
| Compressed soul (10:1 ratio) | 5,000 | 50,000 tokens worth | 10x |

### Soul Growth Timeline

```
Day 1 (bootstrap):     ~500 tokens → basic identity, core values
Month 1 (learning):    ~1,500 tokens → +preferences, +boundaries, +patterns
Month 6 (established): ~3,000 tokens → +domain expertise, +relationship nuances
Year 1 (mature):       ~5,000 tokens → dense, rich identity (35K uncompressed equiv)
Year 2+ (wisdom):      ~5,000 tokens → pruned to essential, highly compressed
```

### Hierarchical Density

Not all content compresses equally:

| Tier | Compression | Growth |
|------|-------------|--------|
| **Axioms** (core values) | 10:1+ | Stable (rarely changes) |
| **Principles** (domain rules) | 7:1 | Accumulates over time |
| **Patterns** (behavioral) | 5:1 | Rotates (recent replaces old) |
| **Context** (situational) | 3:1 | Ephemeral (session-only) |

### Implication for Design

- **No fixed axiom count** - Soul grows as agent learns
- **Budget-aware synthesis** - When approaching limit, compress harder or prune edges
- **Semantic density metric** - Track principles-per-token, should increase over time

---

## Phase 1: Template Compression Testing

### Objective

Download public SOUL.md templates, run them through the PBD pipeline, and measure compression effectiveness. This builds our testing infrastructure before tackling the harder problem.

### Approach

```
souls.directory (10-20 templates)
        │
        ▼
Download to test/fixtures/souls/
        │
        ▼
Single-Source PBD → Extract principles from each
        │
        ▼
Measure: principles per template, coverage of 7 dimensions
        │
        ▼
Multi-Source PBD → Extract axioms across templates
        │
        ▼
Measure: axiom convergence, semantic preservation
        │
        ▼
Hierarchical compression → Compressed soul per template
        │
        ▼
Measure: token reduction ratio, identity coherence
```

### Data Sources

| Source | URL | Expected Templates |
|--------|-----|-------------------|
| souls.directory | https://souls.directory/ | 22 templates across 8 categories |
| onlycrabs.ai | https://onlycrabs.ai | Additional published souls |
| aaronjmars/soul.md | github.com/aaronjmars/soul.md | Example structures |

### Test Fixtures Structure

```
test/fixtures/
├── souls/
│   ├── raw/                    # Downloaded SOUL.md templates
│   │   ├── startup-cto.md
│   │   ├── sre-oncall.md
│   │   ├── legal-reviewer.md
│   │   └── ...
│   ├── principles/             # Extracted principles per template
│   │   ├── startup-cto-principles.json
│   │   └── ...
│   ├── axioms/                 # Distilled axioms per template
│   │   ├── startup-cto-axioms.json
│   │   └── ...
│   └── compressed/             # Final compressed souls
│       ├── startup-cto-compressed.md
│       └── ...
└── memory/                     # Phase 3: synthetic memory fixtures
    └── ...
```

### Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Compression ratio | ≥6:1 | Original tokens / compressed tokens |
| Principle extraction | 5-15 per template | Count principles per source |
| Semantic density | Higher over time | Principles per 100 tokens (should increase) |
| Dimension coverage | 7/7 dimensions | SoulCraft framework coverage |
| Semantic preservation | Human evaluation | Can compressed soul predict original's behavior? |
| Growth capacity | Additive | New principles integrate without replacement |

### Deliverables

- [ ] Script to download templates from souls.directory
- [ ] 10-20 SOUL.md templates in `test/fixtures/souls/raw/`
- [ ] `src/lib/extractor.ts` - Single-source PBD implementation
- [ ] `src/lib/compressor.ts` - Multi-source PBD implementation
- [ ] Test suite with compression metrics
- [ ] Baseline measurements documented

---

## Phase 2: OpenClaw Local Environment

### Objective

Run OpenClaw in Docker to understand:
1. What data exists after fresh installation
2. What the memory file structure looks like in practice
3. What questions/data are needed to bootstrap a complete soul
4. How to design the chat-native interview flow for missing data

### Approach

```
Docker container (OpenClaw)
        │
        ├── Mount volume: ~/.openclaw/ → ./openclaw-data/
        │
        ▼
Fresh installation → Inspect default files
        │
        ▼
Run sample sessions → Generate memory files
        │
        ▼
Analyze: What identity data is present? What's missing?
        │
        ▼
Design chat interview flow to fill gaps
        │
        ▼
Map to SoulCraft 7 dimensions
```

### Docker Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  openclaw:
    image: openclaw/openclaw:latest
    volumes:
      - ./openclaw-data:/root/.openclaw
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    ports:
      - "18789:18789"  # Gateway port
    tty: true
    stdin_open: true
```

### Investigation Questions

| Question | How to Answer |
|----------|---------------|
| What files exist on fresh install? | `ls -la ./openclaw-data/` after first run |
| What's in default SOUL.md? | Read `./openclaw-data/workspace/SOUL.md` |
| How are memory files structured? | Run sessions, inspect `./openclaw-data/workspace/memory/` |
| What identity data accumulates naturally? | Analyze memory after 10+ interactions |
| What's missing for complete soul? | Compare to SoulCraft 7 dimensions |

### SoulCraft 7 Dimensions Gap Analysis

| Dimension | Likely Present in Memory? | Interview Needed? |
|-----------|--------------------------|-------------------|
| Identity Core | Partial (inferred from interactions) | Yes - explicit values/aspirations |
| Character Traits | Partial (observable patterns) | Maybe - confirm inferences |
| Voice & Presence | Yes (communication samples) | No - extractable |
| Honesty Framework | Partial (uncertainty expressions) | Yes - explicit calibration |
| Boundaries & Ethics | Partial (refusals, limits) | Yes - explicit guardrails |
| Relationship Dynamics | Yes (interaction patterns) | No - extractable |
| Continuity & Growth | Partial (memory references) | Yes - explicit evolution stance |

### Chat Interview Flow Design

Based on gap analysis, design minimal interview via chat commands:

```
/soul-interview starts conversation:

🦞 Agent: I'll ask a few questions to understand your values.
   These help me represent you accurately. Ready? (reply 'yes' to continue)

👤 User: yes

🦞 Agent: [1/4] What matters most to you when I help with tasks?
   (Examples: accuracy, speed, thoroughness, creativity)

👤 User: accuracy and being honest when you don't know something

🦞 Agent: Got it: Accuracy + epistemic honesty.
   [2/4] What should I never do, even if asked?

👤 User: never delete files without confirmation, never share private info

🦞 Agent: Noted as hard boundaries.
   [3/4] How should I handle uncertainty?

👤 User: say "I'm not sure" and explain why, then offer to investigate

🦞 Agent: Clear. [4/4] How do you want our working style to evolve?

👤 User: start cautious, earn trust over time, take more initiative as we work together

🦞 Agent: ✅ Interview complete. I've captured:
   - Core: Accuracy, epistemic honesty
   - Boundaries: No file deletion without confirm, no private info sharing
   - Uncertainty: Declare + explain + offer investigation
   - Growth: Cautious → trusted → proactive

   Run /soul-extract to generate your compressed soul.
```

### Deliverables

- [ ] Docker compose configuration for OpenClaw
- [ ] Documentation of fresh install file structure
- [ ] Memory file format analysis
- [ ] Gap analysis: memory vs 7 dimensions
- [ ] `src/commands/interview.ts` - Chat interview implementation
- [ ] Interview question set for missing dimensions

---

## Phase 3: Memory Ingestion Pipeline

### Objective

Build the core differentiating feature: **automatic soul extraction from accumulated memory files**. This is what makes NEON-SOUL dynamic rather than static.

### Why This Matters

| Existing Approaches | NEON-SOUL |
|--------------------|-----------|
| Interview → generate soul (one-time) | Memory → extract soul (continuous) |
| Static after creation | Evolves with usage |
| Manual refresh required | Automatic synthesis |
| User authors identity | Identity emerges from behavior |

### Architecture (Hybrid C+D)

```
┌─────────────────────────────────────────────────────────────────┐
│                         INPUT SOURCES                            │
└─────────────────────────────────────────────────────────────────┘
        │                                       │
        ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│ OpenClaw SOUL.md    │               │ memory/*.md         │
│ (after their synth) │               │ (daily logs)        │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────────┐               ┌─────────────────────┐
│ openclaw-reader.ts  │               │ memory-reader.ts    │
│ Capture + distill   │               │ Parse + extract     │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
          ▼                                     ▼
┌─────────────────────┐               ┌─────────────────────┐
│ STORE: distilled/   │               │ STORE: distilled/   │
│ openclaw/YYYY.json  │               │ memory/YYYY.json    │
│ (audit trail)       │               │ (audit trail)       │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
          └──────────────┬──────────────────────┘
                         ▼
          ┌─────────────────────────┐
          │ extractor.ts (PBD)      │
          │ Extract principles      │
          │ Weight by recency+freq  │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ compressor.ts           │
          │ Principles → axioms     │
          │ (when N≥3 convergence)  │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ merger.ts               │
          │ OpenClaw baseline       │
          │ + NEON-SOUL compression │
          │ + axiom layer           │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ Enhanced SOUL.md        │
          │ (grows over time)       │
          │ Day 1: ~500 tokens      │
          │ Month 1: ~2K tokens     │
          │ Year 1: ~5K tokens      │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ Present diff in chat    │
          │ Wait for /approve-soul  │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ backup.ts               │
          │ Store in history/       │
          │ Write SOUL.md           │
          │ Update state.json       │
          └─────────────────────────┘
```

### Dual-Track Benefits

| Aspect | OpenClaw Track | NEON-SOUL Track |
|--------|---------------|-----------------|
| **Input** | memory/*.md | memory/*.md + OpenClaw SOUL.md |
| **Output** | Verbose SOUL.md | Axioms + principles |
| **Storage** | Overwrites | Accumulates in distilled/ |
| **Transparency** | Black box | Full provenance |
| **Compression** | None | 6-10:1 ratio |

### Why Both Tracks?

1. **No regression**: OpenClaw's full extraction preserved as baseline
2. **Enhancement**: NEON-SOUL adds compression layer on top
3. **Comparison**: Can diff what each system extracted
4. **Fallback**: If NEON-SOUL fails, OpenClaw output still valid
5. **Debugging**: See exactly where axioms came from
```

### Memory Signal Types

| Signal Type | Example | Dimension |
|-------------|---------|-----------|
| Preference statements | "User prefers TypeScript" | Identity Core |
| Correction patterns | "Be more concise" → repeated 5x | Voice |
| Refusal logs | "Declined to provide medical advice" | Boundaries |
| Uncertainty expressions | "I'm not sure about..." patterns | Honesty |
| Relationship markers | "Rapport level: high" | Relationship |
| Evolution notes | "User noted growth in X area" | Continuity |

### Tiered Synthesis (from Self-Learning Agent)

| Tier | Trigger | Scope | Memory Threshold |
|------|---------|-------|------------------|
| Fast | Every ~20 turns | Preferences only | >2,000 chars new |
| Medium | End of session | + Behavioral patterns | >5,000 chars new |
| Full | Daily | All dimensions | >24 hours |

### Integration with OpenClaw

**Primary path: OpenClaw Skill with npx invocation**

```markdown
# In SKILL.md

When user runs /soul-extract or says "update my soul":

1. Run `/neon-soul extract --memory ~/.openclaw/workspace/memory/`
2. Run `/neon-soul compress --principles ./output/principles/`
3. Run `/neon-soul diff --current ~/.openclaw/workspace/SOUL.md`
4. Present diff to user in chat
5. Wait for /approve-soul or /reject-soul
6. If approved: `/neon-soul apply`
7. Confirm with backup location
```

**Automatic synthesis via HEARTBEAT.md:**

```markdown
# Addition to HEARTBEAT.md
- [ ] Run `/neon-soul status` (check if synthesis needed based on memory accumulation)
```

### Synthetic Test Data

For testing before real memory exists:

```
test/fixtures/memory/
├── synthetic-session-01.md    # Simulated daily log
├── synthetic-session-02.md    # With preference signals
├── synthetic-session-03.md    # With correction patterns
├── synthetic-session-04.md    # With boundary tests
└── synthetic-session-05.md    # With relationship markers
```

### Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Memory parsing | 100% coverage | All signal types extracted |
| Principle extraction | 80%+ recall | Human evaluation vs manual extraction |
| Core stability | <20% drift | Core axioms stable week-over-week |
| Edge growth | Additive | New principles accumulate over time |
| Compression ratio | ≥6:1 | Semantic content / tokens used |
| Identity coherence | Human eval | "Does this feel like the same agent?" |
| Skill integration | 100% | Commands work via chat |

### Deliverables

**Core Pipeline**:
- [ ] `src/lib/memory-reader.ts` - Memory file parser
- [ ] `src/lib/openclaw-reader.ts` - OpenClaw SOUL.md parser
- [ ] `src/lib/signal-classifier.ts` - Classify signals by dimension
- [ ] `src/lib/temporal-weights.ts` - Recency + frequency weighting
- [ ] `src/lib/extractor.ts` - PBD principle extraction
- [ ] `src/lib/compressor.ts` - Principle → axiom compression

**Hybrid C+D Components**:
- [ ] `src/lib/distiller.ts` - Store distilled artifacts (audit trail)
- [ ] `src/lib/merger.ts` - Merge OpenClaw + NEON-SOUL outputs
- [ ] `src/commands/audit.ts` - Trace axiom provenance
- [ ] `src/commands/compare.ts` - Diff extraction methods

**Integration**:
- [ ] Synthetic test fixtures (5+ simulated sessions)
- [ ] `skill/SKILL.md` - OpenClaw skill definition
- [ ] End-to-end test suite
- [ ] Documentation for transparency features

---

## Implementation Order

```
Phase 1: Template Testing (Foundation)
    │
    ├── Week 1-2: Project setup, download templates
    ├── Week 2-3: Implement single-source PBD (extractor.ts)
    ├── Week 3-4: Implement compression (compressor.ts), measure ratios
    └── Deliverable: Working compression pipeline with tests
            │
            ▼
Phase 2: OpenClaw Environment (Understanding)
    │
    ├── Week 4-5: Docker setup, fresh install analysis
    ├── Week 5-6: Memory structure investigation
    ├── Week 6-7: Gap analysis, interview implementation
    └── Deliverable: Chat interview flow (interview.ts)
            │
            ▼
Phase 3: Memory Ingestion (Differentiation)
    │
    ├── Week 7-9: Memory parser, signal extraction
    ├── Week 9-11: Integration with PBD pipeline
    ├── Week 11-12: OpenClaw skill, end-to-end testing
    └── Deliverable: Dynamic soul extraction from memory
```

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js ≥22 |
| Language | TypeScript |
| Package Manager | pnpm |
| LLM Access | OpenClaw skill interface (no separate SDK) |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2) |
| Testing | Vitest |
| Integration | OpenClaw skill/cron system |
| Markdown Parsing | unified/remark |

### Dependencies

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**Note**: `@xenova/transformers` downloads the embedding model (~30MB) on first run. The model is cached locally for subsequent runs. No API costs for embeddings.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| souls.directory templates too homogeneous | Medium | Low | Supplement with onlycrabs.ai, manual creation |
| OpenClaw Docker setup complex | Low | Medium | Fallback to local install, document issues |
| Memory signals too sparse | Medium | High | Chat interview to supplement |
| Compression loses identity coherence | Medium | High | Human evaluation checkpoints, rollback |
| OpenClaw API changes break skill | Low | Medium | Version pin, adapter layer |

---

## Open Questions

1. **Growth budget**: What's the max soul size before diminishing returns? (Proposal: 5-10K tokens)
2. **CJK anchoring**: Do we use CJK for axioms in v1, or defer to v2?
3. **Human-in-the-loop**: Should compression always require approval? (Current: yes)
4. **Multi-agent**: Does each agent get unique soul, or share axiom base?
5. **Privacy**: How to handle sensitive content in memory extraction?
6. **Pruning strategy**: When soul approaches budget, how to prioritize (recency? frequency? core vs edge?)

---

## Next Steps

1. **Immediate**: Initialize npm project with TypeScript config
2. **This week**: Download 10-20 templates from souls.directory
3. **Next week**: Begin Phase 1 implementation (extractor.ts)
4. **Parallel**: Draft Docker setup for Phase 2

---

*This proposal establishes the three-phase path from test fixtures through OpenClaw understanding to the differentiating memory ingestion feature, built as a native Node/TypeScript tool for seamless OpenClaw integration.*
