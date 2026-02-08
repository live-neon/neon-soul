/**
 * Incremental processing state management.
 * Tracks what has been processed to enable efficient synthesis.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface MemoryFileState {
  file: string;
  line: number;
  processedAt: string;
}

export interface SynthesisState {
  lastRun: {
    timestamp: string;
    memoryFiles: Record<string, MemoryFileState>;
    soulVersion: string; // Hash of last generated SOUL.md
    // IM-4 FIX: Track content size at last run for delta comparison
    contentSize: number;
  };
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
    return { ...DEFAULT_STATE };
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
