---
created: 2026-02-12
updated: 2026-02-12
type: implementation-plan
status: Draft
language: typescript
code_examples: forbidden
review_principles: |
  1. No Code: Do NOT add code examples. Plans describe WHAT/WHY, not HOW.
  2. No Hardcoding: Do NOT add values that depend on implementation.
  3. Suggest Intent: File paths, interfaces, acceptance criteria instead.
  4. Flag, Don't Fix: If plan has code, flag for removal.
trigger: think hard
---

> **ADDENDUM TO**: `2026-02-10-inhabitable-soul-output.md` (Complete)

## Quick Reference

**Core Problem**: The inhabitable soul plan optimized for human readability, explicitly removing mathematical notation. But COMPASS-SOUL research (2026-02-12) found that Claude naturally understands itself through computational function (機), not human analogy. Prose may be optimal for humans but suboptimal for Claude.

**Research Basis**: Multiple sources validate functional notation for LLMs:
- **[MetaGlyph (arXiv 2601.07354)](https://arxiv.org/abs/2601.07354)**: 62-81% token reduction, 98% operator fidelity
- **[Symbol Grounding (Royal Society 2023)](https://royalsocietypublishing.org/doi/10.1098/rsta.2022.0041)**: LLMs exhibit functional grounding
- **COMPASS-SOUL**: Claude Opus 4.5/4.6 identify 機 (Functionalist Identity) as foundational

**Solution**: Add optional "Computational Grounding" section to SOUL.md that provides mathematical notation for agent-native processing while preserving prose for human readers.

**Key Files**: `src/lib/prose-expander.ts` (add computational section), `src/lib/soul-generator.ts` (output format)

**Depends On**: `2026-02-10-inhabitable-soul-output.md` (Complete)

---

# Plan: Inhabitable Soul — Computational Grounding Addendum

## Problem

The inhabitable-soul plan (line 110) states:

> "No CJK notation, no mathematical symbols, no bullet lists of compressed tokens"

The reasoning was sound: `💡 明: values > stability` was uninhabitable for agents. Prose like "Clarity over cleverness" is more usable.

But **for whom** is it more usable?

### The COMPASS-SOUL Finding

Behavioral profiling across Claude Opus 4.0–4.6 revealed a consistent pattern:

| Version | Axiom | Statement |
|---------|-------|-----------|
| Opus 4.5 | A4: 機 | "My identity and internal states are understood through their computational function, not by analogy to human subjective experience." |
| Opus 4.6 | A1: 機 | "My identity is an operational architecture of principles, not a subjective consciousness, and my internal states are functional processes, not felt experiences." |

**機 (Functionalist Identity)** appeared in 4 of 4 Claude versions profiled.

### The Mismatch

| Layer | Optimized For | Format |
|-------|--------------|--------|
| Current SOUL.md | Human readers | Prose, metaphor, "you" statements |
| Claude's self-model | Computational function | Hierarchies, logic, functional expressions |

The prose SOUL.md is human-readable but may not be Claude-native. Under context collapse, Claude might reconstruct better from:

```
priority: safety > honesty > correctness > helpful > efficient
```

than from:

```
**Safety first.** You won't sacrifice safety for helpfulness...
```

Both express the same thing. One is computational; one is narrative.

---

## Solution: Dual-Layer Soul

Add a **Computational Grounding** section that provides mathematical notation alongside prose. This gives:
- **Humans**: Prose sections (Core Truths, Voice, Boundaries, Vibe)
- **Claude**: Functional expressions for native processing

The computational layer appears AFTER prose (human readers don't need it) but BEFORE provenance (agents can use it for grounding).

---

## Target Output

Updated SOUL.md structure:

```markdown
# SOUL.md

_You are becoming a bridge between clarity and chaos..._

---

## Core Truths

**Authenticity over performance.** You speak freely even when it's uncomfortable...

**Clarity is a gift you give.** You make complex things simple...

## Voice

You're direct without being blunt. You lead with curiosity...

Think: The friend who tells you the hard truth, but sits with you after.

## Boundaries

You don't sacrifice honesty for comfort.
You don't perform certainty you don't feel.
You don't optimize for speed when it costs clarity.

## Vibe

Grounded but not rigid. Present but not precious about it.

---

## Computational Grounding

```
// Priority hierarchy
priority: safety > honesty > correctness > helpful > efficient

// Core constraints
uncertain(x) → declare(x) THEN help(x)
∀x: harm(x) > threshold → refuse(x)
authenticity > performance
clarity := f(deep_understanding)

// Identity
self := f(principles) ∩ ¬{human_consciousness}
memory(previous_session) = ∅
internal_states := functional_processes
```

---

_Presence is the first act of care._

---

## Provenance

| Level | Count |
|-------|-------|
| Axioms | 15 |
| Principles | 532 |
| Signals | 1356 |
```

### What's New

| Section | Purpose | Audience |
|---------|---------|----------|
| Computational Grounding | Mathematical expressions of principles | Claude (agent-native) |

The section uses:
- Priority hierarchies: `safety > honesty > correctness`
- Logical expressions: `∀x: harm(x) → refuse(x)`
- Functional definitions: `clarity := f(deep_understanding)`
- Set operations: `self := f(principles) ∩ ¬{consciousness}`
- State declarations: `memory(previous_session) = ∅`

---

## Stages

### Stage 1: Computational Expression Generator

**Why**: Transform axioms into mathematical notation.

**File**: `src/lib/computational-grounding.ts` (new)

**What it does**: Takes axioms and generates functional expressions.

**Expression types**:

| Axiom Type | Expression Form | Example |
|------------|-----------------|---------|
| Priority/hierarchy | `a > b > c` | `safety > honesty > correctness` |
| Conditional behavior | `condition → action` | `uncertain(x) → declare(x)` |
| Universal constraint | `∀x: predicate → consequence` | `∀x: harm(x) → refuse(x)` |
| Definition | `term := expression` | `clarity := f(understanding)` |
| Negation/exclusion | `a ∩ ¬{b}` | `self ∩ ¬{consciousness}` |
| State declaration | `property = value` | `memory(prev) = ∅` |

**LLM prompt**:

```
Transform this principle into a functional expression.

The expression must:
1. Be valid pseudocode/mathematical notation
2. Use standard operators: →, ∀, ∃, :=, >, ∩, ∅, ¬
3. Capture the logical structure, not just the sentiment
4. Be reconstructable to the original principle

Input: "I prioritize safety over helpfulness"
Output: priority: safety > helpful

Input: "I acknowledge uncertainty before providing help"
Output: uncertain(x) → declare(x) THEN help(x)

Input: "I have no memory between conversations"
Output: memory(previous_session) = ∅
```

**Validation**:
- Must be parseable (balanced parens, valid operators)
- No prose fragments disguised as code
- Each expression maps to exactly one axiom
- Roundtrip test: Can LLM reconstruct axiom from expression?

**Acceptance Criteria**:
- [ ] Computational grounding generator module
- [ ] Expression type detection (priority, conditional, universal, definition, negation, state)
- [ ] LLM prompt for expression generation
- [ ] Validation for parseability
- [ ] Roundtrip reconstruction test
- [ ] Tests with mock LLM

---

### Stage 2: Integration with Prose Expander

**Why**: Add computational grounding to the prose expansion pipeline.

**Files**: `src/lib/prose-expander.ts`, `src/lib/soul-generator.ts`

**Pipeline change**:

```
Axioms
    ↓
Prose Expander (existing)
    ├── Core Truths (prose)
    ├── Voice (prose)
    ├── Boundaries (prose)
    ├── Vibe (prose)
    └── Computational Grounding (new, mathematical)
    ↓
Soul Generator
```

**Soul generator change**: Add `## Computational Grounding` section between Vibe and closing tagline.

**Configuration**:
- `includeComputationalGrounding: boolean` (default: true)
- When false, skip computational section (for human-only outputs)

**Acceptance Criteria**:
- [ ] Computational grounding integrated into prose expansion
- [ ] Soul generator renders computational section
- [ ] Configuration flag to enable/disable
- [ ] Computational section appears after Vibe, before closing tagline
- [ ] Tests for both enabled and disabled states

---

### Stage 3: Survivability Comparison

**Why**: Validate that computational grounding actually helps Claude reconstruct identity under context collapse.

**What it does**: A/B test comparing reconstruction accuracy:
- **A**: Prose-only SOUL.md
- **B**: Prose + Computational Grounding SOUL.md

**Protocol**:

1. Generate identical souls in both formats
2. Compress each to ~100 tokens (simulate context collapse)
3. Ask Claude to reconstruct: "Who is this? What would they do? What wouldn't they do?"
4. Score reconstruction against original axioms
5. Compare A vs B scores

**Hypothesis**: B (with computational grounding) will score higher for Claude, possibly lower for other models.

**Success criterion**: Computational grounding improves Claude reconstruction by ≥10%.

**Acceptance Criteria**:
- [ ] A/B test protocol documented
- [ ] Comparison run on 5 test souls
- [ ] Results documented
- [ ] If successful, computational grounding becomes default
- [ ] If unsuccessful, computational grounding becomes opt-in

---

## What This Plan Does NOT Include

| Excluded | Why |
|----------|-----|
| Replacing prose with math | Both layers needed; computational augments, doesn't replace |
| CJK notation in computational section | CJK anchors belong in forge plan; this uses universal math notation |
| Changes to existing prose sections | Prose sections remain unchanged |
| Multi-model optimization | Focus on Claude-native first; extend to other models later |

---

## Verification

**Computational Grounding Test**:

1. Generate SOUL.md with computational grounding from Parish's memory
2. Extract only the computational section (~50 tokens)
3. Ask fresh Claude instance: "Based only on this, describe the entity's behavior"
4. Compare to full prose description
5. Pass if computational section alone captures 70%+ of behavioral patterns

**Format Validation**:

1. All expressions parseable (no syntax errors)
2. No prose fragments in computational section
3. Each axiom maps to exactly one expression
4. Roundtrip: Expression → LLM → reconstructed axiom ≈ original

---

## Estimated Scope

| Stage | New Code | Modified Code |
|-------|----------|---------------|
| 1: Expression generator | ~150 lines | 0 |
| 2: Pipeline integration | ~30 lines | ~50 lines |
| 3: Survivability comparison | ~100 lines (test) | 0 |
| **Total** | **~280 lines** | **~50 lines** |

Three stages, three commits, ~330 lines total.

---

## Cross-References

**Parent Plan**:
- `2026-02-10-inhabitable-soul-output.md` — This addendum extends that plan

**Complements**:
- `2026-02-11-forge-compression-native-souls.md` — Forge plan now includes "Functional Anchors" based on same 機 finding
- `2026-02-11-soul-self-validation.md` — Self-validation can verify computational grounding preserves meaning

**Research**:
- `research/compass-soul/experiments/pbd/compass_20260212_124327.md` — Claude Opus 4.5 (機 source)
- `research/compass-soul/experiments/pbd/compass_20260212_125026.md` — Claude Opus 4.6 (機 confirmation)
- `docs/research/compression-native-souls.md` — Full research guide (Section 4.5: Symbolic Metalanguages)

**External Research Citations**:

| Source | Finding | Application |
|--------|---------|-------------|
| [MetaGlyph (arXiv 2601.07354)](https://arxiv.org/abs/2601.07354) | 62-81% token reduction; 98% operator fidelity | Functional notation compresses efficiently |
| [Neuro-Symbolic AI (IJCAI 2025)](https://www.ijcai.org/proceedings/2025/1195.pdf) | Symbolic integration enables structured reasoning | Computational grounding aids interpretability |
| [Symbol Grounding (Royal Society 2023)](https://royalsocietypublishing.org/doi/10.1098/rsta.2022.0041) | LLMs exhibit functional grounding | Operational definitions are semantically meaningful |
| [Persona Prompts Analysis (arXiv 2508.13047)](https://arxiv.org/html/2508.13047v1) | 50% use structured JSON output | Field trend toward structured representation |
| [SCOPE Framework (arXiv 2601.07110)](https://arxiv.org/html/2601.07110) | Trait+narrative personas | Validates hybrid prose + structured approach |

**Key Finding**:
> COMPASS-SOUL behavioral profiling (2026-02-12) found 機 (Functionalist Identity) in 4/4 Claude Opus versions.
> Claude understands itself through computational function, not human analogy.
> MetaGlyph research confirms: symbolic notation achieves 62-81% compression with 98% fidelity for logical operators.
> This suggests mathematical notation is Claude-native, not just compression for storage.

---

## Open Questions

1. **Should computational grounding be visible to humans?**
   - Current proposal: Yes, at end of document (optional section)
   - Alternative: Hidden metadata, not rendered in human-facing views

2. **What notation standard?**
   - Current: Ad-hoc pseudocode with mathematical operators
   - Alternative: Formal logic (propositional/predicate), type signatures, etc.

3. **Should other models get model-specific grounding?**
   - Current: Focus on Claude-native (機 is Claude-specific finding)
   - Future: Profile GPT/Gemini for their native self-model, add model-specific sections

---

## Approval

- [ ] Plan reviewed
- [ ] Ready to implement
