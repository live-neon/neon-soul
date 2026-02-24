/**
 * Incremental processing state management.
 * Tracks what has been processed to enable efficient synthesis.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface MemoryFileState {
  /** Content hash for change detection */
  contentHash: string;
  /** When this file was last processed */
  processedAt: string;
}

export interface SessionFileState {
  /** Number of lines processed in this session file */
  lineCount: number;
  /** Number of messages processed in this session file */
  messageCount: number;
  /** When this session was last processed */
  lastProcessedAt: string;
}

export interface SynthesisState {
  lastRun: {
    timestamp: string;
    memoryFiles: Record<string, MemoryFileState>;
    soulVersion: string; // Hash of last generated SOUL.md
    // IM-4 FIX: Track content size at last run for delta comparison
    contentSize: number;
  };
  /** Track processed session files for incremental ingestion */
  processedSessions: Record<string, SessionFileState>;
  metrics: {
    totalSignalsProcessed: number;
    totalPrinciplesGenerated: number;
    totalAxiomsGenerated: number;
  };
}

const DEFAULT_STATE: SynthesisState = {
  lastRun: {
    timestamp: '',
    memoryFiles: {},
    soulVersion: '',
    contentSize: 0,
  },
  processedSessions: {},
  metrics: {
    totalSignalsProcessed: 0,
    totalPrinciplesGenerated: 0,
    totalAxiomsGenerated: 0,
  },
};

/**
 * Get state file path for workspace.
 */
function getStatePath(workspacePath: string): string {
  return resolve(workspacePath, '.neon-soul', 'state.json');
}

/**
 * Load synthesis state from workspace.
 */
export function loadState(workspacePath: string): SynthesisState {
  const statePath = getStatePath(workspacePath);

  if (!existsSync(statePath)) {
    // Deep copy to prevent mutation of DEFAULT_STATE shared references
    return {
      lastRun: { ...DEFAULT_STATE.lastRun, memoryFiles: {} },
      processedSessions: {},
      metrics: { ...DEFAULT_STATE.metrics },
    };
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<SynthesisState>;

    // Merge with defaults to handle missing fields
    return {
      lastRun: {
        ...DEFAULT_STATE.lastRun,
        ...parsed.lastRun,
      },
      processedSessions: parsed.processedSessions ?? {},
      metrics: {
        ...DEFAULT_STATE.metrics,
        ...parsed.metrics,
      },
    };
  } catch {
    // Corrupted state file - return defaults
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save synthesis state to workspace.
 * MN-4 FIX: Uses atomic write (temp + rename) for consistency with persistence.ts.
 */
export function saveState(
  workspacePath: string,
  state: SynthesisState
): void {
  const statePath = getStatePath(workspacePath);
  const stateDir = dirname(statePath);

  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  // MN-4 FIX: Atomic write using temp file + rename
  const tempPath = resolve(stateDir, `.tmp-state-${randomUUID()}`);
  writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  renameSync(tempPath, statePath);
}

/**
 * Clear all synthesis state (for --reset).
 * Resets processedSessions, memoryFiles, and metrics to defaults.
 */
export function clearState(workspacePath: string): void {
  saveState(workspacePath, {
    lastRun: { ...DEFAULT_STATE.lastRun },
    processedSessions: {},
    metrics: { ...DEFAULT_STATE.metrics },
  });
}

/**
 * Check if synthesis should run based on content threshold.
 * IM-4 FIX: Compares content delta from last run, not absolute size.
 * Returns true if new content since last run exceeds threshold (default 2000 chars).
 */
export function shouldRunSynthesis(
  currentContentSize: number,
  threshold: number = 2000,
  lastRunContentSize: number = 0
): boolean {
  const delta = currentContentSize - lastRunContentSize;
  return delta >= threshold;
}
