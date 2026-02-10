# Issue: Validation Enforcing During Bootstrap Phase

**Created**: 2026-02-09
**Updated**: 2026-02-09
**Status**: ✅ Resolved
**Priority**: High
**Source**: User testing synthesis command

---

## Summary

Synthesis was failing with `Validation failed: no-axioms-generated` during what should be the Bootstrap phase. This violated the greenfield methodology which states validation should only enforce in the Enforce phase.

**Root Cause**: `validateSoulOutput()` was rejecting synthesis results when no axioms were generated, regardless of the greenfield phase.

**Impact**: Users couldn't run synthesis to collect learning data because the system was enforcing thresholds before any thresholds had been learned.

---

## Evidence

```bash
$ npx tsx src/commands/synthesize.ts --dry-run --verbose
# Soul Synthesis Result
**Status**: Failed
**Error**: Validation failed: no-axioms-generated
```

---

## Greenfield Violation

Per `docs/guides/greenfield-guide.md`:

> "During Bootstrap, log them as 'would reject' but keep them. You're learning what 'obviously bad' means."

**Phase 1 (Bootstrap) rules**:
- ✅ Capture everything, enforce nothing
- ✅ Accept everything during Bootstrap
- ❌ ~~Reject souls that don't converge~~ (was happening)
- ❌ ~~Enforce "attractor basin" requirements~~ (was happening)

The code at `src/lib/pipeline.ts:548-549` was:
```typescript
if (!context.axioms || context.axioms.length === 0) {
  return { valid: false, reason: 'no-axioms-generated', warnings };
}
```

This enforced a threshold (axioms > 0) without any learning data to justify it.

---

## Resolution

### Changes Made

**1. Added GreenfieldMode type** (`src/lib/pipeline.ts`):
```typescript
export type GreenfieldMode = 'bootstrap' | 'learn' | 'enforce';
```

**2. Updated PipelineOptions** to include mode:
```typescript
interface PipelineOptions {
  // ...existing options...
  mode?: GreenfieldMode; // default: 'bootstrap'
}
```

**3. Updated DEFAULT_PIPELINE_OPTIONS**:
```typescript
mode: 'bootstrap', // measure everything, enforce nothing
```

**4. Updated validateSoulOutput()** to respect mode:
- **Bootstrap mode**: Log "would reject" as warning, return `valid: true`
- **Enforce mode**: Actually reject with `valid: false`

**5. Updated ValidationResult** to track learning data:
```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;
  warnings: string[];
  wouldReject?: string; // Track for Learn phase analysis
}
```

### Verification

After fix:
```bash
$ npx tsx src/commands/synthesize.ts --dry-run --verbose
[neon-soul:warn] [bootstrap] Would reject: no axioms generated (measuring for Learn phase)
# Soul Synthesis Result
**Status**: Success
```

The system now:
1. Accepts synthesis results in bootstrap mode
2. Logs what would have been rejected for future learning
3. Collects data needed to discover actual thresholds

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pipeline.ts` | Added GreenfieldMode, updated validation logic |
| `src/index.ts` | Export GreenfieldMode type |

---

## Related Issue: Zero Axioms Generated

The synthesis now succeeds but produces:
- 47 signals
- 46 principles
- **0 axioms**

This is a separate issue - the reflective loop is generating principles but not crystallizing them into axioms. This is now observable because bootstrap mode accepts the result.

**Root cause identified**: The `axiomNThreshold = 3` is being enforced during Bootstrap phase. Combined with the re-clustering design (which resets N-counts each iteration), principles never accumulate enough N-count.

**Follow-up plan**: [`docs/plans/2026-02-09-axiom-emergence-bootstrap.md`](../plans/2026-02-09-axiom-emergence-bootstrap.md)

---

## Lessons Learned

1. **Greenfield anti-pattern detected**: Hardcoding thresholds (axioms > 0) before measuring actual distribution
2. **Bootstrap phase must be explicit**: Mode should be configurable, not implicit
3. **"Would reject" tracking enables learning**: By logging what would fail, we can analyze patterns in Learn phase

---

## Cross-References

- **Greenfield Guide**: `docs/guides/greenfield-guide.md`
- **Pipeline Implementation**: `src/lib/pipeline.ts`
- **Related**: Zero axioms issue (separate investigation needed)

---

*Issue resolved 2026-02-09 - validation now respects greenfield bootstrap mode*
