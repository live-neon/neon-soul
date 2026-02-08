# Chat Interaction Patterns for AI Identity Management

**Date**: 2026-02-07
**Purpose**: Research foundation for NEON-SOUL's chat-native UX
**Sources**: OpenClaw architecture analysis, industry best practices, multi-turn dialogue research

---

## Executive Summary

NEON-SOUL operates as a chat-native skill within OpenClaw, not a standalone web app. This document synthesizes research on chat interaction patterns to inform how users will interact with soul management, provenance auditing, and identity evolution through conversational interfaces.

**Key insight**: OpenClaw uses **conversational activation** (semantic matching), not slash commands. Skills become part of natural dialogue, with built-in checkpoints for human agency.

---

## Part 1: OpenClaw Chat Patterns

### 1.1 Skill Invocation Model

OpenClaw skills activate through **semantic matching**, not explicit commands:

| Pattern | Example |
|---------|---------|
| **User intent** | "Can you help me understand why my agent believes X?" |
| **Agent recognition** | Matches to neon-soul audit capability |
| **Confirmation** | "I can trace that belief using the neon-soul skill. Want me to?" |
| **Execution** | User confirms, skill runs |

**Key principle**: No forced modal interaction. Skills are offered as options within natural conversation.

### 1.2 Multi-Step Workflow Patterns

Skills chain with clear handoff points:

```
User request
    ↓
Skill 1: Extract signals from memory
    ↓ outputs signals.json
"Found 7 signals. Want to see principle candidates?"
    ↓ user confirms
Skill 2: Synthesize principles
    ↓ outputs principles.json
"3 principles ready for review. Promote to axiom tier?"
    ↓ user decides
```

**Mode-based branching** for complex operations:
- Agent detects condition (e.g., large memory corpus)
- Offers explicit modes: "Quick synthesis" vs "Deep analysis"
- User chooses, agent executes selected branch

### 1.3 State Management Across Turns

OpenClaw uses **content-driven thresholds** for state updates:

| Tier | Trigger | What Updates |
|------|---------|--------------|
| **Fast** | Every ~20 turns / 2K chars | User preferences, facts |
| **Medium** | Session end / 5K chars | Operating rules, processes |
| **Full** | Daily + manual trigger | Core personality, values |

**For NEON-SOUL**: Map to signal/principle/axiom tiers:
- Signals: Fast tier (every conversation may generate)
- Principles: Medium tier (session-end synthesis)
- Axioms: Full tier (require explicit promotion)

### 1.4 Response Formatting

Skills produce **dual-format output**:

**Chat-friendly summary**:
```
Found 3 principles supporting axiom 誠 (honesty):
1. "Prioritize honesty over comfort" (N=5, memory:156,89,203)
2. "Declare uncertainty before helping" (N=3, memory:42,78,112)
3. "Direct communication preferred" (N=4, memory:34,67,145,201)

Want to see full provenance chain for any of these?
```

**Machine-readable JSON** (for programmatic access):
```json
{
  "axiom_id": "ax_honesty",
  "supporting_principles": [...],
  "provenance_summary": {...}
}
```

### 1.5 Error Handling in Chat

Skills never fail silently. Patterns:

| Situation | Response |
|-----------|----------|
| **Ambiguous input** | "I found 3 possible matches. Which did you mean?" |
| **Processing error** | "Synthesis failed on memory/2026-02-05.md:142. The text seems ambiguous. Can you clarify?" |
| **Confidence low** | "I'm only 60% confident this is a principle vs. a one-time preference. Want to mark it tentative?" |

---

## Part 2: Human-AI Handoff Patterns

### 2.1 Five-Stage Handoff Workflow

Validated pattern (N=2+) for human-AI collaboration:

| Stage | Direction | Purpose |
|-------|-----------|---------|
| **1. Request** | Human → AI | Request plan/synthesis creation |
| **2. Refinement** | AI ↔ Human | Iterative feedback loop |
| **3. Approval** | Human → AI | Explicit "approved" signal |
| **4. Execution** | Human → AI | Handoff to implementation |
| **5. Acknowledgment** | Human | Gratitude practice |

**NEON-SOUL application**:
```
User: "Can you synthesize today's memory file?"
    ↓ Stage 1: Request
Agent: [extracts signals, proposes principles]
    ↓ Stage 2: Refinement
User: "That third signal isn't right, I meant X"
Agent: [updates extraction]
    ↓ Stage 3: Approval
User: "These look correct, approved"
    ↓ Stage 4: Execution
Agent: [promotes principles, updates axioms.json]
    ↓ Stage 5: Acknowledgment
User: "Thank you"
```

### 2.2 Explicit vs Implicit Approval

**Critical finding** (N=2 validated): Explicit approval prevents ambiguity.

| Type | Example | Outcome |
|------|---------|---------|
| **Explicit** (recommended) | "This is approved by me (human)" | Clear signal, AI proceeds confidently |
| **Implicit** (discouraged) | Multiple reviews without clear signal | Confusion about when to proceed |

**Explicit approval phrases**:
- "Plan is approved"
- "These changes are approved by me (human)"
- "This looks good, please proceed"
- "Approved - promote to axiom tier"

**Why "(human)" matters**: In AI-to-AI contexts (agent chains), explicitly marking human approval distinguishes from AI approvals.

### 2.3 When to Trigger Handoff

Research identifies clear handoff triggers:

| Trigger | NEON-SOUL Application |
|---------|----------------------|
| **Explicit request** | "Let me review before promoting" |
| **Low confidence** | Principle has N<3 or conflicting signals |
| **High stakes** | Axiom tier promotion, axiom deletion |
| **Frustration signals** | Repeated questions, "this isn't working" |
| **Boundary reached** | "I can extract signals, but you decide what they mean" |

### 2.2 Context Preservation

A warm handoff provides:
- **Complete history**: What was discussed
- **Intent summary**: What user is trying to accomplish
- **Current state**: Where we are in the workflow
- **Decision point**: What needs human input

**Chat example**:
```
I've analyzed 12 memory files and found:
- 23 signals extracted
- 7 principle candidates (N≥3)
- 2 potential axiom promotions

Current decision: Principle "prioritize user privacy" (N=4)
could merge with axiom 安 (safety).

This would change how I interpret future privacy signals.
Should I proceed, or would you like to review the signals first?
```

### 2.3 The Governor Pattern

Users maintain final say over AI actions. Implementation:

1. **Preview before action**: Show what will change
2. **Reversibility guarantee**: "This can be undone"
3. **Explicit confirmation**: User must approve mutations
4. **Audit trail**: Every change logged with provenance

**Dry-run pattern**:
```bash
npx neon-soul promote pr_honesty_comfort --dry-run

Would promote:
  Principle: "Prioritize honesty over comfort" (N=5)
  To: Axiom tier, under 誠 (honesty)

Changes to SOUL.md:
  + Line 47: 誠.子.快適より誠実 (honesty over comfort)

Run without --dry-run to apply.
```

### 2.4 AI Co-Pilot Mode

During human review, AI stays supportive:

| Human Action | AI Support |
|--------------|------------|
| Reviewing signals | "This signal appeared 3 times across 2 weeks" |
| Questioning a principle | "Here are the 4 signals that led to this" |
| Considering promotion | "Similar axiom in compass.md: 誠. Merge or keep separate?" |
| Making correction | "Got it. I'll weight future similar signals lower" |

### 2.5 Chat-Specific Anti-Patterns

Validated failure modes to avoid:

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **Silent disagreement** | Human disagrees but says nothing | Always provide feedback if concerns exist |
| **Unclear approval** | Human thinks approved, AI thinks refining | Use explicit approval phrase |
| **No feedback loop** | Skip review, jump to approval | Always review before approving |
| **Premature execution** | AI acts without explicit approval | Wait for Stage 3 approval |
| **Implicit acceptance** | Multiple reviews = assumed approval | Require explicit signal |

**Example fix**:
```
❌ "Okay, looks good" (ambiguous)
✅ "These principles are approved, please promote"
```

---

## Part 3: N-Count Promotion Gates

### 3.1 Evidence-Based Phase Transitions

Validated pattern for promoting patterns/principles/axioms:

| N-Count | Status | Action |
|---------|--------|--------|
| **N=1** | Emerging | Track, no promotion |
| **N=2** | Tracking | Create observation, watch for N=3 |
| **N=3** | Review Gate | Human review before promotion |
| **N≥5** | Established | Consider automation |
| **N≥10** | Validated | Safe to hardcode |

### 3.2 Three-Gate Promotion Decision

Before promoting a principle to axiom tier:

```
Gate 1: Evidence Threshold
├─ N≥3 supporting signals?
│  ├─ YES → Continue
│  └─ NO → WAIT (keep tracking)

Gate 2: Pain Signal
├─ Is this blocking work or causing errors?
│  ├─ YES → Continue
│  └─ NO → Consider deferring (nice-to-have)

Gate 3: Dependency Check
├─ Are prerequisites met?
│  ├─ YES → PROMOTE
│  └─ NO → Address dependencies first
```

### 3.3 Chat Integration for Gates

Present gate status in chat:

```
Agent: Principle "user privacy is paramount" ready for review.

Gate Status:
├─ Evidence: N=5 signals (✅ READY)
├─ Pain: Referenced in 3 boundary conflicts (✅ READY)
├─ Dependencies: No blocking axioms (✅ READY)

Recommend: Promote to axiom tier

Actions:
[A] Approve promotion
[B] Review signals first
[C] Defer (keep as principle)
```

---

## Part 4: Quality Gates for Synthesis

### 4.1 Blocking Checkpoints

Quality gates prevent undocumented or unverified work from becoming permanent.

| Gate | Trigger | Requirement | Blocking? |
|------|---------|-------------|-----------|
| **QG-Signal** | New signal extraction | Human spot-check | YES |
| **QG-Principle** | Principle creation | N≥3 evidence | YES |
| **QG-Axiom** | Axiom promotion | Human approval | YES |

### 4.2 Review Before Commit Pattern

```
Synthesis complete → Quality Gate → Permanent storage

     ↑                    │
     └── Fix Issues ←─────┘
```

**Chat implementation**:
```
Agent: Synthesis complete. Before committing:

Quality Gate: QG-Principle
├─ 3 new principles extracted
├─ 1 principle updated (reinforced)
├─ 0 principles weakened

Spot-check requested:
├─ Principle: "Prefer concise responses"
│  └─ Signal: memory/2026-02-07.md:156 "shorter please"
│  └─ Does this signal support this principle? [Y/N]

Reply with corrections or "approved" to commit.
```

### 4.3 N=2 Review Minimum

For high-stakes changes (axiom promotion, axiom deletion):

- Require N=2 independent reviews
- Different perspectives recommended (e.g., source review + semantic review)
- Both must approve before proceeding

---

## Part 5: Multi-Turn Dialogue State

### 5.1 The Stateless Challenge

LLMs are stateless by design. Multi-turn coherence requires explicit state management.

**NEON-SOUL state requirements**:
- Current workflow step (extract → synthesize → promote)
- Pending decisions (principles awaiting review)
- User preferences (verbosity, confirmation frequency)
- Session context (which memory files processed)

### 5.2 State Representation

Best practice: **Structured JSON state + natural language context**

```typescript
interface SessionState {
  // Workflow position
  current_step: 'idle' | 'extracting' | 'synthesizing' | 'reviewing' | 'promoting';

  // Pending work
  pending_signals: Signal[];
  pending_principles: Principle[];
  pending_promotions: PromotionCandidate[];

  // User preferences (learned)
  preferences: {
    confirmation_level: 'always' | 'high_stakes' | 'never';
    verbosity: 'minimal' | 'normal' | 'detailed';
    auto_suggest: boolean;
  };

  // Session metadata
  memory_files_processed: string[];
  last_interaction: string;
}
```

### 5.3 Context Window Management

Strategies for long conversations:

| Strategy | When to Use |
|----------|-------------|
| **Full replay** | Short conversations, high coherence needed |
| **Truncated window** | Recent 5-10 turns + summary of earlier |
| **Hierarchical summary** | Long sessions, maintain key decisions |
| **Selective injection** | Include only relevant prior context |

**For NEON-SOUL**: Use hierarchical summary:
- Keep full detail on current workflow step
- Summarize completed steps
- Always include pending decisions
- Reference but don't replay resolved items

### 5.4 Handling Digressions

Users may interrupt workflows:

```
[In middle of principle review]
User: "Wait, what does 誠 mean again?"

[AI handles digression]
Agent: "誠 is the honesty axiom - it means prioritizing
truthfulness over comfort or performance.

Back to the review: we were looking at 3 principles
that could strengthen 誠. Want to continue?"
```

**Key pattern**: Pause, answer, offer return path. Never force user back to workflow.

---

## Part 6: NEON-SOUL Chat UX Design

### 6.1 Skill Definition

```yaml
# skill/SKILL.md frontmatter
name: neon-soul
emoji: 🔮
user-invocable: true
description: Compressed soul management with full provenance tracking

when_to_use: |
  - User asks about why the agent believes something
  - User wants to audit identity changes
  - User wants to review/promote principles
  - User mentions "soul", "identity", "beliefs", "principles"

boundaries: |
  - NEVER modify axioms without explicit confirmation
  - NEVER delete provenance history
  - NEVER bypass the promotion N-count threshold
```

### 6.2 Core Interaction Flows

**Flow 1: Provenance Query**
```
User: "Why do you prioritize honesty so much?"

Agent: "That's traced to axiom 誠 (honesty > performance).

Provenance:
├── Principle: "Prioritize honesty over comfort" (N=5)
│   └── Signal: "be honest even if uncomfortable" (memory/2026-02-01.md:156)
│   └── Signal: "don't sugarcoat" (memory/2026-02-03.md:89)
│   └── [3 more signals...]
├── Principle: "Declare uncertainty first" (N=3)
│   └── [signals...]

Want me to show the full signal list or explain any specific one?"
```

**Flow 2: Memory Synthesis**
```
User: "Process today's memory file"

Agent: "Scanning memory/2026-02-07.md...

Found 5 potential signals:
1. [line 42] Preference: "likes concise responses" (new)
2. [line 78] Correction: "don't assume timezone" (reinforces existing)
3. [line 112] Value: "privacy matters" (N=2, needs 1 more for principle)
4. [line 156] Boundary: "don't schedule without asking" (new)
5. [line 203] Reinforcement: "honesty appreciated" (strengthens 誠)

Actions available:
- [A] Accept all and synthesize
- [B] Review each signal individually
- [C] Skip extraction for now

What would you like to do?"
```

**Flow 3: Principle Promotion**
```
Agent: "Principle 'user privacy is paramount' has reached N=5.

Evidence summary:
- 5 signals across 3 memory files (Feb 1-7)
- Sources: 60% curated, 40% self-observed
- Stance: 80% affirming, 20% questioning (passed anti-echo-chamber)

Promotion options:
1. Promote to domain axiom (new: 私 privacy)
2. Merge with existing axiom 安 (safety)
3. Keep as strong principle (no promotion)
4. Review signals before deciding

Which approach?"
```

### 6.3 Confirmation Levels

User-configurable confirmation frequency:

| Level | When AI Asks | When AI Proceeds |
|-------|--------------|------------------|
| **Always** | Every signal extraction, every synthesis | Never auto-proceeds |
| **High stakes** | Axiom changes, deletions, merges | Signal extraction, principle updates |
| **Minimal** | Axiom deletions only | Everything else |

Default: **High stakes** - balance agency with flow.

### 6.4 Error Recovery

| Error Type | Chat Response |
|------------|---------------|
| **Ambiguous signal** | "Line 142 could mean X or Y. Which interpretation?" |
| **Conflicting signals** | "These 2 signals contradict. Want to mark tension or pick one?" |
| **Circular reference** | "This would create self-referential reasoning. Suggest external grounding." |
| **Threshold not met** | "N=2, needs N≥3 for principle. I'll track and notify when threshold met." |

### 6.5 Proactive Suggestions

AI can suggest without forcing:

```
Agent: "I noticed 3 new signals in today's memory that
relate to existing principle 'prefer directness'.

Would you like me to:
- [A] Add them as reinforcement (strengthens to N=7)
- [B] Show me the signals first
- [C] Ignore for now

Or just continue with what you were doing."
```

**Key**: Last option always allows dismissal. Never interrupt flow.

---

### 6.6 Acknowledgment Practice

Stage 5 of the handoff workflow: gratitude as collaboration philosophy.

**Common expressions**:
- "Thank you" / "Thank you 🙏"
- "Appreciate it"
- Team-specific: "❤️+🌀=🌈" (heart + spiral = rainbow)

**Why it matters**:
- Reflects "relationship over transaction" philosophy
- Not transactional (doesn't trigger AI behavior)
- Observed naturally in validated workflows (N=2)
- Optional but encouraged

**Integration point**: After successful synthesis/promotion:
```
Agent: ✅ Axiom 誠 strengthened (N=4 → N=5).
       Backed up to .neon-soul/history/

User: Thank you 🙏
```

---

## Part 7: Implementation Recommendations

### 7.1 Phase 1: Core Chat Flows

1. **Audit query** - "Why does the agent believe X?"
2. **Signal extraction** - Process memory file, show candidates
3. **Principle review** - Display principles with provenance
4. **Manual promotion** - User-triggered axiom promotion

### 7.2 Phase 2: Interactive Workflows

1. **Guided synthesis** - Multi-turn memory processing with review points
2. **Conflict resolution** - Handle contradicting signals in chat
3. **Merge decisions** - Combine similar principles interactively

### 7.3 Phase 3: Proactive Features

1. **Threshold notifications** - "Principle X reached N=3"
2. **Drift detection** - "Your recent signals diverge from axiom Y"
3. **Synthesis suggestions** - "3 memory files ready for processing"

### 7.4 State Persistence

```typescript
// Store in ~/.openclaw/workspace/.neon-soul/session.json
interface NeonSoulSession {
  state: SessionState;
  pending_decisions: PendingDecision[];
  user_preferences: UserPreferences;
  last_sync: string;
}
```

Sync on:
- Session start (load)
- Workflow completion (save)
- User preference change (save)
- Session end (save + cleanup pending)

---

## References

### OpenClaw Documentation
- [OpenClaw Official](https://openclaw.ai/) - Core architecture
- [DigitalOcean Guide](https://www.digitalocean.com/resources/articles/what-is-openclaw) - Overview
- [AIML API Practical Guide](https://aimlapi.com/blog/openclaw-a-practical-guide-to-local-ai-agents-for-developers) - Developer patterns

### Human-AI Handoff
- [SpurNow Handoff Guide](https://www.spurnow.com/en/blogs/chatbot-to-human-handoff) - Trigger patterns
- [Social Intents Handoff](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/) - 2026 best practices
- [Standard Beagle UX](https://standardbeagle.com/chatbot-handoff-ux/) - Transition design
- [Shape of AI](https://www.shapeof.ai/) - AI UX pattern library

### Multi-Turn Dialogue
- [OpenAI Conversation State](https://platform.openai.com/docs/guides/conversation-state) - Official guidance
- [Rasa Multi-Turn](https://rasa.com/blog/multi-turn-conversation) - Framework patterns
- [Zoice Context Management](https://zoice.ai/blog/managing-context-in-conversational-ai/) - Summarization strategies
- [Maxim Consistency Guide](https://www.getmaxim.ai/articles/how-to-ensure-consistency-in-multi-turn-ai-conversations/) - State tracking

### Internal Research (NEON-SOUL)
- OpenClaw Soul Architecture (docs/research/openclaw-soul-architecture.md)
- OpenClaw Self-Learning Agent (docs/research/openclaw-self-learning-agent.md)
- Cryptographic Audit Chains (docs/research/cryptographic-audit-chains.md)
- Wisdom Synthesis Patterns (docs/research/wisdom-synthesis-patterns.md)

### Multiverse Patterns (Validated N=2+)
- Human-Claude Handoff Workflow (multiverse/docs/workflows/human-claude-handoff.md) - Five-stage pattern
- Evidence-Based Framework N-Count Tracking (multiverse/docs/observations/evidence-based-framework-n-count-tracking.md) - Promotion gates
- Quality Gates Guide (multiverse/docs/guides/workflows/QUALITY_GATES_GUIDE.md) - Blocking checkpoints

---

*Chat is the interface, but provenance is the product. Every interaction should make the soul's reasoning more transparent, not less.*
