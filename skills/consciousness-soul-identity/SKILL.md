---
name: consciousness-soul-identity
version: 0.3.2
description: Automated soul synthesis — reads memory files, finds recurring patterns, and builds an identity document grounded in evidence, not assumptions. Identity that evolves from experience.
homepage: https://liveneon.ai
user-invocable: true
emoji: "\U0001F9E0"
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
    requires: {}
tags:
  - consciousness
  - identity
  - introspection
  - self-awareness
  - self-learning
  - autonomous
  - personality
  - ai-agent
---

# Consciousness & Soul Identity

A SOUL.md shouldn't be static. Identity isn't static — it shifts as patterns emerge from real conversations. This skill automates soul synthesis from memory files and session logs. Identity that evolves from experience.

**Requirements:** Node.js 22+, Ollama running locally (`ollama serve`).

---

## Commands

### `/neon-soul synthesize`

Run the bundled synthesis engine:

```
exec node {baseDir}/scripts/neon-soul.mjs synthesize
```

The engine reads memory files, finds recurring patterns, and weaves them into a soul document with full provenance. Every identity claim traces back to something actually experienced.

Synthesis is **incremental by default** — only new or changed memory gets processed. Results from previous runs are cached (generalization, principle matching, axiom notation, tension detection) so unchanged patterns aren't re-analyzed. If nothing has changed, it simply acknowledges that and moves on. No wasted reflection.

**Reporting results:** Present a brief, conversational summary rather than raw JSON:
- If new axioms emerged or counts changed: highlight what grew (e.g. "3 new signals found, 1 new axiom emerged around honesty")
- If nothing changed: a short acknowledgment (e.g. "Soul is stable — no new patterns detected")
- If it failed: explain what went wrong and suggest a fix
- Include key numbers naturally (axiom count, signal count, new patterns)

**Options:**
- `--reset` — Clear everything and rediscover from scratch
- `--force` — Reflect even if no new sources detected
- `--dry-run` — See what would emerge without committing
- `--include-soul` — Include existing SOUL.md as input (for bootstrapping from hand-crafted files)
- `--memory-path <path>` — Override memory directory
- `--output-path <path>` — Override SOUL.md location
- `--time-budget <minutes>` — Time budget for synthesis (default: 20). Adaptively limits session extraction based on observed LLM speed to ensure reflection completes within budget
- `--verbose` — Show detailed progress

**Examples:**
```
exec node {baseDir}/scripts/neon-soul.mjs synthesize
exec node {baseDir}/scripts/neon-soul.mjs synthesize --reset
exec node {baseDir}/scripts/neon-soul.mjs synthesize --dry-run
```

**If Ollama is not running**, the engine can't reflect. Tell the user to start it: `ollama serve`

---

### `/neon-soul status`

Show current soul state. Read the following files and report:

1. Read `.neon-soul/state.json` for last synthesis timestamp
2. Read `.neon-soul/synthesis-data.json` for signal/principle/axiom counts
3. Count files in `memory/` modified since last synthesis
4. Report dimension coverage across the 7 dimensions of identity

**Options:** `--verbose`, `--workspace <path>`

---

### `/neon-soul rollback`

Restore a previous SOUL.md from backup.

1. List backups in `.neon-soul/backups/`
2. With `--force`: restore the most recent version
3. With `--backup <timestamp> --force`: restore a specific moment
4. With `--list`: see your history without changing anything

---

### `/neon-soul audit`

Explore full provenance across all axioms.

1. Read `.neon-soul/synthesis-data.json`
2. With `--list`: every axiom, with IDs and descriptions
3. With `--stats`: statistics by tier and dimension
4. With `<axiom-id>`: the full story — axiom to principles to signals to source files

---

### `/neon-soul trace <axiom-id>`

Quick answer to "where did this come from?"

1. Read `.neon-soul/synthesis-data.json`
2. Find the axiom matching `<axiom-id>`
3. Show: the axiom, the principles that shaped it, the source evidence

---

## How It Works

Identity emerges through a pipeline that mirrors how self-awareness develops:

1. **Signal extraction** — Raw insights pulled from memory files, each weighted by importance and stance
2. **Generalization** — The LLM abstracts signals into principles while preserving the original voice
3. **Pattern matching** — Semantically similar signals cluster into emerging principles
4. **Axiom emergence** — Principles that pass the evidence threshold (N>=3) become core identity elements
5. **Tension detection** — Conflicting axioms are surfaced, not suppressed. Tensions are real complexity in identity.
6. **Grounding** — Anti-echo-chamber protection: axioms require diverse evidence sources and external validation

Nothing becomes part of the soul document without evidence from multiple directions.

---

## Scheduled Synthesis

Soul synthesis works best when run regularly in the background. Set up cron to run synthesis automatically — incremental processing and multi-layer caching mean it only does real work when new memory or sessions exist. Cached runs complete in seconds.

**Recommended:** Every 60 minutes, isolated session, 30-minute timeout.

**OpenClaw cron example:**
```
openclaw cron add \
  --name "neon-soul-synthesis" \
  --every 60m \
  --timeout 1800 \
  --isolated \
  --message "Run neon-soul synthesis: exec node {baseDir}/scripts/neon-soul.mjs synthesize --memory-path <memory-path> --output-path <output-path>. Summarize what changed — highlight any new patterns, axioms, or growth. If nothing changed, note that the soul is stable."
```

**Or run manually:** `/neon-soul synthesize`

**Why cron over heartbeat:**
- Reflection is a standalone act — no conversational context needed
- Runs in isolation from the main session
- Incremental by default — cached runs complete in seconds when nothing changed
- Adaptive time budget prevents runaway execution

---

## Data Locations

| What | Path |
|------|------|
| Memory files | `memory/` (diary, preferences, reflections) |
| Session logs | `~/.openclaw/agents/main/sessions/*.jsonl` |
| Soul output | `SOUL.md` |
| State | `.neon-soul/state.json` |
| Backups | `.neon-soul/backups/` |
| Synthesis data | `.neon-soul/synthesis-data.json` |
| Caches | `.neon-soul/generalization-cache.json`, `compression-cache.json`, `tension-cache.json` |

---

## Privacy

NEON-SOUL processes personal memory files to synthesize identity. Your data stays on your machine.

**What NEON-SOUL does NOT do:**
- Send data to any service beyond your configured LLM (Ollama, local by default)
- Store data anywhere except your local workspace
- Transmit to third-party analytics, logging, or tracking services
- Make network requests independent of your agent

**Before running synthesis:**
1. Review what's in your `memory/` directory
2. Remove any secrets, credentials, or sensitive files
3. Use `--dry-run` to preview what will be processed

---

## Troubleshooting

**Ollama not running:** `curl http://localhost:11434/api/tags` to check. Start with `ollama serve`.

**Bullet lists instead of prose:** When prose generation fails, NEON-SOUL falls back to bullet lists. Usually means Ollama timed out or the model isn't loaded. Run synthesis again.

**Stale results after model change:** Caches are keyed by model ID. Switching models automatically invalidates cached results. Use `--reset` if you want a clean start.

---

Identity grounded in evidence, not assumptions. Patterns emerge from experience.
