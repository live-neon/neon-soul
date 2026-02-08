/**
 * Rollback Command
 *
 * Restore previous SOUL.md from backup.
 *
 * Usage:
 *   npx tsx src/commands/rollback.ts [options]
 *
 * Options:
 *   --list              List available backups
 *   --backup <id>       Restore specific backup (timestamp)
 *   --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
 *   --force             Skip confirmation prompt
 *   --help              Show help message
 *
 * Output:
 *   Available backups:
 *     1. 2026-02-07T10-30-00-000Z (2 hours ago)
 *     2. 2026-02-06T15-45-00-000Z (1 day ago)
 *
 *   Restored: SOUL.md from 2026-02-07T10-30-00-000Z
 */

import { existsSync } from 'node:fs';
import { getDefaultWorkspacePath, resolvePath } from '../lib/paths.js';
import { listBackups, rollback, type Backup } from '../lib/backup.js';

interface RollbackOptions {
  workspacePath: string;
  listOnly: boolean;
  backupId: string | undefined;
  force: boolean;
}

function parseArgs(args: string[]): RollbackOptions {
  const options: RollbackOptions = {
    workspacePath: getDefaultWorkspacePath(),
    listOnly: false,
    backupId: undefined,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    if (arg === '--list' || arg === '-l') {
      options.listOnly = true;
    } else if (arg === '--backup' && next) {
      options.backupId = next;
      i++;
    } else if (arg === '--workspace' && next) {
      options.workspacePath = resolvePath(next);
      i++;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
NEON-SOUL Rollback Command

Restore previous SOUL.md from backup.

Usage:
  npx tsx src/commands/rollback.ts [options]

Options:
  --list, -l          List available backups
  --backup <id>       Restore specific backup by timestamp
  --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
  --force, -f         Skip confirmation prompt
  --help, -h          Show this help message

Examples:
  # List available backups
  npx tsx src/commands/rollback.ts --list

  # Restore most recent backup
  npx tsx src/commands/rollback.ts

  # Restore specific backup
  npx tsx src/commands/rollback.ts --backup 2026-02-07T10-30-00-000Z

  # Force restore without confirmation
  npx tsx src/commands/rollback.ts --force
`);
}

function formatTimestamp(timestamp: string): string {
  // I-2 FIX: Convert backup timestamp format (2026-02-07T10-30-00-000Z) to valid ISO
  // Input: 2026-02-07T10-30-00-000Z
  // Output: 2026-02-07T10:30:00.000Z (note: dot before milliseconds, not colon)
  const isoTimestamp = timestamp
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');

  try {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diffMins < 60) {
      relative = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      relative = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    return `${timestamp} (${relative})`;
  } catch {
    return timestamp;
  }
}

function formatBackupList(backups: Backup[]): string {
  if (backups.length === 0) {
    return 'No backups available.';
  }

  const lines: string[] = ['Available backups:', ''];

  for (let i = 0; i < backups.length; i++) {
    const backup = backups[i]!;
    lines.push(`  ${i + 1}. ${formatTimestamp(backup.timestamp)}`);
    lines.push(`     File: ${backup.filename}`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('\n⏪ NEON-SOUL Rollback\n');

  // Check if workspace exists
  if (!existsSync(options.workspacePath)) {
    console.log(`Workspace not found: ${options.workspacePath}`);
    return;
  }

  // List backups
  const backups = listBackups(options.workspacePath);

  if (options.listOnly) {
    console.log(formatBackupList(backups));
    return;
  }

  if (backups.length === 0) {
    console.log('No backups available.');
    console.log('\nBackups are created automatically during synthesis.');
    console.log('Run synthesis first to create a backup.');
    return;
  }

  // Find backup to restore
  let backupToRestore: Backup | undefined;

  if (options.backupId) {
    backupToRestore = backups.find(b => b.timestamp === options.backupId);
    if (!backupToRestore) {
      console.log(`Backup not found: ${options.backupId}`);
      console.log('\nAvailable backups:');
      for (const backup of backups.slice(0, 5)) {
        console.log(`  - ${backup.timestamp}`);
      }
      return;
    }
  } else {
    backupToRestore = backups[0];
  }

  if (!backupToRestore) {
    console.log('No backup to restore.');
    return;
  }

  // Confirm restoration
  console.log(`Backup: ${formatTimestamp(backupToRestore.timestamp)}`);
  console.log(`File: ${backupToRestore.filename}`);
  console.log('');

  if (!options.force) {
    console.log('⚠️  This will overwrite the current SOUL.md');
    console.log('');
    console.log('To proceed, run with --force flag:');
    console.log(`  npx tsx src/commands/rollback.ts --force`);
    console.log('');
    console.log('Or restore a specific backup:');
    console.log(`  npx tsx src/commands/rollback.ts --backup ${backupToRestore.timestamp} --force`);
    return;
  }

  // Perform rollback
  const restored = rollback(options.workspacePath);

  if (restored) {
    console.log('✅ Restored successfully!');
    console.log('');
    console.log(`SOUL.md restored from: ${restored.timestamp}`);
  } else {
    console.log('❌ Rollback failed.');
    console.log('');
    console.log('The backup file may be missing or corrupted.');
  }
}

/**
 * Programmatic entry point for skill loader.
 */
export async function run(args: string[]): Promise<{
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}> {
  const options = parseArgs(args);

  try {
    if (!existsSync(options.workspacePath)) {
      return {
        success: false,
        error: `Workspace not found: ${options.workspacePath}`,
      };
    }

    const backups = listBackups(options.workspacePath);

    if (options.listOnly) {
      return {
        success: true,
        data: {
          backups: backups.map(b => ({
            timestamp: b.timestamp,
            filename: b.filename,
            path: b.path,
          })),
        },
      };
    }

    if (backups.length === 0) {
      return {
        success: false,
        error: 'No backups available',
      };
    }

    if (!options.force) {
      return {
        success: false,
        error: 'Rollback requires --force flag for confirmation',
        data: {
          availableBackup: backups[0]?.timestamp,
        },
      };
    }

    const restored = rollback(options.workspacePath);

    if (restored) {
      return {
        success: true,
        message: `Restored from ${restored.timestamp}`,
        data: {
          restoredFrom: restored.timestamp,
          filename: restored.filename,
        },
      };
    } else {
      return {
        success: false,
        error: 'Rollback failed - backup may be missing or corrupted',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
