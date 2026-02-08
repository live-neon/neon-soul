/**
 * Audit Trail
 *
 * Generates comprehensive audit trails for soul synthesis operations.
 * Every axiom traces back to source signals with full provenance.
 *
 * Usage:
 *   const logger = createAuditLogger('output/audit.jsonl');
 *   logger.logSignalExtracted(signal);
 *   logger.logAxiomPromoted(axiom, principles);
 *
 * Output format: JSONL (one JSON object per line)
 */

import { appendFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { Signal } from '../types/signal.js';
import type { Principle } from '../types/principle.js';
import type { Axiom } from '../types/axiom.js';
import type { ProvenanceChain } from '../types/provenance.js';

/**
 * Audit entry types.
 */
export type AuditAction =
  | 'signal_extracted'
  | 'principle_created'
  | 'principle_reinforced'
  | 'axiom_promoted'
  | 'soul_generated'
  | 'iteration_complete'
  | 'attractor_detected'
  | 'backup_created'
  | 'pipeline_started'
  | 'pipeline_completed'
  | 'pipeline_failed';

/**
 * Single audit log entry.
 */
export interface AuditEntry {
  /** Unique entry ID */
  id: string;
  /** Entry timestamp */
  timestamp: string;
  /** Action type */
  action: AuditAction;
  /** Subject ID (signal, principle, or axiom ID) */
  subject: string;
  /** Action details */
  details: Record<string, unknown>;
  /** Provenance chain (for traceable actions) */
  provenance: Partial<ProvenanceChain> | undefined;
}

/**
 * Audit session metadata.
 */
export interface AuditSession {
  /** Session ID */
  sessionId: string;
  /** Start timestamp */
  startedAt: string;
  /** End timestamp */
  endedAt?: string;
  /** Pipeline options */
  options: Record<string, unknown>;
  /** Entry count */
  entryCount: number;
  /** Action counts */
  actionCounts: Record<AuditAction, number>;
}

/**
 * Audit logger instance.
 */
export interface AuditLogger {
  /** Log signal extraction */
  logSignalExtracted: (signal: Signal) => Promise<void>;
  /** Log principle creation */
  logPrincipleCreated: (principle: Principle) => Promise<void>;
  /** Log principle reinforcement */
  logPrincipleReinforced: (principle: Principle, signal: Signal) => Promise<void>;
  /** Log axiom promotion */
  logAxiomPromoted: (axiom: Axiom, principles: Principle[]) => Promise<void>;
  /** Log soul generation */
  logSoulGenerated: (tokenCount: number, axiomCount: number) => Promise<void>;
  /** Log iteration complete */
  logIterationComplete: (iteration: number, metrics: Record<string, number>) => Promise<void>;
  /** Log attractor detected */
  logAttractorDetected: (iteration: number, strength: number) => Promise<void>;
  /** Log backup created */
  logBackupCreated: (backupPath: string) => Promise<void>;
  /** Log pipeline start */
  logPipelineStarted: (options: Record<string, unknown>) => Promise<void>;
  /** Log pipeline complete */
  logPipelineCompleted: (metrics: Record<string, unknown>) => Promise<void>;
  /** Log pipeline failure */
  logPipelineFailed: (error: string) => Promise<void>;
  /** Get session metadata */
  getSession: () => AuditSession;
  /** Close logger */
  close: () => Promise<void>;
}

/**
 * Create audit logger.
 */
export function createAuditLogger(outputPath: string): AuditLogger {
  const sessionId = generateId();
  const startedAt = new Date().toISOString();
  let entryCount = 0;
  const actionCounts: Record<AuditAction, number> = {
    signal_extracted: 0,
    principle_created: 0,
    principle_reinforced: 0,
    axiom_promoted: 0,
    soul_generated: 0,
    iteration_complete: 0,
    attractor_detected: 0,
    backup_created: 0,
    pipeline_started: 0,
    pipeline_completed: 0,
    pipeline_failed: 0,
  };
  let sessionOptions: Record<string, unknown> = {};

  async function log(entry: AuditEntry): Promise<void> {
    // Ensure directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Append entry as JSONL
    const line = JSON.stringify(entry) + '\n';
    await appendFile(outputPath, line);

    entryCount++;
    actionCounts[entry.action]++;
  }

  function createEntry(
    action: AuditAction,
    subject: string,
    details: Record<string, unknown>,
    provenance?: Partial<ProvenanceChain>
  ): AuditEntry {
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      subject,
      details,
      provenance,
    };
  }

  return {
    async logSignalExtracted(signal: Signal): Promise<void> {
      await log(
        createEntry('signal_extracted', signal.id, {
          type: signal.type,
          text: signal.text.slice(0, 100),
          confidence: signal.confidence,
          dimension: signal.dimension,
          source: signal.source.file,
        })
      );
    },

    async logPrincipleCreated(principle: Principle): Promise<void> {
      await log(
        createEntry('principle_created', principle.id, {
          text: principle.text.slice(0, 100),
          dimension: principle.dimension,
          n_count: principle.n_count,
          signalCount: principle.derived_from.signals.length,
        })
      );
    },

    async logPrincipleReinforced(principle: Principle, signal: Signal): Promise<void> {
      await log(
        createEntry('principle_reinforced', principle.id, {
          text: principle.text.slice(0, 100),
          newNCount: principle.n_count,
          reinforcingSignal: signal.id,
        })
      );
    },

    async logAxiomPromoted(axiom: Axiom, principles: Principle[]): Promise<void> {
      await log(
        createEntry(
          'axiom_promoted',
          axiom.id,
          {
            text: axiom.text.slice(0, 100),
            tier: axiom.tier,
            dimension: axiom.dimension,
            principleCount: principles.length,
          },
          {
            axiom: { id: axiom.id, text: axiom.text },
            principles: principles.map((p) => ({
              id: p.id,
              text: p.text.slice(0, 50),
              n_count: p.n_count,
            })),
          }
        )
      );
    },

    async logSoulGenerated(tokenCount: number, axiomCount: number): Promise<void> {
      await log(
        createEntry('soul_generated', 'soul', {
          tokenCount,
          axiomCount,
        })
      );
    },

    async logIterationComplete(
      iteration: number,
      metrics: Record<string, number>
    ): Promise<void> {
      await log(
        createEntry('iteration_complete', `iteration_${iteration}`, {
          iteration,
          ...metrics,
        })
      );
    },

    async logAttractorDetected(iteration: number, strength: number): Promise<void> {
      await log(
        createEntry('attractor_detected', `iteration_${iteration}`, {
          iteration,
          strength,
        })
      );
    },

    async logBackupCreated(backupPath: string): Promise<void> {
      await log(
        createEntry('backup_created', 'backup', {
          path: backupPath,
        })
      );
    },

    async logPipelineStarted(options: Record<string, unknown>): Promise<void> {
      sessionOptions = options;
      await log(
        createEntry('pipeline_started', sessionId, {
          options,
        })
      );
    },

    async logPipelineCompleted(metrics: Record<string, unknown>): Promise<void> {
      await log(
        createEntry('pipeline_completed', sessionId, {
          metrics,
          duration: Date.now() - new Date(startedAt).getTime(),
        })
      );
    },

    async logPipelineFailed(error: string): Promise<void> {
      await log(
        createEntry('pipeline_failed', sessionId, {
          error,
          duration: Date.now() - new Date(startedAt).getTime(),
        })
      );
    },

    getSession(): AuditSession {
      return {
        sessionId,
        startedAt,
        options: sessionOptions,
        entryCount,
        actionCounts: { ...actionCounts },
      };
    },

    async close(): Promise<void> {
      // Write session summary
      const session = this.getSession();
      session.endedAt = new Date().toISOString();

      const summaryPath = outputPath.replace('.jsonl', '-session.json');
      await writeFile(summaryPath, JSON.stringify(session, null, 2));
    },
  };
}

/**
 * Generate unique ID.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format audit entry for display.
 */
export function formatAuditEntry(entry: AuditEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const action = entry.action.replace(/_/g, ' ');

  let details = '';
  if (entry.details['text']) {
    details = `: "${entry.details['text']}"`;
  } else if (entry.details['path']) {
    details = `: ${entry.details['path']}`;
  }

  return `[${time}] ${action}${details}`;
}

/**
 * Generate audit statistics.
 */
export function generateAuditStats(entries: AuditEntry[]): {
  totalEntries: number;
  byAction: Record<string, number>;
  byDimension: Record<string, number>;
  timeline: Array<{ time: string; action: string }>;
} {
  const byAction: Record<string, number> = {};
  const byDimension: Record<string, number> = {};
  const timeline: Array<{ time: string; action: string }> = [];

  for (const entry of entries) {
    // Count by action
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;

    // Count by dimension
    const dimension = entry.details['dimension'] as string | undefined;
    if (dimension) {
      byDimension[dimension] = (byDimension[dimension] || 0) + 1;
    }

    // Build timeline
    timeline.push({
      time: entry.timestamp,
      action: entry.action,
    });
  }

  return {
    totalEntries: entries.length,
    byAction,
    byDimension,
    timeline,
  };
}
