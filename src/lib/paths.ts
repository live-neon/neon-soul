/**
 * Shared Path Resolution Utilities
 *
 * Provides consistent path resolution across all commands.
 * Extracted from synthesize.ts per twin review IM-2.
 */

import { resolve } from 'node:path';
import { homedir } from 'node:os';

/**
 * Default OpenClaw workspace paths.
 */
export const OPENCLAW_DEFAULTS = {
  /** Default memory directory */
  memory: '~/.openclaw/workspace/memory',
  /** Default SOUL.md output location */
  output: '~/.openclaw/workspace/SOUL.md',
  /** Default workspace root */
  workspace: '~/.openclaw/workspace',
} as const;

/**
 * Get default memory path, expanding ~ to home directory.
 * IM-5 FIX: Use os.homedir() instead of fallback to '~' which doesn't expand.
 */
export function getDefaultMemoryPath(): string {
  const home = process.env['HOME'] || homedir();
  return resolve(home, '.openclaw/workspace/memory');
}

/**
 * Get default output path, expanding ~ to home directory.
 * IM-5 FIX: Use os.homedir() instead of fallback to '~' which doesn't expand.
 */
export function getDefaultOutputPath(): string {
  const home = process.env['HOME'] || homedir();
  return resolve(home, '.openclaw/workspace/SOUL.md');
}

/**
 * Get default workspace path, expanding ~ to home directory.
 * IM-5 FIX: Use os.homedir() instead of fallback to '~' which doesn't expand.
 */
export function getDefaultWorkspacePath(): string {
  const home = process.env['HOME'] || homedir();
  return resolve(home, '.openclaw/workspace');
}

/**
 * Derive workspace path from memory path.
 * Handles both `/memory` and `/memory/` suffixes.
 *
 * @example
 * getWorkspaceFromMemory('/path/to/workspace/memory') // '/path/to/workspace'
 * getWorkspaceFromMemory('/path/to/workspace/memory/') // '/path/to/workspace'
 */
export function getWorkspaceFromMemory(memoryPath: string): string {
  let path = memoryPath.replace(/\/$/, ''); // Remove trailing slash
  if (path.endsWith('/memory')) {
    return path.slice(0, -7);
  }
  // If path doesn't end with /memory, assume it's the workspace itself
  return path;
}

/**
 * Resolve a path, handling ~ expansion and relative paths.
 * IM-5 FIX: Use os.homedir() instead of fallback to '' which creates invalid paths.
 */
export function resolvePath(inputPath: string, defaultPath?: string): string {
  if (!inputPath && defaultPath) {
    return resolvePath(defaultPath);
  }

  // Expand ~ to home directory
  if (inputPath.startsWith('~')) {
    const home = process.env['HOME'] || homedir();
    return resolve(home, inputPath.slice(2)); // Skip ~/ or ~
  }

  return resolve(inputPath);
}

/**
 * Get .neon-soul directory path for a workspace.
 */
export function getNeonSoulPath(workspacePath: string): string {
  return resolve(workspacePath, '.neon-soul');
}
