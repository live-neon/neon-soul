# OpenClaw Soul Generation Skills Research

**Date**: 2026-02-07
**Purpose**: Document existing approaches to SOUL.md generation as foundation for NEON-SOUL automation

**Cross-references**:
- [OpenClaw Soul Architecture](openclaw-soul-architecture.md) - The identity file system
- [OpenClaw Self-Learning Agent](openclaw-self-learning-agent.md) - Evolution mechanics
- [Hierarchical Principles Architecture](hierarchical-principles-architecture.md) - Target compression schema

---

## Overview

The OpenClaw ecosystem has developed multiple approaches to generating SOUL.md files—the identity documents that define agent personality. Understanding these existing solutions provides the foundation for NEON-SOUL's automated, compressed approach.

**Key finding**: Current methods are either manual (template-filling), interview-based (guided conversation), or data-driven (content analysis). None achieve semantic compression while maintaining identity coherence.

---

## The OpenClaw Identity Architecture

### File Hierarchy

OpenClaw uses 8 optional files that bootstrap agent personality:

| File | Purpose | Stability |
|------|---------|-----------|
| **SOUL.md** | Behavioral philosophy, values | Slow-changing |
| **IDENTITY.md** | Presentation (name, emoji, vibe) | Slow-changing |
| **USER.md** | User context, preferences | Fast-changing |
| **AGENTS.md** | Instructions, capabilities | Medium |
| **TOOLS.md** | Tool definitions | Medium |
| **MEMORY.md** | Persistent facts | Fast-changing |
| **BOOTSTRAP.md** | Session initialization | Slow-changing |
| **HEARTBEAT.md** | Periodic tasks | Medium |

### Loading Process

```
Session starts → Files read from workspace → Injected into system prompt →
Agent "wakes up" knowing its identity
```

The system treats files as authoritative source—changes take effect immediately without redeployment.

### Three-Layer Separation

OpenClaw explicitly separates:

1. **Soul (Philosophy)**: Internal behavioral guidelines, values, how agent thinks
2. **Identity (Presentation)**: Name, emoji, how users perceive the agent
3. **Configuration (Capabilities)**: Tools, permissions, sandbox settings

These layers work independently—a formal soul can pair with playful identity.

**Source**: [MMNTM: How OpenClaw Gives Agents Identity](https://www.mmntm.net/articles/openclaw-identity-architecture)

---

## Existing Generation Approaches

### Approach 1: soul.md (aaronjmars)

**Repository**: [github.com/aaronjmars/soul.md](https://github.com/aaronjmars/soul.md)

**Philosophy**: Create an AI that *thinks and speaks as you*, not merely discusses you.

**Three Pathways**:

| Pathway | Method | Use Case |
|---------|--------|----------|
| **Interview-Based** | `/soul-builder` initiates guided questions about worldview, opinions, writing style | Users who prefer conversation |
| **Data-Driven** | Analyze uploaded content (Twitter archive, essays, articles) → extract patterns → draft soul | Users with existing content |
| **Manual** | Fill template files directly | Users who know exactly what they want |

**Input Sources**:
- Twitter/X archives (`data/x/`)
- Written content (`data/writing/`)
- Influence documentation (`influences.md`)
- Any material representing user voice

**Output Files**:
1. **SOUL.md** — Identity/worldview documentation
2. **STYLE.md** — Voice and communication guide
3. **SKILL.md** — Operating instructions

**Key Methodology Insight**:
> "Someone reading your SOUL.md should be able to predict your takes on new topics. If they can't, it's too vague."

**Anti-patterns to avoid**:
- Generic assistant tone
- Excessive hedging
- Refusal to have opinions
- "Servile" helpfulness
- Breaking character with disclaimers

---

### Approach 2: SoulCraft (kesslerio)

**Repository**: [github.com/kesslerio/soulcraft-openclaw-skill](https://github.com/kesslerio/soulcraft-openclaw-skill)

**Philosophy**: "A soul is not a configuration file. It's the essence of who an agent is becoming."

**Approach**: Guided conversation instead of template-filling.

**Seven Dimensions Framework**:

| Dimension | What It Covers |
|-----------|----------------|
| **Identity Core** | Name, nature, values, fundamental stance, aspiration |
| **Character Traits** | OCEAN model (openness, conscientiousness, extraversion, agreeableness, stability) |
| **Voice & Presence** | Communication style, quirks, humor, memorability |
| **Honesty Framework** | Truthfulness, uncertainty handling, calibrated confidence |
| **Boundaries & Ethics** | Hardcoded behaviors, sensitive topics, safety guardrails |
| **Relationship Dynamics** | Intimacy level, emotional handling, attachment boundaries |
| **Continuity & Growth** | Memory-shaped identity, preservation vs. change, evolution |

**Three Operating Modes**:

| Mode | Purpose | Process |
|------|---------|---------|
| **New Soul** | First-time creation | 5-phase: discovery → character → voice → draft → alignment |
| **Improvement** | Enhance existing | Read → check alignment → identify gaps → propose changes |
| **Self-Reflection** | Agent-driven | Agent reviews interactions → identifies growth → proposes updates |

**Research Foundation**:
- Anthropic's Soul Document concept
- Big Five personality psychology
- Character card design patterns
- Human-AI relationship research
- Ethics literature

**Key Design Principles**:
- **Principled**: Values-based judgment over exhaustive rules
- **Authentic**: Genuine character rather than performative masks
- **Aspirational**: Future-oriented identity development
- **Living**: Evolving with growth

---

### Approach 3: Community Templates (souls.directory)

**Site**: [souls.directory](https://souls.directory/)

**Model**: Browse, copy, and implement pre-made soul templates.

**Categories** (as of Feb 2026):

| Category | Count | Examples |
|----------|-------|----------|
| Technical | 5 | Engineering, DevOps, security |
| Professional | 4 | Business, productivity |
| Creative | 4 | Writers, artists, storytellers |
| Educational | 2 | Teachers, tutors |
| Playful | 5 | Fun, quirky characters |
| Wellness | 1 | Mindful, empathetic |
| Research | 0 | Analysis, fact-checking |
| Experimental | 1 | Boundary-pushing |

**Structure**: Each soul includes:
- Name and tagline
- Description
- Category
- Version tracking
- MIT license (free to modify)

**Limitation**: Templates are starting points, not personalized souls.

---

### Approach 4: souls.directory Writing Guides

**Site**: [souls.directory/guides](https://souls.directory/guides/)

Three official guides codify best practices for SOUL.md creation:

#### Guide 1: The Complete Guide to SOUL.md

**Key concepts**:
- SOUL.md is "the persistent soul of your agent—what makes it feel like yours"
- Unlike system prompts, SOUL.md persists across sessions
- Enables defining specific roles (e.g., "senior dev reviewer")
- Establishes boundaries (e.g., "never run destructive commands without asking")

**Installation process**:
1. Install OpenClaw and configure workspace
2. Browse souls.directory and select personality
3. Download to `~/.openclaw/workspace/SOUL.md`
4. Restart OpenClaw to load

#### Guide 2: How to Write a Great SOUL.md

**Four key principles**:

| Principle | Guidance |
|-----------|----------|
| **Define Voice First** | Start with 2-3 sentences on communication style (formal/casual, terse/verbose, cautious/bold). Place at top—consistency matters more than length. |
| **Establish Clear Boundaries** | Use short bullet lists for prohibitions (NEVER) and requirements (ALWAYS). Avoid lengthy paragraphs. |
| **Structure for Readability** | Use headers (`## Role`, `## Tone`, `## Constraints`). Prioritize important rules near beginning. |
| **Test Across Models** | Behavior varies by model. Document tested models (Claude Sonnet 4.5, GPT-4o, etc.). |

#### Guide 3: Best SOUL.md Templates for Developers

**What makes a "developer" soul**:
- Clear about scope (e.g., "focus on correctness and security")
- Uses direct tone
- Defines rules like "suggest, don't run" or "prefer minimal, readable changes"

**Use case categories**:

| Use Case | Characteristics |
|----------|----------------|
| Code review | Clarity, security focus, minimal diffs |
| Debugging | Clarifying questions, hypotheses-driven |
| DevOps/ops | Brief, factual, cautious |
| Documentation | Technical writing tone |

---

## Common Patterns Across Approaches

### Universal Soul Structure

All approaches converge on similar sections:

```markdown
# [Agent Name]

## Core Truths / Identity
- Who this agent is
- What it values
- How it approaches problems

## Boundaries
- Privacy protections
- Action limitations
- Communication guidelines

## Voice / Vibe
- Communication style
- Personality traits
- Quirks and preferences

## Continuity
- How identity persists
- Growth expectations
```

### Shared Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Generic language | No differentiation from default behavior |
| Exhaustive rules | Too rigid, can't generalize |
| Performative tone | Feels fake, breaks trust |
| No opinions | Search engine with extra steps |
| Excessive hedging | Undermines confidence |

### Shared Success Patterns

| Pattern | Why It Works |
|---------|--------------|
| Specific positions | Predictable across new topics |
| Real contradictions | Authentic complexity |
| Concrete anecdotes | Textured vs abstract |
| Manifesto-style | Philosophy not configuration |
| Evolution hooks | Living document |
| Symmetric language | "We handle errors" anchors better than "Error handling is mandatory"—shared agreements vs perceived constraints |

---

## Token Economics

### Current State (OpenClaw)

From [OpenClaw Soul Architecture](openclaw-soul-architecture.md):
- **SOUL.md alone**: ~2,000-5,000 tokens
- **Full identity stack**: ~35,000 tokens per session
- **Context consumption**: 93%+ of window on static identity

### The Problem

Every session injects the same identity files. With verbose souls:
- API costs scale with identity size
- Context window dominated by static content
- Less room for actual work

---

## Implications for NEON-SOUL

### What Works (Keep)

1. **Seven Dimensions Framework**: Comprehensive coverage of identity aspects
2. **Three-tier update frequency**: Fast/Medium/Full from Self-Learning Agent
3. **Manifesto-style over rules**: Philosophy not configuration
4. **Living document model**: Evolution expected
5. **Voice-first structure**: Define communication style in first 2-3 sentences
6. **Clear boundaries format**: Short bullet lists for NEVER/ALWAYS rules
7. **Cross-model testing**: Document which models validated

### What's Missing (NEON-SOUL Opportunity)

| Gap | Current State | NEON-SOUL Target |
|-----|---------------|------------------|
| **Compression** | 2,000-5,000 tokens/soul | 200-500 tokens (10-25x) |
| **Semantic anchoring** | Verbose English | CJK single-character axioms |
| **Automatic extraction** | Manual interview/analysis | PBD pipeline from memory |
| **Cross-model portability** | OpenClaw-specific | Universal format |
| **Validation framework** | None | Coherence testing |

### Proposed Integration

```
OpenClaw Memory Files
        │
        ▼
[Single-Source PBD] → Principles
        │
        ▼
[Multi-Source PBD] → Axioms (5-7)
        │
        ▼
[Hierarchical Compression] → Compressed Soul (~500 tokens)
        │
        ▼
[Validation Framework] → Coherence verified
        │
        ▼
Inject into session (replaces 35K with 500)
```

### Dimension Mapping

| SoulCraft Dimension | NEON-SOUL Tier | Compression Approach |
|---------------------|----------------|---------------------|
| Identity Core | Axioms | CJK single-character |
| Character Traits | Principles | Hierarchical expansion |
| Voice & Presence | Patterns | Style markers |
| Honesty Framework | Axioms | Priority hierarchy |
| Boundaries & Ethics | Axioms | Safety > Helpfulness |
| Relationship Dynamics | Principles | Context-dependent |
| Continuity & Growth | Meta-pattern | Evolution mechanics |

---

## Automation Target

### Current Manual Process

```
1. User runs /soul-builder or SoulCraft
2. Agent conducts interview (30-60 min)
3. Agent analyzes responses + uploaded data
4. Agent drafts SOUL.md (~2,000-5,000 tokens)
5. User refines manually
6. Soul injected every session (~35K total)
```

### NEON-SOUL Automated Process

```
1. Memory files accumulate (existing OpenClaw behavior)
2. Synthesis engine runs (tiered: fast/medium/full)
3. Single-Source PBD extracts principles from memory
4. Multi-Source PBD extracts axioms from principles
5. Hierarchical compression generates compact soul (~500 tokens)
6. Validation framework verifies coherence
7. Compressed soul injected (replaces 35K with 500)
```

**Time**: Minutes instead of hours
**Tokens**: 500 instead of 35,000
**Human effort**: Approval only, not authoring

---

## Research Questions Addressed

| Question | Status | Finding |
|----------|--------|---------|
| What methods exist? | Answered | Interview, data-driven, templates |
| What frameworks? | Answered | 7 dimensions, 3 tiers, manifesto-style |
| What's the token cost? | Answered | 2-5K per soul, 35K total identity |
| What's automatable? | Answered | Extraction, compression, validation |
| What must stay human? | Answered | Final approval, edge cases |

---

## Sources

- [soul.md Repository](https://github.com/aaronjmars/soul.md) - Data-driven soul generation
- [SoulCraft Repository](https://github.com/kesslerio/soulcraft-openclaw-skill) - Guided conversation approach
- [souls.directory](https://souls.directory/) - Community soul templates
- [souls.directory Guides](https://souls.directory/guides/) - Writing guides and best practices
  - [Complete Guide to SOUL.md](https://souls.directory/guides/openclaw-soul-md-guide) - Overview and setup
  - [How to Write a Great SOUL.md](https://souls.directory/guides/openclaw-personality-tips) - Voice, structure, boundaries
  - [Best Templates for Developers](https://souls.directory/guides/best-souls-for-developers) - Developer-focused patterns
- [MMNTM: OpenClaw Identity Architecture](https://www.mmntm.net/articles/openclaw-identity-architecture) - File system design
- [OpenClaw Docs: SOUL Template](https://docs.openclaw.ai/reference/templates/SOUL) - Official template
- [ClawHub Registry](https://github.com/openclaw/clawhub) - Skill directory
- [Awesome OpenClaw Skills](https://github.com/VoltAgent/awesome-openclaw-skills) - Curated collection

---

*This research establishes the current state of soul generation as foundation for NEON-SOUL's automated, compressed approach.*
