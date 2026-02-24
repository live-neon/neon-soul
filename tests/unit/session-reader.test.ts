/**
 * Unit Tests: Session Reader
 *
 * Tests for OpenClaw session log parsing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  readSessionFiles,
  parseSessionFile,
  sessionToMemoryContent,
  getSessionMessageCount,
} from '../../src/lib/session-reader.js';

// Create a temp directory for each test
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `neon-soul-test-${randomUUID()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

/**
 * Helper to create a .jsonl session file.
 */
function createSessionFile(
  dir: string,
  filename: string,
  entries: Array<Record<string, unknown>>
): string {
  const filePath = join(dir, filename);
  const content = entries.map((e) => JSON.stringify(e)).join('\n');
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('Session Reader', () => {
  describe('parseSessionFile', () => {
    it('parses a valid session file with messages', async () => {
      const filePath = createSessionFile(testDir, 'test-session.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'abc123',
          timestamp: '2026-02-22T08:00:00.000Z',
          cwd: '/workspace',
        },
        {
          type: 'message',
          id: 'msg1',
          timestamp: '2026-02-22T08:01:00.000Z',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Hello, how are you?' }],
          },
        },
        {
          type: 'message',
          id: 'msg2',
          timestamp: '2026-02-22T08:01:30.000Z',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'I am doing well, thank you for asking!' },
            ],
          },
        },
      ]);

      const session = await parseSessionFile(filePath);

      expect(session).not.toBeNull();
      expect(session!.id).toBe('abc123');
      expect(session!.timestamp).toBe('2026-02-22T08:00:00.000Z');
      expect(session!.messages).toHaveLength(2);
      expect(session!.messages[0]!.role).toBe('user');
      expect(session!.messages[0]!.text).toBe('Hello, how are you?');
      expect(session!.messages[1]!.role).toBe('assistant');
      expect(session!.messages[1]!.text).toBe(
        'I am doing well, thank you for asking!'
      );
    });

    it('skips non-message entries', async () => {
      const filePath = createSessionFile(testDir, 'mixed.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'sess1',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        { type: 'model_change', model: 'gpt-4' },
        { type: 'thinking_level_change', level: 'high' },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'I value honesty' }],
          },
        },
        { type: 'custom', data: 'something' },
      ]);

      const session = await parseSessionFile(filePath);

      expect(session).not.toBeNull();
      expect(session!.messages).toHaveLength(1);
      expect(session!.messages[0]!.text).toBe('I value honesty');
    });

    it('skips tool_use content blocks', async () => {
      const filePath = createSessionFile(testDir, 'tools.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'sess2',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Let me check that file.' },
              { type: 'tool_use', id: 'tool1', name: 'read', input: {} },
            ],
          },
        },
      ]);

      const session = await parseSessionFile(filePath);

      expect(session!.messages).toHaveLength(1);
      // Only text content should be captured
      expect(session!.messages[0]!.text).toBe('Let me check that file.');
    });

    it('skips messages with no text content', async () => {
      const filePath = createSessionFile(testDir, 'no-text.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'sess3',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'tool1', name: 'read', input: {} },
            ],
          },
        },
      ]);

      const session = await parseSessionFile(filePath);

      // Message with only tool_use (no text) should be skipped
      expect(session!.messages).toHaveLength(0);
    });

    it('handles malformed JSON lines gracefully', async () => {
      const filePath = join(testDir, 'malformed.jsonl');
      writeFileSync(
        filePath,
        [
          JSON.stringify({
            type: 'session',
            version: 3,
            id: 'sess4',
            timestamp: '2026-02-22T08:00:00.000Z',
          }),
          'not valid json at all',
          JSON.stringify({
            type: 'message',
            id: 'msg1',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'valid message' }],
            },
          }),
        ].join('\n'),
        'utf-8'
      );

      const session = await parseSessionFile(filePath);

      expect(session).not.toBeNull();
      expect(session!.messages).toHaveLength(1);
      expect(session!.messages[0]!.text).toBe('valid message');
    });

    it('returns null for non-existent file', async () => {
      const session = await parseSessionFile('/nonexistent/file.jsonl');
      expect(session).toBeNull();
    });

    it('tracks line count for incremental processing', async () => {
      const filePath = createSessionFile(testDir, 'counted.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'sess5',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'first' }],
          },
        },
        {
          type: 'message',
          id: 'msg2',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'second' }],
          },
        },
      ]);

      const session = await parseSessionFile(filePath);
      expect(session!.lineCount).toBe(3);
    });

    it('concatenates multiple text blocks in a single message', async () => {
      const filePath = createSessionFile(testDir, 'multi-text.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'sess6',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'First part.' },
              { type: 'text', text: 'Second part.' },
            ],
          },
        },
      ]);

      const session = await parseSessionFile(filePath);

      expect(session!.messages[0]!.text).toBe('First part.\nSecond part.');
    });
  });

  describe('readSessionFiles', () => {
    it('reads all .jsonl files from a directory', async () => {
      createSessionFile(testDir, 'session-a.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'a',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'hello from a' }],
          },
        },
      ]);
      createSessionFile(testDir, 'session-b.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'b',
          timestamp: '2026-02-22T09:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'hello from b' }],
          },
        },
      ]);

      const sessions = await readSessionFiles(testDir);

      expect(sessions).toHaveLength(2);
    });

    it('sorts sessions by timestamp (oldest first)', async () => {
      createSessionFile(testDir, 'later.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'later',
          timestamp: '2026-02-22T10:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'later' }],
          },
        },
      ]);
      createSessionFile(testDir, 'earlier.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'earlier',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'earlier' }],
          },
        },
      ]);

      const sessions = await readSessionFiles(testDir);

      expect(sessions[0]!.id).toBe('earlier');
      expect(sessions[1]!.id).toBe('later');
    });

    it('returns empty array for non-existent directory', async () => {
      const sessions = await readSessionFiles('/nonexistent/dir');
      expect(sessions).toEqual([]);
    });

    it('skips non-jsonl files', async () => {
      createSessionFile(testDir, 'session.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'valid',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        {
          type: 'message',
          id: 'msg1',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'hello' }],
          },
        },
      ]);
      // Create a non-jsonl file
      writeFileSync(join(testDir, 'notes.txt'), 'not a session', 'utf-8');

      const sessions = await readSessionFiles(testDir);

      expect(sessions).toHaveLength(1);
    });

    it('skips sessions with no messages', async () => {
      createSessionFile(testDir, 'empty.jsonl', [
        {
          type: 'session',
          version: 3,
          id: 'empty',
          timestamp: '2026-02-22T08:00:00.000Z',
        },
        { type: 'model_change', model: 'gpt-4' },
      ]);

      const sessions = await readSessionFiles(testDir);

      expect(sessions).toHaveLength(0);
    });
  });

  describe('sessionToMemoryContent', () => {
    it('converts session to message-level format', () => {
      const content = sessionToMemoryContent({
        id: 'abc12345-long-id',
        path: '/sessions/test.jsonl',
        timestamp: '2026-02-22T08:00:00.000Z',
        messages: [
          { id: 'msg1', role: 'user', text: 'What do you value most?' },
          {
            id: 'msg2',
            role: 'assistant',
            text: 'I value honesty and clarity.',
          },
        ],
        lineCount: 3,
      });

      expect(content).toContain('[Human]: What do you value most?');
      expect(content).toContain('[Agent]: I value honesty and clarity.');
      // Each message should be on its own line
      const lines = content.split('\n');
      expect(lines).toHaveLength(2);
    });

    it('collapses newlines within messages', () => {
      const content = sessionToMemoryContent({
        id: 'test',
        path: '/sessions/test.jsonl',
        timestamp: '2026-02-22T08:00:00.000Z',
        messages: [
          { id: 'msg1', role: 'user', text: 'Line one\nLine two\nLine three' },
        ],
        lineCount: 2,
      });

      expect(content).toBe('[Human]: Line one Line two Line three');
    });

    it('truncates long messages', () => {
      const longText = 'x'.repeat(1000);
      const content = sessionToMemoryContent({
        id: 'test',
        path: '/sessions/test.jsonl',
        timestamp: '2026-02-22T08:00:00.000Z',
        messages: [
          { id: 'msg1', role: 'assistant', text: longText },
        ],
        lineCount: 2,
      });

      // [Agent]: prefix + 500 chars max
      expect(content.length).toBeLessThanOrEqual('[Agent]: '.length + 500);
    });

    it('skips empty messages', () => {
      const content = sessionToMemoryContent({
        id: 'test',
        path: '/sessions/test.jsonl',
        timestamp: '2026-02-22T08:00:00.000Z',
        messages: [
          { id: 'msg1', role: 'user', text: '' },
          { id: 'msg2', role: 'user', text: 'I prefer clarity' },
        ],
        lineCount: 3,
      });

      const lines = content.split('\n');
      expect(lines).toHaveLength(1);
      expect(content).toContain('[Human]: I prefer clarity');
    });
  });

  describe('getSessionMessageCount', () => {
    it('returns total messages across all sessions', () => {
      const sessions = [
        {
          id: 'a',
          path: '/a.jsonl',
          timestamp: '2026-02-22T08:00:00.000Z',
          messages: [
            { id: 'm1', role: 'user' as const, text: 'hi' },
            { id: 'm2', role: 'assistant' as const, text: 'hello' },
          ],
          lineCount: 3,
        },
        {
          id: 'b',
          path: '/b.jsonl',
          timestamp: '2026-02-22T09:00:00.000Z',
          messages: [{ id: 'm3', role: 'user' as const, text: 'bye' }],
          lineCount: 2,
        },
      ];

      expect(getSessionMessageCount(sessions)).toBe(3);
    });

    it('returns 0 for empty sessions array', () => {
      expect(getSessionMessageCount([])).toBe(0);
    });
  });
});
