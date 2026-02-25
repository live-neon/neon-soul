# Interview Module Removal

**Date**: 2026-02-25
**Type**: Architecture Decision
**Status**: Implemented

---

## Decision

Removed the interview module (`interview.ts`, `question-bank.ts`, `types/interview.ts`) in favor of passive-only signal extraction.

## Context

The interview module (~1,000+ lines) was designed to:
- Ask users targeted questions when memory content was sparse
- Fill coverage gaps across SoulCraft dimensions
- Bootstrap new users with insufficient conversation history

However, this code was never integrated into the synthesis pipeline.

## Rationale

### Philosophy Alignment

> "Identity emerges from real conversations, not interrogation."

The interview approach conflicted with NEON-SOUL's core philosophy that authentic identity signals come from organic interactions. Structured Q&A produces curated self-presentation rather than behavioral truth.

### Technical Reality

- Interview signals were never connected to the pipeline (dead code)
- The question bank (28 questions across 7 dimensions) added complexity without value
- Passive extraction from sessions + memory provides richer, more authentic data

### Practical Evidence

The 2026-02-25 rewrite demonstrated that:
- Session extraction yields high-quality signals from real Claude Code conversations
- Memory files contain reflections users chose to write (authentic)
- Combined sources provide sufficient signal density for synthesis

## Trade-offs

**Lost capability**: Cannot actively elicit signals for users with sparse coverage.

**Mitigation**:
- Users can manually add reflections to memory files
- Future: could implement organic prompting (not structured interviews)

## Affected Files

Removed:
- `src/lib/interview.ts` - Interview flow engine
- `src/lib/question-bank.ts` - 28 questions across 7 dimensions
- `src/types/interview.ts` - Interview type definitions

Related (now stale):
- `docs/plans/2026-02-09-chat-interview-integration.md` - Plan marked Superseded
- `docs/research/interview-questions.md` - Research for removed feature

## References

- Twin Review finding: TR-4 (`docs/issues/2026-02-25-twin-review-remediation.md`)
- Code Review: Both Codex and Gemini noted the removal as appropriate dead code cleanup
