# Generalization Prompt Strips Voice From Synthesized SOUL.md

**Date**: 2026-02-23
**Severity**: High
**Status**: Open
**Affects**: Final SOUL.md quality — voice, personality, actionable specificity

---

## Problem

The synthesized SOUL.md reads like a corporate mission statement instead of a living identity document. Compared to the hand-crafted original, it lost:

- Natural voice and personality
- Concrete, actionable guidance
- Distinctive character (opinions, humor, directness)
- The Continuity section entirely

**Original** (hand-crafted):
> **Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring. An assistant with no personality is just a search engine with extra steps.

**Synthesized**:
> **Every claim must be testable.** You back each statement with clear evidence or a logical pathway so your words can be verified.

The original has punch, specificity, and voice. The synthesized version is generic and could describe any AI assistant.

---

## Root Cause Analysis

The quality loss is a **cascade across three stages**, but one is the primary culprit.

### Stage 1: Generalization Prompt (PRIMARY)

**File**: `src/lib/generalization-helpers.ts:43-68`

The prompt forces every signal into imperative "Values X" / "Prioritizes Z" form:

```
- Use imperative form (e.g., "Values X over Y", "Prioritizes Z")
- Do NOT use pronouns (I, we, you) - abstract the actor
- Stay under 150 characters
```

This is where the voice dies. The signal extraction (echo-back) correctly captures the raw text faithfully:

| Signal (captured correctly) | After generalization (voice lost) |
|---|---|
| "Be genuinely helpful, not performatively helpful" | "Values genuine help over performative filler" |
| "Have opinions" | "Values having opinions and expressing preferences, including disagreement, amusement, or boredom" |
| "Be resourceful before asking" | "Values self-research over asking; seek answers before posing questions" |

The generalization:
- Strips pronouns ("you" becomes abstract actor)
- Forces imperative form ("Values X", "Prioritizes Y")
- Caps at 150 characters, cutting nuance
- Removes concrete examples and specificity
- Makes every principle sound identical in structure

By the time principles and axioms form downstream, the voice is already dead. No later stage can recover it.

### Stage 2: N-Threshold Promotion (SECONDARY)

**File**: `src/lib/compressor.ts:387`

Cascade thresholds: `[3, 2, 1]`. With only 20 signals and 13 principles, most principles have `n_count=1` (one supporting signal). The cascade falls to N>=2, which means distinctive principles like "Have opinions" (`n_count=1`) never become axioms. They vanish entirely.

Result from latest run:
- 1 core axiom (`n_count=5`): "Values genuine help over performative filler"
- 3 emerging axioms (`n_count=2`): privacy, persistence, framework

Key identity traits like having opinions, being resourceful, earning trust through competence — all dropped because they appeared in only one source.

### Stage 3: Prose Expansion (TERTIARY)

**File**: `src/lib/prose-expander.ts:206-220`

The prose expansion prompt says "Be specific and evocative, not generic" but it's working from already-generalized axioms. The input is bland, so the output can't recover voice. It polishes corporate language into slightly shinier corporate language.

---

## Evidence

### Pipeline data from 2026-02-23 synthesis run

**Signals** (20 total): Good quality. Echo-back extraction captured original text faithfully. 14 from SOUL.md, 6 from session logs.

**Principles** (13 total): Voice stripped. Generalization converted everything to "Values X" form. Many with `n_count=1`.

**Axioms** (4 total):
| Axiom | Tier | N-count |
|---|---|---|
| Values genuine help over performative filler | core | 5 |
| Prioritizes respect for intimacy in others' personal data | emerging | 2 |
| Read and update files each session as memory for persistence | emerging | 2 |
| Values a concise, provable framework of core truths, voice, boundaries, and vibe | emerging | 2 |

**Final SOUL.md**: Generic, interchangeable with any AI assistant's description. Lost all distinctive character.

---

## Possible Fixes

### Option A: Preserve original voice in generalization

Change the generalization prompt to keep the original phrasing and voice instead of forcing "Values X" imperative form. Cluster on semantic similarity of the raw text, not on sanitized abstractions.

### Option B: Skip generalization entirely

Feed raw signal text directly to principle clustering. Let the prose expander handle voice in the final output. The generalization step exists to make clustering easier, but if it destroys the soul in the process, it's not worth it.

### Option C: Two-track generalization

Generate both a "clustering key" (abstract, for matching) and preserve the "voice text" (original phrasing). Cluster on the key, but carry the voice text through to prose expansion.

### Option D: Fix N-threshold to not drop unique traits

Lower `MIN_AXIOM_TARGET` or add a "distinctiveness" metric that protects unique, high-importance principles from being dropped even at `n_count=1`. A principle that appears once but scores high on importance should still survive.

---

## Reproduction

1. Run synthesis against `~/.openclaw/workspace/` with any local LLM
2. Compare `~/.openclaw/workspace/SOUL.md` (synthesized) against `~/.openclaw/workspace/.neon-soul/backups/*/SOUL.md` (original)
3. Read `signals.json` — signals are faithful
4. Read `principles.json` — voice is already gone
5. The damage happens between signal extraction and principle formation

---

## Related

- `docs/plans/2026-02-23-echo-back-batch-detection.md` — the batch detection changes that preceded this diagnosis
- `docs/issues/missing-signal-generalization-step.md` — earlier issue about generalization
- `docs/issues/2026-02-09-signal-generalization-impl-findings.md` — prior generalization findings
