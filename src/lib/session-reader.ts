/**
 * OpenClaw Session Log Reader
 *
 * Parses OpenClaw conversation session files (.jsonl) for signal extraction.
 * Session files contain the richest source of identity data — actual conversations
 * about values, preferences, boundaries, and personality.
 *
 * Session file format:
 *   ~/.openclaw/agents/main/sessions/*.jsonl
 *   Each line is a JSON object with a "type" field.
 *   Message entries have type: "message" with role and content.
 *
 * Usage:
 *   const sessions = await readSessionFiles('~/.openclaw/agents/main/sessions');
 *   const content = sessionToMemoryContent(sessions[0]);
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * A single message extracted from a session file.
 */
export interface SessionMessage {
  /** Message ID from the session */
  id: string;
  /** Message role */
  role: 'user' | 'assistant';
  /** Extracted text content */
  text: string;
  /** Message timestamp (if available) */
  timestamp?: string;
}

/**
 * A parsed session file with its messages.
 */
export interface SessionFile {
  /** Session ID */
  id: string;
  /** Absolute file path */
  path: string;
  /** Session start timestamp */
  timestamp: string;
  /** Extracted messages */
  messages: SessionMessage[];
  /** Total line count in the file (for incremental tracking) */
  lineCount: number;
}

/**
 * Raw JSONL entry types from OpenClaw session files.
 */
interface SessionEntry {
  type: string;
  id?: string;
  timestamp?: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
}

/**
 * Default sessions directory path.
 */
export const DEFAULT_SESSIONS_PATH = '~/.openclaw/agents/main/sessions';

/**
 * Expand ~ to home directory.
 */
function expandPath(path: string): string {
  return path.replace(/^~/, process.env['HOME'] || '');
}

/**
 * Read and parse all session files from a directory.
 *
 * @param sessionsDir - Path to OpenClaw sessions directory
 * @param skipBefore - Optional: only include sessions with lines after this count
 *                     (for incremental processing via state tracking)
 */
export async function readSessionFiles(
  sessionsDir: string
): Promise<SessionFile[]> {
  const dir = expandPath(sessionsDir);

  if (!existsSync(dir)) {
    return [];
  }

  const entries = await readdir(dir);
  const jsonlFiles = entries.filter((f) => extname(f) === '.jsonl');

  const sessions: SessionFile[] = [];

  for (const file of jsonlFiles) {
    const filePath = join(dir, file);
    const session = await parseSessionFile(filePath);
    if (session && session.messages.length > 0) {
      sessions.push(session);
    }
  }

  // Sort by timestamp (oldest first)
  sessions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return sessions;
}

/**
 * Parse a single .jsonl session file into a SessionFile.
 * Extracts only message entries, skipping session metadata,
 * model changes, thinking level changes, and tool use.
 */
export async function parseSessionFile(
  filePath: string
): Promise<SessionFile | null> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  const messages: SessionMessage[] = [];
  let sessionId = '';
  let sessionTimestamp = '';

  for (const line of lines) {
    let entry: SessionEntry;
    try {
      entry = JSON.parse(line) as SessionEntry;
    } catch {
      // Skip malformed lines
      continue;
    }

    // Extract session metadata
    if (entry.type === 'session') {
      sessionId = entry.id ?? '';
      sessionTimestamp = entry.timestamp ?? '';
      continue;
    }

    // Only process message entries
    if (entry.type !== 'message') {
      continue;
    }

    const msg = entry.message;
    if (!msg || !msg.content) {
      continue;
    }

    // Only include user and assistant messages
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      continue;
    }

    // Extract text from content blocks
    const textParts: string[] = [];
    for (const block of msg.content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text);
      }
    }

    const text = textParts.join('\n').trim();
    if (text.length === 0) {
      continue;
    }

    messages.push({
      id: entry.id ?? '',
      role: msg.role as 'user' | 'assistant',
      text,
      timestamp: entry.timestamp,
    });
  }

  // Use filename as fallback ID if no session header found
  if (!sessionId) {
    sessionId = filePath.split('/').pop()?.replace('.jsonl', '') ?? 'unknown';
  }
  if (!sessionTimestamp) {
    sessionTimestamp = new Date().toISOString();
  }

  return {
    id: sessionId,
    path: filePath,
    timestamp: sessionTimestamp,
    messages,
    lineCount: lines.length,
  };
}

/**
 * Maximum characters per message when converting sessions to signal input.
 * Agent messages can be very long (code, tool output, explanations).
 * Truncating keeps batch sizes reasonable while preserving the identity-
 * relevant content, which is usually in the first few sentences.
 */
const MAX_MESSAGE_CHARS = 500;

/**
 * Convert a session file into content suitable for signal extraction.
 *
 * Each message becomes a single line prefixed with [Human] or [Agent].
 * Newlines within messages are collapsed to spaces. Long messages are
 * truncated to MAX_MESSAGE_CHARS.
 *
 * This produces one candidate per message (not per line), so the batch
 * detector evaluates whole messages at a time — dramatically fewer LLM calls.
 */
export function sessionToMemoryContent(
  session: SessionFile,
  startFromMessage: number = 0
): string {
  const lines: string[] = [];
  const messages = startFromMessage > 0
    ? session.messages.slice(startFromMessage)
    : session.messages;

  for (const msg of messages) {
    const role = msg.role === 'user' ? 'Human' : 'Agent';
    // Collapse newlines to spaces, normalize whitespace
    let text = msg.text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    // Truncate long messages
    if (text.length > MAX_MESSAGE_CHARS) {
      text = text.slice(0, MAX_MESSAGE_CHARS);
    }
    if (text.length > 0) {
      lines.push(`[${role}]: ${text}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get total message count across all session files.
 */
export function getSessionMessageCount(sessions: SessionFile[]): number {
  return sessions.reduce((sum, s) => sum + s.messages.length, 0);
}
