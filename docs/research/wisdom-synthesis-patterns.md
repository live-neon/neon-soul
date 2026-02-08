# Wisdom Synthesis Patterns

**Date**: 2026-02-07
**Source**: Analysis of COMPASS-SOUL architecture (essence-router project)
**Purpose**: Extract standalone patterns for NEON-SOUL's principle-to-axiom synthesis

---

## Executive Summary

This document extracts design patterns from a related wisdom synthesis system. These patterns are documented here as **standalone concepts** that may inform NEON-SOUL's architecture, not as dependencies.

**Key insight**: The most valuable patterns address the core challenge of principle promotion—how do you know when N observations represent genuine wisdom vs. echo chamber reinforcement?

---

## Pattern 1: Two-Dimensional Evidence Classification

Instead of a single confidence score, classify evidence on two independent dimensions:

### Source Dimension (Immutable)

Where the evidence originated:

| Source | Description | Example |
|--------|-------------|---------|
| **Self** | From this AI's own reasoning | "I noticed I work better with explicit constraints" |
| **Curated** | Human-provided, verified | Compass axioms, explicit user preferences |
| **External** | Third-party, unverified | Aggregated user feedback, external research |

### Stance Dimension (Mutable)

How the evidence relates to existing principles:

| Stance | Description | Example |
|--------|-------------|---------|
| **Affirming** | Supports existing belief | "This reinforces our honesty principle" |
| **Tensioning** | Creates productive tension | "Speed vs. correctness trade-off" |
| **Questioning** | Challenges assumptions | "Is this pattern actually harmful?" |

### Why Two Dimensions Matter

A principle reinforced 10 times by Self+Affirming evidence is weaker than one reinforced 3 times by External+Questioning evidence. The source and stance carry different epistemological weight.

**Application to NEON-SOUL**: When tracking `derived_from` in Principles and Axioms, consider adding source/stance classification to enable richer promotion logic.

---

## Pattern 2: Anti-Echo-Chamber Rule

**Problem**: AI systems naturally reinforce their own beliefs. If a principle is only supported by Self+Affirming evidence, it may be confirmation bias rather than genuine wisdom.

**Solution**: Require diversity for promotion.

### Promotion Gate

For a Principle to become an Axiom:
- Must have N≥3 supporting signals (already in NEON-SOUL)
- **AND** at least one must be: External source OR Questioning stance

### Demotion Trigger

Consider weakening/demoting when:
- 100% Self-sourced evidence (no external validation)
- 0% Questioning stance (no challenges survived)

### Implementation

```typescript
interface PromotionRequirements {
  min_n_count: number;           // e.g., 3
  require_external_or_questioning: boolean;  // anti-echo-chamber
  max_self_affirming_ratio?: number;         // e.g., 0.8 (80%)
}

function meetsPromotionCriteria(
  principle: Principle,
  signals: Signal[],
  requirements: PromotionRequirements
): boolean {
  const count = signals.length;
  if (count < requirements.min_n_count) return false;

  if (requirements.require_external_or_questioning) {
    const hasExternal = signals.some(s => s.source === 'external');
    const hasQuestioning = signals.some(s => s.stance === 'questioning');
    if (!hasExternal && !hasQuestioning) return false;
  }

  return true;
}
```

---

## Pattern 3: Separation of Powers

A governance model inspired by constitutional design:

| Branch | Role | NEON-SOUL Mapping |
|--------|------|-------------------|
| **Legislative** | Define rules | Axioms (core, unchanging) |
| **Executive** | Apply rules | Principles (operational, evolving) |
| **Judicial** | Verify compliance | Artifacts/Signals (evidence, auditable) |

### Checks and Balances

1. **Axioms cannot self-promote**: An axiom cannot add evidence for itself
2. **Principles require diverse backing**: Anti-echo-chamber rule applies
3. **Artifacts are immutable**: Raw signals never change once extracted

### Application to NEON-SOUL

This maps naturally to our three-tier structure:
- Axioms = Core tier (legislative, high bar for change)
- Principles = Domain tier (executive, can evolve with N-count)
- Signals = Evidence tier (judicial, immutable audit trail)

The key insight: **levels check each other**. Axioms constrain what Principles can emerge. Principles are grounded by Signals. Signals trace back to source files.

---

## Pattern 4: Self-Reference Collapse Prevention

**Problem**: A system that only reasons about itself becomes solipsistic. The soul could "prove" any belief by generating supporting evidence.

**Solution**: Require external grounding.

### The Rule

No principle can be promoted to axiom tier if:
- 100% of supporting evidence is self-generated
- Evidence comes from reasoning about prior conclusions (circular)

### Detection

```typescript
function detectSelfReferenceCollapse(principle: Principle): boolean {
  const signals = getSignalsFor(principle);

  // Check for all self-sourced
  const allSelf = signals.every(s => s.source === 'self');
  if (allSelf) return true;

  // Check for circular references
  const referencesOwnHistory = signals.some(s =>
    s.source_context.includes(principle.id)
  );
  if (referencesOwnHistory) return true;

  return false;
}
```

### Application to NEON-SOUL

Since NEON-SOUL extracts signals from memory files (external), this is less of a risk than in pure self-reasoning systems. However, it's worth tracking:
- What percentage of principles are grounded in memory files vs. synthesis conclusions?
- Are any axioms derived entirely from AI-generated content?

---

## Pattern 5: Bidirectional Discovery

Principles and axioms can be discovered in two directions:

### Top-Down (Deductive)

Start with known axioms, derive principles:
```
Axiom: 誠 (honesty > performance)
  ↓ instantiate
Principle: "Declare uncertainty before helping"
  ↓ instantiate
Signal: "I should mention I'm not sure about X"
```

### Bottom-Up (Inductive)

Start with signals, converge to axioms:
```
Signal: "user prefers directness" (memory:156)
Signal: "avoid sugarcoating" (memory:89)
Signal: "honesty even when uncomfortable" (memory:203)
  ↓ converge (N≥3)
Principle: "Prioritize honesty over comfort"
  ↓ converge (N≥3, anti-echo-chamber passes)
Axiom: 誠 (honesty)
```

### Why Both Matter

- **Top-down** provides coherence (axioms guide interpretation)
- **Bottom-up** provides grounding (axioms must earn their place)

A healthy system uses both:
1. Bootstrap with top-down (compass axioms → initial principles)
2. Evolve with bottom-up (memory signals → new principles → axiom candidates)
3. Validate with bidirectional check (do bottom-up findings align with top-down framework?)

---

## Pattern 6: Tier-Based Trust Levels

Different tiers have different trust characteristics:

| Tier | Mutability | Trust Source | NEON-SOUL Mapping |
|------|------------|--------------|-------------------|
| **Axiom** | Immutable (or near-immutable) | Human curation | Core axioms from compass |
| **Principle** | Mutable with high bar | N-count + diversity | Domain principles |
| **Pattern** | Mutable with medium bar | N-count only | Emerging patterns |
| **Signal** | Immutable (raw extraction) | Provenance chain | Extracted signals |

### Trust Inheritance

Higher tiers inherit trust from lower tiers:
- Axiom trusted because Principles support it
- Principles trusted because Signals ground them
- Signals trusted because provenance traces to source files

### Application to NEON-SOUL

This aligns with the proposed tier structure. The key addition: make trust levels explicit in the data model:

```typescript
interface Axiom {
  // ... existing fields
  trust: {
    level: 'core' | 'domain' | 'emerging';
    source: 'curated' | 'converged';  // human-provided vs. earned
    locked: boolean;  // prevents automatic demotion
  };
}
```

---

## Patterns NOT Adopted

Some patterns from the source architecture are over-engineered for NEON-SOUL's scope:

| Pattern | Why Not |
|---------|---------|
| CRDT-based multi-device sync | Single user, single device for v1 |
| Real-time WebSocket streaming | Batch processing sufficient |
| Complex stance migration rules | Simple N-count works |
| Full separation-of-powers enforcement | Provenance tracking sufficient for auditability |

These remain documented for potential v2+ consideration.

---

## Implementation Recommendations

### For v1 (Provenance Focus)

1. Add optional `source` and `stance` fields to Signal interface
2. Track in `derived_from` for debugging/visualization
3. No enforcement rules yet—just capture the data

### For v2+ (Governance Focus)

1. Implement anti-echo-chamber promotion gate
2. Add self-reference collapse detection
3. Consider tier-based trust levels

### Data Model Extension (Optional)

```typescript
// Enhanced Signal for v2+
interface Signal {
  // ... existing fields from soul-bootstrap-pipeline-proposal.md

  // Two-dimensional classification (v2+)
  classification?: {
    source: 'self' | 'curated' | 'external';
    stance: 'affirming' | 'tensioning' | 'questioning';
  };
}
```

---

## References

- NEON-SOUL Bootstrap Pipeline Proposal (provenance-first data model)
- NEON-SOUL Cryptographic Audit Chains (provenance vs. integrity)
- Multiverse Compass (hierarchical principles architecture)

---

*These patterns are extracted for reference, not prescription. Start simple (N-count + provenance), add sophistication when evidence demands it.*
