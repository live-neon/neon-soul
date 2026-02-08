# Getting Started: OpenClaw + NEON-SOUL

**Purpose**: Step-by-step setup for running OpenClaw with NEON-SOUL soul synthesis
**Time**: ~15 minutes
**Audience**: Developers new to OpenClaw or NEON-SOUL

---

## Overview

This guide walks you through:

1. Installing OpenClaw via Docker
2. Creating your first memory files
3. Running NEON-SOUL synthesis
4. Exploring your generated soul

**Architecture**:
```
┌─────────────────────────────────────────────────────┐
│                   Your Machine                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │    OpenClaw     │    │       NEON-SOUL         │ │
│  │  (Docker)       │    │    (npm package)        │ │
│  │  ├── SOUL.md ◄──┼────┼── Generates identity    │ │
│  │  └── memory/ ───┼────┼── Reads for signals     │ │
│  └─────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Node.js | 22+ | `node --version` |
| Git | any | `git --version` |

**Install Docker**:
- **macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: `sudo apt install docker.io docker-compose-v2`
- **Windows**: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

---

## Step 1: Install OpenClaw

### Option A: Quick Setup (Recommended)

```bash
# Clone OpenClaw
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Run automated setup
./docker-setup.sh
```

The setup wizard will:
1. Build the gateway Docker image
2. Configure your LLM provider (Anthropic, OpenAI, or Ollama)
3. Start the gateway container
4. Generate an access token

### Option B: Manual Setup

```bash
# Clone and enter directory
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Build image
docker build -t openclaw:local -f Dockerfile .

# Run onboarding
docker compose run --rm openclaw-cli onboard

# Start gateway
docker compose up -d openclaw-gateway
```

### Verify Installation

```bash
# Check container is running
docker compose ps

# Expected output:
# NAME               STATUS    PORTS
# openclaw-gateway   Up        0.0.0.0:18789->18789/tcp

# View logs
docker compose logs openclaw-gateway -f
```

Access the Control UI: **http://127.0.0.1:18789/**

Enter the token from setup (or retrieve with `docker compose run --rm openclaw-cli dashboard --no-open`).

---

## Step 2: Configure Workspace

OpenClaw stores data in `~/.openclaw/workspace/`. This is where NEON-SOUL reads memory files.

### Verify Structure

```bash
ls -la ~/.openclaw/workspace/
```

Expected structure:
```
~/.openclaw/workspace/
├── SOUL.md           # AI identity (NEON-SOUL updates this)
├── USER.md           # User profile
├── IDENTITY.md       # Core identity statements
├── AGENTS.md         # Agent configurations
├── TOOLS.md          # Available tools
└── memory/
    ├── diary/        # Journal entries
    ├── experiences/  # Event memories
    ├── goals/        # Aspirations
    ├── knowledge/    # Learned facts
    ├── relationships/# People & connections
    └── preferences/  # Likes, dislikes, boundaries
```

### Create Memory Directories (if missing)

```bash
mkdir -p ~/.openclaw/workspace/memory/{diary,experiences,goals,knowledge,relationships,preferences}
```

---

## Step 3: Create Initial Memory Files

NEON-SOUL extracts signals from memory files. Let's create some starter content.

### preferences/communication.md

```bash
cat > ~/.openclaw/workspace/memory/preferences/communication.md << 'EOF'
---
category: communication
created: 2026-02-08
---

# Communication Preferences

## I Prefer

- Clear, direct feedback over hints
- Written explanations for complex topics
- Honest answers, even when uncomfortable

## I Avoid

- Passive-aggressive communication
- Unnecessary meetings when async works
- Sugarcoated feedback that hides problems

## Boundaries

- Respect work hours unless urgent
- Don't make promises I can't keep
EOF
```

### goals/current.md

```bash
cat > ~/.openclaw/workspace/memory/goals/current.md << 'EOF'
---
priority: high
status: in-progress
---

# Current Goals

## Learning

- Understand AI systems deeply
- Build practical projects, not just tutorials

## Values

- Prioritize honesty over comfort
- Maintain work-life balance
- Help others learn what I discover
EOF
```

### diary/first-entry.md

```bash
cat > ~/.openclaw/workspace/memory/diary/2026-02-08.md << 'EOF'
---
date: 2026-02-08
mood: curious
---

# First Entry

Setting up my AI assistant with NEON-SOUL. I want an AI that:

- Knows my preferences without being asked
- Remembers context across conversations
- Evolves alongside me over time

## Reflections

I believe transparency matters. If my AI develops beliefs about me,
I want to know where those beliefs came from.
EOF
```

---

## Step 4: Install NEON-SOUL

### Clone and Build

```bash
# From your projects directory
git clone https://github.com/your-org/neon-soul.git
cd neon-soul

# Install dependencies
npm install

# Build
npm run build

# Verify
npm test
```

### Configure Workspace Path

NEON-SOUL needs to know where OpenClaw lives:

```bash
export OPENCLAW_WORKSPACE=~/.openclaw/workspace
```

Or create a `.env` file:

```bash
echo "OPENCLAW_WORKSPACE=~/.openclaw/workspace" > .env
```

---

## Step 5: Run Your First Synthesis

### Preview (Dry Run)

```bash
# See what would happen without writing
npx tsx scripts/test-pipeline.ts --dry-run
```

This shows:
- How many signals would be extracted
- Which dimensions are covered
- What axioms would emerge

### Full Synthesis

```bash
# Run full synthesis
npx tsx scripts/test-pipeline.ts
```

Output location: `~/.openclaw/workspace/.neon-soul/`

### View Results

```bash
# Check generated SOUL.md
cat ~/.openclaw/workspace/SOUL.md

# View extracted signals
cat ~/.openclaw/workspace/.neon-soul/signals.json | head -50

# View emergent axioms
cat ~/.openclaw/workspace/.neon-soul/axioms.json
```

---

## Step 6: Explore Your Soul

### Status Check

If using as OpenClaw skill:

```bash
/neon-soul status
```

Output:
```
Last Synthesis: 2026-02-08T12:30:00Z (just now)
Pending Memory: 0 chars (Up to date)
Counts: 12 signals, 5 principles, 3 axioms
Dimension Coverage: 4/7 (57%)
```

### Trace an Axiom

```bash
/neon-soul trace ax_honesty
```

Output:
```
誠 (honesty over comfort)
└── "prioritize honesty" (N=3)
    ├── preferences/communication.md:8
    ├── goals/current.md:14
    └── diary/2026-02-08.md:15
```

### Full Audit

```bash
/neon-soul audit --stats
```

---

## Troubleshooting

### OpenClaw Issues

| Problem | Solution |
|---------|----------|
| Container not starting | `docker compose logs openclaw-gateway` |
| Permission denied | `sudo chown -R 1000:1000 ~/.openclaw` |
| Port 18789 in use | Edit `docker-compose.yml` port mapping |
| Token not working | `docker compose run --rm openclaw-cli dashboard --no-open` |

### NEON-SOUL Issues

| Problem | Solution |
|---------|----------|
| No signals extracted | Check memory files exist and have content |
| Empty SOUL.md | Run with `--force` flag |
| Build errors | Ensure Node.js 22+, run `npm install` |
| Test failures | Check Ollama if using real LLM tests |

### Memory File Issues

| Problem | Solution |
|---------|----------|
| Files not detected | Check `OPENCLAW_WORKSPACE` env var |
| Frontmatter errors | Ensure YAML between `---` delimiters |
| Unicode issues | Save files as UTF-8 |

---

## Optional: Local LLM with Ollama

For real LLM testing without API keys:

```bash
# Start Ollama
docker compose -f docker/docker-compose.ollama.yml up -d

# Pull a model
docker exec neon-soul-ollama ollama pull llama3

# Verify
curl http://localhost:11434/api/tags

# Run tests with real LLM
USE_REAL_LLM=true npm test tests/e2e/real-llm.test.ts
```

---

## Next Steps

1. **Add more memory**: Create files in `~/.openclaw/workspace/memory/`
2. **Run synthesis again**: Watch axioms emerge as patterns converge
3. **Explore provenance**: Use `/neon-soul audit` to understand your soul
4. **Configure channels**: Connect Telegram, Discord, or Slack to OpenClaw
5. **Read the research**: See `docs/research/` for methodology details

---

## Quick Reference

### Commands

```bash
# OpenClaw
docker compose up -d                    # Start
docker compose down                     # Stop
docker compose logs -f openclaw-gateway # Logs

# NEON-SOUL
npx tsx scripts/test-pipeline.ts        # Run synthesis
npm test                                # Run tests
/neon-soul status                       # Check state
/neon-soul synthesize --dry-run         # Preview changes
/neon-soul rollback --force             # Restore backup
```

### Paths

| Path | Purpose |
|------|---------|
| `~/.openclaw/` | OpenClaw home directory |
| `~/.openclaw/workspace/` | Active workspace |
| `~/.openclaw/workspace/memory/` | Signal source files |
| `~/.openclaw/workspace/.neon-soul/` | Synthesis artifacts |
| `~/.openclaw/workspace/SOUL.md` | Generated identity |

### Ports

| Port | Service |
|------|---------|
| 18789 | OpenClaw Control UI |
| 11434 | Ollama API (optional) |

---

## Resources

- [OpenClaw Docker Documentation](https://docs.openclaw.ai/install/docker)
- [OpenClaw Practical Guide (2026)](https://aimlapi.com/blog/openclaw-a-practical-guide-to-local-ai-agents-for-developers)
- [Deploy OpenClaw in 15 Minutes](https://markaicode.com/deploy-openclaw-docker/)
- [NEON-SOUL README](../../README.md)
- [Memory Data Landscape](../research/memory-data-landscape.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

---

*Guide created 2026-02-08. For issues, see troubleshooting section or open a GitHub issue.*
