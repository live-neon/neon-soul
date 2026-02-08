/**
 * Status Command
 *
 * Shows current soul synthesis state.
 *
 * Usage:
 *   npx tsx src/commands/status.ts [options]
 *
 * Options:
 *   --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
 *   --verbose           Show detailed information
 *   --help              Show help message
 *
 * Output:
 *   Last synthesis: 2026-02-07T10:30:00Z
 *   Pending memory: 1,234 chars (above threshold)
 *
 *   Counts:
 *     Signals: 42
 *     Principles: 18
 *     Axioms: 7
 *
 *   Dimension Coverage: 5/7 (71%)
 */

import { existsSync, readdirSync, readFileSync, statSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { getDefaultWorkspacePath, resolvePath } from '../lib/paths.js';
import { loadState } from '../lib/state.js';
import { loadSynthesisData } from '../lib/persistence.js';
import { SOULCRAFT_DIMENSIONS } from '../types/dimensions.js';

interface StatusOptions {
  workspacePath: string;
  verbose: boolean;
}

function parseArgs(args: string[]): StatusOptions {
  const options: StatusOptions = {
    workspacePath: getDefaultWorkspacePath(),
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    if (arg === '--workspace' && next) {
      options.workspacePath = resolvePath(next);
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
NEON-SOUL Status Command

Show current soul synthesis state.

Usage:
  npx tsx src/commands/status.ts [options]

Options:
  --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
  --verbose, -v       Show detailed information
  --help, -h          Show this help message

Examples:
  # Show current status
  npx tsx src/commands/status.ts

  # Verbose output with file details
  npx tsx src/commands/status.ts --verbose

  # Use custom workspace
  npx tsx src/commands/status.ts --workspace ./my-workspace
`);
}

/**
 * Calculate pending memory content by scanning memory directory.
 * Returns total chars in memory files that have been modified since last run.
 */
function calculatePendingContent(
  workspacePath: string,
  lastRunTimestamp: string
): { totalChars: number; newFiles: number; modifiedFiles: number } {
  const memoryPath = join(workspacePath, 'memory');

  if (!existsSync(memoryPath)) {
    return { totalChars: 0, newFiles: 0, modifiedFiles: 0 };
  }

  const lastRunDate = lastRunTimestamp ? new Date(lastRunTimestamp) : new Date(0);
  let totalChars = 0;
  let newFiles = 0;
  let modifiedFiles = 0;

  function walkDir(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // I-4 FIX: Skip symlinks to prevent traversal to arbitrary filesystem locations
      const lstat = lstatSync(fullPath);
      if (lstat.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const stat = statSync(fullPath);
        const modifiedDate = new Date(stat.mtime);

        if (modifiedDate > lastRunDate) {
          const content = readFileSync(fullPath, 'utf-8');
          totalChars += content.length;

          if (lastRunTimestamp === '') {
            newFiles++;
          } else {
            modifiedFiles++;
          }
        }
      }
    }
  }

  walkDir(memoryPath);

  return { totalChars, newFiles, modifiedFiles };
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) {
    return 'Never';
  }

  const date = new Date(timestamp);
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
}

function formatDimensionCoverage(axioms: Array<{ dimension: string }>): string {
  const covered = new Set(axioms.map(a => a.dimension));
  const total = SOULCRAFT_DIMENSIONS.length;
  const count = covered.size;
  const percent = Math.round((count / total) * 100);

  const lines: string[] = [];
  lines.push(`  Coverage: ${count}/${total} (${percent}%)`);

  for (const dim of SOULCRAFT_DIMENSIONS) {
    // M-5 FIX: Use ASCII fallbacks if TERM indicates limited capabilities
    const useAscii = process.env['TERM'] === 'dumb' || process.env['NO_UNICODE'];
    const status = covered.has(dim) ? (useAscii ? '[x]' : '✓') : (useAscii ? '[ ]' : '○');
    // Format dimension name: "identity-core" -> "Identity Core"
    const displayName = dim
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    lines.push(`    ${status} ${displayName}`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('\n📊 NEON-SOUL Status\n');

  // Check if workspace exists
  if (!existsSync(options.workspacePath)) {
    console.log(`Workspace not found: ${options.workspacePath}`);
    console.log('\nRun synthesis first or specify a valid workspace:');
    console.log('  npx tsx src/commands/synthesize.ts');
    return;
  }

  // Load state
  const state = loadState(options.workspacePath);
  const lastRun = state.lastRun.timestamp;

  console.log('## Last Synthesis');
  console.log(`  Timestamp: ${formatTimestamp(lastRun)}`);

  if (state.lastRun.soulVersion) {
    console.log(`  Soul Version: ${state.lastRun.soulVersion.slice(0, 8)}...`);
  }
  console.log('');

  // Calculate pending content
  const pending = calculatePendingContent(options.workspacePath, lastRun);
  const threshold = 2000; // Default threshold
  const aboveThreshold = pending.totalChars >= threshold;

  console.log('## Pending Memory');
  console.log(`  Content: ${pending.totalChars.toLocaleString()} chars`);
  console.log(`  Threshold: ${threshold.toLocaleString()} chars`);
  console.log(`  Status: ${aboveThreshold ? '🟢 Ready for synthesis' : '🟡 Below threshold'}`);

  if (options.verbose) {
    console.log(`  New files: ${pending.newFiles}`);
    console.log(`  Modified files: ${pending.modifiedFiles}`);
  }
  console.log('');

  // Load synthesis data
  const data = loadSynthesisData(options.workspacePath);

  console.log('## Counts');
  if (data) {
    console.log(`  Signals: ${data.metrics.signalCount}`);
    console.log(`  Principles: ${data.metrics.principleCount}`);
    console.log(`  Axioms: ${data.metrics.axiomCount}`);
  } else {
    console.log('  Signals: 0');
    console.log('  Principles: 0');
    console.log('  Axioms: 0');
    console.log('  (No synthesis data found - run synthesize first)');
  }
  console.log('');

  // Dimension coverage
  console.log('## Dimensions');
  if (data && data.axioms.length > 0) {
    console.log(formatDimensionCoverage(data.axioms));
  } else {
    console.log('  Coverage: 0/7 (0%)');
    console.log('  (No axioms - run synthesize first)');
  }
  console.log('');

  // Verbose: show processed files
  if (options.verbose && Object.keys(state.lastRun.memoryFiles).length > 0) {
    console.log('## Processed Files');
    const files = Object.entries(state.lastRun.memoryFiles);
    for (const [file, info] of files.slice(0, 10)) {
      console.log(`  - ${file} (line ${info.line})`);
    }
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
    console.log('');
  }

  // Quick actions
  console.log('## Quick Actions');
  if (aboveThreshold) {
    console.log('  Run synthesis: npx tsx src/commands/synthesize.ts');
    console.log('  Preview first: npx tsx src/commands/synthesize.ts --dry-run');
  } else {
    console.log('  Force synthesis: npx tsx src/commands/synthesize.ts --force');
    console.log('  View axioms: npx tsx src/commands/audit.ts --list');
  }
  console.log('');
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

    const state = loadState(options.workspacePath);
    const data = loadSynthesisData(options.workspacePath);
    const pending = calculatePendingContent(options.workspacePath, state.lastRun.timestamp);

    return {
      success: true,
      data: {
        lastRun: state.lastRun.timestamp,
        pendingChars: pending.totalChars,
        counts: {
          signals: data?.metrics.signalCount ?? 0,
          principles: data?.metrics.principleCount ?? 0,
          axioms: data?.metrics.axiomCount ?? 0,
        },
        dimensionCoverage: data?.metrics.dimensionCoverage ?? 0,
      },
    };
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
