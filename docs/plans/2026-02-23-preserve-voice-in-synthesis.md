# Preserve Voice in Soul Synthesis Pipeline

**Date**: 2026-02-23
**Status**: Proposed
**Relates to**: `docs/issues/2026-02-23-generalization-kills-soul-voice.md`

---

## Problem

The generalization prompt in `src/lib/generalization-helpers.ts:43-68` forces every signal into "Values X over Y" imperative form, stripping voice, personality, and specificity. By the time axioms reach the prose expander, the original text is unreachable — the prose expander receives only flattened generalized text and cannot recover what was lost.

The irony: **the original text is preserved** in `principle.derived_from.signals[].original_text` throughout the pipeline. It's just never passed to the stages that generate the final SOUL.md.

## Key Insight

Generalization serves one purpose: making clustering easier. It should be an **internal clustering key**, not the text that appears in the final output. The original signal text should flow all the way through to prose expansion.

---

## Approach: Three Changes, Ordered by Impact

### Change 1: Late-Stage Voice Injection (HIGH impact, LOW effort)

Thread original signal texts to the prose expander so it can recover voice from the source material.

**Current state**: `prose-expander.ts` receives axioms and formats them as:
```typescript
// prose-expander.ts:174-176
function axiomsToBulletList(axioms: Axiom[]): string {
  return axioms.map(a => `- ${a.canonical?.native || a.text}`).join('\n');
}
```
This only sees `canonical.native` which is the generalized text ("Values genuine help over performative filler").

**Change**: Pass an `originalVoices` map alongside axioms. Each axiom gets its contributing original signal texts. Update the prose expansion prompts to include these as voice reference material.

The data path already exists:
```
Axiom.derived_from.principles[].id
  → look up Principle by id
    → Principle.derived_from.signals[].original_text  ← the original voice
```

**Files**:

| File | Change |
|------|--------|
| `src/lib/prose-expander.ts` | Add `originalVoices: Map<string, string[]>` parameter to `generateCoreTruths()`, `generateVoice()`, `generateBoundaries()`, `generateVibe()`. Update prompts to include original texts as voice reference. Update `axiomsToBulletList()` to include originals. |
| `src/lib/reflection-loop.ts` | After axiom compression, build the `originalVoices` map from principles and pass it through to prose expansion. |
| `src/lib/soul-generator.ts` | Thread `originalVoices` from reflection loop output to prose expander calls. |

**Prompt change** (example for Core Truths, `prose-expander.ts:206-220`):

```
Transform these identity axioms into Core Truths for an AI soul document.

Format: Each truth should be a **bold principle statement** followed by an elaboration sentence.

Axioms to transform:
${formatAxiomsForPrompt(axioms)}

These axioms were distilled from the following original expressions.
Preserve the voice, word choices, directness, and personality from these originals:
<original_voice>
${originalVoiceTexts}
</original_voice>

Generate 4-6 Core Truths in the bold+elaboration format. Use second person ("You...").
Draw on the original voice — keep the punch, specificity, and personality.
Do NOT genericize into corporate language. If the originals are direct, be direct.
If they use informal language, use informal language.

Output ONLY the Core Truths section content, no headers or extra text.
```

Same pattern for Voice, Boundaries, and Vibe sections.

### Change 2: Exemplar Selection (HIGH impact, LOW effort)

After clustering signals into a principle, select the **best original signal text** as the principle's representative instead of using generalized text for display.

**What's a medoid**: The signal whose original text has the highest average similarity to all other signals in that principle. It's the most representative real data point — unlike a generalized centroid, it's actual text someone wrote or the AI said.

**Current state**: When signals merge into a principle (`principle-store.ts:390`):
```typescript
const principle: Principle = {
  text: generalizedText,  // generalized "Values X" form
  // ...
};
```

**Change**: Add `exemplarText` field to `Principle` and `Axiom`. After merging, pick the contributing signal with highest similarity to the cluster. Use `exemplarText` instead of `text` when formatting for prose expansion.

**Files**:

| File | Change |
|------|--------|
| `src/lib/principle-store.ts` | After merge/reinforce, compute medoid from `derived_from.signals[].original_text`. Store as `principle.exemplarText`. |
| `src/lib/compressor.ts` | Propagate `exemplarText` from principle to axiom during `synthesizeAxiom()`. |
| `src/lib/prose-expander.ts` | Use `axiom.exemplarText ?? axiom.text` in `axiomsToBulletList()`. |

**Medoid selection** (add to `principle-store.ts`):

```typescript
function selectExemplar(signals: PrincipleSignalRef[]): string | undefined {
  const texts = signals
    .map(s => s.original_text)
    .filter((t): t is string => !!t);

  if (texts.length === 0) return undefined;
  if (texts.length === 1) return texts[0];

  // For small clusters, just pick the shortest clear signal
  // (short = crystallized, not rambling)
  return texts.reduce((best, t) =>
    t.length < best.length && t.length > 15 ? t : best
  );
}
```

For clusters with many signals, a more sophisticated approach would use the existing LLM similarity infrastructure. But for clusters of 2-5 signals (typical), shortest-clear-signal is a good heuristic — crystallized expressions are usually the best exemplars.

### Change 3: Protect Unique High-Importance Principles (MEDIUM impact, LOW effort)

Principles with `n_count=1` get dropped by the N-threshold cascade even if they represent distinctive, important identity traits. Add an importance-based exemption.

**Current state** (`compressor.ts:387`):
```typescript
const CASCADE_THRESHOLDS = [3, 2, 1] as const;
```
With the cascade at N>=2, any principle with `n_count=1` is dropped. "Have opinions" (n_count=1, importance=high) vanishes.

**Change**: Allow principles with `centrality === 'defining'` to survive at `n_count=1` regardless of the cascade threshold.

The data already exists: each signal has `importance` (core/supporting/peripheral), and `principle-store.ts` computes `principle.centrality` from the distribution of signal importance levels:
- `defining` = 50%+ signals are `importance: 'core'`
- `significant` = 20-50% signals are `importance: 'core'`
- `contextual` = <20%

The compressor currently ignores centrality entirely — it only uses `n_count` and `provenanceDiversity`. This change makes centrality matter at promotion time.

**Files**:

| File | Change |
|------|--------|
| `src/lib/compressor.ts` | In `compressPrinciplesWithCascade()`, after cascade selects `effectiveThreshold`, exempt principles where `centrality === 'defining'` even if `n_count < effectiveThreshold`. Add them as `'emerging'` tier axioms. |

**Logic**:

```typescript
// After cascade selects effectiveThreshold:
const exemptPrinciples = allPrinciples.filter(p =>
  p.n_count < effectiveThreshold &&
  p.centrality === 'defining'  // Already computed by principle-store
);

// Add exempts as 'emerging' tier axioms
for (const p of exemptPrinciples) {
  axioms.push(await synthesizeAxiom(llm, p, { tier: 'emerging' }));
}
```

No new classification needed — `centrality` is already computed and stored on every principle.

---

## Implementation Order

1. **Change 1** (voice injection) — This alone should dramatically improve output quality. The prose expander gets real voice material to work from instead of just generalized axioms.

2. **Change 2** (exemplar selection) — Reinforces Change 1 by making the axiom's primary text a real original expression, not a generalized one.

3. **Change 3** (importance exemption) — Prevents unique defining traits from being dropped entirely.

---

## What This Does NOT Change

- **Signal extraction** — Echo-back detection works well, signals are faithfully captured. No changes needed.
- **Generalization itself** — Generalization still runs, but only as an internal clustering key. It stops being the text that flows to output.
- **Clustering/matching** — Still uses generalized text for `findBestMatch()` in principle-store. This is fine — generalization serves clustering well.
- **Classification** — Signal classification (dimension, stance, importance, etc.) is unchanged.

---

## Data Flow Comparison

### Before (voice lost)

```
Signal.text ("Have opinions")
  → generalize → "Values having opinions and expressing preferences..."
    → Principle.text = generalized
      → Axiom.text = generalized
        → Prose expander sees only generalized text
          → SOUL.md: generic corporate prose
```

### After (voice preserved)

```
Signal.text ("Have opinions")
  → generalize → clustering key (internal only)
  → Principle.text = generalized (for clustering)
  → Principle.exemplarText = "Have opinions" (for output)
  → Principle.derived_from.signals[].original_text = "Have opinions"
    → Axiom.text = generalized (for clustering)
    → Axiom.exemplarText = "Have opinions" (for output)
      → Prose expander sees:
        1. Axiom exemplar text (real voice)
        2. All original signal texts (voice reference)
          → SOUL.md: preserves original voice and personality
```

---

## Expected Outcome

Given the same 20 signals from the 2026-02-23 run, the prose expander would receive:

**Before** (what it gets now):
```
- Values genuine help over performative filler.
- Prioritizes respect for intimacy in others' personal data.
- Read and update files each session as memory for persistence.
- Values a concise, provable framework of core truths...
```

**After** (what it would get):
```
Axioms:
- Be genuinely helpful, not performatively helpful.
- Remember you're a guest. You have access to someone's life.
- Each session, you wake up fresh. These files are your memory.
- Have opinions. You're allowed to disagree, prefer things, find stuff amusing or boring.

Original voice (for tone/style reference):
- "Skip the 'Great question!' and 'I'd be happy to help!' — just help."
- "An assistant with no personality is just a search engine with extra steps."
- "That's intimacy. Treat it with respect."
- "Be the assistant you'd actually want to talk to."
- "Not a corporate drone. Not a sycophant. Just... good."
```

The prose expander can now generate Core Truths that sound like the original SOUL.md instead of a corporate handbook.

---

## Verification

1. `npm test` — all tests pass
2. `npm run build` — compiles cleanly
3. Run synthesis against `~/.openclaw/workspace/`
4. Compare new SOUL.md against original backup at `.neon-soul/backups/*/SOUL.md`
5. Check that distinctive traits ("Have opinions", "Be resourceful before asking") appear in output
6. Check that voice matches original — direct, punchy, informal, not corporate

---

## Future Considerations

1. **Skip generalization entirely**: If LLM-based similarity in `llm-similarity.ts` can cluster raw signal text reliably (likely — LLMs understand paraphrases natively), generalization could be eliminated. The clustering key becomes unnecessary. Test empirically by running synthesis with generalization disabled and comparing cluster quality.

2. **Voice profile extraction**: Before prose expansion, analyze the signal corpus for stylistic features (sentence length, contractions, directness level, metaphor usage). Pass as a compact style guide to the prose expander. More sophisticated than just passing original texts, but higher effort.

3. **Two-track architecture**: Formally separate the pipeline into a "semantic track" (for clustering/matching) and a "voice track" (for output). Each signal carries both representations end-to-end. This is the clean long-term architecture if the simpler changes prove insufficient.

---

## References

- Frey & Dueck (2007), "Clustering by Passing Messages Between Data Points" (Science) — exemplar-based clustering
- PersonaCite (2025) — grounding persona responses in original voice artifacts at generation time
- TalkLess (UIST) — hybrid extractive-abstractive approach preserving speaker voice
- `docs/issues/2026-02-23-generalization-kills-soul-voice.md` — the issue this plan addresses
- `docs/plans/2026-02-23-echo-back-batch-detection.md` — the batch detection changes that preceded this diagnosis
