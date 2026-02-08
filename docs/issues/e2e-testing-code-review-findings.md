---
status: Resolved
priority: Medium
created: 2026-02-09
resolved: 2026-02-08
source: Code Review (N=2)
reviewers:
  - codex-gpt51-examiner
  - gemini-25pro-validator
affects:
  - tests/e2e/state-persistence.test.ts
  - tests/e2e/safety-rails.test.ts
  - tests/e2e/real-environment.test.ts
  - src/lib/persistence.ts
---

# E2E Testing Code Review Findings

**Date**: 2026-02-09
**Source**: External code review (N=2 cross-architecture)
**Review Files**:
- `docs/reviews/2026-02-09-e2e-testing-implementation-codex.md`
- `docs/reviews/2026-02-09-e2e-testing-implementation-gemini.md`
**Context**: `output/context/2026-02-09-e2e-testing-implementation-context.md`

---

## Summary

External code review (Codex + Gemini) of the E2E testing implementation identified test assertion weaknesses that could allow regressions to slip through undetected. **No production code bugs found** - all issues are in test code.

**Totals**: 0 Critical (production), 6 Important (test quality), 5 Minor

**N-Count Verification**: All items independently verified for N=2.

---

## Important Findings (Test Quality)

### I-1: Wrong Metric Comparison in Multi-Run Test

**Location**: `tests/e2e/state-persistence.test.ts:138`
**Verification**: N=2 (Both reviewers + manual verification)

**Problem**: Test compares `countsAfter.signals` to `countsBefore.axioms` instead of `countsBefore.signals`:
```typescript
// Current (buggy):
expect(countsAfter.signals).toBeGreaterThanOrEqual(countsBefore.axioms);

// Should be:
expect(countsAfter.signals).toBeGreaterThan(countsBefore.signals);
```

**Impact**: Test passes even if signal count decreases, masking regressions in signal accumulation logic.

**Fix**: Compare signals to signals.

---

### I-2: Rollback Test Does Not Verify State Files

**Location**: `tests/e2e/state-persistence.test.ts:195-248`
**Verification**: N=2 (Gemini + manual verification)

**Problem**: Rollback test only verifies `SOUL.md` is restored (line 244-247) but does NOT verify internal state files are rolled back:
- `.neon-soul/state.json`
- `.neon-soul/signals.json`
- `.neon-soul/principles.json`
- `.neon-soul/axioms.json`

**Impact**: Could leave application in inconsistent state where output file doesn't match internal data for next synthesis run.

**Fix**: Add assertions that state files match pre-version-B state after rollback, OR verify rollback command actually restores state files (may require checking rollback.ts behavior).

---

### I-3: Rollback Test Does Not Assert Version Difference

**Location**: `tests/e2e/state-persistence.test.ts:230-232`
**Verification**: N=2 (Both reviewers)

**Problem**: Comment explicitly notes versions might be similar with mock LLM, but no assertion that versionB differs from versionA before rollback:
```typescript
// Note: with mock LLM, versions might be similar, so we just verify rollback works
```

**Impact**: With deterministic mock LLM, rollback could be a no-op and test still passes.

**Fix**: Either:
- Assert `versionB !== versionA` before rollback
- Add marker content unique to version B that should disappear after rollback
- Track backup timestamp and verify restoration time

---

### I-4: Force Flag Test Lacks Verification

**Location**: `tests/e2e/safety-rails.test.ts:93-115`
**Verification**: N=2 (Codex + manual verification)

**Problem**: Test only checks `result.success !== undefined` which is always true. Does not verify synthesis was actually skipped or files remain unmodified without `--force`.

**Impact**: Test cannot catch syntheses that wrongly run/write without `--force`.

**Fix**: Assert one of:
- File mtime unchanged
- Result contains explicit skip message
- Content unchanged after operation

---

### I-5: Symlink Test Creates File in Global /tmp

**Location**: `tests/e2e/safety-rails.test.ts:60`
**Verification**: N=2 (Gemini + manual verification)

**Problem**: Symlink target created in global `/tmp` directory:
```typescript
const targetPath = resolve('/tmp', 'neon-soul-test-target.md');
```

**Impact**: External dependency that could cause conflicts in parallel test runs or different environments.

**Fix**: Create target within `TEST_WORKSPACE` or `FIXTURES_DIR` instead:
```typescript
const targetPath = join(TEST_WORKSPACE, '..', 'symlink-target.md');
```

---

### I-6: No Corrupted State File Tests

**Location**: `src/lib/persistence.ts:163-179` (behavior), tests missing
**Verification**: N=2 (Gemini + manual verification)

**Problem**: `loadSignals`/`loadPrinciples`/`loadAxioms` catch JSON parse errors and return empty arrays with console warning. This "silent recovery" behavior is not tested.

**Impact**: Could lead to unexpected data loss if signals.json becomes corrupted; next synthesis would start fresh without explicit warning to user.

**Fix**: Add tests that:
1. Create malformed JSON files
2. Verify functions return empty arrays (or throw, depending on desired behavior)
3. Verify warning is logged

---

## Minor Findings

### M-1: Provenance Audit Computes But Does Not Assert

**Location**: `tests/e2e/state-persistence.test.ts:265-275`
**Verification**: N=2 (Both reviewers)

**Problem**: Test computes `exists` for signal source files but never asserts it.

**Fix**: Add `expect(exists).toBe(true)` or remove the dead code.

---

### M-2: Atomic Write Temp File Detection Gap

**Location**: `tests/e2e/safety-rails.test.ts:167-172`
**Verification**: N=2 (Codex + manual verification)

**Problem**: Test filters files ending with `.tmp`, but `writeFileAtomic` creates files like `.tmp-<uuid>` (starting with `.tmp-`):
```typescript
// Current filter misses hidden temp files:
const actualTempFiles = tempFiles.filter((f: string) => f.endsWith('.tmp'));
```

**Fix**: Also check for `.tmp-` prefix:
```typescript
const actualTempFiles = files.filter((f: string) =>
  f.startsWith('.tmp-') || f.endsWith('.tmp')
);
```

---

### M-3: Timestamp Fallback Could Mislead Status

**Location**: `src/lib/persistence.ts:241`
**Verification**: N=2 (Codex + manual verification)

**Problem**: Falls back to `new Date().toISOString()` when state file is missing:
```typescript
const timestamp = state?.lastRun?.timestamp || new Date().toISOString();
```

**Impact**: Status could appear current even if synthesis never ran successfully.

**Fix**: Return `null` or empty string when state unavailable, allowing consumers to distinguish "never run" from "just ran."

---

### M-4: Format Variation Test Does Not Assert Difference

**Location**: `tests/e2e/real-environment.test.ts:173-223`
**Verification**: N=2 (Both reviewers)

**Problem**: Test confirms two files with different `--format` flags are created but does not assert content is actually different. Comment on line 220-222 acknowledges this.

**Fix**: Assert format-specific markers exist (e.g., CJK characters in notated output).

---

### M-5: Unused Variable in SOUL.md Test

**Location**: `tests/e2e/real-environment.test.ts:57`
**Verification**: N=2 (Gemini + manual verification)

**Problem**: `originalContent` is read but never used in assertions.

**Fix**: Either use for comparison or remove.

---

## Untested Scenarios (Coverage Gaps)

These were identified but not included in findings count:

1. **Concurrent synthesis runs** - Atomic writes prevent corruption but not race conditions
2. **Path traversal attacks** - Symlinks tested but explicit `../../../` paths not tested
3. **Error conditions** - No tests for: read-only directories, missing memory path, permission denied
4. **Rollback edge cases** - No tests for: rollback with no backups, multiple sequential rollbacks

---

## Recommendations

### Immediate (Before Production) ✅

1. [x] Fix I-1 (wrong metric comparison)
2. [x] Fix I-3 (add version difference assertion)
3. [x] Fix I-5 (move symlink target to test workspace)
4. [x] Fix M-1 (add existence assertion)

### Short-Term ✅

5. [x] Address I-2 (verify state files in rollback)
6. [x] Address I-4 (strengthen force flag verification)
7. [x] Address M-2 (fix temp file detection pattern)
8. [x] Add I-6 (corrupted state file tests)
9. [x] Fix M-3 (timestamp fallback to null)
10. [x] Fix M-4 (format variation test structure)
11. [x] Fix M-5 (remove unused variable)

### Long-Term

12. [ ] Add concurrent synthesis tests
13. [ ] Add path traversal security tests
14. [ ] Add error condition tests
15. [x] Real LLM integration tests - See `docs/plans/2026-02-08-ollama-llm-provider.md`

---

## Cross-References

- **Plan**: `docs/plans/2026-02-09-e2e-testing.md`
- **Initial Findings**: `docs/issues/e2e-testing-findings.md`
- **Codex Review**: `docs/reviews/2026-02-09-e2e-testing-implementation-codex.md`
- **Gemini Review**: `docs/reviews/2026-02-09-e2e-testing-implementation-gemini.md`
- **Context**: `output/context/2026-02-09-e2e-testing-implementation-context.md`
