/**
 * Centralized Security Utilities
 *
 * CR-10: This module centralizes all security-related functions for better
 * maintainability and discoverability. All input sanitization, path validation,
 * and other security-critical functions should be defined here.
 *
 * Functions:
 *   - sanitizeForPrompt: Prevent prompt injection in LLM inputs
 *   - validatePath: Prevent path traversal attacks
 */

import { normalize, sep } from 'node:path';
import { homedir } from 'node:os';
import { resolvePath } from './paths.js';

/**
 * Sanitize user input to prevent prompt injection.
 * CR-2 FIX: Wrap user content in XML delimiters to separate from instructions.
 * I-1 FIX: Exported for use by other modules (tension-detector, signal-source-classifier, etc.)
 * I-2 FIX: Added truncation to prevent context overflow attacks.
 *
 * @param text - Raw user input text
 * @param maxLength - Maximum length before truncation (default: 1000)
 * @returns Sanitized text safe for inclusion in LLM prompts
 */
export function sanitizeForPrompt(text: string, maxLength = 1000): string {
  // Escape any XML-like tags in the user content
  let sanitized = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Truncate to prevent context overflow attacks
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }
  return sanitized;
}

/**
 * Validate path is within allowed root directories to prevent path traversal.
 *
 * CR-1 FIX: Uses resolvePath() which properly expands ~ to home directory
 * before normalizing. This prevents ~/../ attacks where Node's resolve()
 * would treat ~ as a literal directory name.
 *
 * Uses path separator check to prevent prefix attacks like
 * /tmp2/evil bypassing /tmp or /home/user_evil bypassing /home/user.
 *
 * @param inputPath - Path to validate (may include ~)
 * @param allowedRoots - Array of allowed root directories (defaults to home + /tmp)
 * @returns Normalized, validated path
 * @throws Error if path resolves outside allowed directories
 */
export function validatePath(
  inputPath: string,
  allowedRoots?: string[]
): string {
  // Use resolvePath() which properly expands ~ to home directory
  const resolved = resolvePath(inputPath);
  const normalized = normalize(resolved);
  const home = homedir();
  // Default allowed roots: home directory and common temp locations
  // /private/tmp is macOS symlink target of /tmp
  // /var/folders is macOS per-user temp directory (used by Node.js os.tmpdir())
  const roots = allowedRoots ?? [home, '/tmp', '/private/tmp', '/var/folders'];

  // Require exact match OR path separator after root
  // Prevents /tmp2/evil from matching /tmp, /home/user_evil from matching /home/user
  const isAllowed = roots.some(root =>
    normalized === root || normalized.startsWith(root + sep)
  );

  if (!isAllowed) {
    throw new Error(
      `Path traversal blocked: ${inputPath} resolves to ${normalized} which is outside allowed directories (${roots.join(', ')})`
    );
  }

  return normalized;
}

/**
 * Expand ~ to home directory.
 * Utility for simple path expansion without full validation.
 *
 * @param path - Path that may start with ~
 * @returns Path with ~ expanded to home directory
 */
export function expandTilde(path: string): string {
  return path.replace(/^~/, process.env['HOME'] || homedir());
}
