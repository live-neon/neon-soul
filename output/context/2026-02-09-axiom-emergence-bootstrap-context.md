# Context: Axiom Emergence in Bootstrap Mode

**Generated**: 2026-02-09
**Scout**: haiku
**Mode**: flexible
**Topic**: Fix zero axiom generation in bootstrap mode

## Files (6 relevant)

| File | SHA256 (16-char) | Lines | Summary |
|------|------------------|-------|---------|
| docs/plans/2026-02-09-axiom-emergence-bootstrap.md | 3184b651cfcdacc3 | 393 | Implementation plan for fixing zero axiom generation; proposes Bootstrap mode with N=1 threshold |
| src/lib/reflection-loop.ts | 09ae3a0082f1b19d | 314 | Reflective synthesis loop; uses re-clustering design that resets N-counts each iteration |
| src/lib/compressor.ts | b93fd5ab9076dd6e | 233 | Principle-to-axiom compression; enforces N>=threshold for promotion |
| src/lib/pipeline.ts | 34c9be27bac428f4 | 811 | Pipeline orchestrator; already has GreenfieldMode type but doesn't pass to reflective loop |
| docs/guides/greenfield-guide.md | 230748af96f2a5ca | 357 | Bootstrap-Learn-Enforce methodology; "thresholds emerge, not declared" |
| docs/issues/greenfield-bootstrap-mode-enforcement.md | 254255b921093ae2 | 148 | Related resolved issue; validation now respects bootstrap mode |

## Historical Notes (from Historian)

*No related observations found - new feature area.*

## Relationships

```
Pipeline (orchestrator)
    │
    ├── passes mode to → ReflectiveLoop
    │                        │
    │                        └── calls → Compressor (N-threshold enforced here)
    │
    └── validates via → validateSoulOutput() (already respects mode)

Issue → documents validation fix
Plan → proposes extending mode to compressor
Guide → provides methodology context
```

**Key Dependency Chain**:
1. `PipelineOptions.mode` exists (default: 'bootstrap')
2. `runReflectiveLoop()` does NOT accept mode parameter (gap)
3. `compressPrinciples()` uses hardcoded `axiomNThreshold` from config (gap)

**Root Cause Flow**:
- ReflectiveLoop uses re-clustering (line 106-111): Each iteration creates fresh PrincipleStore
- N-counts reset each iteration (never accumulate above 1-2)
- Compressor enforces `N >= 3` threshold (line 150)
- Result: 0 axioms promoted

## Suggested Focus

- **Priority 1**: `src/lib/reflection-loop.ts` (lines 30-54, 121-135) - Add mode to config, pass to compressor
- **Priority 2**: `src/lib/compressor.ts` (lines 141-155) - Respect mode for N-threshold
- **Priority 3**: `src/lib/pipeline.ts` (lines 491-502) - Pass mode through to reflective loop

## Exploration Notes

**Current State**:
- Pipeline already has `GreenfieldMode` type and `mode` option (defaults to 'bootstrap')
- Validation (`validateSoulOutput`) already respects mode (returns valid=true in bootstrap)
- Gap: Mode not passed through to ReflectiveLoop and Compressor

**Design Decision (CR-2)**:
- Re-clustering is intentional (trades N-count accumulation for cleaner clustering)
- Plan proposes keeping re-clustering but adjusting threshold based on mode

**Metrics to Track** (per plan):
- N-count distribution histogram
- "Would filter" count for Learn phase analysis

**Verification Command** (from plan):
```bash
OPENCLAW_WORKSPACE=~/.openclaw/workspace npx tsx src/commands/synthesize.ts --dry-run --verbose
# Expected: Axioms > 0 in bootstrap mode
```

---

*Context generated for review workflow - see plan for implementation stages*
