# Self-Learning Agent for OpenClaw

**Source**: Shared by Lucas (2026-02-07)
**Relevance**: Addresses NEON-SOUL Research Question 5 - "How should souls change over time?"

> **⚠️ STATUS: PROPOSAL, NOT CURRENT BEHAVIOR**
>
> This document describes a *proposed* system for OpenClaw soul evolution. As of Feb 2026, **OpenClaw does not update SOUL.md after initial bootstrap** - it remains read-only. This proposal would change that, but the system is not yet built.
>
> **Current OpenClaw behavior**:
> | Event | SOUL.md | memory/*.md |
> |-------|---------|-------------|
> | First run | Created via Q&A | - |
> | Every session | Read & injected | Appended |
> | Memory flush | Unchanged | Written |
> | Daily | Unchanged | Unchanged |
>
> **NEON-SOUL implication**: We use single-track architecture (no dual-track merge needed) since OpenClaw never modifies SOUL.md. See [Master Plan](../plans/2026-02-07-soul-bootstrap-master.md#4-single-track-replacement).

**Cross-references**:
- [OpenClaw Soul Architecture](openclaw-soul-architecture.md) - The 4 identity files this system would update
- [Hierarchical Principles Architecture](hierarchical-principles-architecture.md) - Schema for what evolves

---

## Vision

OpenClaw already remembers things (memory files). But memory is passive — it only gets searched when asked. The agent's *identity* (SOUL.md, USER.md, IDENTITY.md, AGENTS.md) stays frozen from day one.

This system would close the loop: **memory → synthesis → updated identity files → next session starts smarter.**

---

## How it works

```
Session happens → memory/*.md gets written
                        │
                        ▼
              Synthesis engine runs
        (heartbeat, end-of-session, daily, or manual)
                        │
                        ▼
           Reads new memory since last run
           Reads current identity files
           Calls LLM to rewrite the relevant ones
                        │
                        ▼
           Writes updated files:
           • SOUL.md    (persona, tone, boundaries, principles)
           • USER.md    (who the user is, preferences)
           • IDENTITY.md (name, emoji, vibe)
           • AGENTS.md  (operating rules, skills, how-to)
                        │
                        ▼
           Next session loads updated files
           Agent is evolved
```

No new files. No new formats. Just the four files OpenClaw already injects into every prompt.

---

## What goes where

| Signal from memory | Updates | Example |
|---|---|---|
| User facts & preferences | USER.md | "Prefers TypeScript", "Works at Acme" |
| Tone corrections | SOUL.md | "Be more concise", "Less formal" |
| Values & boundaries | SOUL.md | "Never share code publicly" |
| Personality evolution | SOUL.md | Rapport, humor style, trust level |
| Skills & processes learned | AGENTS.md | "Deploy runs via make deploy" |
| Tool conventions | AGENTS.md | "Always use pnpm, not npm" |
| Operating corrections | AGENTS.md | "Ask before deleting files" |
| Name/emoji changes | IDENTITY.md | "Call me Claw", new emoji |

---

## Update frequency — tiered by file stability

Not all files should update at the same rate. The more stable the file, the less often it gets rewritten.

### Three tiers

| Tier | Files | Trigger | Why |
|---|---|---|---|
| **Fast** | USER.md | Every ~20 turns worth of new memory | User facts come up constantly. Cheap to update, highest value. |
| **Medium** | USER.md + AGENTS.md | End of session / pre-compaction | Enough context by session end to update operating rules. |
| **Full** | All 4 files (incl. SOUL.md, IDENTITY.md) | Daily + manual | Personality evolves slowly. Daily is enough. |

### How it decides when to run

We don't hook into OpenClaw's turn counter. Instead, **content-driven thresholds**:

`last-run.json` tracks what was last processed:
```json
{
  "fast": { "file": "memory/2026-02-07.md", "line": 142, "timestamp": "..." },
  "medium": { "file": "memory/2026-02-07.md", "line": 85, "timestamp": "..." },
  "full": { "timestamp": "2026-02-07T03:00:00Z" }
}
```

On each trigger, the memory-reader checks: how much new content since last run for this tier?

| Threshold | Tier triggered | Files updated |
|---|---|---|
| > 2,000 chars of new memory (~20 turns) | Fast | USER.md |
| End of session or > 5,000 chars | Medium | USER.md + AGENTS.md |
| > 24 hours since last full run | Full | All 4 files |

### How triggers fire

| Trigger | What it does |
|---|---|
| **Heartbeat** (every 30 min) | Check memory size → run fast or medium tier if threshold met |
| **Pre-compaction flush** | Run medium tier (session is ending, good time to capture learnings) |
| **Daily cron** | Run full tier (rewrites everything including SOUL.md) |
| **Manual CLI** | Run whatever tier you specify |
| **On-demand skill** | User tells agent "update yourself" → runs full |

### CLI flags

```
npx openclaw-memory synthesize              # Auto-detect: runs whichever tier is due
npx openclaw-memory synthesize --fast       # USER.md only
npx openclaw-memory synthesize --medium     # USER.md + AGENTS.md
npx openclaw-memory synthesize --full       # All 4 files
npx openclaw-memory synthesize --dry-run    # Preview changes without writing
npx openclaw-memory rollback                # Restore from last backup
npx openclaw-memory diff                    # Show what would change
```

### HEARTBEAT.md addition

```markdown
- [ ] Run `npx openclaw-memory synthesize` (auto-detects which tier is due based on new memory volume)
```

This runs every 30 minutes via OpenClaw's built-in heartbeat. The tool itself decides whether enough new memory has accumulated to justify a synthesis. If not, it exits immediately (no LLM calls, no cost).

---

## Why TypeScript

OpenClaw is built entirely in TypeScript/Node.js. Building this tool in the same language gives us:

- **Same runtime** — Node.js is already installed on any machine running OpenClaw. Zero extra dependencies.
- **Same package manager** — pnpm, which OpenClaw uses. Consistent tooling.
- **Shared config parsing** — OpenClaw stores config in `~/.openclaw/openclaw.json`. We read it directly with the same patterns and types.
- **Same LLM SDK** — `@anthropic-ai/sdk` for Claude API calls. Same library OpenClaw uses internally for its own LLM interactions.
- **Skill compatibility** — OpenClaw skills shell out via `npx`. Since Node is already on the path, `npx openclaw-memory synthesize` works natively from a skill with no extra setup.
- **Upstream potential** — if this proves useful, it could become a PR to OpenClaw core. Same language means it could be absorbed directly into the codebase.

Alternatives considered:
- **Shell script** — simpler, but painful for LLM API calls, JSON parsing, and the tier logic.
- **Go** — the Heart/Brain Intake doc spec'd Go, but that adds a separate build toolchain and runtime for no benefit when OpenClaw is already Node.
- **Python** — good LLM ecosystem but adds a second runtime. OpenClaw users may not have Python installed.

---

## Architecture

One Node.js CLI tool. No separate services, no databases, no task queues.

```
openclaw-memory/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # CLI entry point
│   ├── config.ts           # Find workspace, resolve LLM keys
│   ├── memory-reader.ts    # Read memory files, filter to new-since-last-run
│   ├── identity-reader.ts  # Read current SOUL/USER/IDENTITY/AGENTS.md
│   ├── llm.ts              # Call Claude API
│   ├── prompts.ts          # Synthesis prompts for each file
│   ├── synthesize.ts       # Orchestrator: read → synthesize → write
│   └── backup.ts           # Backup files + git commit
├── skill/
│   └── SKILL.md            # OpenClaw skill for on-demand use
├── state/
│   └── last-run.json       # Per-tier tracking of last processed memory
└── docs/
    └── plans/
```

That's it. ~8 source files.

---

## The synthesis call

For each file, one LLM call:

**Input:**
- Current file content
- New memory entries (since last synthesis for this tier)
- File-specific instructions

**Output:**
- Complete rewritten file

**Key prompt rules:**
- Preserve what's still true. Don't throw away working content.
- Add what's new. Incorporate learnings naturally.
- Remove what's stale. Drop contradicted or outdated info.
- Keep it concise. These files eat token budget every session.
- For IDENTITY.md: preserve the exact bullet-list format (Name, Emoji, Creature, Vibe, Avatar).

---

## Safety

1. **Backup before write** — copies to `.identity-backups/YYYY-MM-DD-HHmmss/`
2. **Git commit** — auto-commit if workspace is a git repo
3. **Dry-run** — `--dry-run` shows what would change
4. **Rollback** — `npx openclaw-memory rollback` restores last backup
5. **Validation** — reject empty, too-short, or malformed output
6. **Content-driven rate limiting** — won't run unless enough new memory has accumulated
7. **IDENTITY.md format check** — verify bullet-list format preserved
8. **No-op exit** — if nothing meaningful changed, skip the write entirely

---

## Implementation order

1. Project setup (package.json, tsconfig, types)
2. Config (find workspace path, resolve API keys)
3. Memory reader (read + filter memory files, calculate new content size)
4. Identity reader (read the 4 governance files)
5. LLM client (Claude API)
6. Prompts (one per file)
7. Tier logic (fast/medium/full detection based on thresholds)
8. Synthesize orchestrator (read → pick tier → call LLM → validate → write)
9. Backup + git
10. CLI (synthesize, dry-run, rollback, diff, tier flags)
11. OpenClaw skill (SKILL.md)
12. HEARTBEAT.md integration guide

---

## NEON-SOUL Relevance

This document directly addresses Research Question 5: **"How should souls change over time?"**

### Key Insights for Soul Evolution

1. **Tiered update frequency**: Not all identity aspects should evolve at the same rate
   - Fast-changing: User preferences, operational learnings
   - Slow-changing: Core personality, values, boundaries

2. **Content-driven thresholds**: Evolution triggered by accumulated evidence, not time alone

3. **Synthesis, not append**: LLM rewrites files holistically rather than appending

4. **Safety-first**: Backups, validation, dry-run, rollback before any changes

5. **Minimal architecture**: ~8 source files, no databases, just file I/O + LLM calls

### Implications for Compressed Souls

If NEON-SOUL achieves 10-100x compression:
- Synthesis prompts become cheaper (smaller current file to process)
- Update frequency could increase (lower token cost per synthesis)
- Tiering might collapse (all files small enough to update together)

### Integration Points

| OpenClaw Component | NEON-SOUL Equivalent |
|-------------------|---------------------|
| SOUL.md | Axioms + Principles (compressed) |
| USER.md | User context (could remain verbose) |
| IDENTITY.md | Evolution story (emoji/CJK) |
| AGENTS.md | Operational patterns |

---

*This document provides a concrete implementation approach for soul document evolution that could be adapted for compressed soul formats.*
