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
---

# Plan: Chat-Based Interview Onboarding + Landing Page Demo

## Problem Statement

Two related problems:

1. **Cold Start**: When users run `/neon-soul synthesize` with insufficient memory content (<2000 chars), the skill returns an unhelpful skip message. Users have no clear path to bootstrap their soul.

2. **Concept Clarity**: The landing page doesn't show what NEON-SOUL actually does. "Soul synthesis" is abstract without seeing signals → principles → axioms in action.

**Root cause**: Interview infrastructure exists but isn't connected to the skill flow, and the synthesis process isn't visualized anywhere.

**Solution**:
- Skill asks interview questions via chat when content is insufficient
- Chat responses become memory content with provenance
- Record real synthesis and replay as animated demo on landing page

## Proposed Solution

**Part 1: Chat-Based Interview (Skill Integration)**

When the `/neon-soul synthesize` skill detects insufficient content, it initiates a conversational interview through the chat interface (Telegram, Discord, etc.):
- Asks questions one at a time via chat messages
- User responds naturally in chat
- Responses are collected and written to memory
- Synthesis runs automatically after interview completion

**Part 2: Landing Page Demo**

Record a real interview session through the full pipeline and replay it as an animated "How it works" section:
- Three-column layout: Interview → Signals/Principles → Axioms
- Typewriter animation for Q&A
- Visual flow of signals clustering into principles
- Axiom crystallization with CJK/emoji notation

**Note**: This plan follows the no-code pattern - file paths and acceptance criteria only.

---

## Context

### Why Chat-First?

The original plan proposed CLI readline prompts, but:
- NEON-SOUL runs as an OpenClaw skill via chat (Telegram, Discord, Slack)
- Users interact through chat, not terminal
- Chat history naturally provides session persistence
- No CLI/skill path separation needed

This eliminates:
- Standalone CLI command (was Stage 1)
- Readline complexity
- Session persistence to disk (was Stage 4)
- Architectural duplication between CLI and skill

### Existing Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Interview types | `src/types/interview.ts` | Complete |
| Interview flow | `src/lib/interview.ts` | Complete |
| Question bank | `src/lib/question-bank.ts` | 28 questions, 7 dimensions |
| Synthesize skill | `src/commands/synthesize.ts` | Needs chat interview integration |
| Coverage analysis | `src/lib/interview.ts:analyzeCoverage()` | Complete |

### Question Bank Statistics

- Total questions: 28
- Required questions: 14 (2 per dimension)
- Dimensions covered: 7 (all SoulCraft dimensions)
- Follow-up questions: 8

### User Flow (Chat-Based)

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

**Embedding Model Cold-Start** (addresses Critical #2):
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

**Verification** (per documentation-update workflow):
```bash
# All commands should use skill invocation
grep -r "npx neon-soul" docs/ README.md
# Expected: No results

# Verify interview is documented consistently
grep -r "interview" docs/guides/getting-started-guide.md README.md skill/SKILL.md
```

**Acceptance Criteria**:
- [ ] Getting-started guide explains interview flow with example conversation
- [ ] Skip/restart commands documented
- [ ] Troubleshooting covers embedding download, network issues
- [ ] ARCHITECTURE.md updated with new modules
- [ ] SKILL.md documents conversation modes
- [ ] Verification commands pass (no stale references)

**Commit**: `docs(neon-soul): document chat interview onboarding`

---

### Stage 6: Record Demo Session

**File(s)**: `website/data/demo-session.json`, `src/commands/record-demo.ts`

**Purpose**: Capture real LLM/embedding output for landing page replay

**Changes**:
- Create standalone script to run interview and capture pipeline output
- Run through real pipeline (Ollama or API)
- Capture at each stage:
  - Question text and response
  - Extracted signals (with dimension, confidence)
  - Principles formed (with contributing signals)
  - Axioms emerged (with CJK notation, emoji, provenance)
- Write structured JSON for frontend consumption
- Include timing hints for animation pacing

**Recording Structure**:
```
{
  "version": "1.0",
  "recorded_at": "2026-02-09T...",
  "steps": [
    {
      "type": "question",
      "dimension": "identity-core",
      "text": "What defines you...",
      "delay_ms": 0
    },
    {
      "type": "response",
      "text": "I believe in...",
      "delay_ms": 2000
    },
    {
      "type": "signal",
      "text": "values authenticity",
      "dimension": "identity-core",
      "confidence": 0.87,
      "delay_ms": 500
    },
    {
      "type": "principle",
      "text": "Authenticity over performance",
      "contributing_signals": 2,
      "delay_ms": 1000
    },
    {
      "type": "axiom",
      "notation": { "cjk": "誠", "emoji": "💎", "english": "authenticity" },
      "delay_ms": 1500
    }
  ]
}
```

**Privacy**:
- Use team-authored demo responses that showcase diverse dimensions while representing authentic values
- Responses should feel real without being real user data
- Review recording for PII before commit
- Store recording in version control (public visibility)

**Versioning Strategy**:
- Recording format version in JSON (`"version": "1.0"`)
- Bump version on breaking changes to structure
- Playback code handles version mismatch gracefully:
  - Known older version: Apply migration
  - Unknown version: Fall back to static transcript display
- Document version history in recording file header

**Acceptance Criteria**:
- [ ] Script captures full pipeline output
- [ ] JSON includes all stages (question, response, signal, principle, axiom)
- [ ] Timing hints enable realistic animation pacing
- [ ] Recording is self-contained (no external dependencies for playback)
- [ ] Demo covers at least 3 dimensions with visible axiom emergence
- [ ] Recording reviewed for PII before commit
- [ ] Version field present and documented
- [ ] Playback handles version mismatch with fallback

**Commit**: `feat(neon-soul): add demo recording script`

---

### Stage 7a: Landing Page Static Demo

**File(s)**: `website/index.html`, `website/styles/demo.css`

**Purpose**: Static "How It Works" section showing soul evolution transcript

**Note**: This stage ships with core interview functionality. Stage 7b (animation) is optional Phase 2 work.

**Extends**: Landing page plan (`docs/plans/2026-02-08-liveneon-landing-page.md`) with new "How It Works" section.

**Section Position**: Below fold, after hero section

**Design**:
- Three-column layout: Interview | Signals/Principles | Soul
- Left column: Static Q&A transcript (2-3 exchanges)
- Middle column: Extracted signals grouped by principle
- Right column: Final axioms with CJK notation
- Visual arrows/flow indicators between columns

**Responsive Breakpoints**:
- Desktop (>768px): Three-column layout
- Tablet (768px): Two-column (interview left, results right stacked)
- Mobile (<640px): Single-column vertical flow

**Acceptance Criteria**:
- [ ] Section appears below hero on landing page
- [ ] Three-column layout displays recorded demo data
- [ ] Axioms show full notation (CJK + emoji + English)
- [ ] Renders correctly at 375px width (iPhone SE)
- [ ] Renders correctly at 768px width (tablet)
- [ ] Three-column becomes single-column below 640px
- [ ] Works with `prefers-reduced-motion` (no animation needed)

**Commit**: `feat(website): add static "How it works" demo section`

---

### Stage 7b: Landing Page Animated Demo (Phase 2)

**File(s)**: `website/scripts/demo.js`, `website/styles/demo-animations.css`

**Purpose**: Animated version of Stage 7a with typewriter effects and visual flow

**Complexity Note**: This stage is significantly more complex (CSS animations, accessibility, scroll triggers). Implement only after Stages 0-7a are complete and working.

**Design**:
- Builds on Stage 7a static layout
- Left column: Typewriter effect showing Q&A
- Middle column: Signals appear and cluster into principles
- Right column: Axioms crystallize with CJK notation
- Auto-plays on scroll into view
- Replay button for manual restart

**Animation Sequence**:
1. Question fades in (typewriter)
2. Response types out character by character
3. Signal bubbles emerge from response text
4. Signals float to middle column
5. Related signals cluster → principle forms
6. Principle pulses → axiom crystallizes in right column
7. Repeat for next question (2-3 total for demo)

**Visual Elements**:
- Signal bubbles with dimension color coding
- Connection lines between signals and principles
- Axiom cards with CJK character, emoji, and English
- Progress indicator showing pipeline stages

**Accessibility**:
- Respects `prefers-reduced-motion` (falls back to Stage 7a static)
- Screen reader announces stage transitions
- Pause button for motion control

**Acceptance Criteria**:
- [ ] Animation plays from recorded JSON data
- [ ] Typewriter effect for questions and responses
- [ ] Signals visually flow into principles
- [ ] Reduced motion falls back to static (Stage 7a)
- [ ] Replay button functional
- [ ] Pause/resume controls available

**Commit**: `feat(website): add animated "How it works" demo`

---

## Success Criteria

1. Users can run `/neon-soul synthesize` and get offered interview when content insufficient
2. Interview happens naturally in chat (Telegram, Discord, etc.)
3. Interview responses become permanent memory content with provenance
4. Synthesis runs automatically after interview completion with `--force`
5. Landing page shows animated demo of soul evolution
6. Demo uses curated recorded output (privacy-safe)

## Stages Summary

| Stage | Purpose | Complexity |
|-------|---------|------------|
| 0 | Verify infrastructure | Low |
| 1 | Interview state machine | Medium |
| 2 | Memory file writer | Low |
| 3 | Quick-start question selection | Low |
| 4 | Skill integration | Medium |
| 5 | Documentation | Low |
| 6 | Demo recording script | Medium |
| 7a | Landing page static demo | Low |
| 7b | Landing page animation (Phase 2) | High |

## What Changed from Original Plan

| Original | Now | Why |
|----------|-----|-----|
| Stage 1: Standalone CLI command | Removed | Not needed - skill handles everything |
| Stage 3: CLI readline prompts | Stage 4: Chat messages | Natural for skill-based interaction |
| Stage 4: Disk session persistence | Session context | OpenClaw provides session state |
| CLI/skill path separation | Single path | Only skill path exists |
| Stage 3/4 order | Swapped | Question selection (Stage 3) needed by Skill integration (Stage 4) |
| Stage 7: Single animated stage | 7a/7b split | Static demo ships first, animation as Phase 2 |
| 7 stages | 9 stages (0-7b) | Added state machine, split landing page |

## Related

- Interview types: `src/types/interview.ts`
- Interview flow: `src/lib/interview.ts`
- Question bank: `src/lib/question-bank.ts`
- Synthesize skill: `src/commands/synthesize.ts`
- Getting started: `docs/guides/getting-started-guide.md`
- Landing page: `website/index.html`
- Landing page plan: `docs/plans/2026-02-08-liveneon-landing-page.md`

## Code Review (2026-02-09)

- **Issue**: [`docs/issues/code-review-2026-02-09-interview-cli-plan.md`](../issues/code-review-2026-02-09-interview-cli-plan.md)
- **Codex Review**: [`docs/reviews/2026-02-09-interview-cli-plan-codex.md`](../reviews/2026-02-09-interview-cli-plan-codex.md)
- **Gemini Review**: [`docs/reviews/2026-02-09-interview-cli-plan-gemini.md`](../reviews/2026-02-09-interview-cli-plan-gemini.md)
- **Status**: ✅ Resolved - all issues addressed

### Issues Addressed by Chat-First Approach

| Issue | Resolution |
|-------|------------|
| Critical #5: Interactive prompts break skill path | Eliminated - only chat path exists |
| Critical #6: Stage 4 ambiguity | Replaced with session context (no disk persistence) |
| Important #3: Architectural duplication | Eliminated - single code path |
| Important #8: High-friction UX | Reduced to 7 questions (1 per dimension) |
| Minor #12: Question count mismatch | Clarified: 7 questions for quick-start |

### All Issues Addressed

| Issue | Resolution |
|-------|------------|
| Critical #1: Threshold gating | ✅ Use `--force` after interview (Stage 4) |
| Critical #2: Embedding cold-start | ✅ Progress indicator + error handling (Stage 4) |
| Important #4: Storage format | ✅ Write markdown to `memory/onboarding/` (Stage 2) |
| Important #9: Recording format coupling | ✅ Versioned JSON format (Stage 6) |
| Important #10: PII handling | ✅ Use curated demo data (Stage 6) |
| Minor: Error handling | ✅ Specified in Stage 4 |
| Minor: Stage 7 complexity | ✅ Split into 7a (static) and 7b (animated Phase 2) |

## Twin Review (2026-02-09)

- **Issue**: [`docs/issues/twin-review-2026-02-09-interview-cli-plan.md`](../issues/twin-review-2026-02-09-interview-cli-plan.md)
- **Technical Review**: [`docs/reviews/2026-02-09-interview-plan-twin-technical.md`](../reviews/2026-02-09-interview-plan-twin-technical.md)
- **Creative Review**: [`docs/reviews/2026-02-09-interview-plan-twin-creative.md`](../reviews/2026-02-09-interview-plan-twin-creative.md)
- **Status**: ✅ Resolved - all items addressed

### Twin Review Issues Addressed

| Issue | Resolution |
|-------|------------|
| N=2: Stage 7 scope | ✅ Split into Stage 7a (static) and 7b (animated Phase 2) |
| N=2: Demo recording format | ✅ Versioning strategy + team-authored privacy clarification (Stage 6) |
| Stage dependency | ✅ Reordered: Stage 3 (selection) before Stage 4 (integration) |
| OpenClaw session API | ✅ Documented API in Stage 1 |
| LLM timing | ✅ Clarified: interview offline, embedding at synthesis (Stage 4) |
| Interview pacing | ✅ Added "Got it." acknowledgment in user flow |
| Axiom notation example | ✅ Added disclaimer: notation is illustrative |
| Mobile breakpoints | ✅ Specified: 375px, 768px, 640px threshold (Stage 7a) |
| Partial completion | ✅ Documented 3+ save, <3 discard behavior (Stage 4) |
| Landing page cross-reference | ✅ Added reference to landing page plan in Stage 7a |
