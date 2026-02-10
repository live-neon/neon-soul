---
created: 2026-02-09
updated: 2026-02-09
type: implementation-plan
status: Ready
language: typescript
code_examples: forbidden
review_principles: |
  1. No Code: Do NOT add code examples. Plans describe WHAT/WHY, not HOW.
  2. No Hardcoding: Do NOT add values that depend on implementation.
  3. Suggest Intent: File paths, interfaces, acceptance criteria instead.
  4. Flag, Don't Fix: If plan has code, flag for removal.
trigger: think hard
supersedes: 2026-02-09-interview-cli-integration.md (Part 1)
---

# Plan: Chat-Based Interview Integration

## Problem Statement

When users run `/neon-soul synthesize` with insufficient memory content (<2000 chars), the skill returns an unhelpful skip message. Users have no clear path to bootstrap their soul.

**Root cause**: Interview infrastructure exists (`src/lib/interview.ts`, `src/lib/question-bank.ts`) but isn't connected to the skill flow.

**Solution**: Skill asks interview questions via chat when content is insufficient. Chat responses become memory content with provenance, then synthesis runs automatically.

## Existing Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Interview types | `src/types/interview.ts` | Complete |
| Interview flow | `src/lib/interview.ts` | Complete |
| Question bank | `src/lib/question-bank.ts` | 28 questions, 7 dimensions |
| Synthesize skill | `src/commands/synthesize.ts` | Needs chat interview integration |
| Coverage analysis | `src/lib/interview.ts:analyzeCoverage()` | Complete |

**Question Bank Statistics**:
- Total questions: 28
- Required questions: 14 (2 per dimension)
- Dimensions covered: 7 (all SoulCraft dimensions)
- Follow-up questions: 8

---

## User Flow

```
User: /neon-soul synthesize

Bot: I don't have enough memory content to synthesize your soul yet (1305/2000 chars).
     Would you like to answer a few questions to help me understand you better?

User: yes

Bot: Great! Let's start.

     **Question 1 of 7** (Identity Core)
     What defines you that wouldn't change, even in different circumstances?

User: I value honesty above comfort. I'd rather hear an uncomfortable truth
      than a comfortable lie. I also believe in taking time to think before
      acting - the sacred pause.

Bot: Got it.

     **Question 2 of 7** (Character Traits)
     How do you typically approach problems - methodically, intuitively,
     or collaboratively?

User: Methodically usually. I like to understand the full picture before
      diving in. But I validate with others before committing to a direction.

Bot: Got it.

[...5 more questions with acknowledgments...]

Bot: Thanks for sharing! Writing your responses to memory...
     Running synthesis...

     ✓ 8 signals extracted
     ✓ 3 principles identified
     ✓ 2 axioms emerged
     ✓ SOUL.md updated

     Your soul now includes:
     - 誠 (makoto): Honesty over comfort
     - [CJK]: Methodical approach with validation

(Note: Axiom notation emerges from synthesis; examples above are illustrative.)
```

---

## Stages

### Stage 0: Verify Current State

**Purpose**: Confirm interview infrastructure is functional before integration

**Files to check**:
- `src/lib/interview.ts` - InterviewFlow class exists
- `src/lib/question-bank.ts` - QUESTION_BANK exported
- `src/types/interview.ts` - Types are complete

**Acceptance Criteria**:
- [ ] InterviewFlow class can be instantiated
- [ ] QUESTION_BANK has 28 questions
- [ ] All 7 dimensions have at least 2 questions each

**Commit**: `chore(neon-soul): verify interview infrastructure`

---

### Stage 1: Interview State Machine

**File(s)**: `src/lib/interview-state.ts`

**Purpose**: Manage interview state across chat messages

**Design**:
OpenClaw skills receive one message at a time. We need state to track:
- Whether an interview is in progress
- Which questions have been asked
- Collected responses so far
- Current question index

**State Storage**: OpenClaw provides session context that persists across messages in a conversation. Use this instead of disk persistence.

**OpenClaw Session API**:
- Use `context.session.get(key)` and `context.session.set(key, value)` for state
- Session persists for conversation lifetime (until user starts new conversation)
- Size limit: ~64KB per session (sufficient for interview state)
- Reference: OpenClaw SDK documentation, `@openclaw/sdk` package

**State Structure**:
- `interviewActive`: boolean
- `currentQuestionIndex`: number
- `selectedQuestions`: array of question IDs (7 questions, 1 per dimension)
- `responses`: array of { questionId, responseText, timestamp }

**Acceptance Criteria**:
- [ ] State initializes when interview starts
- [ ] State updates after each response
- [ ] State clears after interview completes or is abandoned
- [ ] State accessible from skill context

**Commit**: `feat(neon-soul): add interview state machine`

---

### Stage 2: Memory File Writer

**File(s)**: `src/lib/interview-writer.ts`

**Purpose**: Write interview responses to memory file with proper frontmatter

**Changes**:
- Create function to convert interview responses to markdown
- Generate proper frontmatter (category, created date, source)
- Group responses by dimension with section headers
- Include question text as context for each response
- Write to `memory/onboarding/interview-{date}.md`

**Output Format**:
```
---
category: onboarding
created: 2026-02-09
source: neon-soul-interview
dimensions_covered: 7
---

# Onboarding Interview

## Identity Core

### What defines you that wouldn't change?
I value honesty above comfort. I'd rather hear an uncomfortable truth than a comfortable lie...

## Character Traits

### How do you typically approach problems?
Methodically usually. I like to understand the full picture before diving in...

[...]
```

**Acceptance Criteria**:
- [ ] Generates valid markdown with YAML frontmatter
- [ ] Groups responses by dimension
- [ ] Includes question text for context
- [ ] Creates parent directories if needed
- [ ] File is immediately readable by signal extractor
- [ ] Total content exceeds 2000 char threshold (7 questions × ~300 chars each)

**Commit**: `feat(neon-soul): add interview response memory writer`

---

### Stage 3: Quick-Start Question Selection

**File(s)**: `src/lib/interview.ts`

**Purpose**: Select optimal 7 questions for quick-start interview

**Note**: This stage must be implemented before Stage 4 (Skill Integration) which uses the selection algorithm.

**Design**:
Full question bank has 28 questions. For cold-start, select 7 (one per dimension):
- Prioritize required questions
- Prefer higher priority scores
- Ensure dimension coverage

**Selection Algorithm**:
1. Group questions by dimension
2. For each dimension, pick the highest-priority required question
3. If no required question exists for a dimension, pick highest-priority optional
4. Result: exactly 7 questions covering all dimensions

**Acceptance Criteria**:
- [ ] Returns exactly 7 questions
- [ ] All 7 dimensions represented
- [ ] Required questions preferred over optional
- [ ] Higher priority preferred within category

**Commit**: `feat(neon-soul): add quick-start question selection`

---

### Stage 4: Skill Integration

**File(s)**: `src/commands/synthesize.ts`, `src/skills/neon-soul.ts`

**Purpose**: Handle interview flow within the skill's message handler

**Dependency**: Uses question selection algorithm from Stage 3.

**Flow**:
1. User sends `/neon-soul synthesize`
2. Skill checks content threshold
3. If below threshold AND no interview in progress:
   - Ask "Would you like to answer a few questions?"
   - Set state to awaiting confirmation
4. If user confirms:
   - Select 7 questions using Stage 3 algorithm
   - Send first question
   - Set state to interview in progress
5. For each subsequent message while interview active:
   - Store response for current question
   - If more questions remain: send next question
   - If all questions answered: write to memory, run synthesis with `--force`
6. Return synthesis results

**Conversation Modes**:
- `awaiting_interview_confirmation` - Asked if user wants interview
- `interview_in_progress` - Collecting responses
- `normal` - Regular skill operation

**Embedding Model Cold-Start**:
- First synthesis after install downloads embedding model (~90MB)
- Show progress message: "Initializing embedding model (first run only)..."
- Model is cached after first download
- Subsequent runs are fast (<1s)

**LLM Timing Clarification**:
- Interview phase: Collects responses only (no LLM/embedding calls)
- Memory write phase: Writes markdown to disk (no LLM)
- Synthesis phase: Signal extraction and embedding happen here (LLM required)
- This means interview flow works offline; only synthesis requires model access

**Partial Interview Completion**:
- If user types "skip" or "done" during interview:
  - **3+ questions answered**: Offer to save partial responses with note "(partial interview)"
  - **<3 questions answered**: Discard responses (insufficient for meaningful synthesis)
  - Show clear message explaining outcome to user

**Error Handling**:
- **User abandons mid-interview**: State cleared, partial responses discarded, user informed
- **Network timeout during synthesis**: Retry once, then show error with "try again" suggestion
- **Memory write failure**: Show error, keep responses in state for retry
- **Embedding model download fails**: Clear error message with manual retry instructions

**Acceptance Criteria**:
- [ ] Skill detects low content and offers interview
- [ ] "yes/no" response handled for confirmation
- [ ] Questions sent one at a time with progress indicator
- [ ] Responses collected in session state
- [ ] "skip" or "done" ends interview early with appropriate handling
- [ ] Partial completion (3+ answers) offers save option
- [ ] Memory written after last question
- [ ] Synthesis runs with `--force` after interview
- [ ] Results displayed to user
- [ ] Progress indicator shown during embedding model initialization
- [ ] Graceful error handling for common failure modes

**Commit**: `feat(neon-soul): integrate chat interview into synthesize skill`

---

### Stage 5: Documentation

**File(s)**:
- `docs/guides/getting-started-guide.md` - Primary user guide
- `README.md` - Project overview
- `skill/SKILL.md` - Skill manifest
- `docs/ARCHITECTURE.md` - System reference (new modules)

**Purpose**: Document interview flow for new users and update system reference

**Reference**: Follow `docs/workflows/documentation-update.md` for consistency checks

**Changes**:

1. **Getting Started Guide** (`docs/guides/getting-started-guide.md`):
   - Add "First Run: Bootstrapping Your Soul" section
   - Example chat conversation showing interview flow
   - How to skip or restart interview ("skip", "done" commands)
   - What happens to interview responses (saved to `memory/onboarding/`)
   - Troubleshooting: embedding model download, network issues

2. **README.md**:
   - Update "Getting Started" section with interview mention
   - Add interview to "Current Status" if not already production-ready
   - Verify all `/neon-soul` commands are consistent

3. **SKILL.md**:
   - Document interview conversation modes
   - Document session state structure
   - Add interview-related skill commands/options

4. **ARCHITECTURE.md**:
   - Add `interview-state.ts` to module diagram
   - Add `interview-writer.ts` to module diagram
   - Document interview flow in data flow section

**Acceptance Criteria**:
- [ ] Getting-started guide explains interview flow with example conversation
- [ ] Skip/restart commands documented
- [ ] Troubleshooting covers embedding download, network issues
- [ ] ARCHITECTURE.md updated with new modules
- [ ] SKILL.md documents conversation modes

**Commit**: `docs(neon-soul): document chat interview onboarding`

---

## Success Criteria

1. Users can run `/neon-soul synthesize` and get offered interview when content insufficient
2. Interview happens naturally in chat (Telegram, Discord, etc.)
3. Interview responses become permanent memory content with provenance
4. Synthesis runs automatically after interview completion with `--force`

## Stages Summary

| Stage | Purpose | Complexity |
|-------|---------|------------|
| 0 | Verify infrastructure | Low |
| 1 | Interview state machine | Medium |
| 2 | Memory file writer | Low |
| 3 | Quick-start question selection | Low |
| 4 | Skill integration | Medium |
| 5 | Documentation | Low |

## Related

- Interview types: `src/types/interview.ts`
- Interview flow: `src/lib/interview.ts`
- Question bank: `src/lib/question-bank.ts`
- Synthesize skill: `src/commands/synthesize.ts`
- Getting started: `docs/guides/getting-started-guide.md`
- **Landing page demo plan**: `docs/plans/2026-02-09-landing-page-demo.md`
- **Original combined plan**: `docs/plans/2026-02-09-interview-cli-integration.md` (superseded)
