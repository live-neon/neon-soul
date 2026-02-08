# Soul Bootstrap Pipeline - Master Plan

**Date**: 2026-02-07
**Status**: Complete (Phase 4 finished)
**Proposal**: [soul-bootstrap-pipeline-proposal.md](../proposals/soul-bootstrap-pipeline-proposal.md)

---

## Overview

This master plan coordinates the implementation of NEON-SOUL's extraction and compression pipeline. Each phase has its own detailed implementation plan.

> **CRITICAL CONSTRAINT**: All matching MUST use semantic similarity (embeddings + cosine similarity). NO regex, string contains, or keyword matching.

---

## Phase Plans

| Phase | Plan | Objective | Status |
|-------|------|-----------|--------|
| 0 | [Project Setup](./2026-02-07-phase0-project-setup.md) | Scaffolding, config, embeddings | ✅ Complete |
| 1 | [Template Compression](./2026-02-07-phase1-template-compression.md) | Validate on public templates | ✅ Complete |
| 2 | [OpenClaw Environment](./2026-02-07-phase2-openclaw-environment.md) | Data landscape, interview flow | ✅ Complete |
| 3 | [Memory Ingestion](./2026-02-07-phase3-memory-ingestion.md) | Core differentiating feature | ✅ Complete |
| 3.5 | [Pipeline Completion](./2026-02-07-phase3.5-pipeline-completion.md) | Fix critical gaps from code review | ✅ Complete |
| 4 | [OpenClaw Integration](./2026-02-07-phase4-openclaw-integration.md) | Skill entry point, commands, E2E tests | ✅ Complete |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEMANTIC MATCHING LAYER                     │
│         @xenova/transformers (all-MiniLM-L6-v2, 384-dim)        │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    Signal     │     │   Principle   │     │    Axiom      │
│  extraction   │ ──▶ │  matching OR  │ ──▶ │  promotion    │
│  (LLM + embed)│     │   DISCOVERY   │     │   (N≥3)       │
└───────────────┘     └───────────────┘     └───────────────┘
        ▲                ├─ Match ≥0.85 (reinforce)     │
        │                └─ Match <0.85 (create new)    │
        │                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ memory/*.md   │     │ principles.   │     │  Enhanced     │
│ OpenClaw SOUL │     │    json       │     │   SOUL.md     │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## Shared Module Architecture

Phase 0 establishes shared infrastructure used by all subsequent phases. This avoids code duplication and ensures consistent behavior.

```
src/lib/                          Used By
├── embeddings.ts      ←──────── Phase 1, 2, 3 (all signal processing)
├── matcher.ts         ←──────── Phase 1, 3 (principle matching)
├── llm.ts             ←──────── Phase 1, 2, 3 (all LLM calls)
├── markdown-reader.ts ←──────── Phase 1, 2 (template + memory parsing)
├── provenance.ts      ←──────── Phase 1, 2, 3 (audit trails)
└── signal-extractor.ts ←─────── Phase 1, 2 (configurable extraction)

src/types/
└── dimensions.ts      ←──────── Phase 1, 2, 3 (7 SoulCraft dimensions)
```

**Key principle**: If code supports N≥2 implementations, extract to shared module in Phase 0.

---

## Phase Dependencies

```
Phase 0 (Setup) ─────────────────────────────────┐  ✅
    │                                             │
    ├─── Embeddings infrastructure ───────────────┤
    │                                             │
    ▼                                             ▼
Phase 1 (Templates) ✅                 Phase 2 (OpenClaw) ✅
    │                                             │
    │   Can run in parallel                       │
    │                                             │
    └──────────────────┬──────────────────────────┘
                       │
                       ▼
               Phase 3 (Pipeline) ✅
                       │
                       ▼
            Phase 3.5 (Pipeline Completion) ✅
            - Path convention fix
            - Signal extraction fallback
            - Persistence layer
                       │
                       ▼
             Phase 4 (Skill Integration) ✅
             - Commands (status, rollback, trace, audit)
             - Skill entry point with LLM context
             - E2E tests (23 tests)
             - Safety rails (dry-run, backup, force)
                       │
                       ▼
              ✅ PRODUCTION READY
              143/143 tests passing
```

---

## Quality Gates

| Phase | Gate | Criteria | Status |
|-------|------|----------|--------|
| 0 | QG-Setup | Dependencies install, types compile, embeddings return 384-dim vectors | ✅ Passed |
| 1 | QG-Compression | ≥6:1 compression ratio on 10+ templates | ✅ Passed |
| 2 | QG-Environment | OpenClaw runs in Docker, data landscape documented | ✅ Passed |
| 3 | QG-Pipeline | Full synthesis works end-to-end, audit traces complete | ✅ Passed |
| 3.5 | QG-Pipeline-Complete | All 8 stages wired, persistence layer, no placeholders | ✅ Passed |
| 4 | QG-Integration | 5/5 commands, E2E tests pass, safety rails implemented | ✅ Passed |

---

## Key Architectural Decisions

### 1. Embedding-Based Matching

LLMs are non-deterministic. To ensure consistent principle matching:
- **Embeddings** for matching (deterministic)
- **LLM** for extraction and synthesis (creative)
- **Cosine similarity** threshold: 0.85 (configurable)

### 2. Notation Format

Users configure output format in `.neon-soul/config.json`:
- `native`: "honesty over performance"
- `cjk-labeled`: "誠 (honesty over performance)"
- `cjk-math`: "誠: honesty > performance"
- `cjk-math-emoji`: "🎯 誠: honesty > performance"

Internal storage uses canonical form (all variants).

### 3. Provenance-First

Every axiom traces to:
- Principles (with N-count)
- Signals (with embeddings)
- Source files (with line numbers)

Full audit trail via `/neon-soul audit <axiom>`.

### 4. Single-Track Replacement

NEON-SOUL generates a new compressed SOUL.md that **replaces** the original:
- **Input sources**: memory/*.md + initial SOUL.md (treated as high-signal memory file)
- **Output**: New compressed SOUL.md with full provenance
- **No merge needed**: OpenClaw never updates SOUL.md after bootstrap (read-only)

**Why not dual-track?** Original design assumed OpenClaw updates SOUL.md daily. Research confirmed it doesn't - SOUL.md stays frozen after initial creation. Simpler architecture = less code, fewer bugs.

### 5. OpenClaw Skill Architecture

NEON-SOUL is implemented as an **OpenClaw skill**, not a standalone CLI:
- **No API key required** - uses OpenClaw's authenticated LLM access
- **Invocation**: `/neon-soul synthesize` or scheduled via OpenClaw cron
- **Local embeddings** - `@xenova/transformers` runs locally, no API needed
- **Native integration** - direct access to OpenClaw memory system

---

## Success Criteria

**Bootstrap Phase Approach**: Currently measuring all metrics without enforcement. See [Greenfield Guide](../guides/greenfield-guide.md) for Bootstrap → Learn → Enforce methodology. Research hypotheses from [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md) will be validated with our data.

| Metric | Research Hypothesis | Bootstrap Phase | Learn Phase | Enforce Phase |
|--------|---------------------|-----------------|-------------|---------------|
| **Semantic preservation** | ≥0.85 | Log all scores | Find our p95 | Apply threshold |
| **Trajectory stabilization** | 3-5 iterations | Log iterations | Discover range | Enforce limits |
| **Style coherence** | ≥0.70 | Measure style | Find quality point | Set minimum |
| **Axiom stability** | ≥0.80 | Track retention | Learn variance | Define acceptable |
| Dimension coverage | 7/7 SoulCraft | Count coverage | Validate importance | Require if critical |
| Provenance completeness | 100% | Always required | Always required | Always required |
| Compression ratio | ≥6:1 | Track ratio | Assess value | Secondary metric |

**Current Status**: Implementation Complete - Ready for Bootstrap Phase validation with real data

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js ≥22 |
| Language | TypeScript 5.x (strict mode) |
| Embeddings | @xenova/transformers (all-MiniLM-L6-v2) |
| LLM | OpenClaw skill interface (no separate SDK) |
| Integration | OpenClaw skill/cron system |
| Testing | Vitest |

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Embedding model too slow | Low | Batch processing, lazy loading |
| LLM extraction inconsistent | Medium | Embeddings for matching, not LLM |
| OpenClaw API changes | Low | Adapter layer, version pinning |
| Memory signals too sparse | Medium | Interview flow supplements |
| Compression loses identity | Medium | Human evaluation checkpoints |

---

## Cross-References

### Proposal
- [Soul Bootstrap Pipeline Proposal](../proposals/soul-bootstrap-pipeline-proposal.md)

### Phase Plans
- [Phase 3.5: Pipeline Completion](./2026-02-07-phase3.5-pipeline-completion.md) - Fix critical gaps (path convention, signal extraction, persistence)
- [Phase 4: OpenClaw Integration](./2026-02-07-phase4-openclaw-integration.md) - Skill entry point, commands, E2E tests

### Issues (All Resolved)
- [Phase 4 OpenClaw Integration Code Review](../issues/phase4-openclaw-integration-code-review-findings.md) - 15 items, all fixed
- [Phase 3/3.5 Implementation Code Review](../issues/phase3-phase35-implementation-code-review-findings.md) - 15 items, all fixed
- [Phase 2 OpenClaw Environment Code Review](../issues/phase2-openclaw-environment-code-review-findings.md) - All fixed
- [Phase 4 Plan Code Review Findings](../issues/phase4-plan-code-review-findings.md) - N=2 verified findings that prompted Phase 3.5 split
- [Phase 4 Twin Review Findings](../issues/phase4-twin-review-findings.md) - All resolved
- [Implementation Code Review Findings](../issues/neon-soul-implementation-code-review-findings.md) - All resolved

### System Reference
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Created during Phase 0 Stage 0.5

### Research
- [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md) - Attractor basin convergence and style metrics
- [Chat Interaction Patterns](../research/chat-interaction-patterns.md)
- [Wisdom Synthesis Patterns](../research/wisdom-synthesis-patterns.md)
- [Cryptographic Audit Chains](../research/cryptographic-audit-chains.md)

### Guides
- [Greenfield Guide](../guides/greenfield-guide.md) - Bootstrap → Learn → Enforce methodology
- [Configuration as Code](../guides/configuration-as-code-guide.md)
- [Single-Source PBD](../guides/single-source-pbd-guide.md)
- [Multi-Source PBD](../guides/multi-source-pbd-guide.md)

---

## Design Considerations (M-4)

### Current Approach: Matching-First with Discovery Fallback

The pipeline prioritizes matching signals to existing principles (≥0.85 similarity), with new principle creation as fallback when no match exists. This approach emphasizes convergence and consistency.

### Alternative: Clustering-First Approach

Instead of matching-first, could use unsupervised clustering (e.g., HDBSCAN) to discover natural principle groupings, then validate with semantic similarity. This might better handle novel principles but adds complexity.

### User Agency: Opt-In Axiom Promotion

Current design automatically promotes principles to axioms when N≥3. Alternative would allow users to review and selectively promote axiom candidates, providing more control over core identity formation.

### Consideration: Principle-Store Placement (M-3)

`principle-store.ts` is created in Phase 1 but used by Phase 3. Could move to Phase 0 for consistency with N≥2 rule, but current placement groups it with compression logic where it's first needed. This is an acceptable exception to the shared module pattern.

---

## Implementation Summary

**Completed**: 2026-02-07
**Tests**: 143/143 passing
**Code Reviews**: 4 rounds (N=2 cross-architecture: Codex + Gemini)
**Issues Resolved**: 45+ items across all phases

### Key Deliverables

1. **Core Pipeline** (`src/lib/`)
   - Embeddings with @xenova/transformers (all-MiniLM-L6-v2)
   - Semantic matching (cosine similarity ≥0.85)
   - Reflective loop with trajectory tracking
   - Atomic file operations with backup/rollback

2. **Commands** (`src/commands/`)
   - `synthesize` - Full soul synthesis pipeline
   - `status` - Show synthesis state and pending memory
   - `rollback` - Restore from backup with confirmation
   - `audit` - List and inspect axioms
   - `trace` - Full provenance chain for any axiom

3. **Skill Integration** (`src/skill-entry.ts`)
   - OpenClaw-compatible entry point
   - LLM context forwarding (Option C pattern)
   - Lazy-loaded command modules

4. **Safety Rails**
   - Dry-run mode (default)
   - Auto-backup with 10-file rotation
   - Force confirmation for destructive operations
   - Path validation (no traversal attacks)
   - Symlink detection

---

*Master plan coordinates phases. All phases complete. See individual phase plans for detailed stages and tasks.*
