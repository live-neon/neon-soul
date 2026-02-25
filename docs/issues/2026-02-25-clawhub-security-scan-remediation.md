# ClawHub Security Scan Remediation

**Created**: 2026-02-25
**Status**: Open
**Priority**: P1 (blocking publish)
**Skills Affected**: neon-soul, consciousness-soul-identity

---

## Summary

Both NEON-SOUL skills were flagged as "Suspicious" (medium confidence) by ClawHub's automated security scanning during publish. This blocks distribution until findings are addressed.

---

## Security Scan Results

### Skill: neon-soul (v0.4.0)

| Check | Status | Details |
|-------|--------|---------|
| VirusTotal | Pending | Hash submitted, awaiting analysis |
| OpenClaw Security | Suspicious | system-prompt-override pattern detected |

**Findings**:
- `system-prompt-override` injection pattern detected in SKILL.md
- Runtime requirements not declared in metadata (Node.js 22+, Ollama)
- Sensitive file access (memory/, session logs) partially declared

### Skill: consciousness-soul-identity (v0.4.0)

| Check | Status | Details |
|-------|--------|---------|
| VirusTotal | Pending | Hash submitted, awaiting analysis |
| OpenClaw Security | Suspicious | system-prompt-override pattern detected |

**Findings**:
- Same `system-prompt-override` pattern as neon-soul
- Same undeclared runtime requirements
- Same sensitive file access concerns

---

## Root Cause Analysis

### 1. "system-prompt-override" Pattern (False Positive)

**Trigger**: The word "Override" in CLI option descriptions:

```markdown
# In skills/neon-soul/SKILL.md (lines 62-63):
- `--memory-path <path>` — Override memory directory
- `--output-path <path>` — Override SOUL.md location

# In skills/consciousness-soul-identity/SKILL.md (lines 62-63):
- `--memory-path <path>` — Override memory directory
- `--output-path <path>` — Override SOUL.md location
```

**Analysis**: The scanner is pattern-matching for prompt injection attempts. "Override" is a common keyword in injection attacks ("override system prompt", "override instructions"). Our usage is legitimate CLI documentation, but the scanner cannot distinguish context.

**Fix**: Replace "Override" with neutral alternatives like "Custom" or "Specify".

### 2. Undeclared Runtime Requirements

**Issue**: SKILL.md documents requirements but metadata doesn't declare them:

```markdown
# In SKILL.md:
**Requirements:** Node.js 22+, Ollama running locally (`ollama serve`).

# In metadata (lines 8-14):
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
    requires: {}  # <-- Empty!
```

**Fix**: Add runtime requirements to metadata:

```yaml
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
    requires:
      node: ">=22.0.0"
      services:
        - name: ollama
          url: http://localhost:11434
          optional: false
```

### 3. Sensitive File Access

**Issue**: Skills access sensitive paths not fully declared:

| Path | Purpose | Declared |
|------|---------|----------|
| `memory/` | User memory files | Yes (stateDirs) |
| `.neon-soul/` | State and caches | Yes (stateDirs) |
| `~/.openclaw/agents/main/sessions/*.jsonl` | Session logs | No |
| `SOUL.md` | Output file | No |

**Fix**: Declare all accessed paths in metadata:

```yaml
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
      readPaths:
        - ~/.openclaw/agents/main/sessions/
      writePaths:
        - SOUL.md
```

---

## Remediation Plan

### Stage 1: Fix "Override" Wording

**Files**:
- `skills/neon-soul/SKILL.md`
- `skills/consciousness-soul-identity/SKILL.md`

**Changes**:
```diff
- - `--memory-path <path>` — Override memory directory
+ - `--memory-path <path>` — Custom memory directory path

- - `--output-path <path>` — Override SOUL.md location
+ - `--output-path <path>` — Custom SOUL.md output path
```

### Stage 2: Declare Runtime Requirements

**Files**: Same as Stage 1

**Changes**: Update metadata section:
```yaml
metadata:
  openclaw:
    config:
      stateDirs:
        - memory/
        - .neon-soul/
    requires:
      node: ">=22.0.0"
      services:
        - name: ollama
          url: http://localhost:11434
          optional: false
```

### Stage 3: Declare All File Access

**Files**: Same as Stage 1

**Changes**: Expand config section:
```yaml
config:
  stateDirs:
    - memory/
    - .neon-soul/
  readPaths:
    - ~/.openclaw/agents/main/sessions/
  writePaths:
    - SOUL.md
    - .neon-soul/backups/
```

### Stage 4: Republish and Verify

1. Bump version to 0.4.1
2. Republish both skills:
   ```bash
   cd skills/neon-soul && clawhub publish
   cd skills/consciousness-soul-identity && clawhub publish
   ```
3. Verify scan results show "Clean" status
4. Monitor VirusTotal results (may take 24-48 hours)

---

## Verification Checklist

- [ ] "Override" replaced with "Custom" in both SKILL.md files
- [ ] Runtime requirements declared in metadata
- [ ] All file access paths declared
- [ ] Version bumped to 0.4.1
- [ ] Both skills republished
- [ ] Security scan returns "Clean" status
- [ ] VirusTotal analysis completes without flags

---

## Notes

- VirusTotal "Pending" status is normal for new submissions
- ClawHub security scanning uses pattern matching which can produce false positives
- The "system-prompt-override" detection is overly aggressive but reasonable given prompt injection risks
- Our skills are legitimate but documentation wording triggered the scanner

---

## Related

- Code review: `docs/issues/2026-02-25-code-review-remediation.md`
- Twin review: `docs/issues/2026-02-25-twin-review-remediation.md`
- Skill publish workflow: `docs/workflows/skill-publish.md`
