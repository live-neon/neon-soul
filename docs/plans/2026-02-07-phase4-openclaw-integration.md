# Phase 4: OpenClaw Skill Integration and End-to-End Testing

**Date**: 2026-02-07
**Status**: ✅ Complete
**Master Plan**: [soul-bootstrap-master.md](./2026-02-07-soul-bootstrap-master.md)
**Proposal**: [soul-bootstrap-pipeline-proposal.md](../proposals/soul-bootstrap-pipeline-proposal.md)
**Depends on**: [Phase 3.5](./2026-02-07-phase3.5-pipeline-completion.md) (pipeline completion) - Complete
**Issues** (all resolved):
- [Phase 4 OpenClaw Integration Code Review](../issues/phase4-openclaw-integration-code-review-findings.md) (15 items fixed)
- [Phase 4 Code Review Findings](../issues/phase4-plan-code-review-findings.md) (resolved via Phase 3.5 split)
- [Phase 4 Twin Review Findings](../issues/phase4-twin-review-findings.md) (resolved)

---

## Objective

Wire up neon-soul as a fully functional OpenClaw skill with proper command handlers, SKILL.md manifest updates, and end-to-end validation on real OpenClaw memory. This phase bridges the gap between library implementation (Phases 0-3) and production skill usage.

**Blocks**: Production deployment to OpenClaw

---

## Current State

**Prerequisite**: Phase 3.5 must complete first, providing:
- All 8 pipeline stages wired to implementations
- Path convention fix (workspace vs memory path)
- Signal extraction fallback (pattern-based, no LLM required)
- Working backup stage
- Persistence layer (signals/principles/axioms to `.neon-soul/*.json`)

**What exists** (after Phase 3.5):
- SKILL.md manifest with command definitions (`skill/SKILL.md`)
- Command handlers: `synthesize.ts`, `audit.ts`, `download-templates.ts`
- Pipeline orchestrator (`pipeline.ts`) with 8 working stages
- Source collector for OpenClaw memory integration
- 57 passing integration tests
- Persistence layer for command data access

**What's missing** (Phase 4 scope):
- Status and rollback commands (documented in SKILL.md but not implemented)
- Trace command (`/neon-soul trace <axiom-id>`)
- End-to-end test on real OpenClaw workspace
- Skill registration for OpenClaw skill loader

---

## Stage 4.0: Twin Review Fixes (Blocking)

**Source**: [Phase 4 Twin Review Findings](../issues/phase4-twin-review-findings.md)

These fixes must be completed before Stage 4.1 continues, as trace.ts depends on working audit patterns.

**Tasks**:
- [x] **CR-1**: Update `audit.ts` to use `persistence.ts` instead of test-fixtures:
  - Import `loadSynthesisData()` from `persistence.ts`
  - Remove hardcoded `test-fixtures/souls` path
  - Accept workspace path as argument or use default
- [x] **CR-3**: Clarify trace vs audit relationship (Option B chosen):
  - `audit` = exploration mode (--list, --stats, full provenance tree)
  - `trace` = quick single-axiom lookup (minimal output, focused)
  - trace.ts will be thin wrapper focusing on single axiom
- [x] **IM-2**: Extract shared path utility:
  - Create `src/lib/paths.ts` with `getDefaultWorkspacePath()` and `getDefaultOutputPath()`
  - Refactor synthesize.ts to use shared utility
  - Use in rollback.ts, status.ts, audit.ts

**Acceptance criteria**:
- [x] `audit.ts` reads from `.neon-soul/*.json` files
- [x] Path resolution shared across all commands
- [x] trace vs audit documented in plan

---

## Stage 4.1: Implement Missing Commands

**Files to create/modify**:
```
src/commands/
├── status.ts      # NEW: Show synthesis state
├── rollback.ts    # NEW: Restore from backup
└── trace.ts       # NEW: Trace axiom provenance
```

**Tasks**:
- [x] Create `status.ts` command:
  - Show last synthesis timestamp (from `.neon-soul/state.json`)
  - Show pending memory content via re-scan (IM-3 Option B - simpler than tracking size)
  - Display signal/principle/axiom counts
  - Show dimension coverage summary
  - Use existing `state.ts` for state loading
  - Use shared `paths.ts` for workspace path
- [x] Create `rollback.ts` command:
  - List available backups with `--list` flag
  - Restore most recent backup by default
  - Confirm before overwrite
  - Use existing `backup.ts` utilities
  - Use shared `paths.ts` for workspace path (IM-2)
- [x] Create `trace.ts` command (CR-3 Option B - differentiated from audit):
  - Accept axiom ID or CJK character
  - Display minimal focused output: axiom → contributing principles → source signals
  - Single-axiom lookup only (no --list or --stats modes)
  - Quick lookup for "where did this come from?"
  - Use shared `paths.ts` and `persistence.ts` for data loading

**Acceptance criteria**:
- [x] `npx tsx src/commands/status.ts` shows current state
- [x] `npx tsx src/commands/rollback.ts --list` shows backups
- [x] `npx tsx src/commands/trace.ts <axiom-id>` shows provenance chain
- [x] All commands handle missing files gracefully

---

## Stage 4.2: Verify Phase 3.5 Completion

**Purpose**: Confirm pipeline infrastructure is ready before building commands on top.

**Verification checklist** (from Phase 3.5 quality gate):
- [x] All 8 pipeline stages call real implementations (no TODOs/placeholders)
- [x] `collectSources` receives correct workspace path (uses `getWorkspacePath()`)
- [x] Signal extraction returns non-empty array for valid markdown
- [x] Backup created before overwrite (`backupCurrentSoul` stage)
- [x] Persistence files written via `saveSynthesisData()` in `validateOutput` stage

**Verification commands**:
```bash
# Run Phase 3.5 quality gate
npm test       # ✅ 57/57 tests pass
npm run build  # ✅ Compiles
npm run lint   # ✅ Clean

# Verify no placeholder stages remain
grep -r "TODO\|placeholder\|return context;" src/lib/pipeline.ts
# Only remaining: compression ratio placeholder (MN-2, documented)
```

**Acceptance criteria**:
- [x] Phase 3.5 quality gate passes
- [x] No placeholder stages in pipeline (compression ratio documented as MN-2)
- [x] Pipeline persists to `.neon-soul/` via `saveSynthesisData()`

---

## Stage 4.3: OpenClaw Skill Entry Point

**Files to create/modify**:
```
src/skill-entry.ts    # NEW: Skill loader entry point (compiles to dist/)
src/index.ts          # Update exports for skill usage
skill/SKILL.md        # Verify/update manifest
package.json          # Update main field to point to skill entry
```

**Design decision**: Skill entry point lives in `src/skill-entry.ts` and compiles to `dist/skill-entry.js`. This avoids needing a separate TypeScript config for `skill/` and keeps all source in one place. The `skill/` directory only contains `SKILL.md` (manifest).

**Tasks**:
- [x] Create `src/skill-entry.ts` as skill loader entry point:
  - Export skill metadata (name, version, commands)
  - Provide command dispatch function
  - Match OpenClaw skill interface pattern
- [x] Update `package.json`:
  - Added exports field with "./skill" entry point
  - Verified `"files": ["dist", "skill"]` includes compiled output
- [x] Ensure all commands export a `run` function:
  - Accept parsed arguments
  - Return structured result (success/error)
  - Support common flags (--help, --verbose)
- [x] Verify SKILL.md matches implemented commands:
  - synthesize (exists)
  - status (new in Stage 4.1)
  - rollback (new in Stage 4.1)
  - trace (new in Stage 4.1 - differentiated from audit)
  - audit (exists)

**Skill interface pattern** (matches OpenClaw expectations):
```typescript
// src/skill-entry.ts -> compiles to dist/skill-entry.js
// All imports are relative within dist/ (no ../src or ../dist needed)
export const skill = {
  name: 'neon-soul',
  version: '0.1.0',
  commands: {
    synthesize: () => import('./commands/synthesize.js'),
    status: () => import('./commands/status.js'),
    rollback: () => import('./commands/rollback.js'),
    audit: () => import('./commands/audit.js'),
    trace: () => import('./commands/trace.js'),
  },
};
```

**Acceptance criteria**:
- [x] `src/skill-entry.ts` compiles without errors
- [x] `dist/skill-entry.js` exports valid skill definition
- [x] All 5 commands accessible via skill interface
- [x] Commands can be invoked with OpenClaw-style args (run() function)
- [x] SKILL.md accurately documents all 5 commands

---

## Stage 4.4: End-to-End Test with Real Memory

**Files to create**:
```
tests/e2e/
├── live-synthesis.test.ts    # Real OpenClaw memory test
└── fixtures/
    └── mock-openclaw/        # Simulated OpenClaw workspace
        ├── memory/
        │   ├── diary/
        │   │   └── 2026-02-01.md
        │   ├── preferences/
        │   │   └── communication.md
        │   └── relationships/
        │       └── work.md
        ├── SOUL.md           # Initial soul to compress
        └── USER.md           # User context
```

**Tasks**:
- [x] Create mock OpenClaw workspace with realistic content:
  - 5 memory files across categories (diary, preferences, relationships)
  - Diary entries with personal signals
  - Preferences with clear value statements
  - Existing SOUL.md and USER.md as input
- [x] Implement e2e test that runs full pipeline:
  - Point to mock workspace
  - Run synthesize command
  - Test pipeline stages run through
  - Handle case where axioms don't promote (N<3 threshold)
- [x] Test safety rails:
  - Dry-run mode doesn't write files
  - Backup created before overwrite
  - Rollback requires --force confirmation
- [x] Add dry-run e2e test:
  - Verify no files written
  - Original SOUL.md unchanged
- [x] Add command interface tests:
  - All 5 commands have run() functions
  - Commands handle errors gracefully

**Acceptance criteria**:
- [x] E2E test passes with mock workspace (77 tests total)
- [x] Safety rails tested (dry-run, backup, --force)
- [x] Command interface tested (synthesize, status, rollback, audit, trace)
- [x] Edge cases handled (empty memory, missing workspace, missing axiom)

---

## Stage 4.5: Documentation Update

**Workflow**: Follow `docs/workflows/documentation-update.md`

**Files to update** (per documentation hierarchy):
```
docs/proposals/soul-bootstrap-pipeline-proposal.md  # OpenClaw skill commands
docs/plans/2026-02-07-soul-bootstrap-master.md      # Phase 4 completion
docs/ARCHITECTURE.md                                 # Skill integration layer
docs/plans/2026-02-07-phase4-openclaw-integration.md # Mark complete
README.md                                            # Usage guide, status
skill/SKILL.md                                       # Final command reference
scripts/README.md                                    # Any new scripts
```

**Tasks** (follow workflow steps):

Step 1 - Identify scope: Architecture change (skill integration)

Step 2 - Update Proposal:
- [x] Add all 5 skill commands to OpenClaw Skill Commands section
- [x] Update technology stack if needed

Step 3 - Update Master Plan:
- [x] Mark Phase 4 complete in overview
- [x] Add skill integration to architecture diagram

Step 4 - Update Phase Plans:
- [x] Mark Phase 4 plan status as Complete
- [x] Verify all deliverables checked

Step 5 - Update README.md (Twin Review IM-5, MN-3, MN-4):
- [x] Complete skill usage instructions (installation, commands, examples)
- [x] **Standardize command syntax**: slash commands for users, npx for developers only
- [x] **Add "Getting Started" flow** (5-minute onboarding narrative)
- [x] **Explain dimensions** briefly or link to SoulCraft model
- [x] Update Current Status checklist
- [x] Add Phase 4 to completed phases

Step 6 - Finalize SKILL.md (Twin Review CR-2, IM-4):
- [x] **Add audit command** with --list, --stats, axiom-id options
- [x] **Add trace command** with axiom-id parameter
- [x] **Add Safety Philosophy section** explaining *why* safety rails exist
- [x] Verify all 5 commands documented with usage examples
- [x] Match output format to implementation
- [x] Decide: document download-templates or mark internal-only (MN-1) - marked as dev command

Step 7 - Verify consistency:
```bash
# Check for stale command references
grep -r "npx neon-soul" docs/ README.md

# Check phase cross-references
grep -r "Phase 4\|phase4" docs/plans/

# All tests pass
npm test && npm run lint && npm run build
```

**Acceptance criteria**:
- [x] All workflow steps completed
- [x] Verification commands return expected results
- [x] README has complete usage guide
- [x] ARCHITECTURE.md reflects skill integration
- [x] SKILL.md matches implementation
- [x] All tests/lint/build pass

---

## Quality Gate: QG-Integration

Before marking Phase 4 complete:

| Metric | Target | Measured |
|--------|--------|----------|
| Phase 3.5 complete | Yes | All QG-Pipeline criteria met |
| Command coverage | 5/5 | synthesize, status, rollback, audit, trace |
| E2E test pass | 100% | All e2e tests green |
| Safety rails | Implemented | --live flag, auto-backup, dry-run default |
| SKILL.md accuracy | 100% | Commands match manifest |
| Build/lint/test | Pass | No errors |

---

## Deliverables

**Stage 4.0** (Twin Review Fixes) - Complete:
- [x] `src/lib/paths.ts` - Shared path resolution utility
- [x] Updated `src/commands/audit.ts` - Uses persistence.ts instead of test-fixtures
- [x] Updated `src/commands/synthesize.ts` - Uses shared paths utility

**Stage 4.1** (Commands) - Complete:
- [x] `src/commands/status.ts` - Show synthesis state
- [x] `src/commands/rollback.ts` - Restore from backup
- [x] `src/commands/trace.ts` - Quick single axiom provenance lookup

**Stage 4.3** (Skill) - Complete:
- [x] `src/skill-entry.ts` - Skill loader entry point (compiles to dist/)
- [x] All commands export `run()` function for programmatic use
- [x] `package.json` exports field with "./skill" entry

**Stage 4.4** (Testing) - Complete:
- [x] E2E test suite with mock workspace and safety rails
- [x] Mock workspace: 5 memory files (diary, preferences, relationships)
- [x] 20 E2E tests covering pipeline, commands, safety, edge cases

**Stage 4.5** (Docs) - Complete:
- [x] Updated README (getting started, dimensions, standardized syntax)
- [x] Updated SKILL.md (audit, trace, safety philosophy)
- [x] Updated ARCHITECTURE.md

**Note**: Pipeline wiring moved to [Phase 3.5](./2026-02-07-phase3.5-pipeline-completion.md).

---

## Effort Estimate

| Stage | Estimate | Notes |
|-------|----------|-------|
| Stage 4.0: Twin review fixes | 1 hour | Fix audit.ts, create paths.ts, clarify trace |
| Stage 4.1: Missing commands | 1.5 hours | 3 new commands, follow existing patterns |
| Stage 4.2: Verify Phase 3.5 | 0.25 hours | Run quality gate, verify no placeholders |
| Stage 4.3: Skill entry point | 1 hour | Match OpenClaw skill interface, use dist/ imports |
| Stage 4.4: E2E tests | 2.5 hours | Mock workspace + live test + safety rails |
| Stage 4.5: Documentation Update | 1.5 hours | Expanded per twin review (SKILL.md, README enhancements) |

**Total**: ~7.75 hours active work

**Combined with Phase 3.5**: ~6.5h + ~7.75h = ~14.25h (aligns with I-5 revised estimate of 12-15h)

---

## Dependencies

**External**:
- OpenClaw memory at `~/.openclaw/workspace/memory/` (optional for live test)
- Node.js 22+ (required by package.json)

**Internal (from previous phases)**:
- `src/lib/source-collector.ts` - Source collection (Phase 3)
- `src/lib/signal-extractor.ts` - Signal extraction (Phase 1)
- `src/lib/pipeline.ts` - Orchestration (Phase 3)
- `src/lib/soul-generator.ts` - SOUL.md generation (Phase 3)
- `src/lib/backup.ts` - Backup/rollback (Phase 0)
- `src/lib/state.ts` - State persistence (Phase 0)

---

## Notes

- **Phase 3.5 prerequisite**: Critical foundational work (path fix, signal extraction, persistence) moved to Phase 3.5
- Phase 4 focuses on skill integration: commands, entry point, E2E tests
- Safety rails required for live tests (--live flag, auto-backup, dry-run default)
- Skill entry point in `src/skill-entry.ts` compiles to `dist/skill-entry.js` (no separate skill/index.ts)
- After Phase 4: ready for user testing and feedback collection

---

*Phase 4 completes the skill integration. Success means neon-soul works as a drop-in OpenClaw skill.*
