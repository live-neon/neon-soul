---
status: Resolved
priority: High
created: 2026-02-07
resolved: 2026-02-07
source: Code Review (N=2)
reviewers:
  - codex-gpt51-examiner
  - gemini-25pro-validator
affects:
  - src/lib/backup.ts
  - src/lib/reflection-loop.ts
  - src/lib/signal-extractor.ts
  - src/lib/embeddings.ts
  - src/lib/principle-store.ts
  - src/lib/pipeline.ts
  - src/lib/persistence.ts
  - src/lib/paths.ts
  - src/lib/compressor.ts
  - src/lib/trajectory.ts
  - src/lib/metrics.ts
  - src/lib/template-extractor.ts
  - src/commands/download-templates.ts
  - tests/integration/pipeline.test.ts
---

# NEON-SOUL Implementation Code Review Findings

**Date**: 2026-02-07
**Source**: External code review (N=2 cross-architecture)
**Review Files**:
- `docs/reviews/2026-02-07-neon-soul-implementation-codex.md`
- `docs/reviews/2026-02-07-neon-soul-implementation-gemini.md`
**Context**: `output/context/2026-02-07-neon-soul-implementation-context.md`

---

## Summary

External code review (Codex + Gemini) of the NEON-SOUL implementation identified security vulnerabilities, logic bugs, performance issues, and architectural concerns. Both reviewers independently found the same critical issues, providing N=2 verification for convergent findings.

**Totals**: 6 Critical, 12 Important, 6 Minor

**Reviews**:
- Implementation review (N=2): `2026-02-07-neon-soul-implementation-{codex,gemini}.md`
- Phase 1 review (N=2): `2026-02-07-phase1-template-compression-{codex,gemini}.md`

**Dismissed**: 1 finding (`callLLMForSignals` returns empty) - verified as intentional design:
- **Pattern-based extraction** (`extractSignalsFromContent`) is the primary path, used by pipeline (lines 409, 419)
- **LLM-based extraction** (`extractSignals`) is exported for direct OpenClaw use when LLM access is available
- Pipeline wiring for LLM injection (adding `llm` option to `PipelineOptions`) is Phase 5+ scope
- Code documents this architecture at `signal-extractor.ts:3-4, 27, 40-41, 68-77`

---

## Critical Findings (Must Fix)

### CR-1: Command Injection in backup.ts

**Location**: `src/lib/backup.ts:138-140`
**Verification**: N=2 (Both reviewers)

**Problem**: Shell command injection via insufficient escaping:
```typescript
execSync(`git add "${soulPath}"`, { cwd: dirPath, stdio: 'pipe' });
execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { ... });
```

Both `soulPath` (line 138) and `message` (line 139) can contain shell metacharacters like backticks, `$(...)`, or `${}` that execute arbitrary commands.

**Impact**: Malicious memory content could execute arbitrary shell commands during git commit.

**Fix**: Use `execFileSync` with array arguments:
```typescript
import { execFileSync } from 'node:child_process';
execFileSync('git', ['add', soulPath], { cwd: dirPath, stdio: 'pipe' });
execFileSync('git', ['commit', '-m', message], { cwd: dirPath, stdio: 'pipe' });
```

---

### CR-2: Reflection Loop Discards State

**Location**: `src/lib/reflection-loop.ts:133-139`
**Verification**: N=2 (Both reviewers)

**Problem**: Each iteration creates a NEW `PrincipleStore`, discarding all accumulated N-counts and history:
```typescript
} else {
  store = createPrincipleStore(principleThreshold + i * 0.02);
  for (const signal of signals) {
    store.addSignal(signal);
  }
}
```

**Impact**:
- "Iterative refinement" doesn't refine - it reprocesses from scratch
- Signals matching principle A in iteration 1 may match principle B in iteration 2
- Convergence detection measures set stability, not actual refinement

**Fix Options**:
- **A**: Preserve store across iterations (actual refinement)
- **B**: Document as intentional re-clustering with stricter threshold (semantic change)

---

### CR-3: Signal Type Embeddings Not Cached

**Location**: `src/lib/signal-extractor.ts:165-182`
**Verification**: N=2 (Both reviewers)

**Problem**: `classifySignalType` recomputes type reference embeddings on every call:
```typescript
for (const type of types) {
  const typeEmbedding = await embed(SIGNAL_TYPE_REFERENCES[type]); // Every call!
  const similarity = cosineSimilarity(textEmbedding, typeEmbedding);
}
```

**Impact**: 10x embedding overhead per signal. Dimension embeddings are cached (line 91), but type embeddings are not.

**Fix**: Add caching pattern matching `dimensionEmbeddings`:
```typescript
let signalTypeEmbeddings: Map<SignalType, number[]> | null = null;

async function getSignalTypeEmbeddings(): Promise<Map<SignalType, number[]>> {
  if (!signalTypeEmbeddings) {
    signalTypeEmbeddings = new Map();
    for (const [type, text] of Object.entries(SIGNAL_TYPE_REFERENCES)) {
      signalTypeEmbeddings.set(type as SignalType, await embed(text));
    }
  }
  return signalTypeEmbeddings;
}
```

---

### CR-4: Interview Signals Not Integrated

**Location**: `src/lib/pipeline.ts:392-428`, `src/lib/source-collector.ts:191-203`
**Verification**: N=2 (Codex + code verification)

**Problem**: Interview signals are loaded but never merged into the signal extraction pipeline:
- `source-collector.ts:191` loads interview signals into `collected.interviewSignals`
- `pipeline.ts:extractSignals` (lines 392-428) only processes `memoryFiles` and `existingSoul`
- `interviewSignals` is never used

**Impact**: Interview-based gap filling (question-bank.ts, interview.ts) has no effect on synthesis.

**Fix**: Merge interview signals in `extractSignals`:
```typescript
// After line 424
if (collected.interviewSignals && collected.interviewSignals.length > 0) {
  allSignals.push(...collected.interviewSignals);
}
```

---

## Important Findings (Should Fix)

### IM-1: Batch Embedding Not Actually Batched

**Location**: `src/lib/embeddings.ts:86-105`
**Verification**: N=2 (Both reviewers)

**Problem**: `embedBatch` processes each text independently via `Promise.all`, not true transformer batching:
```typescript
const results = await Promise.all(
  batch.map(async (text) => {
    const result = await model(text, { pooling: 'mean', normalize: true });
  })
);
```

**Impact**: Doesn't leverage GPU/CPU parallelism of batch inference.

**Fix**: Check if `@xenova/transformers` supports array input for actual batching.

---

### IM-2: Keyword Fallback Contradicts Semantic-First

**Location**: `src/lib/principle-store.ts:65-115`
**Verification**: N=2 (Both reviewers)

**Status**: **Superseded by CR-6** (CRITICAL CONSTRAINT violation - broader scope)

**Problem**: Dimension inference uses keyword matching despite "semantic-first" claim:
```typescript
if (lower.includes('honest') || lower.includes('truth')) {
  return 'honesty-framework';
}
```

**Impact**: Misclassifies signals containing keywords in other contexts. Contradicts documentation.

**Fix**: See CR-6 for comprehensive fix approach.

---

### IM-3: Object.assign Mutation Pattern

**Location**: `src/lib/pipeline.ts:215-217`
**Verification**: N=2 (Both reviewers)

**Problem**: Stages receive mutable context AND pipeline assigns returned context:
```typescript
const updatedContext = await stage.execute(context);
Object.assign(context, updatedContext);
```

**Impact**: Unclear contract - some stages mutate, some return new objects. Hidden dependencies between stages.

**Fix**: Establish clear contract: either stages mutate (return void) or stages return new context (immutable).

---

### IM-4: No Atomic File Writes

**Location**: `src/lib/persistence.ts:63-77`
**Verification**: N=2 (Codex + code verification)

**Problem**: Direct `writeFileSync` without temp file + atomic rename:
```typescript
writeFileSync(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
```

**Impact**: Crash mid-write corrupts JSON. No locking for concurrent runs.

**Fix**: Write to temp file, then `renameSync` (atomic on same filesystem).

---

### IM-5: HOME Environment Fallback

**Location**: `src/lib/paths.ts:26, 34, 42, 73`
**Verification**: N=2 (Codex + code verification)

**Problem**: Fallback to `'~'` or `''` when HOME is unset:
```typescript
const home = process.env['HOME'] || '~';
return resolve(home, '.openclaw/workspace/memory');
```

**Impact**: `resolve('~', ...)` doesn't expand tilde. Results in invalid path `/current/dir/~/...`.

**Fix**: Use `os.homedir()` or throw if HOME unset and tilde expansion requested.

---

### IM-6: Token Count Methodology Wrong

**Location**: `src/lib/compressor.ts:185-192`
**Verification**: N=2 (Codex + code verification)

**Problem**: Word count != token count, CJK char count != token count:
```typescript
const originalTokens = principles.reduce(
  (sum, p) => sum + p.text.split(/\s+/).length, 0
);
const compressedTokens = axioms.reduce(
  (sum, a) => sum + a.canonical.cjk.length + 5, 0
);
```

**Impact**: Compression ratio metric is meaningless.

**Fix**: Use proper tokenizer (tiktoken) or rename to `wordCount`/`charCount`.

---

### IM-7: Silent Rollback Failure

**Location**: `src/lib/pipeline.ts:246-250`
**Verification**: N=2 (Gemini + code verification)

**Problem**: Rollback errors completely swallowed:
```typescript
try {
  await stage.rollback(context);
} catch {
  // Ignore rollback errors
}
```

**Impact**: Data loss during rollback goes unnoticed.

**Fix**: At minimum log the error. Consider throwing after attempting all rollbacks.

---

### IM-8: Overly Broad Signal Patterns

**Location**: `src/lib/signal-extractor.ts:215-218`
**Verification**: N=2 (Gemini + code verification)

**Problem**: Any bullet point > 15 chars is considered a signal:
```typescript
if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
  text = line.replace(/^[-*]\s+|\d+\.\s+/, '');
  isSignal = text.length > 15;
}
```

**Impact**: Grocery lists, TODOs, and mundane content captured as "identity signals."

**Fix**: Add semantic filtering or stricter patterns for value-laden content.

---

## Minor Findings (Nice to Have)

### MN-1: Weak Test Assertions

**Location**: `tests/e2e/live-synthesis.test.ts:53-60`
**Verification**: N=2 (Both reviewers)

**Problem**: Tests pass when "no axioms" error occurs:
```typescript
if (!result.success && result.error) {
  expect(result.error.message).toContain('axiom');
}
```

**Impact**: Real failures masked. Tests are tautologically true.

**Fix**: Assert on expected output content, not just error message patterns.

---

### MN-2: ID Generation Not Collision-Resistant

**Location**: `src/lib/signal-extractor.ts:83-85`
**Verification**: N=2 (Codex + code verification)

**Problem**: `Date.now()` (1ms granularity) + 7 random chars:
```typescript
return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
```

**Impact**: Insufficient collision resistance at high throughput.

**Fix**: Use `crypto.randomUUID()`.

---

### MN-3: Backup Directory Accumulation

**Location**: `src/lib/backup.ts:26-47`
**Verification**: N=2 (Codex + code verification)

**Problem**: Each backup creates timestamped directory with single file:
```
.neon-soul/backups/2026-02-07T10-30-00-000Z/SOUL.md
```

**Impact**: Inode accumulation over time.

**Fix**: Flat structure with timestamped filenames, or add backup rotation.

---

## Phase 1 Template Compression Findings

*Added from Phase 1 code review (N=2)*

### CR-5: Path Traversal Vulnerability (Mitigated)

**Location**: `src/commands/download-templates.ts:85-86`
**Verification**: N=2 (Codex critical + code verification)

**Problem**: Slug is written directly to filesystem without sanitization:
```typescript
const filename = `${source.slug}.md`;
const filepath = resolve(outputDir, filename);
writeFileSync(filepath, content, 'utf-8');
```

**Current mitigation**: `source.slug` comes from hardcoded `TEMPLATES` array (lines 18-39).

**Risk**: If templates become dynamically sourced (API, user input), path traversal via `../` would allow arbitrary file overwrites.

**Fix**: Sanitize slug before use:
```typescript
const safeSlug = source.slug.replace(/[^a-zA-Z0-9-_]/g, '');
```

---

### CR-6: CRITICAL CONSTRAINT Violation - Keyword Matching Throughout Codebase

**Location**: Multiple files (see scope below)
**Verification**: N=2 (Both reviewers flagged, user escalated per proposal)

**Problem**: The proposal (`docs/proposals/soul-bootstrap-pipeline-proposal.md:3`) explicitly states:

> **CRITICAL CONSTRAINT**: Implementation MUST be language-agnostic using semantic matching/similarity (embeddings + cosine similarity). NO regex, string contains, or keyword matching. Principles like "be concise" and "prefer brevity" must match semantically, not syntactically.

Despite this, keyword matching is used extensively throughout the codebase:

**Scope of Violation** (6 files):

1. **`src/lib/principle-store.ts:65-115`** - `inferDimension()` uses keyword matching:
   ```typescript
   if (lower.includes('honest') || lower.includes('truth') || lower.includes('transparent')) {
     return 'honesty-framework';
   }
   ```

2. **`src/lib/metrics.ts:84-99`** - Duplicate keyword-based dimension inference (divergent keywords)

3. **`src/lib/signal-extractor.ts:215-234`** - Signal detection uses keyword matching:
   ```typescript
   const signalKeywords = ['believe', 'value', 'always', 'never', 'important', 'principle', 'core', 'fundamental'];
   if (signalKeywords.some(kw => lowerLine.includes(kw))) {
     isSignal = true;
   }
   ```

4. **`src/lib/template-extractor.ts:82-146`** - Section type detection via string includes:
   ```typescript
   if (normalizedTitle.includes('core') || normalizedTitle.includes('truth')) {
     // Extract as value signals
   }
   ```

5. **`src/lib/compressor.ts:55-116`** - CJK anchor and emoji mapping via keywords

6. **`src/lib/memory-extraction-config.ts:202-361`** - Extensive category inference keywords

**Note**: `signal-extractor.ts` HAS embedding-based `classifyDimension()` (lines 86-110) that correctly uses cosine similarity. But this is NOT used by `principle-store.ts` or `metrics.ts` - they have their own keyword-based implementations.

**Impact**:
- Language-agnostic promise is broken (English keywords only)
- Semantic equivalence not captured ("be concise" and "prefer brevity" won't match)
- Misclassification when keywords appear in other contexts
- Duplicate implementations diverge (metrics vs principle-store keywords differ)

**Fix Required** (per proposal):
- **Option A**: Use LLM for classification (proposal's stated approach)
- **Option B**: Use existing `classifyDimension()` from signal-extractor.ts everywhere
- Remove ALL `.includes()` keyword matching from semantic classification paths
- CJK/emoji mapping may remain as non-semantic display transformation

**Supersedes**: IM-2, MN-7

---

### IM-9: Retry-After Header Only Handles Integer Seconds

**Location**: `src/commands/download-templates.ts:68-70`
**Verification**: N=2 (Codex + code verification)

**Problem**: Only parses integer seconds, not HTTP-date format:
```typescript
const waitTime = retryAfter
  ? parseInt(retryAfter, 10) * 1000
  : Math.pow(2, attempt + 1) * 1000;
```

**Impact**: HTTP-date values (RFC 7231) parse to `NaN`, causing immediate retry and potential API bans.

**Fix**: Handle both formats or use exponential backoff when parsing fails.

---

### IM-10: Line Number Provenance Inaccuracy

**Location**: `src/lib/template-extractor.ts:94-106`
**Verification**: N=2 (Codex + code verification)

**Problem**: Line offset calculated AFTER being used, and recalculated from content start each time:
```typescript
const signal = await createSignal(text, 'value', 0.9, filePath,
  startLine + lineOffset,  // Uses old lineOffset
  content
);
// THEN updates lineOffset
const beforeMatch = content.slice(0, match.index);
lineOffset = (beforeMatch.match(/\n/g) ?? []).length;
```

**Impact**:
- First signal uses wrong line number (pointing to section heading)
- O(n²) line counting for large files

**Fix**: Calculate line offset before use; accumulate incrementally.

---

### IM-11: Unbounded Trajectory Points Array

**Location**: `src/lib/trajectory.ts:62-71`
**Verification**: N=2 (Codex + code verification)

**Problem**: `recordPoint` pushes indefinitely without cap or windowing:
```typescript
recordPoint(point: TrajectoryPoint): void {
  this.points.push(point);
  // ...
}
```

**Impact**: Memory leak in long-running sessions; variance metrics become meaningless with unbounded data.

**Fix**: Add max size or sliding window; prune old points.

---

### IM-12: Dimension Inference Keyword Divergence

**Location**: `src/lib/metrics.ts:84-103` vs `src/lib/principle-store.ts:65-115`
**Verification**: N=2 (Both reviewers)

**Problem**: Two nearly-identical `inferDimension` functions with different keyword sets:
- `metrics.ts` missing: "refuse", "vibe", "adapt"
- `principle-store.ts` missing: some keywords in metrics

**Impact**: Coverage metrics disagree with principle dimensions; skewed reports.

**Fix**: Extract to shared utility in `src/lib/dimensions.ts`.

---

### MN-4: Tests Silently Pass With Empty Fixtures

**Location**: `tests/integration/pipeline.test.ts:29-39`
**Verification**: N=2 (Gemini + code verification)

**Problem**: Tests conditionally load fixtures and pass with empty arrays:
```typescript
if (existsSync(signalsPath)) {
  signals = JSON.parse(await readFile(signalsPath, 'utf-8'));
}
// ...
expect(Array.isArray(signals)).toBe(true); // Always passes
```

**Impact**: CI failures masked when fixtures aren't generated.

**Fix**: Fail fast if required fixtures missing, or use `beforeAll` to generate.

---

### MN-5: Unused styleWeight Parameter

**Location**: `src/lib/trajectory.ts:161`
**Verification**: N=2 (Gemini + code verification)

**Problem**: Parameter documented but ignored:
```typescript
export function calculateStyleMetrics(
  originalEmbedding: number[],
  compressedEmbedding: number[],
  _styleWeight: number = 0.7  // Never used
): StyleMetrics {
```

**Impact**: Configurable style weighting doesn't work as documented.

**Fix**: Either implement or remove parameter.

---

### MN-6: Compression Ratio Calculation Misleading

**Location**: `src/lib/compressor.ts:185-201`
**Verification**: N=2 (Gemini + already noted in README caveat)

**Problem**: Compares word tokens to CJK character count + arbitrary constant:
```typescript
const originalTokens = principles.reduce(
  (sum, p) => sum + p.text.split(/\s+/).length, 0
);
const compressedTokens = axioms.reduce(
  (sum, a) => sum + a.canonical.cjk.length + 5, 0  // CJK chars != tokens
);
```

**Impact**: 2.4:1 ratio is meaningless; native text still stored.

**Status**: Already documented with caveat in README.md. Token counting deferred to Phase 5.

---

### MN-7: Brittle Template Section Matching

**Location**: `src/lib/template-extractor.ts:81-180`
**Verification**: N=2 (Gemini + code verification)

**Status**: **Superseded by CR-6** (CRITICAL CONSTRAINT violation - this is one of 6 files with keyword matching)

**Problem**: Section matching uses string includes:
```typescript
if (normalizedTitle.includes('core') || normalizedTitle.includes('truth')) {
  // ...
} else if (normalizedTitle.includes('boundar')) {
  // ...
}
```

**Impact**: Fails for non-English templates, alternative naming ("Principles" vs "Core Truths"), nested sections.

**Fix**: See CR-6 for comprehensive fix approach.

---

## Alternative Framing (N=2 Convergent)

Both reviewers independently question fundamental assumptions:

1. **Pattern extraction ≠ meaning extraction**
   - Bullet points with keywords may not express values
   - Format detection, not semantic understanding

2. **Semantic similarity ≠ conceptual equivalence**
   - "I believe in honesty" and "I despise honesty" have high cosine similarity
   - 0.85 threshold may over-merge distinct concepts

3. **N-count ≠ importance**
   - Frequency reflects recency/conversation patterns, not core identity
   - No source-level deduplication

4. **Convergence ≠ correctness**
   - Stable state may be incorrect
   - Reflection loop doesn't actually refine

5. **No human-in-the-loop**
   - Identity synthesis without user validation
   - Single-track overwrites human edits

**Suggested Alternatives**:
- Human validation before axiom commitment
- Contrastive signal extraction (distinguish from baseline)
- Temporal weighting (recent > old)
- Negative signals (track rejections)

---

## Resolution Plan

### Phase 1: Security (Before Production) - COMPLETE

1. [x] **CR-1**: Replace `execSync` with `execFileSync` in backup.ts
2. [x] **CR-5**: Sanitize slug in download-templates.ts (defensive)
3. [x] **IM-4**: Add atomic file writes to persistence.ts
4. [x] **IM-5**: Fix HOME fallback to use `os.homedir()`

### Phase 2: Correctness (CRITICAL CONSTRAINT FIX REQUIRED) - COMPLETE

5. [x] **CR-6**: ~~Remove ALL keyword matching from semantic classification paths (6 files)~~ **RESOLVED**
   - [x] `principle-store.ts` - Replaced `inferDimension()` with LLM-based classification
   - [x] `metrics.ts` - Removed duplicate inference, uses signal's existing dimension
   - [x] `signal-extractor.ts` - Replaced `signalKeywords` with LLM-based `isIdentitySignal()`
   - [x] `template-extractor.ts` - Replaced section detection with `classifySectionType()`
   - [x] `compressor.ts` - Replaced CJK/emoji mapping with `mapToCJKAnchor()`/`mapToEmoji()`
   - [x] `memory-extraction-config.ts` - Replaced category inference with LLM classification
   - **Decision**: LLM-based classification via `semantic-classifier.ts` (Option C: throw error if no LLM)
   - **Plan**: `docs/plans/2026-02-07-cr6-semantic-classification-refactor.md` (11 stages, complete)
   - *(Supersedes IM-2 and MN-7)*
6. [x] **CR-2**: ~~Fix or document reflection loop state behavior~~ **RESOLVED** - Documented as intentional re-clustering design
7. [x] **CR-4**: ~~Merge interview signals into pipeline~~ **RESOLVED** - Added merge in extractSignals stage
8. [x] **IM-8**: ~~Improve signal pattern filtering~~ **RESOLVED via CR-6** - Now uses LLM-based `isIdentitySignal()`
9. [x] **IM-10**: ~~Fix line number provenance accuracy~~ **RESOLVED** - Fixed line offset calculation (before use, incremental)
10. [x] **IM-12**: ~~Unify dimension inference into shared utility~~ **RESOLVED via CR-6** (all dimension inference now in `semantic-classifier.ts`)

### Phase 3: Performance - COMPLETE

11. [x] **CR-3**: ~~Cache signal type embeddings~~ **N/A** - Superseded by CR-6 (now LLM-based, no embeddings)
12. [x] **IM-1**: ~~Investigate true batch embedding support~~ **RESOLVED** - Documented limitation (pipeline API doesn't expose true batching)
13. [x] **IM-11**: ~~Add windowing to trajectory points array~~ **RESOLVED** - Added MAX_TRAJECTORY_POINTS=100 sliding window

### Phase 4: Polish - MOSTLY COMPLETE

14. [ ] **IM-3**: Establish clear context mutation contract *(deferred - design discussion needed)*
15. [x] **IM-6**: ~~Fix token count methodology or rename metric~~ **RESOLVED** - Renamed to wordCount with documentation
16. [x] **IM-7**: ~~Log rollback failures~~ **RESOLVED** - Added console.error logging and context tracking
17. [ ] **IM-9**: Handle Retry-After HTTP-date format *(deferred - edge case)*
18. [ ] **MN-1**: Strengthen test assertions *(deferred - test infrastructure)*
19. [x] **MN-2**: ~~Use crypto.randomUUID()~~ **RESOLVED** - Updated signal-extractor.ts, compressor.ts, template-extractor.ts
20. [x] **MN-3**: ~~Add backup rotation~~ **RESOLVED** - Added MAX_BACKUPS=10 rotation in backup.ts
21. [ ] **MN-4**: Fail fast on missing test fixtures *(deferred - test infrastructure)*
22. [x] **MN-5**: ~~Implement or remove styleWeight parameter~~ **RESOLVED** - Removed unused parameter
23. ~~[ ] **MN-7**: Improve template section matching~~ *(Superseded by CR-6)*

### Deferred (Design Discussion)

24. [ ] Human-in-the-loop validation
25. [ ] Source-level deduplication
26. [ ] Temporal weighting
27. [ ] MN-6: True token counting (Phase 5)

---

## Cross-References

- **Implementation Reviews** (N=2):
  - `docs/reviews/2026-02-07-neon-soul-implementation-codex.md`
  - `docs/reviews/2026-02-07-neon-soul-implementation-gemini.md`
- **Phase 1 Reviews** (N=2):
  - `docs/reviews/2026-02-07-phase1-template-compression-codex.md`
  - `docs/reviews/2026-02-07-phase1-template-compression-gemini.md`
- **Context Files**:
  - `output/context/2026-02-07-neon-soul-implementation-context.md`
  - `output/context/2026-02-07-phase1-template-compression-context.md`
- **Plans**:
  - `docs/plans/2026-02-07-soul-bootstrap-master.md`
  - `docs/plans/2026-02-07-phase1-template-compression.md`
  - `docs/plans/2026-02-07-phase4-openclaw-integration.md`
  - `docs/plans/2026-02-07-cr6-semantic-classification-refactor.md` (CR-6 refactor plan - Complete)
  - `docs/plans/2026-02-07-notation-simplification.md` (notation simplification from TR-0 - Complete)
- **Prior Issue**: `docs/issues/phase4-twin-review-findings.md` (resolved)
- **CR-6 Refactor Review**: `docs/issues/cr6-refactor-code-review-findings.md` (post-implementation review)
- **CR-6 Twin Review**: `docs/issues/cr6-twin-review-findings.md` (twin review findings, TR-0 resolved)

---

## Resolution Log

| Date | Action | By |
|------|--------|-----|
| 2026-02-07 | Issue created from N=2 code review (implementation) | Claude Code |
| 2026-02-07 | MN-3 (LLM placeholder) dismissed - verified as intentional OpenClaw integration hook | Human review |
| 2026-02-07 | Research verified: pattern-based extraction works, LLM hook exported, pipeline wiring is Phase 5+ | Claude Code |
| 2026-02-07 | Phase 1 review findings appended (N=2): CR-5, IM-9-12, MN-4-7 | Claude Code |
| 2026-02-07 | **CR-6 CRITICAL**: Keyword matching violates proposal CRITICAL CONSTRAINT. MN-7 + IM-2 elevated and superseded. 6 files identified with `.includes()` keyword matching in semantic classification paths. | Human escalation + Claude Code |
| 2026-02-07 | **CR-6 RESOLVED**: 11-stage refactor complete. Created `semantic-classifier.ts` with LLM-required classification. All 6 files refactored. Stage 11 verification passed. IM-12 also resolved via CR-6. | Claude Code |
| 2026-02-07 | **Phase 1 RESOLVED**: CR-1 (execFileSync), CR-5 (slug sanitization), IM-4 (atomic writes), IM-5 (homedir fallback). All security items complete. | Claude Code |
| 2026-02-07 | **Phase 2 RESOLVED**: CR-2 (documented re-clustering design), CR-4 (interview signal merge), IM-8 (resolved via CR-6 LLM filtering), IM-10 (fixed line offset calculation). All 143 tests pass. | Claude Code |
| 2026-02-07 | **Phase 3 RESOLVED**: CR-3 (N/A, superseded by CR-6), IM-1 (documented batch limitation), IM-11 (sliding window). All 143 tests pass. | Claude Code |
| 2026-02-07 | **Phase 4 MOSTLY RESOLVED**: IM-6 (wordCount rename), IM-7 (rollback logging), MN-2 (crypto.randomUUID), MN-3 (backup rotation), MN-5 (removed styleWeight). Deferred: IM-3, IM-9, MN-1, MN-4 (design discussion or test infrastructure changes). All 143 tests pass. | Claude Code |

---

*Issue consolidates all code review findings (implementation + Phase 1). Phases 1-4 substantially resolved. 4 items deferred for design discussion or test infrastructure changes.*
