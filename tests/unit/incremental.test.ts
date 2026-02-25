/**
 * Unit Tests: Incremental Synthesis
 *
 * Tests for incremental processing behavior:
 * - clearState() resets state to defaults
 * - clearSynthesisData() removes synthesis data files
 * - sessionToMemoryContent() with startFromMessage
 * - loadState() does not mutate DEFAULT_STATE (shallow copy bug regression)
 * - State tracking for memory files and sessions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { loadState, saveState, clearState, type SynthesisState } from '../../src/lib/state.js';
import {
  saveSignals,
  savePrinciples,
  saveAxioms,
  loadSignals,
  loadPrinciples,
  loadAxioms,
  clearSynthesisData,
} from '../../src/lib/persistence.js';
import { sessionToMemoryContent, type SessionFile } from '../../src/lib/session-reader.js';
import type { Signal } from '../../src/types/signal.js';

// Create a temp workspace for each test
let workspacePath: string;

beforeEach(() => {
  workspacePath = join(tmpdir(), `neon-soul-incremental-${randomUUID()}`);
  mkdirSync(join(workspacePath, '.neon-soul'), { recursive: true });
});

afterEach(() => {
  rmSync(workspacePath, { recursive: true, force: true });
});

/**
 * Helper to create a minimal signal for testing.
 */
function createSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: randomUUID(),
    text: 'Test signal',
    generalizedText: 'Values testing',
    dimension: 'identity-core',
    signalType: 'value',
    confidence: 0.9,
    source: {
      file: '/test/memory/file.md',
      type: 'memory',
      context: 'test',
      extractedAt: new Date(),
    },
    ...overrides,
  } as Signal;
}

describe('clearState()', () => {
  it('resets state to defaults', () => {
    // Save some state first
    saveState(workspacePath, {
      lastRun: {
        timestamp: '2026-02-22T08:00:00.000Z',
        memoryFiles: {
          '/path/to/file.md': {
            contentHash: 'abc123',
            processedAt: '2026-02-22T08:00:00.000Z',
          },
        },
        soulVersion: 'def456',
        contentSize: 5000,
      },
      processedSessions: {
        'session-abc': {
          lineCount: 100,
          messageCount: 25,
          lastProcessedAt: '2026-02-22T08:00:00.000Z',
        },
      },
      metrics: {
        totalSignalsProcessed: 50,
        totalPrinciplesGenerated: 10,
        totalAxiomsGenerated: 5,
      },
    });

    // Clear state
    clearState(workspacePath);

    // Load and verify it's defaults
    const state = loadState(workspacePath);
    expect(state.lastRun.timestamp).toBe('');
    expect(state.lastRun.memoryFiles).toEqual({});
    expect(state.lastRun.soulVersion).toBe('');
    expect(state.lastRun.contentSize).toBe(0);
    expect(state.processedSessions).toEqual({});
    expect(state.metrics.totalSignalsProcessed).toBe(0);
    expect(state.metrics.totalPrinciplesGenerated).toBe(0);
    expect(state.metrics.totalAxiomsGenerated).toBe(0);
  });

  it('creates state file if it does not exist', () => {
    const freshWorkspace = join(tmpdir(), `neon-soul-fresh-${randomUUID()}`);
    mkdirSync(freshWorkspace, { recursive: true });

    clearState(freshWorkspace);

    // State file should exist now
    expect(existsSync(join(freshWorkspace, '.neon-soul', 'state.json'))).toBe(true);

    // Clean up
    rmSync(freshWorkspace, { recursive: true, force: true });
  });
});

describe('clearSynthesisData()', () => {
  it('removes signals.json, principles.json, and axioms.json', () => {
    // Create synthesis data files
    const signal = createSignal();
    saveSignals(workspacePath, [signal]);
    savePrinciples(workspacePath, [{
      id: 'p1',
      text: 'Test principle',
      dimension: 'identity-core',
      strength: 0.8,
      n_count: 3,
      derived_from: { signals: [], merged_at: new Date().toISOString() },
      history: [],
    }]);
    saveAxioms(workspacePath, [{
      id: 'a1',
      text: 'Test axiom',
      dimension: 'identity-core',
      principles: [],
      strength: 0.9,
      n_count: 5,
      history: [],
    }]);

    // Verify files exist
    const dir = join(workspacePath, '.neon-soul');
    expect(existsSync(join(dir, 'signals.json'))).toBe(true);
    expect(existsSync(join(dir, 'principles.json'))).toBe(true);
    expect(existsSync(join(dir, 'axioms.json'))).toBe(true);

    // Clear synthesis data
    clearSynthesisData(workspacePath);

    // Verify files are removed
    expect(existsSync(join(dir, 'signals.json'))).toBe(false);
    expect(existsSync(join(dir, 'principles.json'))).toBe(false);
    expect(existsSync(join(dir, 'axioms.json'))).toBe(false);
  });

  it('does not crash when files do not exist', () => {
    // Should not throw even if no files exist
    expect(() => clearSynthesisData(workspacePath)).not.toThrow();
  });

  it('does not remove state.json', () => {
    // Save state
    saveState(workspacePath, {
      lastRun: {
        timestamp: '2026-02-22T08:00:00.000Z',
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
    });

    clearSynthesisData(workspacePath);

    // state.json should still exist
    expect(existsSync(join(workspacePath, '.neon-soul', 'state.json'))).toBe(true);
  });
});

describe('sessionToMemoryContent() with startFromMessage', () => {
  const session: SessionFile = {
    id: 'test-session',
    path: '/sessions/test.jsonl',
    timestamp: '2026-02-22T08:00:00.000Z',
    messages: [
      { id: 'msg1', role: 'user', text: 'First message' },
      { id: 'msg2', role: 'assistant', text: 'First response' },
      { id: 'msg3', role: 'user', text: 'Second message' },
      { id: 'msg4', role: 'assistant', text: 'Second response' },
      { id: 'msg5', role: 'user', text: 'Third message' },
    ],
    lineCount: 6,
  };

  it('returns all messages when startFromMessage is 0', () => {
    const content = sessionToMemoryContent(session, 0);
    const lines = content.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[0]).toContain('First message');
    expect(lines[4]).toContain('Third message');
  });

  it('returns all messages when startFromMessage is not provided', () => {
    const content = sessionToMemoryContent(session);
    const lines = content.split('\n');
    expect(lines).toHaveLength(5);
  });

  it('skips first N messages when startFromMessage is set', () => {
    const content = sessionToMemoryContent(session, 2);
    const lines = content.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Second message');
    expect(lines[1]).toContain('Second response');
    expect(lines[2]).toContain('Third message');
  });

  it('returns empty string when startFromMessage exceeds message count', () => {
    const content = sessionToMemoryContent(session, 10);
    expect(content).toBe('');
  });

  it('returns last message when startFromMessage is count - 1', () => {
    const content = sessionToMemoryContent(session, 4);
    const lines = content.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Third message');
  });
});

describe('loadState() DEFAULT_STATE mutation prevention', () => {
  it('does not share references between multiple loadState() calls', () => {
    // Load state from non-existent file (returns defaults)
    const freshWorkspace1 = join(tmpdir(), `neon-soul-iso1-${randomUUID()}`);
    const freshWorkspace2 = join(tmpdir(), `neon-soul-iso2-${randomUUID()}`);

    const state1 = loadState(freshWorkspace1);
    const state2 = loadState(freshWorkspace2);

    // Mutate state1's memoryFiles
    state1.lastRun.memoryFiles['/some/file.md'] = {
      contentHash: 'hash123',
      processedAt: new Date().toISOString(),
    };

    // state2 should NOT be affected
    expect(state2.lastRun.memoryFiles).toEqual({});
    expect(Object.keys(state2.lastRun.memoryFiles)).toHaveLength(0);
  });

  it('does not pollute DEFAULT_STATE across calls', () => {
    const fresh1 = join(tmpdir(), `neon-soul-def1-${randomUUID()}`);
    const fresh2 = join(tmpdir(), `neon-soul-def2-${randomUUID()}`);

    // First load and mutate
    const state1 = loadState(fresh1);
    state1.lastRun.memoryFiles['/file-a.md'] = {
      contentHash: 'aaa',
      processedAt: new Date().toISOString(),
    };
    state1.processedSessions['session-x'] = {
      lineCount: 50,
      messageCount: 10,
      lastProcessedAt: new Date().toISOString(),
    };

    // Second load should be clean
    const state2 = loadState(fresh2);
    expect(state2.lastRun.memoryFiles).toEqual({});
    expect(state2.processedSessions).toEqual({});
  });
});

describe('Incremental state tracking roundtrip', () => {
  it('persists and loads memory file tracking', () => {
    const state: SynthesisState = {
      lastRun: {
        timestamp: new Date().toISOString(),
        memoryFiles: {
          '/workspace/memory/values.md': {
            contentHash: 'abc123def456',
            processedAt: new Date().toISOString(),
          },
          '/workspace/memory/goals.md': {
            contentHash: '789xyz000111',
            processedAt: new Date().toISOString(),
          },
        },
        soulVersion: 'soul-hash-v1',
        contentSize: 3000,
      },
      processedSessions: {},
      metrics: {
        totalSignalsProcessed: 20,
        totalPrinciplesGenerated: 5,
        totalAxiomsGenerated: 3,
      },
    };

    saveState(workspacePath, state);
    const loaded = loadState(workspacePath);

    expect(loaded.lastRun.memoryFiles).toEqual(state.lastRun.memoryFiles);
    expect(Object.keys(loaded.lastRun.memoryFiles)).toHaveLength(2);
    expect(loaded.lastRun.memoryFiles['/workspace/memory/values.md']?.contentHash).toBe('abc123def456');
  });

  it('persists and loads session tracking with messageCount', () => {
    const state: SynthesisState = {
      lastRun: {
        timestamp: new Date().toISOString(),
        memoryFiles: {},
        soulVersion: '',
        contentSize: 0,
      },
      processedSessions: {
        'session-001': {
          lineCount: 150,
          messageCount: 40,
          lastProcessedAt: '2026-02-22T08:00:00.000Z',
        },
        'session-002': {
          lineCount: 75,
          messageCount: 20,
          lastProcessedAt: '2026-02-22T09:00:00.000Z',
        },
      },
      metrics: {
        totalSignalsProcessed: 0,
        totalPrinciplesGenerated: 0,
        totalAxiomsGenerated: 0,
      },
    };

    saveState(workspacePath, state);
    const loaded = loadState(workspacePath);

    expect(Object.keys(loaded.processedSessions)).toHaveLength(2);
    expect(loaded.processedSessions['session-001']?.messageCount).toBe(40);
    expect(loaded.processedSessions['session-002']?.lineCount).toBe(75);
  });
});

describe('Signal persistence for incremental merge', () => {
  it('saves and loads signals preserving source.file', () => {
    const signals: Signal[] = [
      createSignal({ source: { file: '/workspace/memory/values.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
      createSignal({ source: { file: '/workspace/memory/goals.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
    ];

    saveSignals(workspacePath, signals);
    const loaded = loadSignals(workspacePath);

    expect(loaded).toHaveLength(2);
    expect(loaded[0]!.source.file).toBe('/workspace/memory/values.md');
    expect(loaded[1]!.source.file).toBe('/workspace/memory/goals.md');
  });

  it('supports filtering stale signals by source.file', () => {
    const signals: Signal[] = [
      createSignal({ id: 'keep-1', source: { file: '/workspace/memory/values.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
      createSignal({ id: 'remove-1', source: { file: '/workspace/memory/old-file.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
      createSignal({ id: 'keep-2', source: { file: '/workspace/memory/goals.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
      createSignal({ id: 'remove-2', source: { file: '/workspace/memory/old-file.md', type: 'memory', context: 'test', extractedAt: new Date() } as Signal['source'] }),
    ];

    // Simulate removing stale signals from a modified/removed file
    const stalePaths = new Set(['/workspace/memory/old-file.md']);
    const filtered = signals.filter(s => !stalePaths.has(s.source.file));

    expect(filtered).toHaveLength(2);
    expect(filtered.map(s => s.id)).toEqual(['keep-1', 'keep-2']);
  });

  it('merges existing and new signals', () => {
    const existing: Signal[] = [
      createSignal({ id: 'existing-1', text: 'I value honesty' }),
      createSignal({ id: 'existing-2', text: 'I prefer clarity' }),
    ];

    const newSignals: Signal[] = [
      createSignal({ id: 'new-1', text: 'Growth matters' }),
    ];

    const merged = [...existing, ...newSignals];

    expect(merged).toHaveLength(3);
    expect(merged.map(s => s.id)).toEqual(['existing-1', 'existing-2', 'new-1']);
  });
});
