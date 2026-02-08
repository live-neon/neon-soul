/**
 * Trace Command
 *
 * Quick single-axiom provenance lookup.
 * Focused, minimal output for answering "where did this come from?"
 *
 * Usage:
 *   npx tsx src/commands/trace.ts <axiom-id>
 *
 * Options:
 *   <axiom-id>          Axiom ID or CJK character to trace
 *   --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
 *   --help              Show help message
 *
 * Output:
 *   誠 (honesty over performance)
 *   └── "be honest about capabilities" (N=4)
 *       ├── memory/preferences/communication.md:23
 *       └── memory/diary/2024-03-15.md:45
 *
 * Note: For full provenance exploration, use the audit command:
 *   npx tsx src/commands/audit.ts --list
 *   npx tsx src/commands/audit.ts --stats
 */

import { getDefaultWorkspacePath, resolvePath } from '../lib/paths.js';
import { loadAxioms, loadPrinciples } from '../lib/persistence.js';
import type { Axiom } from '../types/axiom.js';
import type { Principle } from '../types/principle.js';

interface TraceOptions {
  axiomId: string | undefined;
  workspacePath: string;
}

function parseArgs(args: string[]): TraceOptions {
  const options: TraceOptions = {
    axiomId: undefined,
    workspacePath: getDefaultWorkspacePath(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    if (arg === '--workspace' && next) {
      options.workspacePath = resolvePath(next);
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.axiomId = arg;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
NEON-SOUL Trace Command

Quick single-axiom provenance lookup.
For full provenance exploration, use the audit command.

Usage:
  npx tsx src/commands/trace.ts <axiom-id>

Arguments:
  <axiom-id>          Axiom ID (e.g., ax_honesty) or CJK character (e.g., 誠)

Options:
  --workspace <path>  Workspace path (default: ~/.openclaw/workspace)
  --help, -h          Show this help message

Examples:
  # Trace by axiom ID
  npx tsx src/commands/trace.ts ax_honesty

  # Trace by CJK character
  npx tsx src/commands/trace.ts 誠

  # Use custom workspace
  npx tsx src/commands/trace.ts ax_honesty --workspace ./my-workspace

Related Commands:
  # Full provenance exploration
  npx tsx src/commands/audit.ts --list    # List all axioms
  npx tsx src/commands/audit.ts --stats   # Show statistics
  npx tsx src/commands/audit.ts ax_honesty  # Detailed view
`);
}

function formatTrace(
  axiom: Axiom,
  principleMap: Map<string, Principle>
): string {
  const lines: string[] = [];

  // Axiom header - compact format
  const notated = axiom.canonical?.notated;
  const native = axiom.canonical?.native || axiom.text;

  if (notated) {
    lines.push(notated);
  } else {
    lines.push(native);
  }

  // Contributing principles with source locations
  const principleRefs = axiom.derived_from.principles;

  for (let i = 0; i < principleRefs.length; i++) {
    const ref = principleRefs[i];
    if (!ref) continue;

    const isLastPrinciple = i === principleRefs.length - 1;
    const principlePrefix = isLastPrinciple ? '└──' : '├──';
    const childPrefix = isLastPrinciple ? '    ' : '│   ';

    // Truncate principle text for compact display
    const text = ref.text.length > 50
      ? ref.text.slice(0, 47) + '...'
      : ref.text;

    lines.push(`${principlePrefix} "${text}" (N=${ref.n_count})`);

    // Get full principle for signal sources
    const principle = principleMap.get(ref.id);
    if (principle) {
      const signalRefs = principle.derived_from.signals;
      for (let j = 0; j < signalRefs.length; j++) {
        const signal = signalRefs[j];
        if (!signal) continue;

        const isLastSignal = j === signalRefs.length - 1;
        const signalPrefix = isLastSignal ? '└──' : '├──';

        // Show just the source location for compact output
        const source = signal.source;
        const location = source.line
          ? `${source.file}:${source.line}`
          : source.file;

        lines.push(`${childPrefix}${signalPrefix} ${location}`);
      }
    }
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.axiomId) {
    console.log('\n🔗 NEON-SOUL Trace\n');
    console.log('Usage: npx tsx src/commands/trace.ts <axiom-id>');
    console.log('');
    console.log('Run with --help for more information.');
    return;
  }

  // Load data
  const axioms = loadAxioms(options.workspacePath);
  const principles = loadPrinciples(options.workspacePath);
  const principleMap = new Map(principles.map((p) => [p.id, p]));

  if (axioms.length === 0) {
    console.log('\n🔗 NEON-SOUL Trace\n');
    console.log('No axioms found. Run synthesis first:');
    console.log('  npx tsx src/commands/synthesize.ts');
    return;
  }

  // Find the axiom
  // M-7 FIX: Use exact match for ID, and word-boundary match for CJK notation
  // This prevents false positives from partial CJK character matches
  const searchId = options.axiomId ?? '';
  const axiom = axioms.find((a) => {
    // Exact ID match
    if (a.id === searchId) return true;
    // Notated form: check for exact match or as a distinct symbol
    const notated = a.canonical?.notated;
    if (!notated) return false;
    // Exact match on entire notated form
    if (notated === searchId) return true;
    // Check if searchId appears as a word (surrounded by spaces or at boundaries)
    const pattern = new RegExp(`(^|\\s)${searchId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`);
    return pattern.test(notated);
  });

  if (!axiom) {
    console.log('\n🔗 NEON-SOUL Trace\n');
    console.log(`Axiom not found: ${options.axiomId}`);
    console.log('');
    console.log('Available axioms:');
    for (const a of axioms.slice(0, 5)) {
      const notated = a.canonical?.notated || '';
      console.log(`  - ${a.id}${notated ? ` (${notated})` : ''}`);
    }
    if (axioms.length > 5) {
      console.log(`  ... and ${axioms.length - 5} more`);
    }
    console.log('');
    console.log('Use audit --list for full list:');
    console.log('  npx tsx src/commands/audit.ts --list');
    return;
  }

  // Output trace - minimal, no header for clean piping
  console.log('');
  console.log(formatTrace(axiom, principleMap));
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

  if (!options.axiomId) {
    return {
      success: false,
      error: 'Axiom ID required. Usage: trace <axiom-id>',
    };
  }

  try {
    const axioms = loadAxioms(options.workspacePath);
    const principles = loadPrinciples(options.workspacePath);

    if (axioms.length === 0) {
      return {
        success: false,
        error: 'No axioms found. Run synthesis first.',
      };
    }

    const axiom = axioms.find(
      (a) => a.id === options.axiomId || a.canonical?.notated?.includes(options.axiomId ?? '')
    );

    if (!axiom) {
      return {
        success: false,
        error: `Axiom not found: ${options.axiomId}`,
        data: {
          availableAxioms: axioms.slice(0, 5).map(a => ({
            id: a.id,
            notated: a.canonical?.notated,
          })),
        },
      };
    }

    const principleMap = new Map(principles.map((p) => [p.id, p]));

    // Build trace data
    const trace = {
      axiom: {
        id: axiom.id,
        notated: axiom.canonical?.notated,
        text: axiom.canonical?.native || axiom.text,
      },
      principles: axiom.derived_from.principles.map(ref => {
        const principle = principleMap.get(ref.id);
        return {
          text: ref.text,
          nCount: ref.n_count,
          sources: principle?.derived_from.signals.map(s => ({
            file: s.source.file,
            line: s.source.line,
          })) ?? [],
        };
      }),
    };

    return {
      success: true,
      data: trace,
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
