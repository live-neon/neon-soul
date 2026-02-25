---
name: NEON-SOUL
version: 0.3.1
description: Automated soul synthesis for AI agents. Extracts identity from memory and session logs, promotes recurring patterns to axioms (N>=3), generates SOUL.md with full provenance tracking. Bundled processing engine — no manual Q&A needed.
homepage: https://liveneon.ai
user-invocable: true
emoji: "\U0001F52E"
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
    requires: {}
tags:
  - soul
  - soul-synthesis
  - identity
  - self-learning
  - memory
  - provenance
  - compression
  - agent-soul
  - soul-document
  - ai-agent
---

# NEON-SOUL

Automated soul synthesis for AI agents. Reads memory files and session logs, finds recurring patterns, generates SOUL.md with provenance tracking. No questionnaires, no templates — identity emerges from real conversations.

**Requirements:** Node.js 22+, Ollama running locally (`ollama serve`).

---

## Commands

### `/neon-soul synthesize`

Run the bundled processing engine. This is a single exec command:

```
exec node {baseDir}/scripts/neon-soul.mjs synthesize
```

Synthesis is **incremental by default** — only new/changed memory files and sessions are processed. Existing signals are preserved and merged with new ones. If nothing changed since the last run, synthesis skips automatically.

The script auto-detects Ollama, reads memory files and session logs, extracts signals, promotes axioms, and generates SOUL.md. It outputs JSON.

**Reporting results:** Don't dump raw JSON. Present a brief, conversational summary:
- If new axioms emerged or counts changed: highlight what grew (e.g. "3 new signals crystallized into axioms — your soul is deepening")
- If nothing changed: a short one-liner is fine (e.g. "Soul is stable, no new patterns detected")
- If it failed: explain clearly what went wrong and suggest a fix
- Include key numbers naturally (axiom count, signal count) but don't list every field
- Keep the tone reflective and warm — this is about the user's identity evolving, not a build log

**Options:**
- `--reset` — Clear all synthesis data and re-extract from scratch
- `--force` — Run even if no new sources detected
- `--dry-run` — Preview changes without writing
- `--include-soul` — Include existing SOUL.md as input (for bootstrapping from hand-crafted files)
- `--memory-path <path>` — Override memory directory
- `--output-path <path>` — Override SOUL.md location
- `--time-budget <minutes>` — Time budget for synthesis (default: 20). Adaptively limits session extraction based on observed LLM speed to ensure synthesis completes within budget

**Examples:**
```
exec node {baseDir}/scripts/neon-soul.mjs synthesize
exec node {baseDir}/scripts/neon-soul.mjs synthesize --reset
exec node {baseDir}/scripts/neon-soul.mjs synthesize --force
exec node {baseDir}/scripts/neon-soul.mjs synthesize --dry-run
```

**If Ollama is not running**, the script prints an error. Tell the user to start Ollama: `ollama serve`

---

### `/neon-soul status`

Show current soul state. Read the following files and report:

1. Read `.neon-soul/state.json` for last synthesis timestamp
2. Read `.neon-soul/synthesis-data.json` for signal/principle/axiom counts
3. Count files in `memory/` modified since last synthesis
4. Report dimension coverage (7 SoulCraft dimensions)

**Options:** `--verbose`, `--workspace <path>`

---

### `/neon-soul rollback`

Restore previous SOUL.md from backup.

1. List backups in `.neon-soul/backups/`
2. With `--force`: restore most recent backup
3. With `--backup <timestamp> --force`: restore specific backup
4. With `--list`: show available backups without restoring

---

### `/neon-soul audit`

Explore provenance across all axioms.

1. Read `.neon-soul/synthesis-data.json`
2. With `--list`: show all axioms with IDs and descriptions
3. With `--stats`: show statistics by tier and dimension
4. With `<axiom-id>`: show full provenance tree (axiom -> principles -> signals -> source files)

---

### `/neon-soul trace <axiom-id>`

Quick single-axiom provenance lookup.

1. Read `.neon-soul/synthesis-data.json`
2. Find the axiom matching `<axiom-id>`
3. Show: axiom text, contributing principles, source signal file:line references

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

---

## Reference

For detailed documentation (architecture, privacy, troubleshooting, configuration, dimensions), see `{baseDir}/references/guide.md`.
