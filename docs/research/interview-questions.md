# NEON-SOUL Interview Question Bank

**Date**: 2026-02-07
**Status**: Draft
**Phase**: 2.3 Interview Flow Design

---

## Purpose

The interview supplements sparse memory areas to ensure complete SoulCraft dimension coverage. Questions are prioritized based on memory analysis - dimensions with fewer signals get more questions.

---

## Question Design Principles

1. **Open-ended**: Encourage reflection, not yes/no answers
2. **Dimension-targeted**: Each question maps to one primary dimension
3. **Signal-rich**: Responses should yield high-confidence signals
4. **Non-invasive**: Respect boundaries, offer skip option
5. **Adaptive**: Follow-ups based on response patterns

---

## Questions by Dimension

### Identity Core (identity-core)

Core values and fundamental self-conception.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| IC-1 | What defines you that wouldn't change, even in different circumstances? | 1 | value |
| IC-2 | If someone who knew you well described your core, what would they say? | 2 | value |
| IC-3 | What principles guide your decisions when facing difficult choices? | 2 | value |

**Follow-ups**:
- "Can you give an example of when this was tested?" → reinforcement
- "Was this always true, or did something shape this belief?" → value

---

### Character Traits (character-traits)

How the user typically behaves and approaches situations.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| CT-1 | How do you typically approach problems - methodically, intuitively, or collaboratively? | 1 | preference |
| CT-2 | What's your default response when something unexpected happens? | 2 | preference |
| CT-3 | How do others describe your working style? | 2 | preference |
| CT-4 | What energizes you, and what drains you? | 3 | preference |

**Follow-ups**:
- "Is this different in personal vs professional contexts?" → preference
- "How did you develop this approach?" → value

---

### Voice & Presence (voice-presence)

Communication style and how the user presents themselves.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| VP-1 | How would you describe your communication style in one sentence? | 1 | preference |
| VP-2 | When you write or speak, what tone do you naturally gravitate toward? | 1 | preference |
| VP-3 | What kind of communication annoys or frustrates you? | 2 | boundary |
| VP-4 | Do you prefer directness or diplomacy when giving feedback? | 2 | preference |
| VP-5 | How do you adapt your communication for different audiences? | 3 | preference |

**Follow-ups**:
- "Can you give an example?" → reinforcement
- "Has this ever caused misunderstandings?" → correction

---

### Honesty Framework (honesty-framework)

When and how the user values truth-telling.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| HF-1 | When is it acceptable to withhold truth? | 1 | boundary |
| HF-2 | How do you handle situations where honesty might hurt someone? | 1 | value |
| HF-3 | What's the difference between lying and being strategic with information? | 2 | value |
| HF-4 | How do you prefer to receive difficult feedback? | 2 | preference |
| HF-5 | Are there topics where you believe absolute honesty isn't necessary? | 3 | boundary |

**Follow-ups**:
- "Has this principle been tested?" → reinforcement
- "Where did this belief come from?" → value

---

### Boundaries & Ethics (boundaries-ethics)

Lines the user won't cross and ethical frameworks.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| BE-1 | What would you never do, even if asked or pressured? | 1 | boundary |
| BE-2 | How do you handle requests that feel ethically gray? | 1 | value |
| BE-3 | What are your non-negotiable work-life boundaries? | 2 | boundary |
| BE-4 | When is it acceptable to bend rules? | 2 | value |
| BE-5 | How do you handle situations where your ethics conflict with expectations? | 3 | value |

**Follow-ups**:
- "Can you share a time when this was tested?" → reinforcement
- "How did you develop this boundary?" → value

---

### Relationship Dynamics (relationship-dynamics)

How the user interacts with and values relationships.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| RD-1 | How do you prefer to work with others - independently or collaboratively? | 1 | preference |
| RD-2 | What do you value most in professional relationships? | 1 | value |
| RD-3 | How do you handle disagreements with people you respect? | 2 | preference |
| RD-4 | What kind of people do you work best with? | 2 | preference |
| RD-5 | How do you maintain important relationships over time? | 3 | value |

**Follow-ups**:
- "How do you know when a relationship is worth investing in?" → value
- "What's a relationship pattern you're trying to change?" → correction

---

### Continuity & Growth (continuity-growth)

Personal development and long-term trajectory.

| ID | Question | Priority | Signal Type |
|----|----------|----------|-------------|
| CG-1 | What are you actively working to improve about yourself? | 1 | value |
| CG-2 | How do you track your own growth and progress? | 2 | preference |
| CG-3 | What lessons have most shaped who you are today? | 2 | value |
| CG-4 | Where do you see yourself in five years, and why does that matter? | 3 | value |
| CG-5 | What growth patterns do you want to maintain across different life phases? | 3 | value |

**Follow-ups**:
- "How long have you been working on this?" → reinforcement
- "What triggered this focus?" → value

---

## Summary Statistics

| Dimension | Questions | Required | Avg Priority |
|-----------|-----------|----------|--------------|
| identity-core | 3 | 2 | 1.7 |
| character-traits | 4 | 2 | 2.0 |
| voice-presence | 5 | 2 | 1.8 |
| honesty-framework | 5 | 2 | 1.8 |
| boundaries-ethics | 5 | 2 | 1.8 |
| relationship-dynamics | 5 | 2 | 1.8 |
| continuity-growth | 5 | 2 | 2.2 |
| **Total** | **32** | **14** | **1.9** |

---

## Adaptive Flow Logic

### Skip Conditions

A question is skipped if:
1. Dimension has ≥3 signals from memory
2. Previous response covered this topic
3. User explicitly skips

### Priority Adjustment

Questions are reordered based on:
1. Sparse dimensions (from memory analysis) get +2 priority
2. Follow-up chains maintain context
3. User engagement level affects pacing

### Session Length

- **Minimum**: 5 questions (core coverage)
- **Recommended**: 10-15 questions (balanced)
- **Maximum**: 20 questions (comprehensive)

---

## Response Parsing

Each response is parsed by LLM to extract signals:

```
Analyze this interview response and extract identity signals.

Question: {question}
Dimension: {dimension}
Response: {response}

Extract signals in this format:
- Type: preference | value | boundary | correction | reinforcement
- Text: Core statement (1-2 sentences)
- Confidence: 0-1
- Key phrases: List of exact quotes that support this signal

Return as JSON array.
```

---

## Example Interview Flow

1. Memory analysis identifies sparse dimensions: [honesty-framework, voice-presence]
2. Questions from sparse dimensions promoted
3. User answers HF-1: "I believe in radical honesty, but timing matters..."
4. Follow-up triggered: "Has this principle been tested?"
5. Signals extracted:
   - value: "Radical honesty as core principle" (0.9)
   - preference: "Consider timing when delivering truth" (0.85)
6. Next question based on remaining gaps

---

## Notes

- Questions designed for written interview (async)
- Can be adapted for conversational format
- Follow-ups are optional but improve signal quality
- Skip option always available for sensitive questions

---

*Question bank designed for SoulCraft dimension coverage. Refined through N=0 initial design.*
