# NEON-SOUL

AI identity compression with full provenance tracking. Generates soul documents from memory files.

**Stack**: TypeScript, Node.js 22+, Vitest, LLM-based semantic similarity

---

## Quick Start

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run tests
npm run lint         # Type check
```

---

## Project Structure

```
src/
├── index.ts              # Library exports
├── skill-entry.ts        # OpenClaw skill loader
├── commands/             # Skill commands (synthesize, status, audit, trace, rollback)
├── lib/                  # Core library
│   ├── pipeline.ts       # Main orchestration (8-stage pipeline, incremental by default)
│   ├── state.ts          # Incremental state tracking (memory hashes, session counts)
│   ├── persistence.ts    # Signal/principle/axiom persistence + clearSynthesisData()
│   ├── session-reader.ts # OpenClaw session log parsing (incremental via startFromMessage)
│   ├── llm-similarity.ts # LLM-based semantic similarity
│   ├── principle-store.ts # N-count convergence
│   └── soul-generator.ts # SOUL.md generation
└── types/                # TypeScript interfaces

skills/
├── neon-soul/            # Primary skill (developer voice)
│   └── SKILL.md
└── consciousness-soul-identity/  # SEO skill (agent voice)
    └── SKILL.md

tests/
├── integration/          # Unit/integration tests
└── e2e/                  # End-to-end tests with fixtures
```

---

## Key Concepts

- **Signal**: Raw insight extracted from memory (with source location)
- **Principle**: Validated pattern (N≥2 occurrences)
- **Axiom**: Core identity element (N≥3, promoted from principles)
- **Provenance**: Full audit trail from axiom → principle → signal → source line
- **Incremental synthesis**: Only extracts signals from new/changed sources; merges with existing signals
- **State tracking**: `state.json` tracks memory file content hashes and session message counts

---

## Synthesis Modes

| Mode | Flag | Behavior |
|------|------|----------|
| **Incremental** | *(default)* | Only process new/changed memory files and sessions. Merge new signals with existing. Skip if nothing changed. |
| **Force** | `--force` | Run even if no new sources detected (still incremental extraction). |
| **Reset** | `--reset` | Clear all synthesis data, re-extract from scratch. Use when you want a clean slate. |
| **Include SOUL** | `--include-soul` | Include existing SOUL.md as input source (off by default to prevent feedback loop). For bootstrapping from hand-crafted files. |
| **Dry run** | `--dry-run` | Preview changes without writing. |

**SOUL.md is never re-ingested by default.** It's a derivative of the pipeline's own output — re-ingesting it creates a feedback loop that inflates LLM request counts. Use `--include-soul` explicitly when bootstrapping from a hand-crafted SOUL.md.

---

## Development Workflows

### Adding a new command
1. Create `src/commands/your-command.ts` with `run()` export
2. Add to `src/skill-entry.ts` command registry
3. Add tests in `tests/integration/`

### Testing changes
```bash
npm test                           # Full suite
npm test -- --grep "pipeline"      # Filter by name
npm run test:watch                 # Watch mode
```

### Running synthesis locally
```bash
# Requires Ollama running with a model loaded
# Run from neon-soul project root:

# Incremental run (default - only processes new/changed sources):
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  NEON_SOUL_LLM_TELEMETRY=1 \
  npx tsx src/cli.ts synthesize \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md

# Reset run (clear everything, re-extract from scratch):
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  NEON_SOUL_LLM_TELEMETRY=1 \
  npx tsx src/cli.ts synthesize --reset \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md

# Force run (run even if no new sources, still incremental):
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  npx tsx src/cli.ts synthesize --force \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md

# Dry run (preview without writing):
cd /Users/neonsoul/Desktop/projects/neon-soul && \
  OLLAMA_MODEL=gpt-oss:120b \
  npx tsx src/cli.ts synthesize --dry-run \
  --memory-path ~/.openclaw/workspace/memory \
  --output-path ~/.openclaw/workspace/SOUL.md
```

---

## Important Files

- `src/lib/pipeline.ts` - Pipeline orchestration (incremental extraction, state tracking)
- `src/lib/state.ts` - Incremental state (memory hashes, session message counts, clearState)
- `src/lib/persistence.ts` - Signal/principle/axiom persistence + clearSynthesisData()
- `src/lib/session-reader.ts` - Session log parsing with incremental startFromMessage
- `src/types/signal.ts` - Core data types
- `skills/neon-soul/SKILL.md` - Skill manifest and commands
- `docs/architecture/README.md` - System design reference

---

## Conventions

- All commands export `run(args, context)` function
- Tests use `tests/e2e/fixtures/mock-openclaw/` for workspace simulation
- Provenance is mandatory - every axiom traces to source
- Default to `--dry-run`, require `--force` for mutations

---

## Safety Rails

- Path traversal protection in all file operations
- Symlink detection and rejection
- Auto-backup before SOUL.md overwrites
- LLM context required (throws `LLMRequiredError` if missing)
- SOUL.md excluded from input by default (prevents feedback loop)
- Atomic file writes (temp + rename) for state and synthesis data
- `--reset` clears data before re-extraction (no stale signal contamination)
