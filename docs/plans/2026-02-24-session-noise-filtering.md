# Plan: Filter System-Injected Noise from Session Messages

**Date**: 2026-02-24
**Status**: Complete
**Impact**: Signals extracted reduced 58% (19→8), extract-signals LLM time reduced 59% (138s vs 339s equiv.), SOUL.md quality dramatically improved

---

## Problem

The generated SOUL.md read like a cron-job monitoring chatbot:
- Voice section described a "chatty system‑monitor that knocks on your door with a coffee‑stained note about the house alarm"
- "Relentless bridge" repeated 3 times across sections
- First axiom was self-referential: "You run on a concise, provable framework" with wrong signal counts
- Vibe section was thin and generic

**Root cause**: OpenClaw injects system/cron messages into session `.jsonl` files as `role: "user"` messages. The session reader had no content-level filtering — only role-based filtering (user/assistant). These system messages were being extracted as identity signals, and the assistant's responses to them (cron-relay persona) contaminated the Voice/Vibe sections.

### Noise Analysis

| Session | Total Messages | Noise Messages | Noise % |
|---------|---------------|----------------|---------|
| `bad21235` | 50 | 25 (cron + meta) | 50% |
| `aa3258cb` | 32 | 14 (meta) | 44% |
| `3b9c0ac1` | 87 | 21+ (cron tasks) | 24% |
| `b380c416` | 126 | 22+ (cron tasks) | 17% |

### Two Contamination Vectors

1. **System user messages** — cron triggers, metadata wrappers, and task instructions extracted as identity signals
2. **Assistant responses to system messages** — the cron-relay persona ("Hey! 👋 here's your cron report...") interpreted as the user's desired voice/tone

---

## Analysis: Four Noise Patterns

### Pattern 1: Cron Error/Info (skip entirely)

```
System: [2026-02-23 04:13:37 PST] Cron (error): This operation was aborted
```

Pure platform noise. OpenClaw surfaces cron job results as user messages. Contains no identity information — just timestamps and error snippets.

### Pattern 2: Conversation Metadata Wrapper (strip prefix, keep user text)

```
Conversation info (untrusted metadata):
```json
{"message_id": "abc123", "sender_id": "openclaw-control-ui"}
```
[2026-02-23 04:13:37 PST] What do you think about honesty?
```

Real user text wrapped in channel metadata JSON. The text after the code block is genuine identity-relevant content. Strip the metadata prefix and optional timestamp, keep the actual message.

### Pattern 3: Cron Maintenance Tasks (skip entirely)

```
[cron:3ddea0b6-0c8a-45c1-8e13-51f21462c23c neon-soul-maintenance] Run the neon-agent maintenance task: cd /Users/neonsoul/Desktop/projects/neon-agent && npm run maintenance
```

Automated task instructions injected as user messages. Contains only command-line instructions — no identity content.

### Pattern 4: Session Startup (skip entirely)

```
A new session was started via /new or /reset. Execute your Session Startup sequence now - read the required files before responding to the user.
```

Procedural startup instructions. Not identity expression.

---

## Solution

### Design Decision: Filter in `sessionToMemoryContent()`, NOT `parseSessionFile()`

Filtering in `parseSessionFile()` would break incremental state tracking — the pipeline stores `processedSessions[sessionId].messageCount = session.messages.length` to track which messages have already been processed. Changing the message count would cause the pipeline to miss new messages or re-process old ones.

Filtering at the content-output stage (`sessionToMemoryContent()`) is transparent to state tracking — the parsed messages array stays the same length, but the output content excludes noise.

### Implementation

#### `isSystemMessage(text: string): boolean`

Three regex patterns matching the skip-entirely noise types:

```typescript
const SYSTEM_MESSAGE_PATTERNS: RegExp[] = [
  /^System: \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]{3,4}\] Cron \(/,
  /^\[cron:[a-f0-9-]+ [\w-]+\]/,
  /^A new session was started via \/new or \/reset\./,
];
```

#### `stripConversationMetadata(text: string): string | null`

Extracts real user text from metadata wrappers:
1. Check for `Conversation info (untrusted metadata):` prefix
2. Find and skip past the ` ```json...``` ` code block
3. Strip optional leading timestamp pattern
4. Return extracted text, or null if no extractable content

#### Updated `sessionToMemoryContent()`

Added `skipNextAssistant` flag to track paired assistant responses:

```typescript
let skipNextAssistant = false;

for (const msg of messages) {
  // Skip assistant responses to system messages
  if (msg.role === 'assistant' && skipNextAssistant) {
    skipNextAssistant = false;
    continue;
  }
  skipNextAssistant = false;

  if (msg.role === 'user') {
    if (isSystemMessage(messageText)) {
      skipNextAssistant = true;  // Also skip paired assistant response
      continue;
    }
    // Strip metadata wrapper, keep real text
    const extracted = stripConversationMetadata(messageText);
    if (extracted !== null) messageText = extracted;
    else if (messageText.startsWith(CONVERSATION_META_PREFIX)) {
      skipNextAssistant = true;  // Empty metadata — skip both
      continue;
    }
  }
  // ... normal processing
}
```

---

## Changes

### Files Modified

| File | Change |
|------|--------|
| `src/lib/session-reader.ts` | Added `isSystemMessage()`, `stripConversationMetadata()`, updated `sessionToMemoryContent()` with noise filtering and `skipNextAssistant` flag |
| `tests/unit/session-reader.test.ts` | Added 19 new tests across 3 describe blocks |

### What Did NOT Change

- `parseSessionFile()` — still parses all messages (preserves incremental state tracking)
- `pipeline.ts` — still calls `sessionToMemoryContent()` the same way
- `signal-extractor.ts` — receives cleaner input automatically, no code changes
- `isStructuralNoise()` in `signal-extractor.ts` — separate pre-filter for code/structural noise, unrelated
- `state.ts` / `persistence.ts` — incremental tracking unchanged

---

## Results

### Signal Extraction Comparison (`--reset`)

| Metric | Before (unfiltered) | After (filtered) | Change |
|--------|--------------------|--------------------|--------|
| **Signals extracted** | 19 | 8 | **-58%** |
| **Extract-signals requests** | 34 | 17 | **-50%** |
| **Extract-signals LLM time** | 651.9s | 138.6s | **-79%** |
| **Total LLM requests** | 106 | 67 | **-37%** |
| **Total LLM time** | 1,155.3s | 579.0s | **-50%** |

### SOUL.md Quality Before vs After

| Aspect | Before (with noise) | After (filtered) |
|--------|---------------------|-------------------|
| **Voice** | "chatty system-monitor that knocks on your door with a coffee-stained note about the house alarm" — cron relay persona | Informal, eager personality matching user energy; food/health enthusiasm from real conversations |
| **Repetition** | "relentless bridge" appeared 3 times | Zero repetition of canned phrases |
| **Core Truths** | Self-referential ("You run on a concise, provable framework" with wrong signal counts) | Actionable principles: speak hard truth, admit uncertainty, own mistakes, challenge complacency |
| **Boundaries** | Mixed with cron-monitoring language | Clear personal boundaries: don't pretend to know, don't hide slip-ups, don't smooth over truths |
| **Vibe** | Thin, one generic line | Genuine curiosity: "someone leaning in, quietly saying 'i'm learning who you are'" |
| **Provenance** | 7 axioms, 13 principles, 19 signals (inflated by noise) | 7 axioms, 7 principles, 8 signals (clean) |

### Pipeline Stage Breakdown

| Stage | Requests | LLM Time |
|-------|----------|----------|
| extract-signals | 17 | 138.6s |
| reflective-synthesis | 43 | 360.8s |
| prose-expansion | 6 | 73.7s |
| generate-soul | 1 | 5.9s |
| **Total** | **67** | **579.0s** |

---

## Test Coverage

**455 tests pass** across 28 test files (up from 433 before the classification + filtering changes).

New tests added (19 total):

### `isSystemMessage` (6 tests)
- Matches cron error messages
- Matches cron info messages
- Matches cron maintenance task messages
- Matches session startup messages
- Does NOT match normal user text
- Does NOT match system-like words in normal context

### `stripConversationMetadata` (7 tests)
- Returns null for non-metadata text
- Extracts user text after JSON block
- Strips leading timestamp from extracted text
- Returns null when no text after JSON block
- Returns null when only whitespace after JSON block
- Returns null when no ```json block present
- Returns null when closing ``` is missing

### `sessionToMemoryContent` filtering (6 tests)
- Skips cron messages entirely
- Skips assistant response following a system message
- Skips cron maintenance task messages and their responses
- Skips session startup messages and their responses
- Extracts real text from metadata-wrapped messages
- Skips metadata-wrapped messages with no extractable text
- Handles mixed session with all noise types (comprehensive integration test)
- Preserves normal messages when no noise is present
- Does not false-positive on system-like words in normal messages

---

## Future Considerations

1. **New noise patterns**: If OpenClaw adds new system message types, add a regex to `SYSTEM_MESSAGE_PATTERNS`. The pattern-matching approach is extensible.

2. **Logging filtered messages**: Could add debug-level logging of filtered message counts per session to help diagnose future quality issues.

3. **Configurable filtering**: If a user wants to include startup messages for bootstrapping, a `--include-system-messages` flag could bypass the filter. Not needed now.

4. **Smarter assistant filtering**: The current `skipNextAssistant` flag is a simple heuristic — it assumes one assistant response per system message. If OpenClaw ever sends multiple system messages in a row without assistant responses, the flag correctly handles it (each sets the flag, each assistant skip resets it). If there are multiple assistant responses to one system message (shouldn't happen in practice), only the first would be skipped.
