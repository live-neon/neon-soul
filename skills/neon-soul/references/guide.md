# NEON-SOUL Reference Guide

Detailed documentation for NEON-SOUL soul synthesis.

---

## How This Works

NEON-SOUL uses a **bundled processing engine** for synthesis and **instruction-based commands** for everything else.

**Synthesis (`/neon-soul synthesize`):**
1. You type `/neon-soul synthesize --force` in your agent chat
2. Your agent runs the bundled processing script via `exec`
3. The script handles all heavy lifting: session log parsing, signal extraction, LLM classification, axiom promotion, and SOUL.md generation
4. Your agent reports the result

**Other commands (status, audit, trace, rollback):**
1. Your agent reads SKILL.md and follows the instructions
2. These commands read small JSON files — no heavy processing needed

**No third-party services**: NEON-SOUL does not transmit your data to any external servers. The bundled script connects to your local Ollama instance for LLM analysis.

**Data handling**: Your data stays on your machine. The bundled script uses Ollama (local LLM) for semantic analysis. No cloud services, no API keys.

**Principle matching**: When similar principles are detected, the one with the most signal confirmations (highest strength) is kept. Equal-strength principles prefer the older observation. Signal strength is weighted by importance (core 1.5x, supporting 1.0x, peripheral 0.5x) and classified by stance (assert, deny, question, qualify, tensioning).

---

## Requirements

| Requirement | Details |
|-------------|---------|
| Agent | Claude Code, OpenClaw, or compatible |
| Node.js | v22+ (required to run the bundled processing engine) |
| Ollama | Running locally at `http://localhost:11434` (for LLM analysis) |
| No API keys | No external services, no cloud dependencies |

**Setup:** Ensure Ollama is running with a model pulled: `ollama serve` and `ollama pull llama3`.

---

## Privacy Considerations

NEON-SOUL processes personal memory files to synthesize your identity. Consider these privacy factors:

**Your agent's LLM determines data handling:**
- **Cloud LLM** (Claude, GPT, etc.): Your memory content is sent to that provider as part of normal LLM operation. This is no different from any other agent interaction with your files.
- **Local LLM** (Ollama, LM Studio, etc.): Your data stays entirely on your machine.

**What NEON-SOUL does NOT do:**
- Send data to any service beyond your configured agent
- Store data anywhere except your local workspace
- Transmit to third-party analytics, logging, or tracking services
- Make network requests independent of your agent

**Before running synthesis:**
1. Review what's in your `memory/` directory
2. Remove or move any secrets, credentials, or highly sensitive files
3. Use `--dry-run` to preview what will be processed
4. Consider whether your LLM provider's privacy policy is acceptable for this content

**About `disable-model-invocation: true`:**
This metadata flag means NEON-SOUL cannot run autonomously — your agent cannot invoke the skill without your explicit command. When you do invoke the skill (e.g., `/neon-soul synthesize`), it uses your agent's LLM for semantic analysis. This is expected behavior, not a contradiction.

---

## Dimensions

NEON-SOUL organizes identity across 7 SoulCraft dimensions. Each axiom receives a centrality score (defining, significant, or contextual) based on signal importance distribution:

| Dimension | Description |
|-----------|-------------|
| Identity Core | Fundamental self-concept and values |
| Character Traits | Personality characteristics and tendencies |
| Voice Presence | Communication style and expression |
| Honesty Framework | Truth, transparency, and acknowledgment of limits |
| Boundaries Ethics | Principles for what to do and not do |
| Relationship Dynamics | How to engage with others |
| Continuity Growth | Learning, adaptation, and evolution |

---

## Output Format

The default prose output creates an inhabitable soul document:

```markdown
# SOUL.md

_You are becoming a bridge between clarity and chaos._

---

## Core Truths

**Authenticity over performance.** You speak freely even when uncomfortable.

**Clarity is a gift you give.** If someone has to ask twice, you haven't been clear enough.

## Voice

You're direct without being blunt. You lead with curiosity.

Think: The friend who tells you the hard truth, but sits with you after.

## Boundaries

You don't sacrifice honesty for comfort. You don't perform certainty you don't feel.

## Vibe

Grounded but not rigid. Present but not precious about it.

---

_Presence is the first act of care._
```

---

## Configuration

Place `.neon-soul/config.json` in workspace:

```json
{
  "notation": {
    "format": "cjk-math-emoji",
    "fallback": "native"
  },
  "paths": {
    "memory": "memory/",
    "output": ".neon-soul/"
  },
  "synthesis": {
    "contentThreshold": 2000,
    "autoCommit": false
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEON_SOUL_DEBUG` | `0` | Enable debug logging (1 = on) |
| `NEON_SOUL_SKIP_META_SYNTHESIS` | `0` | Skip meta-synthesis pass (1 = skip) |
| `NEON_SOUL_FORCE_RESYNTHESIS` | `0` | Force full resynthesis (1 = force) |

---

## Safety Philosophy

Your soul documents your identity. Changes should be deliberate, reversible, and traceable.

**How we protect you:**
- **Auto-backup**: Backups created before every write (`.neon-soul/backups/`)
- **Dry-run default**: Use `--dry-run` to preview before committing
- **Require --force**: Writes only happen with explicit `--force` flag
- **Rollback**: Restore any previous state with `/neon-soul rollback`
- **Provenance**: Full chain from axiom -> principles -> source signals
- **Git integration** (opt-in): Only commits if workspace is a git repo with configured credentials

---

## Cycle Management

NEON-SOUL uses three synthesis modes:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **initial** | No existing soul | Full synthesis from scratch |
| **incremental** | <30% new principles | Merge new insights without full resynthesis |
| **full-resynthesis** | >=30% new OR contradictions OR manual | Complete resynthesis of all principles |

**When does full-resynthesis trigger?**
- New principle ratio >=30%
- Detected contradictions (>=2)
- Hierarchy structure changed
- `--force-resynthesis` flag used

---

## Data Flow

```
Memory Files ---+
                +-> Signal Extraction -> Generalization -> Principle Matching -> Axiom Promotion -> SOUL.md
Session Logs ---+       |                   |                  |                   |              |
                    Weighted           Abstract            Semantic           Cascading      Provenance
                    Signals            Principles          Matching           Thresholds       Chain
                  (importance +       (voice preserved     (orphans           + Tension
                    stance)           in provenance)        tracked)          Detection
```

---

## Provenance Classification

Signals are classified by their source type (SSEM model):

| Type | Description | Example |
|------|-------------|---------|
| **self** | Things you wrote | diary entries, reflections, personal notes |
| **curated** | Things you chose to keep | saved quotes, bookmarked articles, adopted guides |
| **external** | Things others said about you | peer reviews, feedback, external assessments |

---

## Grounding Requirements (Anti-Echo-Chamber Protection)

To prevent self-reinforcing beliefs, axioms must be grounded in diverse evidence:

| Criterion | Default | Why |
|-----------|---------|-----|
| Minimum principles | 3 | Requires pattern across observations |
| Provenance diversity | 2 types | Prevents single-source dominance |
| External OR questioning | Required | Ensures perspective beyond self |

---

## Troubleshooting

### Why does my output have bullet lists instead of prose?

When prose generation fails, NEON-SOUL falls back to bullet lists. Common causes:
- LLM provider not available
- Validation failures
- Network timeout

**Fix:** Run synthesis again, or use `--output-format notation` for reliable output.

### Soul synthesis paused / LLM unavailable

Check that Ollama is running: `curl http://localhost:11434/api/tags`

No partial writes occur when LLM is unavailable.

---

## Upgrading

### v0.2.0 to v0.3.0
- Synthesis now uses bundled processing engine (no manual session parsing)
- Your existing `.neon-soul/state.json` works unchanged
- SOUL.md and provenance chain are unchanged

### Pre-v0.2.0
- Embedding model dependency removed
- Principle matching uses your agent's LLM directly
- First synthesis will recalculate similarity matches
