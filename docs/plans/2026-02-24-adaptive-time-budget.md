# Plan: Adaptive Time Budget for Session Extraction

**Date**: 2026-02-24
**Status**: Complete
**Impact**: Prevents cron timeouts, self-tunes to LLM speed, processed 3/7 sessions in 12 min (vs previous 16+ min timeouts)

---

## Problem

The synthesis pipeline had no limits on session processing. On a first run or `--reset`, it processed ALL session files with no time awareness. With a local Ollama model (gpt-oss:120b, ~9s avg per LLM call), this caused:

- **Frequent cron timeouts**: 5 out of the last 15 runs timed out (600s limit hit)
- **Wasted work**: A 16-minute extraction that gets killed at 10 min produces nothing
- **No prioritization**: Sessions were processed oldest-first, so the most relevant recent conversations were processed last (or not at all if timeout hit)

### Timeout History (from cron run log)

| Run | Duration | Status |
|-----|----------|--------|
| Run at 4:09 PM | 997,990ms (16.6 min) | timeout |
| Run at 4:36 PM | 978,983ms (16.3 min) | timeout |
| Run at 5:22 PM | 979,011ms (16.3 min) | timeout |
| Run at 6:03 PM | 967,520ms (16.1 min) | timeout |
| Run at 7:39 PM | 600,030ms (10.0 min) | timeout |

Each timeout wasted 10-16 minutes of GPU time with zero output.

---

## Solution: Adaptive Budget Equation

Instead of a fixed session count cap, we implemented an equation that estimates downstream LLM cost after each session and stops extraction when the remaining time can't safely cover synthesis + generation.

### The Equation

Before processing each session (after the first), evaluate:

```
canContinue = estimatedWork < remainingTime x safetyFactor

Where:
  estimatedWork   = downstreamCost + nextSessionCost + generationOverhead
  remainingTime   = totalBudget - wallClockElapsed
  safetyFactor    = 0.7 (reserve 30% margin)

  downstreamCost    = signalsExtracted x 2.5 x avgCallDuration
  nextSessionCost   = avgCallsPerSession x avgCallDuration
  generationOverhead = 5 x avgCallDuration

Constants (empirical):
  2.5 calls/signal  = generalize (1) + match (1) + compress (0.5 amortized)
  5 calls overhead  = soul generator (1) + prose expansion (4)
```

### Self-Tuning Properties

- `avgCallDuration` adapts to actual Ollama speed (observed from telemetry)
- `downstreamCost` grows with each new signal, naturally throttling when many signals extracted
- A fast GPU processes more sessions in the same budget; a slow CPU processes fewer
- No manual tuning required

---

## Changes

### 1. Reverse session order: newest-first

**File**: `src/lib/session-reader.ts`

Sessions sorted newest-first so the most identity-relevant conversations are processed first when the budget cuts off.

### 2. Adaptive budget check in pipeline

**File**: `src/lib/pipeline.ts`

Added `timeBudgetMinutes` option (default: 20) to `PipelineOptions`. Before each session in the extraction loop, the budget equation evaluates whether to continue. Per-session logging shows the equation's estimates in real-time.

### 3. CLI flag and env var

**File**: `src/commands/synthesize.ts`

- `--time-budget <minutes>` CLI flag
- `NEON_SOUL_TIME_BUDGET` env var fallback
- Default: 20 minutes (leaves 10 min of the 30-min cron timeout)

### 4. Budget tracking in context

Added `budgetExhausted` and `sessionsSkippedByBudget` to pipeline incremental tracking for downstream reporting.

---

## Test Results

Manual test with `--reset --force` (full re-extraction of all 7 sessions):

```
Budget check [1/7]: 8 signals, 45s elapsed, 1155s remaining
  est. work: 226s (downstream=181s + next=0s + gen=45s) vs budget: 809s  -> CONTINUE

Budget check [2/7]: 8 signals, 48s elapsed, 1152s remaining
  est. work: 205s (downstream=158s + next=8s + gen=39s) vs budget: 807s  -> CONTINUE

Budget check [3/7]: 24 signals, 201s elapsed, 999s remaining
  est. work: 1283s (downstream=1074s + next=119s + gen=89s) vs budget: 699s  -> STOP
```

**Stopped at 3/7 sessions** (newest first). Proceeded to synthesis:

| Metric | Value |
|--------|-------|
| Sessions processed | 3 / 7 |
| Signals extracted | 24 |
| Principles formed | 15 |
| Axioms produced | 10 |
| Total LLM requests | 140 (0 failures, 0 timeouts) |
| Total wall time | ~12 minutes |
| Extract-signals time | 555s (31 requests, 17.9s avg) |
| Reflective-synthesis time | 676s (102 requests, 6.6s avg) |
| Prose expansion time | 60s (6 requests) |

### Budget Equation Accuracy

The equation estimated downstream would take 1074s after session 3. Actual downstream (synthesis + generation) took 742s. The equation was ~45% conservative — better to overestimate than timeout.

### Incremental Runs

On subsequent incremental runs (no `--reset`), only new/changed sessions are processed. With typical 0-2 changed sessions, the budget check is rarely triggered. It primarily protects first runs and resets.

---

## Files Modified

| File | Lines Changed | Description |
|------|--------------|-------------|
| `src/lib/session-reader.ts` | +2/-2 | Reverse sort to newest-first |
| `src/lib/pipeline.ts` | +120/-1 | Budget equation, per-session logging, tracking fields |
| `src/commands/synthesize.ts` | +14 | `--time-budget` flag, env var, wiring |
| `skills/neon-soul/SKILL.md` | +1 | Document new option |
| `tests/unit/session-reader.test.ts` | +3/-3 | Update sort order expectation |

---

## Related

- Cron timeout increased from 600s to 1800s in `~/.openclaw/cron/jobs.json`
- Session noise filtering (2026-02-24-session-noise-filtering.md) reduced signal count per session
- Dead code removal (commit b47efbb) cleaned up ~2,100 lines of unused modules
