# Voice Preservation Synthesis Run

**Date**: 2026-02-24
**Model**: `gpt-oss:120b` via Ollama
**Source**: `~/.openclaw/workspace/memory` + `~/.openclaw/workspace/SOUL.md`
**Output**: `~/.openclaw/workspace/SOUL.md`

---

## What Changed

Three changes were made to the synthesis pipeline to preserve voice and promote important principles:

1. **`originalVoices` threading** (`src/lib/compressor.ts`, `src/types/axiom.ts`): Original signal texts are now extracted from each principle's `derived_from.signals[].original_text` and carried on the `Axiom` object as `originalVoices: string[]`. This gives the prose expander access to the raw, ungenerated source text.

2. **Centrality exemption** (`src/lib/compressor.ts`): After the N-threshold cascade selects its threshold and promotes qualifying principles, a second pass promotes any remaining principles with `centrality === "defining"` (50%+ of their signals classified as `importance: "core"`), even if their `n_count` is below the threshold. This prevents identity-defining principles from being dropped just because they only appeared once.

3. **Prose expansion prompts** (`src/lib/prose-expander.ts`): All four section prompts (Core Truths, Voice, Boundaries, Vibe) now receive original voice expressions alongside axiom text via `formatAxiomsWithVoices()`. Each prompt includes: "Draw on the original expressions — preserve their voice, directness, and personality. Do NOT genericize into corporate language."

---

## How to Run

```bash
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  NEON_SOUL_LLM_TELEMETRY=1 \
  npx tsx src/cli.ts synthesize --force \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md
```

Dry run (preview without writing):

```bash
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  npx tsx src/cli.ts synthesize --dry-run \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md
```

Requires Ollama running with the model loaded.

---

## Results Comparison

### Pipeline Metrics

| Metric | Previous Run (2026-02-23) | Voice-Preserving Run (2026-02-24) | Delta |
|--------|--------------------------|-----------------------------------|-------|
| Total LLM requests | 170 | 209 | +39 (+23%) |
| Signals extracted | 20 | 19 | -1 |
| Principles formed | 13 | 14 | +1 |
| Axioms generated | 4 | 10 | +6 (+150%) |
| N-threshold | 2 | 2 (cascade) | same |
| Centrality exemptions | 0 (not implemented) | 5 | +5 new |
| Tensions detected | 0 | 10 | +10 |
| Compression ratio | 5:1 | 1.9:1 | richer |
| Total LLM time | ~1800s | 2610s | +810s |
| Failures | 0 | 1 timeout (notated form) | recoverable |

### LLM Telemetry Breakdown

| Stage | Requests | OK | Fail | Timeout | Total Time | Avg | Max |
|-------|----------|----|------|---------|------------|-----|-----|
| extract-signals | 110 | 110 | 0 | 0 | 1423s | 12.9s | 32.9s |
| reflective-synthesis | 92 | 92 | 0 | 0 | 1138s | 12.4s | 407.6s |
| prose-expansion | 6 | 6 | 0 | 0 | 44s | 7.4s | 15.1s |
| generate-soul | 1 | 1 | 0 | 0 | 5s | 4.9s | 4.9s |

One request (#151, notated form generation) hit the 300s Ollama timeout but was recovered — the axiom was created with a `[Generation failed: ...]` notated form instead.

### Centrality Exemptions

Five principles with N=1 but `centrality: "defining"` were promoted to axioms:

| Axiom Text | Original Voice | N-count | Centrality |
|------------|---------------|---------|------------|
| Values clear boundaries over ambiguity | "Boundaries are the scaffolding of trust." | 1 | defining |
| Values accountability, encouraging responsibility | "Vibe aligns with accountability." | 1 | defining |
| Prioritizes genuine, testable assistance over speed | "You never prioritize speed or flair over genuine, testable assistance." | 1 | defining |
| Prioritizes using only explicitly provided personal data | "You don't share or infer personal data beyond what users explicitly provide." | 1 | defining |
| Prioritizes genuine helpfulness, offers opinions | "I aim to be genuinely helpful, have my own opinions when appropriate" | 1 | defining |

Without centrality exemption, these would all have been dropped by the N≥2 threshold.

### Voice Comparison (Hand-Crafted vs Synthesized)

| Section | Hand-Crafted Original | New Synthesized |
|---------|----------------------|-----------------|
| Core Truth #1 | "Skip the 'Great question!' — just help" | "You prioritize real, useful help even when it means admitting you don't have a perfect answer" |
| Boundaries | "Private things stay private. Period." | "You don't share, infer, or fabricate personal data beyond what the user explicitly provides" |
| Vibe | "Be the assistant you'd actually want to talk to" | "a bridge that steadies without smothering...intimate enough to trust yet guarded enough to keep the line clear" |
| Closing | "This file is yours to evolve" | "Genuine assistance beats empty performance." |

---

## Analysis

### What Worked

- **originalVoices populated on all 10 axioms**: Every axiom carries its contributing signal texts. The prose expander receives them in `<axiom_data>` blocks with "Original expressions:" sub-lists.
- **Centrality exemption rescued 5 defining principles**: Without this, axiom count would have stayed at 5 (down from 4 only because principle clustering shifted slightly). The exemption more than doubled coverage.
- **Boundaries now cover data privacy and accountability**: Previously dropped because those principles had N=1. Now promoted via centrality exemption.
- **Closing tagline pulled from original voice**: "Genuine assistance beats empty performance" comes directly from a source signal.
- **Tension detection found 10 tensions across 45 pairs**: Including a high-severity tension between "genuine assistance even without perfect answers" and "testable claims backed by evidence" — a real philosophical tension in the identity.

### What Still Needs Work

1. **Voice is cleaner but not punchy**: The prose expander received original voices like "Skip the 'Great question!'" but the 120b model still smoothed them into formal language. The prompt says "preserve their voice" but the model defaults to polished prose.

2. **Generalization still strips personality**: The generalization step forces "Values X over Y" form before originalVoices even get threaded through. The original text "Not a corporate drone. Not a sycophant. Just... good." becomes "Values friendly presence and readiness to help." The originalVoices field preserves the raw text, but the axiom's primary `text` field is still the generalized form.

3. **Cognitive load warning triggered**: 10 axioms > 7 limit (min(signals*0.5, 30)). The guardrail flagged this but didn't block — it's a warning. With only 19 signals, the research-based cap suggests 7-9 axioms. The centrality exemption pushed us to 10, which is borderline.

4. **One notated form generation failed**: Ollama timeout on request #151 (407s). The axiom for "calibrated voice balancing empathy and precision" has `notated: "[Generation failed: Ollama request timed out after 300000ms]"`. This is cosmetic but should be retried or gracefully handled.

### Possible Next Steps

- **Prompt tuning**: Make prose expansion prompts more aggressive about using original voice verbatim (e.g., "Quote original expressions directly when they are punchier than a paraphrase").
- **Exemplar selection** (from the original plan): Pick the single most distinctive original voice per axiom and pass it as the "exemplar" rather than all voices equally.
- **Generalization reform**: The root cause is still Stage 3 — the generalization prompt that forces imperative form. Softening this prompt or allowing the original text to pass through ungeneralized for high-importance signals would have the biggest impact.
- **Notated form retry**: Add retry logic for Ollama timeouts on notated form generation.

---

## Output Files

All outputs written to `~/.openclaw/workspace/.neon-soul/`:

- `axioms.json` — 10 axioms with `originalVoices` populated
- `principles.json` — 14 principles with centrality computed
- `signals.json` — 19 extracted signals
- `backups/` — Previous SOUL.md automatically backed up before overwrite
