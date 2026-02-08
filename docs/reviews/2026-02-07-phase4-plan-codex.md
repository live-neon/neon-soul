# Phase 4 OpenClaw Integration Plan Review - Codex

**Date**: 2026-02-07
**Reviewer**: 審碼 (codex-gpt51-examiner)
**Model**: gpt-5.1-codex-max
**Files Reviewed**:
- `docs/plans/2026-02-07-phase4-openclaw-integration.md` (primary)
- `src/lib/pipeline.ts`
- `src/lib/source-collector.ts`
- `src/lib/signal-extractor.ts`
- `src/commands/synthesize.ts`
- `src/commands/audit.ts`
- `skill/SKILL.md`
- `package.json`

## Summary

The Phase 4 plan has a well-structured stage breakdown but contains **critical path mismatches** that would block E2E testing. The plan assumes components work together that currently do not: source collection expects workspace paths while pipeline provides memory paths, and signal extraction is still a stub returning empty arrays. Without addressing these gaps, the proposed commands and tests cannot succeed.

## Findings

### Critical

1. **Path Mismatch: memoryPath vs workspacePath**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:85-89`
   - `src/lib/pipeline.ts:31-35`
   - `src/lib/source-collector.ts:123-146`

   The plan proposes calling `collectSources(memoryPath)`, but `PipelineOptions.memoryPath` is already the memory directory path (e.g., `~/.openclaw/workspace/memory`), while `collectSources()` expects the workspace root and internally appends `/memory`. Following the plan will read `memory/memory` and return zero sources, completely blocking synthesis.

2. **Signal Extractor is a Stub**
   - `src/lib/signal-extractor.ts:37-75`
   - `src/lib/pipeline.ts:407-415`

   Wiring `extract-signals` stage to `signal-extractor.ts` will not produce data because `callLLMForSignals` is a stub that always returns an empty array. The `validateSoulOutput` function rejects runs with no axioms, so both E2E tests and the new status/trace commands cannot succeed without real extraction or a deterministic fallback.

### Important

3. **Incomplete Stage Coverage (4/8, not 8/8)**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:279-283`
   - `src/lib/pipeline.ts:299-466`

   The Quality Gate claims "Pipeline stages wired: 8/8", but the plan only covers four placeholders (`collectSources`, `extractSignals`, `reflectiveSynthesis`, `generateSoul`). Three stages remain as stubs with no tasks to implement them:
   - `checkContentThreshold` - never reads from state.ts
   - `backupCurrentSoul` - placeholder, no backup.ts integration
   - `commitChanges` - placeholder, no git integration

4. **No Persistence Layer for Commands**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:48-65`
   - `src/commands/audit.ts:97-120`

   The status/trace/audit commands rely on real state and provenance data, but the pipeline never reads/writes `state.ts` and does not persist signals/principles/axioms anywhere. Currently, `audit.ts` reads fixtures from `test-fixtures/souls`. Without a persistence plan (e.g., `.neon-soul/*.json`), the new commands will have nothing to display.

5. **Skill Entry Point Package Path Error**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:136-149`
   - `package.json:43-46`

   The proposed `skill/index.ts` imports `../src/commands/*.js`, but the published package only ships `dist` and `skill` directories, excluding `src`. The skill loader would 404 on missing files. The plan must either:
   - Point imports at `dist/commands/*.js`, or
   - Update package.json `files` array to include `src`

6. **No Safety Rail for Live Memory Tests**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:191-195`

   Stage 4.4 proposes running synthesis directly against `~/.openclaw/workspace/memory/` without a copy/backup step to avoid overwriting a real user's `SOUL.md` during tests. This risks data loss in development environments.

### Minor

7. **Compression Ratio Untestable**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:206-207`

   The quality gate requires compression ratio >= 6:1, but the plan does not define how to measure it. Without real signal extraction and token baseline calculation, this target is currently untestable and should be deferred or clarified.

8. **Optimistic Time Estimate**
   - `docs/plans/2026-02-07-phase4-openclaw-integration.md:301-309`

   The 7.5-hour estimate ignores:
   - LLM integration work (or deterministic fallback)
   - Persistence layer implementation
   - Path convention alignment
   - Additional 4 pipeline stages

   Realistic estimate: 12-15 hours with dependencies resolved.

## Alternative Framing

**Are we solving the right problem?**

The plan focuses on "wiring up" existing code, but the code is not ready to wire. Several foundational pieces are missing:

1. **Signal extraction requires LLM access** - The skill assumes OpenClaw's LLM interface is available, but there's no fallback for offline/CI testing. Consider: Should Phase 4 include a deterministic extraction mode using embeddings-only?

2. **Path conventions are inconsistent** - `memoryPath` vs `workspacePath` confusion suggests an API design issue, not just an integration task. This should be resolved in Phase 3 cleanup or early Phase 4.

3. **Persistence is undesigned** - Where do signals/principles/axioms live between runs? The plan assumes this exists but it does not. This is arguably Phase 3 scope.

**Unquestioned Assumptions**:
- OpenClaw's LLM will be available in test environments
- The skill/index.ts pattern is correct for OpenClaw skill loading (no reference to OpenClaw skill interface docs)
- 57 "passing" integration tests actually exercise real pipeline behavior (they may use fixtures only)

## Open Questions

1. Should `memoryPath` become a workspace path to align with `collectSources`, or should `collectSources` accept a memory directory directly?

2. Do we want deterministic, offline signal extraction for tests, or will OpenClaw's LLM be available in CI?

3. Where should synthesized signals/principles/axioms be persisted so `status`/`trace`/`audit` read real data (e.g., `.neon-soul/` JSON alongside state/backups)?

4. What is the actual OpenClaw skill interface pattern? The plan shows a proposed structure but cites no reference.

## Recommendations

1. **Block on Critical Fixes**: Do not proceed with Stage 4.2 until path convention and signal extraction are resolved. These are Phase 3 gaps.

2. **Add Persistence Stage**: Insert a new task in Stage 4.2 to persist pipeline results to `.neon-soul/`:
   - `signals.json` - extracted signals with embeddings
   - `principles.json` - matched/created principles
   - `axioms.json` - promoted axioms with provenance

3. **Implement Fallback Extraction**: Create a deterministic signal extraction mode using embeddings + pattern matching (no LLM) for tests and CI.

4. **Update Quality Gate**: Change "8/8 stages wired" to reflect actual scope, or add missing stage tasks.

5. **Add Safety for Live Tests**: Require `--dry-run` flag or explicit backup before writing to real OpenClaw workspace.

---

<details>
<summary>Raw CLI Output</summary>

```
**Findings**
- [Critical] Stage 4.2 plans to call `collectSources(memoryPath)` (`docs/plans/2026-02-07-phase4-openclaw-integration.md:85-89`), but `PipelineOptions.memoryPath` is already the memory directory (`src/lib/pipeline.ts:31-35`) while `collectSources` expects the workspace root and appends `/memory` (`src/lib/source-collector.ts:123-146`). Following the plan will read `memory/memory` and return zero sources, blocking synthesis and status metrics.
- [Critical] Wiring `extract-signals` to `signal-extractor.ts` won't produce data because `callLLMForSignals` is a stub that always returns an empty array (`src/lib/signal-extractor.ts:37-75`). `validateSoulOutput` rejects runs with no axioms (`src/lib/pipeline.ts:407-415`), so the proposed E2E and new commands cannot succeed without adding real extraction or a deterministic fallback.
- [Important] QG calls for "Pipeline stages wired: 8/8" (`docs/plans/2026-02-07-phase4-openclaw-integration.md:279-283`), but the plan only covers four placeholders; `checkContentThreshold`, `backupCurrentSoul`, and `commitChanges` remain stubs (`src/lib/pipeline.ts:299-466`) with no tasks to implement them.
- [Important] Status/trace rely on real state and provenance (`docs/plans/2026-02-07-phase4-openclaw-integration.md:48-65`), yet the pipeline never reads/writes `state.ts` and doesn't persist signals/principles/axioms anywhere; `audit` currently reads fixtures from `test-fixtures/souls` (`src/commands/audit.ts:97-120`). Without a persistence plan, new commands will have nothing to display.
- [Important] Proposed skill entry point imports `../src/commands/*.js` (`docs/plans/2026-02-07-phase4-openclaw-integration.md:136-149`), but the published package only ships `dist` and `skill` (`package.json:43-46`), excluding `src`. The loader would 404 unless the plan includes build outputs or points at `dist`.
- [Important] Stage 4.4 suggests running synthesis directly against `~/.openclaw/workspace/memory/` (`docs/plans/2026-02-07-phase4-openclaw-integration.md:191-195`) without a safety rail; there's no copy/backup step to avoid overwriting a real `SOUL.md` during tests.
- [Minor] The quality gate requires a compression ratio ≥6:1 (`docs/plans/2026-02-07-phase4-openclaw-integration.md:206-207`), but the plan doesn't define how to measure it (no token baseline or real signal extraction yet), so the target is currently untestable.
- [Minor] The 7.5h estimate (`docs/plans/2026-02-07-phase4-openclaw-integration.md:301-309`) ignores the missing LLM integration and persistence work above, making the schedule optimistic.

**Open Questions**
- Should `memoryPath` become a workspace path to align with `collectSources`, or should `collectSources` accept a memory directory directly?
- Do we want deterministic, offline signal extraction for tests, or will OpenClaw's LLM be available in CI?
- Where should synthesized signals/principles/axioms be persisted so `status`/`trace`/`audit` read real data (e.g., `.neon-soul/` JSON alongside state/backups)?
```

**CLI Version**: OpenAI Codex v0.63.0 (research preview)
**Session ID**: 019c3b12-23ae-7fe0-af59-9fe4a0050e42
**Tokens Used**: 177,278

</details>
