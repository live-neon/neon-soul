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
  isSystemMessage,
  stripConversationMetadata,
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

// ---------------------------------------------------------------------------
// System message filtering
// ---------------------------------------------------------------------------

describe('isSystemMessage', () => {
  it('matches cron error messages', () => {
    expect(isSystemMessage(
      'System: [2026-02-23 04:13:37 PST] Cron (error): This operation was aborted'
    )).toBe(true);
  });

  it('matches cron info messages', () => {
    expect(isSystemMessage(
      'System: [2026-02-23 17:37:00 PST] Cron (info): Maintenance completed successfully'
    )).toBe(true);
  });

  it('matches cron maintenance task messages', () => {
    expect(isSystemMessage(
      '[cron:3ddea0b6-0c8a-45c1-8e13-51f21462c23c neon-soul-maintenance] Run the neon-agent maintenance task: cd /Users/neonsoul/Desktop/projects/neon-agent && npm run maintenance'
    )).toBe(true);
  });

  it('matches session startup messages', () => {
    expect(isSystemMessage(
      'A new session was started via /new or /reset. Execute your Session Startup sequence now - read the required files before responding to the user.'
    )).toBe(true);
  });

  it('does NOT match normal user text', () => {
    expect(isSystemMessage('I prefer concise responses')).toBe(false);
    expect(isSystemMessage('What do you value most?')).toBe(false);
    expect(isSystemMessage('Tell me about your boundaries')).toBe(false);
  });

  it('does NOT match text containing system-like words in normal context', () => {
    expect(isSystemMessage('The system should be robust')).toBe(false);
    expect(isSystemMessage('I started a new project yesterday')).toBe(false);
    expect(isSystemMessage('My cron jobs are important to me')).toBe(false);
  });
});

describe('stripConversationMetadata', () => {
  it('returns null for non-metadata text', () => {
    expect(stripConversationMetadata('I prefer concise responses')).toBeNull();
    expect(stripConversationMetadata('Hello there!')).toBeNull();
  });

  it('extracts user text after JSON block', () => {
    const input = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123", "sender_id": "user1"}',
      '```',
      'What do you think about honesty?',
    ].join('\n');

    expect(stripConversationMetadata(input)).toBe('What do you think about honesty?');
  });

  it('strips leading timestamp from extracted text', () => {
    const input = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123"}',
      '```',
      '[2026-02-23 04:13:37 PST] What do you think about honesty?',
    ].join('\n');

    expect(stripConversationMetadata(input)).toBe('What do you think about honesty?');
  });

  it('returns null when no text after JSON block', () => {
    const input = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123"}',
      '```',
    ].join('\n');

    expect(stripConversationMetadata(input)).toBeNull();
  });

  it('returns null when only whitespace after JSON block', () => {
    const input = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123"}',
      '```',
      '   ',
    ].join('\n');

    expect(stripConversationMetadata(input)).toBeNull();
  });

  it('returns null when no ```json block present', () => {
    expect(stripConversationMetadata(
      'Conversation info (untrusted metadata): some text'
    )).toBeNull();
  });

  it('returns null when closing ``` is missing', () => {
    const input = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123"}',
    ].join('\n');

    expect(stripConversationMetadata(input)).toBeNull();
  });
});

describe('sessionToMemoryContent filtering', () => {
  const makeSession = (messages: Array<{ role: 'user' | 'assistant'; text: string }>) => ({
    id: 'test-session',
    path: '/sessions/test.jsonl',
    timestamp: '2026-02-22T08:00:00.000Z',
    messages: messages.map((m, i) => ({ id: `msg${i}`, ...m })),
    lineCount: messages.length + 1,
  });

  it('skips cron messages entirely', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'System: [2026-02-23 04:13:37 PST] Cron (error): This operation was aborted' },
      { role: 'user', text: 'I value honesty' },
    ]));

    expect(content).not.toContain('Cron');
    expect(content).toContain('[Human]: I value honesty');
    expect(content.split('\n')).toHaveLength(1);
  });

  it('skips assistant response following a system message', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'System: [2026-02-23 04:13:37 PST] Cron (error): This operation was aborted' },
      { role: 'assistant', text: 'Hey! Here is your cron report with all the details...' },
      { role: 'user', text: 'I prefer clarity' },
      { role: 'assistant', text: 'Noted! Clarity is important.' },
    ]));

    expect(content).not.toContain('cron report');
    expect(content).not.toContain('Cron');
    expect(content).toContain('[Human]: I prefer clarity');
    expect(content).toContain('[Agent]: Noted! Clarity is important.');
    expect(content.split('\n')).toHaveLength(2);
  });

  it('skips cron maintenance task messages and their responses', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: '[cron:abc-123 neon-soul-maintenance] Run the neon-agent maintenance task: npm run maintenance' },
      { role: 'assistant', text: 'Running maintenance now... 0 processed, 0 decayed.' },
      { role: 'user', text: 'What are your core values?' },
    ]));

    expect(content).not.toContain('maintenance');
    expect(content).toContain('[Human]: What are your core values?');
    expect(content.split('\n')).toHaveLength(1);
  });

  it('skips session startup messages and their responses', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'A new session was started via /new or /reset. Execute your Session Startup sequence now.' },
      { role: 'assistant', text: 'Session initialized! Reading required files...' },
      { role: 'user', text: 'Tell me about boundaries' },
    ]));

    expect(content).not.toContain('Session Startup');
    expect(content).not.toContain('initialized');
    expect(content).toContain('[Human]: Tell me about boundaries');
    expect(content.split('\n')).toHaveLength(1);
  });

  it('extracts real text from metadata-wrapped messages', () => {
    const metaWrapped = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123", "sender_id": "user1"}',
      '```',
      'I believe in being direct and honest.',
    ].join('\n');

    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: metaWrapped },
      { role: 'assistant', text: 'That resonates with me.' },
    ]));

    expect(content).toContain('[Human]: I believe in being direct and honest.');
    expect(content).toContain('[Agent]: That resonates with me.');
    expect(content).not.toContain('untrusted metadata');
    expect(content).not.toContain('message_id');
    expect(content.split('\n')).toHaveLength(2);
  });

  it('skips metadata-wrapped messages with no extractable text', () => {
    const metaOnly = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "abc123"}',
      '```',
    ].join('\n');

    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: metaOnly },
      { role: 'assistant', text: 'I see a metadata message with no content.' },
      { role: 'user', text: 'I value empathy' },
    ]));

    expect(content).not.toContain('metadata');
    expect(content).toContain('[Human]: I value empathy');
    expect(content.split('\n')).toHaveLength(1);
  });

  it('handles mixed session with all noise types and preserves clean messages', () => {
    const metaWrapped = [
      'Conversation info (untrusted metadata):',
      '```json',
      '{"message_id": "xyz"}',
      '```',
      'How do you handle conflict?',
    ].join('\n');

    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'I believe in honesty' },
      { role: 'assistant', text: 'Honesty is a core value.' },
      { role: 'user', text: 'System: [2026-02-23 04:13:37 PST] Cron (error): timeout' },
      { role: 'assistant', text: 'Hey! Your cron failed...' },
      { role: 'user', text: metaWrapped },
      { role: 'assistant', text: 'Great question about conflict.' },
      { role: 'user', text: '[cron:abc-123 maint] Run the neon-agent maintenance task: npm run maint' },
      { role: 'assistant', text: 'Running maintenance...' },
      { role: 'user', text: 'A new session was started via /new or /reset. Execute startup.' },
      { role: 'assistant', text: 'Starting up!' },
      { role: 'user', text: 'I prefer directness' },
      { role: 'assistant', text: 'Directness noted.' },
    ]));

    const lines = content.split('\n');
    // Should have: honesty pair (2) + conflict pair (2) + directness pair (2) = 6
    expect(lines).toHaveLength(6);
    expect(content).toContain('[Human]: I believe in honesty');
    expect(content).toContain('[Agent]: Honesty is a core value.');
    expect(content).toContain('[Human]: How do you handle conflict?');
    expect(content).toContain('[Agent]: Great question about conflict.');
    expect(content).toContain('[Human]: I prefer directness');
    expect(content).toContain('[Agent]: Directness noted.');
    // None of the noise should appear
    expect(content).not.toContain('Cron');
    expect(content).not.toContain('cron');
    expect(content).not.toContain('maintenance');
    expect(content).not.toContain('metadata');
    expect(content).not.toContain('Starting up');
  });

  it('preserves normal messages when no noise is present', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'What matters to you?' },
      { role: 'assistant', text: 'I value growth and learning.' },
      { role: 'user', text: 'Tell me more about that.' },
      { role: 'assistant', text: 'Growth means continuous improvement.' },
    ]));

    expect(content.split('\n')).toHaveLength(4);
    expect(content).toContain('[Human]: What matters to you?');
    expect(content).toContain('[Agent]: I value growth and learning.');
  });

  it('does not skip assistant after normal user message even if it mentions system words', () => {
    const content = sessionToMemoryContent(makeSession([
      { role: 'user', text: 'The system should be more transparent' },
      { role: 'assistant', text: 'Transparency is important for trust.' },
    ]));

    expect(content.split('\n')).toHaveLength(2);
    expect(content).toContain('[Human]: The system should be more transparent');
    expect(content).toContain('[Agent]: Transparency is important for trust.');
  });
});
