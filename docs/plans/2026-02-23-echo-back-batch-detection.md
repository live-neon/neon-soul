# Echo-Back Batch Detection & Message-Level Session Processing

**Date**: 2026-02-23
**Status**: Implemented & verified
**Project**: neon-soul (soul synthesis pipeline)

---

## Problem

Soul synthesis had two performance bottlenecks in the signal extraction stage:

### 1. Fragile line-number-based batch detection

`detectIdentitySignalsBatch()` sent numbered candidate lines to the LLM and asked it to return comma-separated line numbers of identity signals. LLMs are autoregressive — they hallucinate line numbers, miscount in long sequences, and lose track during selective recall. A prior plan proposed inline Y/N annotation (`1:Y 2:N 3:Y`), but that still requires number tracking and alignment.

### 2. Line-level shredding of conversation sessions

`sessionToMemoryContent()` converted each conversation message into flat markdown (`**User**: <text>`), then `extractSignalsFromContent()` split the entire output by `\n` and processed every individual line as a separate candidate. A single long assistant response could produce hundreds of individual lines — most of which are code, tool output, or task coordination noise. Even with the structural noise pre-filter (`isStructuralNoise`), this generated hundreds of unnecessary LLM calls per session file.

---

## Solution

### Change A: Echo-back batch detection

Instead of asking the LLM to return line numbers or Y/N annotations, send the candidate texts and ask it to **echo back only the valid identity signals**, one per line. If none, return "none".

The returned text IS the signal. No matching back to originals. No line numbers, no indexes, no normalization maps.

**Why this works better than alternatives:**

| Approach | Failure mode |
|----------|-------------|
| Line numbers (`1, 3, 7, 12`) | LLMs hallucinate numbers, miscount, forget earlier lines |
| Y/N annotation (`1:Y 2:N 3:Y`) | Still requires number tracking + alignment validation |
| String matching (echo + match back) | Fragile normalization, fails on minor rephrasing |
| **Echo-back (no matching)** | LLM returns signal text directly. No matching needed. |

### Change B: Message-level session batching

Instead of flattening all messages into line-splittable markdown:

- Each message becomes a single line: `[Human]: <text>` or `[Agent]: <text>`
- Newlines within messages are collapsed to spaces
- Long messages truncated to 500 chars (agent messages especially)
- Both human and agent messages included — the LLM decides what's relevant to the soul
- One candidate per message instead of one per line

A session with 200 messages = ~200 candidates batched 30 at a time = ~7 LLM calls.
Previously: 200 messages could produce 2000+ individual lines = ~70 batch calls.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/signal-extractor.ts` | Rewrote `detectIdentitySignalsBatch()` to echo-back approach. Returns `string[]` instead of `Map<index, {isSignal, confidence}>`. Updated Phase 2-3 in `extractSignalsFromContent()` to create signals directly from returned texts. Removed `SignalDetectionResult` interface and `DEFAULT_CONFIDENCE_THRESHOLD`. |
| `src/lib/session-reader.ts` | Rewrote `sessionToMemoryContent()`. Each message is now `[Human]: <text>` or `[Agent]: <text>` on a single line. Added `MAX_MESSAGE_CHARS` (500) truncation. |
| `tests/mocks/llm-mock.ts` | Updated `generate()` batch handler to parse bare text lines (no `N.` prefix) and return matching lines joined by `\n` instead of CSV numbers. |
| `tests/unit/session-reader.test.ts` | Updated `sessionToMemoryContent` tests for new format: role prefixes, single-line messages, newline collapsing, truncation, empty message skipping. |

---

## Performance Comparison

Synthesis run against the same OpenClaw workspace (`~/.openclaw/workspace/`).

### Request Counts

| Metric | Before (2026-02-22) | After (2026-02-23) | Change |
|--------|---------------------|---------------------|--------|
| Total LLM requests | 438 | 170 | **-61%** |
| Classify requests | 379 | 107 | **-72%** |
| Generate requests | 53 | 63 | +19% (batch detection now uses generate) |
| Failed requests | 0 | 0 | Same |

### Extract-Signals Stage (the bottleneck)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Requests | 379 | 115 | **-70%** |
| Request type | ~379 classify (1 per line) | ~8 generate (batch) + ~107 classify (per signal) | Shifted to batch |

### Output Quality

| Metric | Before | After |
|--------|--------|-------|
| Signals extracted | 24-28 | 20 |
| Principles formed | ~14 | 13 |
| Axioms generated | 6 | 4 |
| Compression ratio | ~4:1 | 5:1 |

Note: Different model used (gpt-oss:120b vs qwen3-coder:480b), so signal count difference reflects both the model change and the message-level batching. Fewer signals is expected — message-level batching filters more aggressively by giving the LLM better context per candidate.

### Model Details

| | Before | After |
|--|--------|-------|
| Model | qwen3-coder:480b (Q5_K_M) | gpt-oss:120b |
| Memory footprint | ~290 GB | ~65 GB |
| Avg request time | ~7s | ~27s (120B is slower per-request but fewer requests) |

---

## Architecture Notes

### Data flow (before)

```
Content → split by \n → individual lines → isStructuralNoise filter
  → batch 30 lines → LLM returns line numbers → match back to candidates
  → filter by confidence → classify each signal (5 calls per signal)
```

### Data flow (after)

```
Content → split by \n → individual lines → isStructuralNoise filter
  → batch 30 lines → LLM returns signal texts directly
  → classify each signal (5 calls per signal)
```

### Session data flow (before)

```
Session messages → **Role**: <full multi-line text> markdown
  → split by \n → hundreds of individual lines → batch detection
```

### Session data flow (after)

```
Session messages → [Human]: <collapsed text> / [Agent]: <collapsed text>
  → one line per message → batch detection
```

### Key design decision: no traceability back to source lines

The old system tried to map signals back to exact line numbers in source files for provenance tracking. The echo-back approach drops this — the LLM's returned text IS the signal. `SignalSource.line` is set to 0 for echo-back signals. This is an intentional tradeoff: traceability to exact source lines was fragile and of limited value compared to having the signal text itself.

---

## Verification

- 390 tests pass (0 failures, 0 new build errors)
- Full synthesis run completed successfully against real workspace
- Generated valid SOUL.md with 4 axioms, 13 principles, 20 signals

---

## Future Considerations

1. **Classification call reduction**: Each confirmed signal still requires 5 classify calls (dimension, type, stance, importance, elicitation). A similar batch approach could reduce these further — e.g., having the LLM return all 5 classifications in a single structured response.

2. **Session incremental processing**: Currently re-processes all session files on each run. State tracking (`state.ts`) could track which sessions/messages have been processed to skip already-seen content.

3. **Batch size tuning**: The default `DETECTION_BATCH_SIZE` of 30 works well for the 120B model. Larger models may handle bigger batches (50-100 candidates) effectively, further reducing round-trips.
