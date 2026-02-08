# Phase 0: Project Setup

**Date**: 2026-02-07
**Status**: ✅ Complete
**Master Plan**: [soul-bootstrap-master.md](./2026-02-07-soul-bootstrap-master.md)
**Proposal**: [soul-bootstrap-pipeline-proposal.md](../proposals/soul-bootstrap-pipeline-proposal.md)

---

## Objective

Scaffold the TypeScript project as an **OpenClaw skill** with embedding infrastructure. LLM calls use OpenClaw's authenticated access - no separate API key required.

**Blocks**: Phase 1, Phase 2 (both depend on embeddings infrastructure)

---

## Architecture Decision: OpenClaw Skill

NEON-SOUL is implemented as an **OpenClaw skill**, not a standalone CLI:

| Aspect | Standalone CLI | OpenClaw Skill (chosen) |
|--------|----------------|-------------------------|
| LLM Access | Requires `ANTHROPIC_API_KEY` | Uses OpenClaw's authenticated access |
| Invocation | `npx neon-soul synthesize` | `/neon-soul synthesize` or cron |
| Scheduling | External (cron, CI) | OpenClaw cron built-in |
| Billing | User's API key | OpenClaw subscription |

**Benefits**:
- No API key management complexity
- Natural integration with OpenClaw memory system
- Can run on-demand, scheduled (cron), or on-trigger
- Embeddings remain local (`@xenova/transformers`, no API needed)

---

## Stage 0.1: Project Scaffolding

**Files to create**:
```
neon-soul/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md (update with setup instructions)
└── src/
    └── index.ts           # OpenClaw skill entry point
```

**Tasks**:
- [ ] Initialize npm project with `pnpm init`
- [ ] Configure TypeScript 5.x with strict mode, `noUncheckedIndexedAccess`
- [ ] Add dependencies:
  - `@xenova/transformers` - Local embeddings (no API key needed)
  - `unified`, `remark-parse` - Markdown parsing
  - `zod` - Runtime validation
- [ ] Add dev dependencies:
  - `typescript`
  - `vitest`
  - `@types/node`
- [ ] Create OpenClaw skill entry point
- [ ] Add npm scripts: `build`, `dev`, `test`, `lint`

> **Note**: No `@anthropic-ai/sdk` - LLM calls go through OpenClaw's skill interface.

**Acceptance criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm build` compiles without errors
- [ ] Skill registers with OpenClaw
- [ ] TypeScript strict mode enabled

---

## Stage 0.2: Configuration System

**Files to create**:
```
src/lib/
├── config.ts              # Configuration loader
└── types/
    └── config.ts          # Config type definitions
```

**Tasks**:
- [ ] Define `NeonSoulConfig` interface:
  ```typescript
  interface NeonSoulConfig {
    notation: {
      format: 'native' | 'cjk-labeled' | 'cjk-math' | 'cjk-math-emoji';
      fallback: 'native';
    };
    matching: {
      similarityThreshold: number;  // default 0.85
      embeddingModel: string;       // default 'Xenova/all-MiniLM-L6-v2'
    };
    paths: {
      memory: string;      // default '~/.openclaw/workspace/memory/'
      distilled: string;   // default '.neon-soul/distilled/'
      output: string;      // default '.neon-soul/'
    };
  }
  ```
- [ ] Implement config loader from `.neon-soul/config.json`
- [ ] Add Zod schema for validation
- [ ] Provide sensible defaults
- [ ] Auto-detect notation from existing `compass.md` if present
- [ ] Support environment variable overrides

**Acceptance criteria**:
- [ ] Config loads from file or uses defaults
- [ ] Invalid config throws clear error with Zod messages
- [ ] All 4 notation formats recognized
- [ ] Paths resolve correctly (expand `~`)

---

## Stage 0.3: Shared Infrastructure

**Files to create**:
```
src/lib/
├── embeddings.ts          # @xenova/transformers wrapper
├── matcher.ts             # Cosine similarity matching
├── llm.ts                 # Claude API wrapper (shared by all extractors)
├── markdown-reader.ts     # Markdown parser with frontmatter (used by Phase 1 + 2)
├── provenance.ts          # Provenance chain builders (used everywhere)
└── signal-extractor.ts    # Generic signal extraction (configurable prompt)
```

> **Reuse principle**: These modules support N=2+ implementations. All signal extraction, LLM calls, and provenance tracking flow through shared code.

**Tasks**:

**embeddings.ts**:
- [ ] Initialize `all-MiniLM-L6-v2` model (lazy load on first use)
- [ ] Implement embedding function with dimension validation (CR-2 from twin review):
  ```typescript
  const EXPECTED_DIM = 384;  // all-MiniLM-L6-v2 produces 384-dim vectors

  async function embed(text: string): Promise<number[]> {
    const result = await extractor([text], { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data);

    // Runtime validation - fail fast if model changes
    if (embedding.length !== EXPECTED_DIM) {
      throw new Error(`Embedding dimension mismatch: expected ${EXPECTED_DIM}, got ${embedding.length}`);
    }

    return embedding;
  }
  ```
- [ ] Implement batch embedding for efficiency:
  ```typescript
  async function embedBatch(texts: string[]): Promise<number[][]>
  ```
- [ ] Add caching for model initialization
- [ ] Add error recovery for model download (CR-1 from twin review):
  ```typescript
  async function downloadModelWithRetry(modelName: string, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = await loadModel(modelName);
        // Verify checksum if available
        return model;
      } catch (error) {
        lastError = error;
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
    // Try cached fallback
    if (await hasCachedModel(modelName)) {
      return loadCachedModel(modelName);
    }
    throw lastError;
  }
  ```

**matcher.ts**:
- [ ] Implement cosine similarity:
  ```typescript
  function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot; // Already L2-normalized
  }
  ```
- [ ] Implement best match finder:
  ```typescript
  interface MatchResult {
    principle: Principle | null;
    similarity: number;
    isMatch: boolean;  // similarity >= threshold
  }

  function findBestMatch(
    embedding: number[],
    principles: Principle[],
    threshold: number
  ): MatchResult
  ```

**llm.ts** (OpenClaw skill LLM interface):
- [ ] Create OpenClaw LLM interface (uses OpenClaw's authenticated access):
  ```typescript
  interface LLMRequest<T> {
    prompt: string;
    schema?: ZodSchema<T>;  // For structured JSON output
    temperature?: number;   // Default 0 for determinism
  }

  // Calls OpenClaw's LLM interface, not direct API
  async function callLLM<T>(request: LLMRequest<T>): Promise<T>
  ```
- [ ] Integrate with OpenClaw skill execution context
- [ ] No API key needed - uses OpenClaw's authenticated session

**markdown-reader.ts** (used by Phase 1 + 2):
- [ ] Parse markdown with frontmatter (gray-matter or manual):
  ```typescript
  interface ParsedMarkdown {
    frontmatter: Record<string, unknown>;
    content: string;
    sections: MarkdownSection[];
  }

  function parseMarkdown(content: string): ParsedMarkdown
  ```
- [ ] Extract sections by heading level
- [ ] Handle malformed markdown gracefully

**provenance.ts** (used everywhere):
- [ ] Implement provenance chain builders:
  ```typescript
  function createSignalSource(file: string, line: number, context: string): SignalSource
  function createPrincipleProvenance(signals: Signal[]): PrincipleProvenance
  function createAxiomProvenance(principles: Principle[]): AxiomProvenance
  function traceToSource(axiom: Axiom): ProvenanceChain  // Full audit trail
  ```

**signal-extractor.ts** (generic, configurable):
- [ ] Create configurable signal extraction:
  ```typescript
  interface ExtractionConfig {
    promptTemplate: string;      // With {content}, {path}, {category} placeholders
    sourceType: 'template' | 'memory' | 'interview';
  }

  async function extractSignals(
    content: string,
    source: { file: string; line?: number; category?: string },
    config: ExtractionConfig
  ): Promise<Signal[]>
  ```
- [ ] Uses llm.ts for API calls
- [ ] Uses embeddings.ts for signal embeddings
- [ ] Uses provenance.ts for source tracking

**state.ts** (incremental processing - from Self-Learning Agent proposal):
- [ ] Track last processed position per source:
  ```typescript
  interface SynthesisState {
    lastRun: {
      timestamp: string;
      memoryFiles: Record<string, {
        file: string;
        line: number;
        processedAt: string;
      }>;
      soulVersion: string;  // Hash of last generated SOUL.md
    };
    metrics: {
      totalSignalsProcessed: number;
      totalAxiomsGenerated: number;
    };
  }

  function loadState(workspacePath: string): SynthesisState
  function saveState(workspacePath: string, state: SynthesisState): void
  function getNewMemorySince(state: SynthesisState): MemoryFile[]
  ```
- [ ] Store in `.neon-soul/state.json`
- [ ] Calculate new content size for threshold check:
  ```typescript
  function shouldRunSynthesis(state: SynthesisState, threshold: number = 2000): boolean {
    const newContent = getNewMemorySince(state);
    const charCount = newContent.reduce((sum, f) => sum + f.content.length, 0);
    return charCount >= threshold;
  }
  ```

**backup.ts** (safety patterns - from Self-Learning Agent proposal):
- [ ] Backup before write:
  ```typescript
  function backupFile(filePath: string): string {
    const backupDir = '.neon-soul/backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${backupDir}/${timestamp}/${path.basename(filePath)}`;
    // Copy file to backup location
    return backupPath;
  }
  ```
- [ ] Git auto-commit if workspace is repo:
  ```typescript
  async function commitSoulUpdate(soulPath: string, message: string): Promise<void> {
    if (await isGitRepo(path.dirname(soulPath))) {
      await exec(`git add ${soulPath}`);
      await exec(`git commit -m "${message}"`);
    }
  }
  ```
- [ ] Rollback capability:
  ```typescript
  function rollback(workspacePath: string): void {
    // Restore from most recent backup
  }
  function listBackups(workspacePath: string): Backup[]
  ```

- [ ] Write unit tests for all shared modules

**Acceptance criteria**:
- [ ] `embed("hello world")` returns 384-dim vector
- [ ] `cosineSimilarity(v, v)` returns 1.0
- [ ] `cosineSimilarity(embed("be concise"), embed("prefer brevity"))` > 0.8
- [ ] `cosineSimilarity(embed("be concise"), embed("eat pizza"))` < 0.5
- [ ] Model downloads on first run (~30MB), caches for subsequent
- [ ] Batch embedding works correctly
- [ ] **Embedding dimensions validated** (exactly 384)
- [ ] **Error recovery for model download** (retry with backoff)
- [ ] **Memory efficient for 10K+ embeddings** (LRU cache or streaming)

---

## Stage 0.4: Core Type Definitions

**Files to create**:
```
src/types/
├── signal.ts              # Signal interface
├── principle.ts           # Principle interface
├── axiom.ts               # Axiom interface
├── provenance.ts          # Provenance types
├── dimensions.ts          # SoulCraft dimension constants (shared)
└── index.ts               # Re-exports
```

**Tasks**:
- [ ] Define `Signal` interface:
  ```typescript
  interface Signal {
    id: string;
    type: 'preference' | 'correction' | 'boundary' | 'value' | 'reinforcement';
    text: string;
    confidence: number;
    embedding: number[];  // 384-dim
    source: SignalSource;
  }

  interface SignalSource {
    file: string;
    line: number;
    context: string;
    extracted_at: string;  // ISO timestamp
  }
  ```
- [ ] Define `Principle` interface:
  ```typescript
  interface Principle {
    id: string;
    text: string;
    dimension: string;
    strength: number;
    n_count: number;               // Reinforcement count (equals derived_from.signals.length)
    embedding: number[];           // Centroid
    similarity_threshold: number;  // Default 0.85
    derived_from: PrincipleProvenance;
    history: PrincipleEvent[];
  }
  ```
- [ ] Define `Axiom` interface:
  ```typescript
  interface Axiom {
    id: string;
    text: string;
    tier: 'core' | 'domain' | 'emerging';
    canonical: CanonicalForm;
    derived_from: AxiomProvenance;
    history: AxiomEvent[];
  }

  interface CanonicalForm {
    emoji?: string;
    cjk: string;
    math: string;
    native: string;
  }
  ```
- [ ] Define provenance types
- [ ] Define history event types
- [ ] Define SoulCraft dimension constants:
  ```typescript
  // src/types/dimensions.ts
  export const SOULCRAFT_DIMENSIONS = [
    'identity-core',
    'character-traits',
    'voice-presence',
    'honesty-framework',
    'boundaries-ethics',
    'relationship-dynamics',
    'continuity-growth',
  ] as const;

  export type SoulCraftDimension = typeof SOULCRAFT_DIMENSIONS[number];

  export interface DimensionCoverage {
    dimension: SoulCraftDimension;
    signalCount: number;
    principleCount: number;
    axiomCount: number;
  }
  ```
- [ ] Add JSDoc comments for all types

**Acceptance criteria**:
- [ ] Types compile without errors
- [ ] All fields from proposal data model present
- [ ] Embedding fields included (384-dim arrays)
- [ ] Canonical form supports all 4 notation variants

---

## Stage 0.5: Documentation Update

**Goal**: Update documentation to reflect Phase 0 implementation and create ARCHITECTURE.md.

**Reference**: Follow [Documentation Update Workflow](../workflows/documentation-update.md)

**Tasks**:
- [ ] **Create `docs/ARCHITECTURE.md`** - System reference document:
  - Module diagram (actual exports from `src/lib/`)
  - Data flow (config → embeddings → matching)
  - Type overview (reference to `src/types/`)
  - Configuration options (from `config.ts`)
  - Add header: "Implements [Soul Bootstrap Proposal](proposals/soul-bootstrap-pipeline-proposal.md)"
- [ ] Update README.md with actual setup instructions (verify commands work)
- [ ] Verify proposal tech stack matches implemented dependencies
- [ ] Update master plan shared module table with actual exports
- [ ] Run verification commands from workflow:
  ```bash
  # Verify no stale references
  grep -r "npx neon-soul" docs/ README.md  # Should return nothing
  grep -r "@anthropic-ai/sdk" docs/        # Should return nothing
  ```
- [ ] Commit documentation updates with implementation

**Acceptance criteria**:
- [ ] `docs/ARCHITECTURE.md` created with module diagram
- [ ] README setup instructions tested and working
- [ ] Proposal and master plan reflect actual implementation
- [ ] Verification commands pass

---

## Quality Gate: QG-Setup

Before proceeding to Phase 1 or Phase 2:

| Check | Command | Expected |
|-------|---------|----------|
| Dependencies | `pnpm install` | Exit 0 |
| Compile | `pnpm build` | Exit 0, no errors |
| Skill | `/neon-soul --help` | Shows usage |
| Embeddings | `pnpm test embeddings` | 384-dim vectors |
| Matching | `pnpm test matcher` | Semantic similarity works |
| Config | `pnpm test config` | Loads/validates correctly |

---

## Deliverables

- [ ] `package.json` with all dependencies
- [ ] `tsconfig.json` with strict mode
- [ ] `src/lib/config.ts` - Configuration system
- [ ] `src/lib/embeddings.ts` - Embedding wrapper
- [ ] `src/lib/matcher.ts` - Cosine similarity matching
- [ ] `src/lib/llm.ts` - Claude API wrapper (shared)
- [ ] `src/lib/markdown-reader.ts` - Markdown parser (shared)
- [ ] `src/lib/provenance.ts` - Provenance builders (shared)
- [ ] `src/lib/signal-extractor.ts` - Signal extraction (shared)
- [ ] `src/lib/state.ts` - Incremental processing state (from Self-Learning Agent)
- [ ] `src/lib/backup.ts` - Backup and rollback utilities (from Self-Learning Agent)
- [ ] `src/types/` - All type definitions including dimensions
- [ ] `src/index.ts` - CLI entry point
- [ ] Unit tests for all shared modules
- [ ] README updated with setup instructions
- [ ] `docs/ARCHITECTURE.md` - System reference (module diagram, data flow)
- [ ] Documentation updated per [workflow](../workflows/documentation-update.md)

---

## Notes

- Model download is ~30MB on first run. Document this in README.
- Lazy loading prevents startup delay when embeddings not needed.
- Consider adding progress indicator for model download.
- **Error recovery required**: Add retry logic with exponential backoff, checksum verification, and cached model fallback (see twin review CR-1)

---

*Phase 0 establishes the foundation. Embeddings infrastructure is critical for Phase 1 and 2.*
