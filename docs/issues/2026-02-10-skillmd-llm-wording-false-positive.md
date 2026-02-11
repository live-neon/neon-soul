# Issue: SKILL.md "call LLMs" Wording Triggers False Positive

**Created**: 2026-02-10
**Status**: Open
**Priority**: Medium
**Type**: Documentation Fix
**Blocking**: No (skill is published and functional)

---

## Summary

The phrase "call LLMs" in SKILL.md triggers a ClawHub security scan false positive. The scanner interprets this as "makes undeclared outbound API calls to arbitrary LLM endpoints" when in reality it just means "use the agent's own configured model."

---

## Root Cause

The scanner can't distinguish between:
- **Normal**: "Use your own configured model" (what every skill does implicitly)
- **Suspicious**: "Call arbitrary external LLM APIs" (actual security concern)

NEON-SOUL explicitly described what agents naturally do, and the scanner flagged the explicit mention.

---

## The Insight

> The agent already has its LLM configured — that's how it works. The skill isn't calling some random external LLM, it's using the agent's own model that's already set up in OpenClaw/Claude Code/whatever framework is running it. That's like flagging a skill for "using the agent's brain."

Every skill uses the agent's model implicitly. NEON-SOUL just happened to say it explicitly.

---

## Fix

**Current** (problematic):
```markdown
The skill will call LLMs to classify and synthesize your identity.
```

**Fixed** (same meaning, no false positive):
```markdown
The skill reads files, analyzes content, and writes output.
```

This describes the same behavior without ambiguity. The scanner won't flag the agent doing what agents do.

---

## Files to Update

- `skill/SKILL.md` - Remove/reword "call LLMs" phrasing
- `skill/README.md` - Check for similar wording
- `docs/workflows/skill-publish.md` - Add to security scan troubleshooting table

---

## Acceptance Criteria

- [ ] No mention of "call LLMs" or "LLM calls" in SKILL.md
- [ ] Replaced with "read files, analyze content, write output" or similar
- [ ] Security scan troubleshooting updated with this pattern
- [ ] Publish patch version (v0.1.3)

---

## Troubleshooting Pattern (Add to Workflow)

| Flag | Likely Cause | Fix |
|------|--------------|-----|
| "LLM API calls" or "External LLM" | SKILL.md says "call LLMs" | Reword to "analyze content" — agents use their model implicitly |

---

## Cross-References

**Related**:
- `docs/plans/2026-02-10-clawhub-deployment.md` - Original deployment (v0.1.0-0.1.2)
- `docs/workflows/skill-publish.md` - Security scan response section
- `docs/issues/2026-02-10-post-deployment-version-fixes.md` - Previous version fixes

**Files to modify**:
- `skill/SKILL.md`
- `skill/README.md` (if applicable)
- `docs/workflows/skill-publish.md`

---

## Notes

This is a documentation fix, not a code change. The skill behavior is correct — only the description triggered the false positive.
