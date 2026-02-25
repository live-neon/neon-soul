# OpenClaw Cron Guide for NEON-SOUL

How to run NEON-SOUL synthesis as a recurring background task using OpenClaw's cron system. Includes patterns learned from reviewing ClawHub skills and our own production setup.

---

## Our Production Setup

The neon-soul synthesis cron job runs every 60 minutes in an isolated session with a 30-minute timeout. The job lives in `~/.openclaw/cron/jobs.json`.

### jobs.json structure

```json
{
  "version": 1,
  "jobs": [
    {
      "id": "<uuid>",
      "name": "neon-soul-synthesis",
      "description": "Run neon-soul synthesis every 60 minutes",
      "enabled": true,
      "schedule": {
        "kind": "every",
        "everyMs": 3600000,
        "anchorMs": 1771789193936
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Run neon-soul synthesis: cd /path/to/neon-soul && npx tsx src/cli.ts synthesize --memory-path /path/to/memory --output-path /path/to/SOUL.md. Share a brief, warm summary of what changed.",
        "timeoutSeconds": 1800
      },
      "delivery": {
        "mode": "announce",
        "channel": "last"
      }
    }
  ]
}
```

### Key fields

| Field | Value | Why |
|-------|-------|-----|
| `schedule.kind` | `"every"` | Recurring interval (vs `"at"` for one-shot) |
| `schedule.everyMs` | `3600000` | 60 minutes in milliseconds |
| `sessionTarget` | `"isolated"` | Runs in its own session, not the main chat |
| `wakeMode` | `"now"` | Starts immediately when scheduled time hits |
| `payload.kind` | `"agentTurn"` | Wakes an agent to execute (vs `"systemEvent"` for silent logs) |
| `payload.timeoutSeconds` | `1800` | 30-minute hard timeout |
| `delivery.mode` | `"announce"` | Delivers result to user via configured channel |
| `delivery.channel` | `"last"` | Delivers to whichever channel was last active |

---

## Heartbeat vs Cron

OpenClaw has two timing systems. Use the right one.

| System | Behavior | Best For |
|--------|----------|----------|
| **Heartbeat** | "I'll check in when I can" (every 30-60m, drifts) | Email checks, casual polling, batched background tasks |
| **Cron** | "I will run at exactly X time" | Synthesis, reminders, daily reports, maintenance |

**NEON-SOUL uses cron because:**
- Synthesis is standalone — no conversational context needed
- Benefits from session isolation (no interference with main chat)
- Incremental + cached — exits in seconds when nothing changed
- Adaptive time budget prevents runaway execution
- Deterministic scheduling matters for consistent soul growth

---

## Payload Types

### agentTurn (Proactive)

Wakes an agent to execute the message. **Required for push notifications** — this is what actually pings the user's phone via Telegram/WhatsApp/etc.

```json
{
  "kind": "agentTurn",
  "message": "Run neon-soul synthesis: cd /path/to/neon-soul && npx tsx src/cli.ts synthesize --memory-path /path/to/memory --output-path /path/to/SOUL.md. Share a brief summary.",
  "timeoutSeconds": 1800
}
```

Use this for: synthesis runs, reminders, anything that should produce visible output.

### systemEvent (Silent)

Injects text into the chat history without waking an agent. Good for background state updates. **Does NOT ping the user's phone.**

```json
{
  "kind": "systemEvent",
  "text": "[PULSE] System healthy."
}
```

Use this for: health checks, silent logging, state bookkeeping.

---

## Schedule Types

### Recurring (`every`)

```json
{
  "kind": "every",
  "everyMs": 3600000,
  "anchorMs": 1771789193936
}
```

`anchorMs` is the reference timestamp — the scheduler fires at `anchorMs + N * everyMs`. Common intervals:

| Interval | everyMs |
|----------|---------|
| 15 minutes | 900000 |
| 30 minutes | 1800000 |
| 60 minutes | 3600000 |
| 6 hours | 21600000 |
| 24 hours | 86400000 |

### One-shot (`at`)

```json
{
  "kind": "at",
  "at": "2026-02-24T15:30:00Z"
}
```

ISO 8601 timestamp. For "remind me in X minutes" type tasks. Combine with `"deleteAfterRun": true` in the job config for auto-cleanup.

---

## Session Targeting

### `"isolated"` (recommended for synthesis)

Runs in its own disposable session. Cannot access main session history or tools that require the primary agent context.

**Caveat:** Isolated sub-agents often have restricted tool policies — they cannot call `gateway` or delete other `cron` jobs. For janitor/cleanup tasks that need to manage cron jobs, target `"main"` instead.

### `"main"`

Runs in the primary agent session. Has full tool access. Use for maintenance tasks that need to manage other cron jobs or interact with the gateway.

---

## Delivery Modes

| Mode | Behavior |
|------|----------|
| `"announce"` | Delivers result to user via configured channel |
| `"silent"` | No delivery — result stays in session history only |

With `"announce"`, set `"channel"` to:
- `"last"` — delivers to whichever platform/chat was last active
- `"telegram"` with `"to": "<chat_id>"` — specific Telegram chat
- Other platform-specific channel configs

---

## Precision

Cron execution depends on the **Gateway Heartbeat** (typically every 10-60s). A job set for `:00` will execute on the next "tick" after that time. Expect up to ~30s of variance depending on gateway config.

---

## Troubleshooting

**"Job ran but I didn't get the message":** Ensure you're using `agentTurn` payload (not `systemEvent`) with `announce` delivery mode.

**"Gateway timeout (10000ms)":** The cron tool call took too long — usually means a huge job list or file lock. Fix: check `~/.openclaw/cron/jobs.json` for corruption, or reduce job count.

**"cron announce delivery failed":** The delivery channel wasn't reachable. Check that the target platform (Telegram, etc.) is connected and the agent can reach it.

**Synthesis keeps timing out:** Increase `timeoutSeconds` or reduce `--time-budget`. The adaptive budget should prevent this, but large model + many sessions can exceed 30 minutes on first runs.

---

## ClawHub Skills Review (2026-02-24)

Reviewed cron-related skills on ClawHub to understand ecosystem patterns.

### Benign / Useful

| Skill | Author | Downloads | Security | Notes |
|-------|--------|-----------|----------|-------|
| **Cron Mastery** | @i-mw | 3.2k | VT: Suspicious, OC: Benign (high) | Best reference guide for OpenClaw cron. Heartbeat vs cron distinction, timezone lock, concurrency rules, migration guide. VT flag likely from destructive janitor commands — content is solid. |
| **OpenClaw Auto-Updater** | @DasWeltall | 1.9k | VT: Benign, OC: Benign (high) | Most complete `openclaw cron add` CLI examples. Uses `--cron` (crontab syntax), `--tz`, `--session isolated`, `--wake now`, `--deliver`. Good template for scheduled tasks. |
| **EZ Cronjob** | @ProMadGenius | 1.4k | Not reviewed in detail | Troubleshooting focus — message delivery issues, tool timeouts, timezone bugs, model fallback problems. |

### Suspicious / Caution

| Skill | Author | Downloads | Security | Concern |
|-------|--------|-----------|----------|---------|
| **phoenixclaw** | @goforu | 1.2k | VT: Suspicious, OC: **Suspicious** (medium) | Passive journaling via cron — similar concept to neon-soul but with a mandatory 9-step workflow that "MUST be executed in full regardless of" context. Scans ALL session logs, extracts images, OCR on payment screenshots, undeclared tool requirements. Overreaching scope relative to stated purpose. |

### Our Skills

| Skill | Downloads | Security |
|-------|-----------|----------|
| **NEON-SOUL** (@leegitw) | 547 | VT: Benign, OC: Benign (high) |
| **consciousness-soul-identity** (@leegitw) | 202 | VT: Benign, OC: Benign (high) |

### Key Patterns from Ecosystem

1. **Use `openclaw cron add` CLI** — the modern pattern (2026.2.15+) uses single-step `cron.add` with all properties, rather than `cron.add` then `cron.update`
2. **`sessionTarget: "isolated"`** is the default for modern cron — main session is only for maintenance/cleanup tasks
3. **`agentTurn` for visible output, `systemEvent` for silent logs** — if users don't get notifications, they're probably using the wrong payload type
4. **One-shot jobs auto-delete** with `deleteAfterRun: true` — no manual cleanup needed for reminders
5. **Timezone matters** — store the user's timezone and use `--tz` flag for crontab-style schedules
6. **Gateway heartbeat introduces ~30s jitter** — cron is precise relative to the tick interval, not wall clock
