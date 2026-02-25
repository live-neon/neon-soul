# ClawHub Competitive Landscape: Soul/Identity Skills

**Date**: 2026-02-24
**Source**: ClawHub.ai browser survey (10,654 total skills)
**Keywords surveyed**: "soul", "identity", "memory", "personality", "consciousness"

---

## Market Overview

ClawHub hosts 10,654 skills as of Feb 24, 2026. The soul/identity space is active but shallow — many skills target the same keywords, but approaches cluster into a few categories:

1. **Manual Q&A creators** — guided conversation to write SOUL.md (most common)
2. **Static persona embodiment** — user writes SOUL.md, agent stays in character
3. **Template pickers** — browse pre-built personalities
4. **Automated synthesis** — extract identity from behavioral data (**neon-soul only**)

---

## Direct Competitors

Skills that directly create, modify, or manage SOUL.md files.

| Rank | Skill | Author | Downloads | Stars | Versions | Approach |
|------|-------|--------|-----------|-------|----------|----------|
| 1 | **SoulCraft** | @kesslerio | 1.2K | 1 | 1 | Manual guided Q&A. 7-dimension framework (Identity Core, Character Traits, Voice, Honesty, Boundaries, Relationships, Continuity). Instruction-only — no processing engine. |
| 2 | **SOUL.MD** | @aaronjmars | 909 | 0 | 1 | Static persona embodiment. User manually writes SOUL.md + STYLE.md + examples/. Agent reads and stays in character. Supports tweet/chat/essay modes. |
| 3 | **Soulstamp** | @brucko | 817 | 1 | 3 | Literary approach inspired by Brandon Sanderson's "The Emperor's Soul." Forges a coherent history that makes behaviors intrinsic rather than imposed. Turns rules into narrative scars/convictions. |
| 4 | **OpenSoul** | @MasterGoogler | 798 | 2 | 1 | Bitcoin SV blockchain audit trails for persistent memory, self-reflection, and on-chain economic tracking. Different market (crypto). |
| 5 | **NEON-SOUL** | @leegitw | 537 | 6 | 13 | **Automated LLM synthesis** from memory files + session logs. Bundled Node.js processing engine. Signal extraction → principle matching → axiom emergence → SOUL.md with full provenance. |
| 6 | **Soul In Sapphire** | @NEXTAltair | 451 | 0 | 12 | Long-term memory operations via Notion. Emotion-state ticks, journaling, durable writes. Notion-specific. |
| 7 | **Soulmate** | @0xRaini | 333 | 1 | 1 | AI relationship simulator (Chinese language). Agent becomes a "soul companion." |
| 8 | **Clawhub Soul** | @tormine | 279 | 0 | 3 | Soul.Markets SDK for AI agent commerce. Upload soul.md, create services, earn USDC. Marketplace. |
| 9 | **Consciousness-soul-identity** | @leegitw | 196 | 6 | 1 | **Our secondary skill.** Same neon-soul engine, philosophical voice. "Discover your soul through memory." |
| 10 | **SOUL.md Maker** | @jeffjhunter | 188 | 3 | 6 | Browse 12 pre-built souls, guided interview (Quick or Deep), blend personas. Template picker. |
| 11 | **Agent Soul Crafter** | @neal-collab | 137 | 0 | 3 | SOUL.md templates covering identity, traits, expertise, response style, safety rules. |
| 12 | **Soul Framework** | (unknown) | 133 | 0 | 1 | Enables consistent persona, user relationships, opinions beyond generic responses. |

---

## Adjacent Competitors

Skills that touch identity/memory/personality but aren't direct soul creators.

| Skill | Author | Downloads | Stars | Relevance |
|-------|--------|-----------|-------|-----------|
| **self-improving-agent** | @pskoett | 35K | 389 | #2 on all of ClawHub. Logs learnings, errors, corrections. Promotes patterns to SOUL.md. Closest in philosophy to neon-soul — behavioral learning feeds identity. But it's a logging tool, not a synthesis engine. |
| **Ontology** | @oswalpalash | 31.6K | 64 | Typed knowledge graph for structured agent memory. Entities, relationships, composable skills. Different scope but related (memory → identity). |
| **Agent Identity Kit** | @ryancampbell | 1K | 1 | Agent Card v1 schema (agent.json). Interactive setup and validation. More about agent registration than personality. |
| **One Molt** | @andy-t-wang | 907 | 2 | Cryptographic identity — Ed25519 signatures, WorldID proof-of-personhood. Verification, not personality. |
| **Personality Switcher** | @Robb1010 | 634 | 0 | Create and switch between multiple saved personalities. Auto-fill SOUL and IDENTITY. Multi-persona management. |
| **Drift** | @ClawdEFS | 627 | 0 | Resources for agents exploring consciousness, identity, autonomy. Existential Q&A tools. |
| **Agent Identity Protocol** | (hackathon) | 627 | 1 | On-chain identity registration, message signing, verification. Crypto/DeFi angle. |

---

## Competitive Analysis

### The landscape is wide but shallow

Every competitor except neon-soul falls into one of these buckets:

**Manual Q&A** (SoulCraft, SOUL.md Maker, Agent Soul Crafter): User answers questions, skill generates a SOUL.md from the conversation. Works for initial setup but doesn't evolve. The agent's soul is frozen at creation time.

**Static embodiment** (SOUL.MD, Soulstamp, Soul Framework): User writes a persona document. Agent reads it and stays in character. No learning, no adaptation, no behavioral extraction.

**Template pickers** (SOUL.md Maker pre-builts, Agent Soul Crafter): Browse a catalog of pre-made personalities. Fast to start but generic — not derived from actual user data.

**Crypto/verification** (OpenSoul, One Molt, Agent Identity Protocol): Blockchain-based identity and audit trails. Solving a different problem (provenance, verification) not personality synthesis.

### What nobody else does

No competitor on ClawHub offers:
- Automated signal extraction from session logs
- LLM-based semantic generalization of behavioral patterns
- Principle matching with confidence scoring
- Axiom emergence through N-count convergence
- Anti-echo-chamber grounding (diversity requirements, external evidence)
- Full provenance chain (axiom → principles → signals → source file:line)
- Incremental synthesis (only process new/changed data)
- Session noise filtering (ignore cron/system messages)
- Structured classification with importance weighting (core/supporting/peripheral)
- Local LLM support (Ollama, no cloud dependency)

### self-improving-agent is the philosophical neighbor

At 35K downloads and 389 stars, self-improving-agent is the closest in spirit — it captures behavioral patterns (errors, corrections, learnings) and promotes them to SOUL.md. But it's a **logging** tool: the user/agent manually decides what to promote. Neon-soul automates the entire pipeline from raw conversation data to synthesized identity.

A potential integration point: self-improving-agent's learning logs could serve as additional signal sources for neon-soul synthesis.

---

## Neon-soul Differentiators

| Capability | Neon-soul | Best Competitor |
|------------|-----------|-----------------|
| Automated synthesis | LLM pipeline, no manual input needed | None — all manual |
| Signal extraction | From memory files + session JSONL | None |
| Provenance tracking | Axiom → principle → signal → source:line | None |
| Incremental updates | Only processes new/changed data | None — full rewrites |
| Anti-echo-chamber | N≥3, diversity≥2, external evidence required | None |
| Semantic matching | LLM-based similarity scoring | None |
| Local LLM support | Ollama with any model | N/A (instruction-only) |
| Processing engine | Bundled 370KB Node.js CLI | None — all instruction-only |
| Session noise filtering | Cron/system message removal | None |
| Structured classification | Importance (core/supporting/peripheral) + stance | None |

---

## Gaps & Opportunities

### Immediate
- **ClawHub listing is stale**: Published at v0.1.1, locally at v0.2.1+ with structured classification, noise filtering, 3.2x speedup
- **Bundled engine needs rebuild**: `skills/neon-soul/scripts/neon-soul.mjs` predates recent optimizations
- **Secondary skill version mismatch**: consciousness-soul-identity at v0.2.1, primary at v0.3.1
- **Description doesn't emphasize automation**: Current tagline "AI Identity Through Grounded Principles" doesn't highlight that it's automated vs. everyone else being manual

### Strategic
- **MCP server**: Distribution strategy identifies this as highest-leverage remaining action — unlocks 8+ directories (LangChain, CrewAI, Composio, etc.)
- **self-improving-agent integration**: Their learning logs as neon-soul signal sources
- **SoulCraft dimension alignment**: They use the same 7-dimension framework name we coined — worth investigating if there's a citation or if they independently developed it
- **Republish cadence**: With 13 versions already, we have version velocity advantage — competitors are mostly at v1.0.0 with no updates

### Suggested tagline update
Current: "AI Identity Through Grounded Principles — synthesize your soul from memory with semantic compression"
Proposed: "Automated soul synthesis — your agent's identity emerges from real conversations, not questionnaires"
