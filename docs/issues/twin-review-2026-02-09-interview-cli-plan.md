# Twin Review Issue: Interview CLI Integration Plan

**Created**: 2026-02-09
**Updated**: 2026-02-09
**Status**: ✅ Resolved
**Priority**: Medium
**Source**: Twin review synthesis (N=2 internal)
**Reviews**:
- `docs/reviews/2026-02-09-interview-plan-twin-technical.md`
- `docs/reviews/2026-02-09-interview-plan-twin-creative.md`
**Plan**: `docs/plans/2026-02-09-interview-cli-integration.md`

---

## Summary

Internal twin review (Technical + Creative) of the Interview CLI Integration plan after external code review and chat-first pivot. Both reviewers approved the plan with suggestions. Key findings focus on UX polish, documentation clarity, and Stage 7 scoping.

**Note**: MCE violations (interview.ts, question-bank.ts) and plan length issues are excluded from this issue per user request.

---

## N=2 Verified (Both Reviewers Flagged)

### 1. Stage 7 Scope Understated

**Technical**: Stage 7 acceptance criteria thorough but complexity note doesn't match detailed scope
**Creative**: Suggests splitting into Stage 7a (static) and Stage 7b (animated)

**Verification**: Plan lines 451-455 note complexity, but lines 486-494 list extensive criteria (typewriter, signals flow, axiom display, responsive, accessibility, replay).

**Resolution**:
- [ ] Split Stage 7 into two sub-stages:
  - **Stage 7a**: Static transcript demo (low complexity, ships with core interview)
  - **Stage 7b**: Animated visualization (high complexity, separate plan or Phase 2)

**Location**: Plan Stage 7 (lines 445-497)

---

### 2. Demo Recording Format Needs Strengthening

**Technical**: Versioning strategy unclear - what happens when format changes?
**Creative**: Privacy framing needs specificity - who creates demo data and with what intent?

**Verification**:
- Line 391: `"version": "1.0"` shown but no migration strategy
- Lines 429-432: "Use curated/synthetic demo responses" but doesn't specify team authorship

**Resolution**:
- [ ] Add to Stage 6 acceptance criteria: "Recording format version bumped on breaking changes"
- [ ] Add: "Playback code handles version mismatch gracefully (fallback to static)"
- [ ] Clarify privacy: "Use team-authored demo responses that showcase diverse dimensions while representing authentic values. Review for PII before commit."

**Location**: Plan Stage 6 (lines 372-441)

---

## N=1 Verified (Confirmed in Codebase)

### 3. Stage Dependency: Stage 4 Required BY Stage 3

**Source**: Technical only
**Verification**: Plan line 244 (Stage 3) says "Select 7 questions (1 per dimension, prioritize required)" but the selection algorithm is defined in Stage 4 (lines 286-310).

**Impact**: Stage 3 cannot be implemented without Stage 4's algorithm.

**Resolution** (choose one):
- [ ] **Option A**: Reorder stages (current Stage 4 becomes Stage 3)
- [ ] **Option B**: Merge Stages 3 and 4 (tightly coupled)
- [ ] **Option C**: Extract algorithm to shared utility in Stage 2

**Location**: Plan Stages 3-4 (lines 231-310)

---

### 4. OpenClaw Session Context API Not Documented

**Source**: Technical only
**Verification**: Line 164-165 mentions "OpenClaw provides session context that persists across messages" but provides no API reference.

**Impact**: Implementer must discover API independently.

**Resolution**:
- [ ] Add to Stage 1 acceptance criteria: specific OpenClaw session API to use
- [ ] Link to OpenClaw session documentation
- [ ] Specify any size limits on session state

**Location**: Plan Stage 1 (lines 151-178)

---

### 5. LLM/Embedding Timing Unclear

**Source**: Technical only
**Verification**: Lines 258-263 mention embedding model cold-start but don't clarify WHEN signal extraction happens (during interview or after).

**Impact**: If extraction during interview, LLM dependency not fully solved.

**Resolution**:
- [ ] Clarify in Stage 3: "Interview collects responses only (no embedding during interview)"
- [ ] Add: "Signal extraction happens at synthesis time (existing pipeline)"

**Location**: Plan Stage 3 (lines 258-263)

---

### 6. Interview Pacing Lacks Breathing Room

**Source**: Creative only
**Verification**: User flow (lines 89-127) shows questions firing immediately after responses with no acknowledgment.

**Impact**: Feels transactional rather than conversational.

**Resolution**:
- [ ] Add brief acknowledgment between questions (e.g., "Got it." or similar)
- [ ] Example: User responds → "Got it." → Pause → Next question

**Location**: Plan User Flow (lines 89-127), Stage 3 behavior

---

### 7. Example Axiom Notation Incorrect

**Source**: Creative only
**Verification**: Line 126 shows "計 (kei): Methodical approach with validation" but 計 means "plan/planning" in CJK vocabulary, not "methodical approach".

**Impact**: Sets false expectations about axiom notation.

**Resolution** (choose one):
- [ ] **Option A**: Use placeholder notation: `[CJK TBD]`
- [ ] **Option B**: Add note: "Axiom notation emerges from synthesis; examples are illustrative only"
- [ ] **Option C**: Use accurate notation (e.g., 順 for "methodical/orderly")

**Location**: Plan User Flow (lines 124-127)

---

### 8. Mobile Breakpoint Not Specified

**Source**: Technical only
**Verification**: Line 492 says "Works on mobile (responsive layout)" without specific breakpoints.

**Impact**: No clear test criteria for "mobile".

**Resolution**:
- [ ] Specify breakpoints in Stage 7 acceptance criteria:
  - Renders correctly at 375px width (iPhone SE)
  - Renders correctly at 768px width (tablet)
  - Three-column becomes single-column below 640px

**Location**: Plan Stage 7 acceptance criteria (line 492)

---

### 9. Partial Interview Completion Undefined

**Source**: Creative only
**Verification**: Line 275 mentions "'skip' or 'done' ends interview early" but doesn't specify what happens to partial responses.

**Impact**: Users who skip don't know if their answers are saved.

**Resolution**:
- [ ] Document partial completion path in Stage 3:
  - If 3+ questions answered: Offer to save partial responses (with note: "partial interview")
  - If <3 questions answered: Discard (insufficient for meaningful synthesis)
  - Show clear message to user about outcome

**Location**: Plan Stage 3 acceptance criteria (line 275)

---

### 10. Landing Page Plan Extension Unclear

**Source**: Creative only
**Verification**: Landing page plan (`2026-02-08-liveneon-landing-page.md`) status is Complete. Stage 7 adds "How It Works" section not in original plan.

**Impact**: Documentation drift between plans.

**Resolution**:
- [ ] Note in Stage 7 that this extends the completed landing page plan
- [ ] OR create separate plan for "How It Works" demo feature
- [ ] Update landing page plan status or add cross-reference

**Location**: Plan Stage 7, Related section (line 540)

---

## Alternative Framing (From Creative Review)

The plan solves cold start through interview, but creative reviewer raised:

1. **Interview implies interrogation**: Consider "conversation" or "getting to know you" framing
2. **7 questions assumes completeness**: One profound answer might be worth more than 7 surface answers
3. **No scratch space**: Users might want trial runs that don't persist

**Recommendation**: Consider cold start as *relationship initiation*, not *data collection*. Functional requirements remain; emotional design shifts.

---

## Resolution Checklist

### Important (Fix in Plan Update)
- [x] Stage 7 split into 7a/7b (#1)
- [x] Demo recording versioning + privacy clarification (#2)
- [x] Stage dependency resolution (#3)
- [x] OpenClaw session API documentation (#4)
- [x] LLM timing clarification (#5)

### Minor (Nice to Have)
- [x] Interview pacing acknowledgment (#6)
- [x] Axiom notation fix/disclaimer (#7)
- [x] Mobile breakpoint specification (#8)
- [x] Partial completion behavior (#9)
- [x] Landing page plan cross-reference (#10)

---

## Cross-References

- **Plan**: `docs/plans/2026-02-09-interview-cli-integration.md`
- **Technical Review**: `docs/reviews/2026-02-09-interview-plan-twin-technical.md`
- **Creative Review**: `docs/reviews/2026-02-09-interview-plan-twin-creative.md`
- **Prior Code Review Issue**: `docs/issues/code-review-2026-02-09-interview-cli-plan.md` (resolved)
- **Landing Page Plan**: `docs/plans/2026-02-08-liveneon-landing-page.md`
- **Getting Started Guide**: `docs/guides/getting-started-guide.md`

---

*Issue created 2026-02-09 from N=2 twin review synthesis*
