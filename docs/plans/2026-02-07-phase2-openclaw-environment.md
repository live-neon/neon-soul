# Phase 2: OpenClaw Environment Setup

**Date**: 2026-02-07
**Status**: ✅ Complete
**Master Plan**: [soul-bootstrap-master.md](./2026-02-07-soul-bootstrap-master.md)
**Proposal**: [soul-bootstrap-pipeline-proposal.md](../proposals/soul-bootstrap-pipeline-proposal.md#phase-2-openclaw-environment)
**Depends on**: [Phase 0](./2026-02-07-phase0-project-setup.md)

---

## Objective

Set up OpenClaw development environment, analyze memory data landscape, and design the interview flow for capturing user signals. This phase runs in parallel with Phase 1.

**Blocks**: Phase 3 (requires data landscape understanding)

---

## Stage 2.1: OpenClaw Docker Setup

**Files to create**:
```
docker/
├── docker-compose.yml    # OpenClaw local development
└── .env.example          # Environment template
scripts/
└── setup-openclaw.sh     # One-command setup
```

**Tasks**:
- [ ] Research OpenClaw deployment requirements
- [ ] Create Docker Compose configuration for local development
- [ ] Configure volume mounts for memory directory access with security (I-3):
  - Use read-only mount (`:ro`) for memory directory
  - Document PII handling guidelines for memory files
  - Add sanitization recommendations before processing sensitive data
- [ ] Create environment variable template
- [ ] Write setup script for one-command bootstrap
- [ ] Document prerequisites (Docker, API keys)

**Acceptance criteria**:
- [ ] `docker-compose up` starts OpenClaw locally
- [ ] Memory directory accessible at `~/.openclaw/workspace/memory/`
- [ ] Can create and edit memory files through OpenClaw
- [ ] Setup script handles first-time configuration

---

## Stage 2.2: Data Landscape Analysis

**Files to create**:
```
docs/research/
└── memory-data-landscape.md  # Analysis of OpenClaw memory format
```

**Tasks**:
- [ ] Analyze OpenClaw memory file structure:
  ```
  ~/.openclaw/workspace/memory/
  ├── diary/          # Timestamped journal entries
  ├── experiences/    # Event-based memories
  ├── goals/          # Aspirations and objectives
  ├── knowledge/      # Learned facts
  ├── relationships/  # People and connections
  └── preferences/    # Likes, dislikes, boundaries
  ```
- [ ] Document markdown structure conventions
- [ ] Identify signal-rich sections (frontmatter, headers, lists)
- [ ] Map memory categories to SoulCraft dimensions:
  | Memory Category | SoulCraft Dimension |
  |-----------------|---------------------|
  | preferences/ | Character Traits, Boundaries |
  | relationships/ | Relationship Dynamics |
  | goals/ | Identity Core, Continuity |
  | experiences/ | Voice & Presence |
  | knowledge/ | (domain-specific) |
  | diary/ | (temporal signals) |
- [ ] Estimate signal density per category
- [ ] Identify sparse categories needing interview supplementation

**Acceptance criteria**:
- [ ] Data landscape documented
- [ ] All 7 SoulCraft dimensions mapped to memory sources
- [ ] Sparse categories identified for interview focus
- [ ] Example signal extraction from each category

---

## Stage 2.3: Interview Flow Design

**Files to create**:
```
src/lib/
└── interview.ts           # Interview flow implementation
src/types/
└── interview.ts           # Interview type definitions
docs/research/
└── interview-questions.md # Question bank by dimension
```

**Tasks**:
- [ ] Design interview question types:
  ```typescript
  interface InterviewQuestion {
    id: string;
    dimension: SoulCraftDimension;
    text: string;
    followUps: string[];  // Conditional follow-ups
    signalType: SignalType;
    required: boolean;
  }
  ```
- [ ] Create question bank covering all 7 dimensions:
  - **Identity Core**: "What defines you that wouldn't change?"
  - **Character Traits**: "How do you typically approach problems?"
  - **Voice & Presence**: "How would others describe your communication style?"
  - **Honesty Framework**: "When is it acceptable to withhold truth?"
  - **Boundaries & Ethics**: "What would you never do, even if asked?"
  - **Relationship Dynamics**: "How do you prefer to work with others?"
  - **Continuity & Growth**: "What are you actively working to improve?"
- [ ] Implement adaptive questioning based on memory gaps
- [ ] Design response parsing with LLM extraction
- [ ] Generate embeddings for interview responses
- [ ] Store responses as signals with full provenance

**Acceptance criteria**:
- [ ] 3-5 questions per dimension (21-35 total)
- [ ] Adaptive flow skips covered dimensions
- [ ] Interview responses become signals with embeddings
- [ ] Provenance traces to interview session + question

---

## Stage 2.4: Memory File Walker

**Files to create**:
```
src/lib/
└── memory-walker.ts       # Traverse memory directory, wraps markdown-reader.ts
```

> **Reuses from Phase 0**: `markdown-reader.ts` (shared markdown parser)

**Tasks**:
- [ ] Implement directory walker for memory structure
- [ ] Use shared `markdown-reader.ts` for parsing, extend with memory-specific metadata:
  ```typescript
  interface MemoryFile extends ParsedMarkdown {
    path: string;
    category: string;       // Derived from directory
    lastModified: Date;     // For incremental processing
  }
  ```
- [ ] Extract metadata (dates, tags, relationships)
- [ ] Handle different file encodings gracefully
- [ ] Implement file change detection for incremental processing
- [ ] Cache parsed files for performance

**Acceptance criteria**:
- [ ] Reads all memory file types
- [ ] Parses frontmatter correctly
- [ ] Extracts structured sections
- [ ] Handles missing/malformed files gracefully
- [ ] Change detection works for incremental updates

---

## Stage 2.5: Signal Extraction from Memory

**Files to create**:
```
src/lib/
└── memory-extraction-config.ts  # Memory-specific extraction config
```

> **Reuses from Phase 0**: `signal-extractor.ts`, `llm.ts`, `embeddings.ts`, `provenance.ts`

**Tasks**:
- [ ] Create memory-specific extraction prompt:
  ```
  Extract signals from this OpenClaw memory file.

  File: {path}
  Category: {category}

  Content:
  {content}

  For each signal, identify:
  - Type: preference | correction | boundary | value | reinforcement
  - Text: The core statement
  - Confidence: 0-1 how clear this signal is
  - Context: Surrounding text for provenance

  Return as JSON array.
  ```
- [ ] Configure shared `signal-extractor.ts` with memory prompt:
  ```typescript
  const memoryConfig: ExtractionConfig = {
    promptTemplate: MEMORY_EXTRACTION_PROMPT,
    sourceType: 'memory',
  };
  ```
- [ ] Implement batch extraction across memory directory using memory-walker.ts
- [ ] Use shared signal-extractor.ts (includes embedding generation + provenance)
- [ ] Track extraction statistics per category

**Acceptance criteria**:
- [ ] Extracts signals from all memory categories
- [ ] Each signal has embedding (384-dim)
- [ ] Provenance includes file path and category
- [ ] Batch processing handles 100+ files efficiently
- [ ] Statistics show signal density per category

---

## Stage 2.6: Documentation Update

**Goal**: Update documentation to reflect Phase 2 OpenClaw integration discoveries.

**Reference**: Follow [Documentation Update Workflow](../workflows/documentation-update.md)

**Tasks**:
- [ ] Finalize `docs/research/memory-data-landscape.md` with actual findings
- [ ] Update `docs/ARCHITECTURE.md` with OpenClaw integration details
- [ ] Update proposal with observed OpenClaw memory structure
- [ ] Document interview questions in `docs/research/interview-questions.md`
- [ ] Update master plan with Phase 2 environment details
- [ ] Note any OpenClaw version-specific behaviors discovered
- [ ] Run verification commands from workflow
- [ ] Commit documentation updates with implementation

**Acceptance criteria**:
- [ ] Memory data landscape reflects actual OpenClaw structure
- [ ] ARCHITECTURE.md updated with Phase 2 integration
- [ ] Interview questions documented and tested
- [ ] Master plan updated with Phase 2 results

---

## Quality Gate: QG-Environment

Before proceeding to Phase 3:

| Check | Command | Expected |
|-------|---------|----------|
| Docker | `docker-compose up -d` | OpenClaw running |
| Memory access | `ls ~/.openclaw/workspace/memory/` | Directory structure present |
| Data landscape | `cat docs/research/memory-data-landscape.md` | All categories documented |
| Interview | `/neon-soul interview --dry-run` | Questions shown |
| Memory reader | `pnpm test memory-reader` | Parses test fixtures |
| Extraction | `pnpm test memory-extractor` | Signals extracted |

---

## Deliverables

- [ ] Docker Compose configuration for OpenClaw
- [ ] Setup script and documentation
- [ ] `docs/research/memory-data-landscape.md` - Data analysis
- [ ] `docs/research/interview-questions.md` - Question bank
- [ ] `src/lib/interview.ts` - Interview flow
- [ ] `src/lib/memory-walker.ts` - Directory traversal (uses shared markdown-reader.ts)
- [ ] `src/lib/memory-extraction-config.ts` - Memory-specific config (uses shared signal-extractor.ts)
- [ ] Test suite for memory processing
- [ ] Documentation updated per [workflow](../workflows/documentation-update.md)

> **Shared modules from Phase 0**: Uses `markdown-reader.ts`, `signal-extractor.ts`, `llm.ts`, `provenance.ts`, `embeddings.ts`

---

## Notes

- Phase 2 can run in parallel with Phase 1 (both depend only on Phase 0)
- Memory structure may vary per OpenClaw version - document observed structure
- Interview flow supplements sparse memory areas - not a replacement
- Consider privacy: memory files may contain sensitive information

---

*Phase 2 prepares for real memory ingestion. Understanding data landscape is critical for Phase 3.*
