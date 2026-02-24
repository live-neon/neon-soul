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

// ---------------------------------------------------------------------------
// System message filtering
// ---------------------------------------------------------------------------
// OpenClaw injects system/cron messages into sessions as role:"user" entries.
// These contaminate identity signal extraction — the cron-relay persona bleeds
// into Voice/Vibe sections. Filter them at the content-output stage so
// parseSessionFile() stays stable for incremental state tracking.
// ---------------------------------------------------------------------------

/**
 * Patterns that identify system-injected messages to skip entirely.
 *
 * 1. Cron error/info: "System: [2026-02-23 04:13:37 PST] Cron (error): ..."
 * 2. Cron maintenance tasks: "[cron:UUID task-name] Run the neon-agent ..."
 * 3. Session startup: "A new session was started via /new or /reset. ..."
 */
const SYSTEM_MESSAGE_PATTERNS: RegExp[] = [
  /^System: \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]{3,4}\] Cron \(/,
  /^\[cron:[a-f0-9-]+ [\w-]+\]/,
  /^A new session was started via \/new or \/reset\./,
];

/**
 * Detect system-injected messages that should be skipped during signal extraction.
 * These are OpenClaw platform messages injected as role:"user" — cron triggers,
 * maintenance task instructions, and session startup sequences.
 */
export function isSystemMessage(text: string): boolean {
  return SYSTEM_MESSAGE_PATTERNS.some((p) => p.test(text));
}

/**
 * Prefix for conversation metadata wrapper messages.
 */
const CONVERSATION_META_PREFIX = 'Conversation info (untrusted metadata):';

/**
 * Strip OpenClaw conversation metadata wrapper, extracting the real user text.
 *
 * Format:
 *   Conversation info (untrusted metadata):
 *   ```json
 *   { "message_id": "...", "sender_id": "...", ... }
 *   ```
 *   [optional timestamp] actual user message text
 *
 * Returns the extracted user text, or null if the message isn't a metadata
 * wrapper or contains no extractable text.
 */
export function stripConversationMetadata(text: string): string | null {
  if (!text.startsWith(CONVERSATION_META_PREFIX)) {
    return null;
  }

  // Find the ```json...``` code block and skip past it
  const jsonBlockStart = text.indexOf('```json');
  if (jsonBlockStart === -1) {
    return null;
  }

  // Find the closing ``` after the json block
  const codeBlockEnd = text.indexOf('```', jsonBlockStart + 7);
  if (codeBlockEnd === -1) {
    return null;
  }

  const afterBlock = text.slice(codeBlockEnd + 3).trim();
  if (afterBlock.length === 0) {
    return null;
  }

  // Strip leading timestamp patterns:
  //   "[2026-02-23 04:13:37 PST]" or "2026-02-23T04:13:37" or "[04:13:37 PST]"
  const stripped = afterBlock.replace(
    /^\[?\d{1,4}[-/:]\d{2}[-/:]\d{2}[T ]?\d{2}:\d{2}(:\d{2})?\s*[A-Z]{0,4}\]?\s*/,
    ''
  );

  return stripped.length > 0 ? stripped : null;
}

/**
 * Convert a session file into content suitable for signal extraction.
 *
 * Each message becomes a single line prefixed with [Human] or [Agent].
 * Newlines within messages are collapsed to spaces. Long messages are
 * truncated to MAX_MESSAGE_CHARS.
 *
 * Filters out system-injected noise:
 * - Cron error/info messages (skipped entirely)
 * - Cron maintenance task instructions (skipped entirely)
 * - Session startup sequences (skipped entirely)
 * - Conversation metadata wrappers (prefix stripped, real user text kept)
 * - Assistant responses to any skipped system message (skipped — cron-relay
 *   persona contaminates Voice/Vibe if included)
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

  let skipNextAssistant = false;

  for (const msg of messages) {
    // Skip assistant responses to system messages — the cron-relay persona
    // ("Hey! here's your cron report...") is not identity expression
    if (msg.role === 'assistant' && skipNextAssistant) {
      skipNextAssistant = false;
      continue;
    }
    skipNextAssistant = false;

    // Filter user messages for system-injected noise
    let messageText = msg.text;
    if (msg.role === 'user') {
      // Pattern 1/3/4: Skip system messages entirely
      if (isSystemMessage(messageText)) {
        skipNextAssistant = true;
        continue;
      }

      // Pattern 2: Strip conversation metadata, keep real user text
      const extracted = stripConversationMetadata(messageText);
      if (extracted !== null) {
        messageText = extracted;
      } else if (messageText.startsWith(CONVERSATION_META_PREFIX)) {
        // Metadata wrapper with no extractable text — skip
        skipNextAssistant = true;
        continue;
      }
    }

    const role = msg.role === 'user' ? 'Human' : 'Agent';
    // Collapse newlines to spaces, normalize whitespace
    let text = messageText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
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
