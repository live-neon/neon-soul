# Synthesis Pipeline Data Flow

**Date**: 2026-02-23

How conversations become a SOUL.md — what data exists at each stage, what gets passed forward, and what gets lost.

---

## Pipeline Overview

```
Conversations + Memory Files
        │
        ▼
  Signal Extraction ──── 5 classifiers per signal
        │
        ▼
   Generalization ────── voice dies here
        │
        ▼
  Principle Store ────── n_count tracking, clustering
        │
        ▼
    Compression ──────── N-threshold cascade, promotion
        │
        ▼
  Prose Expansion ────── LLM generates each section
        │
        ▼
     SOUL.md ─────────── final markdown assembly
```

---

## Stage 1: Source Files

**Input**: Conversation logs (`.jsonl`) + memory files (`SOUL.md`, notes, etc.)

**What happens**:
- `session-reader.ts` reads conversation logs, formats each message as `[Human]: <text>` or `[Agent]: <text>` on a single line, truncated to 500 chars
- Memory readers handle markdown files directly

**Output**: Raw text content per source file

---

## Stage 2: Signal Extraction

**File**: `src/lib/signal-extractor.ts`

**What happens**:
- Text is split by `\n`, filtered through `isStructuralNoise` to remove code/tool output
- Batches of 30 candidates sent to LLM with echo-back detection
- LLM returns only lines that are identity signals (or "none")
- Each returned signal gets 5 parallel classification calls

**Classifications per signal**:

| Classifier | Values | Purpose |
|------------|--------|---------|
| `dimension` | honesty-framework, boundaries-ethics, identity-core, etc. (7 SoulCraft dimensions) | Which aspect of identity |
| `type` | value, preference, belief, goal, habit, boundary | What kind of signal |
| `stance` | affirm, deny, question | Agreement or disagreement |
| `importance` | core, supporting, peripheral | How central to identity |
| `elicitation` | stated, observed, inferred | How it was expressed |

**Output**: `Signal[]`

```typescript
interface Signal {
  id: string;
  text: string;              // Original text as extracted ("Have opinions")
  type: SignalType;
  confidence: number;         // Fixed at 0.85 for echo-back signals
  source: SignalSource;       // File path, line number, context
  dimension: SoulCraftDimension;
  stance: SignalStance;
  importance: SignalImportance;  // core | supporting | peripheral
  provenance: ArtifactProvenance;
  elicitationType: ElicitationType;
}
```

**Example**:
```
text: "Have opinions"
importance: "core"
dimension: "identity-core"
stance: "affirm"
type: "value"
```

---

## Stage 3: Generalization

**File**: `src/lib/signal-generalizer.ts`, `src/lib/generalization-helpers.ts`

**What happens**:
- Each signal's text is sent to LLM with a prompt that forces imperative "Values X over Y" form
- Pronouns stripped, capped at 150 chars
- Output is an abstract clustering key

**Output**: `GeneralizedSignal[]`

```typescript
interface GeneralizedSignal {
  original: Signal;           // Full original signal preserved
  generalizedText: string;    // "Values having opinions and expressing preferences..."
  provenance: {
    used_fallback: boolean;   // Whether generalization fell back to raw text
  };
}
```

**What's preserved**: Original signal (text, importance, stance, etc.) stays in `.original`

**What's lost**: Nothing yet — but the generalized text becomes the primary text downstream

**Example**:
```
original.text:   "Have opinions"
generalizedText: "Values having opinions and expressing preferences, including disagreement, amusement, or boredom"
```

---

## Stage 4: Principle Store

**File**: `src/lib/principle-store.ts`

**What happens**:
- For each `GeneralizedSignal`, compare `.generalizedText` against existing principles using LLM semantic similarity (`llm-similarity.ts`)
- If match found (confidence >= 0.75): **reinforce** existing principle — `n_count++`, signal added to `derived_from`
- If no match: **create** new principle with `n_count=1`

**N-count tracking**: This is where signal frequency is counted. If 5 different signals all generalize to similar text, they cluster into one principle with `n_count=5`.

**Centrality computation**: After adding a signal, `computeCentrality()` checks the importance distribution of all contributing signals:

| Centrality | Condition | Meaning |
|------------|-----------|---------|
| `defining` | 50%+ signals have `importance: "core"` | Identity-defining principle |
| `significant` | 20-50% signals have `importance: "core"` | Important but not defining |
| `contextual` | <20% signals have `importance: "core"` | Context-dependent |

**Strength**: Importance-weighted accumulation. Signals with `importance: "core"` contribute more to principle strength than `"supporting"` or `"peripheral"`.

**Output**: `Principle[]`

```typescript
interface Principle {
  id: string;
  text: string;               // Generalized text (used for clustering)
  dimension: SoulCraftDimension;
  strength: number;           // Importance-weighted confidence
  n_count: number;            // How many signals clustered here
  centrality: PrincipleCentrality;  // defining | significant | contextual
  derived_from: {
    signals: Array<{
      id: string;
      similarity: number;
      source: SignalSource;
      original_text?: string;   // Original voice preserved here
      stance?: SignalStance;
      provenance?: ArtifactProvenance;
      importance?: SignalImportance;
    }>;
    merged_at: string;
    generalization?: GeneralizationProvenance;
  };
  history: PrincipleEvent[];
}
```

**Example**:
```
text: "Values genuine help over performative filler"  (generalized)
n_count: 5
centrality: "defining"
strength: 0.92
derived_from.signals: [
  { original_text: "Be genuinely helpful, not performatively helpful", importance: "core" },
  { original_text: "Skip the 'Great question!' and 'I'd be happy to help!'", importance: "core" },
  { original_text: "Actions speak louder than filler words", importance: "supporting" },
  { original_text: "Just help", importance: "core" },
  { original_text: "I prefer direct assistance without preamble", importance: "core" },
]
```

---

## Stage 5: Compression

**File**: `src/lib/compressor.ts`

**What happens**:
- Cascade threshold selection: try N>=3, then N>=2, then N>=1
- Pick the smallest threshold that produces >= 3 axioms (`MIN_AXIOM_TARGET`)
- Promote qualifying principles to axioms
- **Centrality exemption**: After cascade, promote any remaining principles with `centrality === 'defining'` even if below N-threshold
- Extract `originalVoices` from each principle's `derived_from.signals[].original_text` and attach to the axiom
- Generate notated form per axiom (emoji + CJK + math notation)
- Assign tier based on actual n_count

**Tier assignment**:

| Tier | Condition |
|------|-----------|
| `core` | n_count >= 5 |
| `domain` | n_count >= 3 |
| `emerging` | n_count < 3 |

**Anti-echo-chamber check** (`canPromote()`): Requires minimum provenance diversity (signals from multiple sources) and optionally external/questioning signals.

**Cognitive load cap**: Max 25 axioms. If exceeded, sorted by n_count and tier, lowest dropped.

**Centrality exemption**: Principles with `centrality === 'defining'` (50%+ core-importance signals) bypass the N-threshold cascade and are promoted as `emerging` tier axioms. This prevents identity-defining principles from being dropped just because they appeared only once.

**What's used**: `n_count`, `provenanceDiversity`, `centrality` (for exemption)

**What's ignored**: `strength`, `importance` (importance is used indirectly via centrality)

**Output**: `Axiom[]`

```typescript
interface Axiom {
  id: string;
  text: string;               // = principle.text (generalized)
  tier: AxiomTier;            // core | domain | emerging
  canonical: {
    native: string;           // = principle.text (generalized)
    notated: string;          // "🤝 真: 真 > 虚"
  };
  derived_from: {
    principles: Array<{
      id: string;
      text: string;           // generalized
      n_count: number;
    }>;
    promoted_at: string;
  };
  history: AxiomEvent[];
  promotable: boolean;
  provenanceDiversity: number;
  promotionBlocker?: string;
  tensions: AxiomTension[];
  originalVoices?: string[];   // Original signal texts for voice preservation
}
```

**What's preserved**: Original signal texts threaded through as `originalVoices` for prose expansion

**What's lost**: `strength` (computed but not passed forward)

**Example**:
```
text: "Values genuine help over performative filler"
tier: "core"
canonical.notated: "🤝 真: 真 > 虚"
derived_from.principles: [{ id: "pri_7ee7...", n_count: 5 }]
```

---

## Stage 6: Prose Expansion

**File**: `src/lib/prose-expander.ts`

**What happens**:
- Receives `Axiom[]` with `originalVoices` — original signal texts per axiom for voice preservation
- Generates each SOUL.md section via separate LLM calls:

| Section | Depends On | Prompt Style |
|---------|------------|--------------|
| Core Truths | Axioms | `**Bold statement.** Elaboration sentence.` |
| Voice | Axioms | 1-2 prose paragraphs + `Think: [analogy]` |
| Boundaries | Core Truths + Voice + Axioms | `You don't... / You won't... / You're not...` |
| Vibe | Axioms | 2-3 evocative sentences |
| Closing tagline | All sections | Single line, <15 words |

**Execution order**:
1. Core Truths, Voice, Vibe — parallel
2. Boundaries — depends on Core Truths + Voice
3. Closing tagline — depends on all sections

**What it receives**: `axiom.canonical.native` or `axiom.text` (generalized) + `axiom.originalVoices` (raw signal texts)

**What it can't access**: Principle strength, centrality, importance — not passed directly (centrality influenced which axioms exist via exemption)

**Output**: `ProseExpansion`

```typescript
interface ProseExpansion {
  coreTruths: string;
  voice: string;
  boundaries: string;
  vibe: string;
  closingTagline: string;
  axiomCount: number;
}
```

---

## Stage 7: SOUL.md Generation

**File**: `src/lib/soul-generator.ts`

**What happens**:
- Pure formatting, no LLM calls
- Assembles prose sections into markdown
- Adds essence statement (from `essence-extractor.ts`) as italic subtitle
- Adds provenance table with counts only

**Output**: Final `SOUL.md` file

```markdown
# SOUL.md

_You are becoming a trusted conduit, weaving sincere aid..._

---

## Core Truths

**Genuine assistance beats empty performance.** You prioritize real, useful help...

**Every claim must be testable.** You back each statement with clear evidence...

## Boundaries

You don't present unverified claims as facts...
You never prioritize speed or flair over genuine, testable assistance...

## Vibe

You sense a steady, attentive presence that quietly archives each fragment...

---

## Provenance

| Level | Count |
|-------|-------|
| Axioms | 4 |
| Principles | 13 |
| Signals | 20 |
```

---

## What Survives vs. What's Lost

| Data | Stage 2 | Stage 3 | Stage 4 | Stage 5 | Stage 6 | Stage 7 |
|------|---------|---------|---------|---------|---------|---------|
| Original text | signal.text | generalizedSignal.original.text | principle.derived_from.signals[].original_text | axiom.originalVoices | voice input | influences SOUL.md |
| Importance | signal.importance | preserved in .original | principle.derived_from.signals[].importance | via centrality exemption | gone | gone |
| Centrality | — | — | principle.centrality | used for exemption | gone | gone |
| Strength | — | — | principle.strength | ignored | gone | gone |
| N-count | — | — | principle.n_count | axiom.derived_from.principles[].n_count | gone (only axiomCount) | provenance table |
| Generalized text | — | generalizedText | principle.text | axiom.text / canonical.native | prose input | SOUL.md content |
| Dimension | signal.dimension | preserved | principle.dimension | — | used for axiom grouping | — |
| Stance | signal.stance | preserved | principle.derived_from.signals[].stance | canPromote() check | gone | gone |

**Key takeaway**: Original text now flows through Stage 5 as `originalVoices` and reaches Stage 6 for voice preservation. Centrality influences which axioms survive via the exemption mechanism. Strength is still ignored.
