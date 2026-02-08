/**
 * Backup and rollback utilities for safe soul updates.
 * Provides safety net before any SOUL.md modifications.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  statSync,
  rmSync,
} from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';

// MN-3: Maximum number of backups to keep per workspace
const MAX_BACKUPS = 10;
import { execFileSync } from 'node:child_process';

export interface Backup {
  path: string;
  timestamp: string;
  filename: string;
}

/**
 * Create backup of file before modification.
 * Returns path to backup file.
 *
 * I-1 FIX: Now accepts optional workspacePath to ensure backups are stored
 * in a consistent location that rollback can discover.
 *
 * @param filePath - File to backup
 * @param workspacePath - Optional workspace path for backup storage (default: dirname of filePath)
 */
export function backupFile(filePath: string, workspacePath?: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Cannot backup non-existent file: ${filePath}`);
  }

  // I-1 FIX: Use workspace path for backup location if provided, otherwise fall back to file dir
  const backupRoot = workspacePath ?? dirname(filePath);
  const backupDir = resolve(backupRoot, '.neon-soul', 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = basename(filePath);
  const backupPath = resolve(backupDir, timestamp, filename);

  // Create backup directory
  const backupParent = dirname(backupPath);
  if (!existsSync(backupParent)) {
    mkdirSync(backupParent, { recursive: true });
  }

  // Copy file to backup location
  copyFileSync(filePath, backupPath);

  // MN-3 FIX: Rotate old backups to prevent unbounded accumulation
  rotateBackups(backupRoot);

  return backupPath;
}

/**
 * Rotate old backups, keeping only the most recent MAX_BACKUPS.
 * MN-3: Prevents inode accumulation over time.
 */
function rotateBackups(workspacePath: string): void {
  const backupDir = resolve(workspacePath, '.neon-soul', 'backups');

  if (!existsSync(backupDir)) {
    return;
  }

  try {
    const timestamps = readdirSync(backupDir)
      .filter((name) => {
        const fullPath = join(backupDir, name);
        return existsSync(fullPath) && statSync(fullPath).isDirectory();
      })
      .sort() // Ascending order (oldest first)
      .reverse(); // Descending order (newest first)

    // Remove backups beyond MAX_BACKUPS
    if (timestamps.length > MAX_BACKUPS) {
      const toRemove = timestamps.slice(MAX_BACKUPS);
      for (const timestamp of toRemove) {
        const dirPath = join(backupDir, timestamp);
        try {
          rmSync(dirPath, { recursive: true });
        } catch (error) {
          // M-4 FIX: Log removal errors at debug level
          if (process.env['DEBUG'] || process.env['NEON_SOUL_DEBUG']) {
            console.debug(`Backup rotation: failed to remove ${dirPath}: ${error instanceof Error ? error.message : error}`);
          }
        }
      }
    }
  } catch (error) {
    // M-4 FIX: Log rotation errors at debug level (safety feature, not critical)
    if (process.env['DEBUG'] || process.env['NEON_SOUL_DEBUG']) {
      console.debug(`Backup rotation failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}

/**
 * List available backups for rollback.
 */
export function listBackups(workspacePath: string): Backup[] {
  const backupDir = resolve(workspacePath, '.neon-soul', 'backups');

  if (!existsSync(backupDir)) {
    return [];
  }

  const backups: Backup[] = [];
  const timestamps = readdirSync(backupDir);

  for (const timestamp of timestamps) {
    const timestampDir = join(backupDir, timestamp);
    const stat = statSync(timestampDir);

    if (stat.isDirectory()) {
      const files = readdirSync(timestampDir);
      for (const file of files) {
        backups.push({
          path: join(timestampDir, file),
          timestamp,
          filename: file,
        });
      }
    }
  }

  // Sort by timestamp descending (most recent first)
  backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return backups;
}

/**
 * Rollback to most recent backup.
 * Returns the backup that was restored.
 */
export function rollback(workspacePath: string): Backup | null {
  const backups = listBackups(workspacePath);

  if (backups.length === 0) {
    return null;
  }

  const latest = backups[0];
  if (!latest) {
    return null;
  }

  // Determine original file location
  const originalPath = resolve(workspacePath, latest.filename);

  // Restore backup
  copyFileSync(latest.path, originalPath);

  return latest;
}

/**
 * Check if path is in a git repository.
 */
function isGitRepo(dirPath: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: dirPath,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Commit soul update to git if workspace is a repo.
 * Uses execFileSync with array arguments to prevent command injection (CR-1).
 */
export async function commitSoulUpdate(
  soulPath: string,
  message: string
): Promise<void> {
  const dirPath = dirname(soulPath);

  if (!isGitRepo(dirPath)) {
    return; // Not a git repo, skip commit
  }

  try {
    // CR-1 FIX: Use execFileSync with array arguments to prevent shell injection
    execFileSync('git', ['add', soulPath], { cwd: dirPath, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', message], {
      cwd: dirPath,
      stdio: 'pipe',
    });
  } catch (error) {
    // MN-3 FIX: Log at debug level so issues are discoverable
    // Commit failed - could be nothing to commit, or git config issue
    if (process.env['DEBUG'] || process.env['NEON_SOUL_DEBUG']) {
      console.debug(`Git commit skipped: ${error instanceof Error ? error.message : error}`);
    }
  }
}
