/**
 * LLM Telemetry Wrapper
 *
 * Wraps an LLMProvider to track every request with:
 * - Request count per operation type (classify/generate)
 * - Duration of each request (ms)
 * - Per-stage breakdown (caller provides stage context)
 * - Success/failure/timeout tracking
 * - Summary statistics for optimization
 *
 * Usage:
 *   const telemetry = new LLMTelemetry(llm);
 *   telemetry.setStage('extract-signals');
 *   const result = await telemetry.classify(prompt, options);
 *   console.log(telemetry.getSummary());
 *
 * Environment:
 *   NEON_SOUL_LLM_TELEMETRY=1  Enable detailed per-request logging to stderr
 */

import type {
  LLMProvider,
  ClassifyOptions,
  ClassificationResult,
  GenerationResult,
} from '../types/llm.js';

/**
 * Single LLM request record.
 */
export interface LLMRequestRecord {
  /** Request sequence number */
  seq: number;
  /** Operation type */
  type: 'classify' | 'generate';
  /** Pipeline stage when request was made */
  stage: string;
  /** Request start time (epoch ms) */
  startMs: number;
  /** Request duration (ms) */
  durationMs: number;
  /** Whether the request succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Whether it timed out */
  timedOut?: boolean;
  /** Classification category result (for classify ops) */
  category?: string | null;
  /** Prompt length (chars) */
  promptChars: number;
  /** Caller label (e.g., "classifyDimension", "isIdentitySignal") */
  caller?: string;
}

/**
 * Per-stage statistics.
 */
export interface StageStats {
  /** Stage name */
  stage: string;
  /** Total requests in this stage */
  requestCount: number;
  /** Successful requests */
  successCount: number;
  /** Failed requests */
  failCount: number;
  /** Timed-out requests */
  timeoutCount: number;
  /** Total duration of all requests (ms) */
  totalDurationMs: number;
  /** Average request duration (ms) */
  avgDurationMs: number;
  /** Max request duration (ms) */
  maxDurationMs: number;
  /** Min request duration (ms) */
  minDurationMs: number;
}

/**
 * Full telemetry summary.
 */
export interface TelemetrySummary {
  /** Total requests across all stages */
  totalRequests: number;
  /** Total classify requests */
  classifyRequests: number;
  /** Total generate requests */
  generateRequests: number;
  /** Total successful */
  successCount: number;
  /** Total failed */
  failCount: number;
  /** Total timed out */
  timeoutCount: number;
  /** Total wall-clock time for all LLM requests (ms) */
  totalLLMTimeMs: number;
  /** Average request duration (ms) */
  avgDurationMs: number;
  /** Slowest request duration (ms) */
  maxDurationMs: number;
  /** Fastest request duration (ms) */
  minDurationMs: number;
  /** Model identifier */
  model: string;
  /** Per-stage breakdown */
  stages: StageStats[];
  /** All individual request records (for detailed analysis) */
  requests: LLMRequestRecord[];
}

/**
 * LLM Telemetry wrapper.
 *
 * Implements LLMProvider by delegating to a wrapped provider
 * while recording timing and status for every request.
 */
export class LLMTelemetry implements LLMProvider {
  private readonly inner: LLMProvider;
  private readonly records: LLMRequestRecord[] = [];
  private currentStage = 'unknown';
  private seq = 0;
  private readonly verbose: boolean;

  constructor(inner: LLMProvider, options?: { verbose?: boolean }) {
    this.inner = inner;
    this.verbose = options?.verbose ?? (process.env['NEON_SOUL_LLM_TELEMETRY'] === '1');
  }

  /**
   * Set the current pipeline stage for request attribution.
   */
  setStage(stage: string): void {
    this.currentStage = stage;
  }

  /**
   * Get model identifier (delegates to inner).
   */
  getModelId(): string {
    return this.inner.getModelId?.() ?? 'unknown';
  }

  /**
   * Classify with telemetry tracking.
   */
  async classify<T extends string>(
    prompt: string,
    options: ClassifyOptions<T>
  ): Promise<ClassificationResult<T>> {
    const record = this.startRecord('classify', prompt.length);

    try {
      const result = await this.inner.classify(prompt, options);
      this.endRecord(record, true, { category: result.category !== null ? result.category : null });
      return result;
    } catch (error) {
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      this.endRecord(record, false, {
        error: error instanceof Error ? error.message : String(error),
        timedOut: isTimeout,
      });
      throw error;
    }
  }

  /**
   * Generate with telemetry tracking.
   */
  async generate(prompt: string): Promise<GenerationResult> {
    const record = this.startRecord('generate', prompt.length);

    try {
      const result = await this.inner.generate(prompt);
      this.endRecord(record, true);
      return result;
    } catch (error) {
      const isTimeout = error instanceof Error && error.message.includes('timed out');
      this.endRecord(record, false, {
        error: error instanceof Error ? error.message : String(error),
        timedOut: isTimeout,
      });
      throw error;
    }
  }

  /**
   * Start a request record.
   */
  private startRecord(type: 'classify' | 'generate', promptChars: number): LLMRequestRecord {
    this.seq++;
    const record: LLMRequestRecord = {
      seq: this.seq,
      type,
      stage: this.currentStage,
      startMs: Date.now(),
      durationMs: 0,
      success: false,
      promptChars,
    };
    return record;
  }

  /**
   * End a request record and store it.
   */
  private endRecord(
    record: LLMRequestRecord,
    success: boolean,
    extra?: Partial<LLMRequestRecord>
  ): void {
    record.durationMs = Date.now() - record.startMs;
    record.success = success;
    if (extra) Object.assign(record, extra);
    this.records.push(record);

    if (this.verbose) {
      const status = success ? 'OK' : record.timedOut ? 'TIMEOUT' : 'FAIL';
      const cat = record.category !== undefined ? ` → ${record.category}` : '';
      const dur = (record.durationMs / 1000).toFixed(1);
      process.stderr.write(
        `[llm-telemetry] #${record.seq} ${record.type} [${record.stage}] ${dur}s ${status}${cat}\n`
      );
    }
  }

  /**
   * Get all recorded requests.
   */
  getRecords(): readonly LLMRequestRecord[] {
    return this.records;
  }

  /**
   * Get per-stage statistics.
   */
  getStageStats(): StageStats[] {
    const stageMap = new Map<string, LLMRequestRecord[]>();

    for (const record of this.records) {
      const existing = stageMap.get(record.stage) ?? [];
      existing.push(record);
      stageMap.set(record.stage, existing);
    }

    const stats: StageStats[] = [];
    for (const [stage, records] of stageMap) {
      const durations = records.map(r => r.durationMs);
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      stats.push({
        stage,
        requestCount: records.length,
        successCount: records.filter(r => r.success).length,
        failCount: records.filter(r => !r.success).length,
        timeoutCount: records.filter(r => r.timedOut).length,
        totalDurationMs: totalDuration,
        avgDurationMs: records.length > 0 ? Math.round(totalDuration / records.length) : 0,
        maxDurationMs: Math.max(...durations, 0),
        minDurationMs: records.length > 0 ? Math.min(...durations) : 0,
      });
    }

    return stats;
  }

  /**
   * Get full telemetry summary.
   */
  getSummary(): TelemetrySummary {
    const durations = this.records.map(r => r.durationMs);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    return {
      totalRequests: this.records.length,
      classifyRequests: this.records.filter(r => r.type === 'classify').length,
      generateRequests: this.records.filter(r => r.type === 'generate').length,
      successCount: this.records.filter(r => r.success).length,
      failCount: this.records.filter(r => !r.success).length,
      timeoutCount: this.records.filter(r => r.timedOut).length,
      totalLLMTimeMs: totalDuration,
      avgDurationMs: this.records.length > 0 ? Math.round(totalDuration / this.records.length) : 0,
      maxDurationMs: Math.max(...durations, 0),
      minDurationMs: this.records.length > 0 ? Math.min(...durations) : 0,
      model: this.getModelId(),
      stages: this.getStageStats(),
      requests: [...this.records],
    };
  }

  /**
   * Format summary as human-readable report.
   */
  formatReport(): string {
    const summary = this.getSummary();
    const lines: string[] = [];

    lines.push('');
    lines.push('═══════════════════════════════════════════');
    lines.push('  LLM TELEMETRY REPORT');
    lines.push('═══════════════════════════════════════════');
    lines.push(`  Model: ${summary.model}`);
    lines.push(`  Total requests: ${summary.totalRequests} (${summary.classifyRequests} classify, ${summary.generateRequests} generate)`);
    lines.push(`  Success: ${summary.successCount}  Failed: ${summary.failCount}  Timeout: ${summary.timeoutCount}`);
    lines.push(`  Total LLM time: ${(summary.totalLLMTimeMs / 1000).toFixed(1)}s`);
    lines.push(`  Avg/request: ${(summary.avgDurationMs / 1000).toFixed(1)}s  Max: ${(summary.maxDurationMs / 1000).toFixed(1)}s  Min: ${(summary.minDurationMs / 1000).toFixed(1)}s`);
    lines.push('');
    lines.push('  ── Per-Stage Breakdown ──');

    for (const stage of summary.stages) {
      lines.push(`  [${stage.stage}]`);
      lines.push(`    Requests: ${stage.requestCount}  (ok: ${stage.successCount}, fail: ${stage.failCount}, timeout: ${stage.timeoutCount})`);
      lines.push(`    Time: ${(stage.totalDurationMs / 1000).toFixed(1)}s total, ${(stage.avgDurationMs / 1000).toFixed(1)}s avg, ${(stage.maxDurationMs / 1000).toFixed(1)}s max`);
    }

    // Show slowest 5 requests
    const slowest = [...this.records]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5);
    if (slowest.length > 0) {
      lines.push('');
      lines.push('  ── Slowest Requests ──');
      for (const r of slowest) {
        const status = r.success ? 'OK' : r.timedOut ? 'TIMEOUT' : 'FAIL';
        lines.push(`    #${r.seq} ${r.type} [${r.stage}] ${(r.durationMs / 1000).toFixed(1)}s ${status} (${r.promptChars} chars)`);
      }
    }

    lines.push('═══════════════════════════════════════════');
    lines.push('');

    return lines.join('\n');
  }
}
