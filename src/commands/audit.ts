/**
 * Audit Command
 *
 * Traces axiom provenance back to source signals.
 * Provides full transparency into identity formation.
 *
 * Usage:
 *   npx tsx src/commands/audit.ts [options] [axiom-id]
 *
 * Options:
 *   <axiom-id>         Show provenance chain for specific axiom
 *   --stats            Show audit statistics
 *   --list             List all axioms with brief provenance
 *   --workspace <path> Workspace path (default: ~/.openclaw/workspace)
 *   --help             Show help message
 *
 * Output:
 *   Axiom: 誠 (honesty over performance)
 *   ├── Principle: "be honest about capabilities" (N=4)
 *   │   ├── Signal: "I prefer honest answers" (memory/preferences/communication.md:23)
 *   │   ├── Signal: "Don't sugarcoat feedback" (memory/diary/2024-03-15.md:45)
 *   │   └── ...
 *   └── Created: 2024-03-20T14:30:00Z
 */

import { getDefaultWorkspacePath, resolvePath } from '../lib/paths.js';
import { loadAxioms, loadPrinciples, loadSignals } from '../lib/persistence.js';
import type { Axiom } from '../types/axiom.js';
import type { Principle } from '../types/principle.js';
import type { Signal } from '../types/signal.js';

interface AuditOptions {
  axiomId: string | undefined;
  showStats: boolean;
  listAll: boolean;
  workspacePath: string;
}

function parseArgs(args: string[]): AuditOptions {
  const options: AuditOptions = {
    axiomId: undefined,
    showStats: false,
    listAll: false,
    workspacePath: getDefaultWorkspacePath(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    if (arg === '--stats') {
      options.showStats = true;
    } else if (arg === '--list') {
      options.listAll = true;
    } else if (arg === '--workspace' && next) {
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
NEON-SOUL Audit Command

Trace axiom provenance back to source signals.
Exploration mode for full provenance analysis.

Usage:
  npx tsx src/commands/audit.ts [options] [axiom-id]

Options:
  <axiom-id>         Show detailed provenance for specific axiom
  --stats            Show audit statistics (dimensions, tiers)
  --list             List all axioms with brief provenance summary
  --workspace <path> Workspace path (default: ~/.openclaw/workspace)
  --help, -h         Show this help message

Examples:
  # List all axioms
  npx tsx src/commands/audit.ts --list

  # Show statistics
  npx tsx src/commands/audit.ts --stats

  # Trace a specific axiom (detailed view)
  npx tsx src/commands/audit.ts ax_honesty

  # Use CJK character as ID
  npx tsx src/commands/audit.ts 誠

Note: For quick single-axiom lookup, use the trace command instead:
  npx tsx src/commands/trace.ts <axiom-id>
`);
}

function loadData(workspacePath: string): {
  axioms: Axiom[];
  principles: Principle[];
  signals: Signal[];
} {
  return {
    axioms: loadAxioms(workspacePath),
    principles: loadPrinciples(workspacePath),
    signals: loadSignals(workspacePath),
  };
}

function formatProvenanceTree(
  axiom: Axiom,
  principleMap: Map<string, Principle>,
  signalMap: Map<string, Signal>
): string {
  const lines: string[] = [];

  // Axiom header
  const notated = axiom.canonical?.notated || axiom.canonical?.native || axiom.text;
  lines.push(`Axiom: ${notated}`);
  lines.push(`Tier: ${axiom.tier}`);
  lines.push(`Dimension: ${axiom.dimension}`);
  lines.push('');

  // Contributing principles
  lines.push('Provenance:');
  const principleRefs = axiom.derived_from.principles;

  for (let i = 0; i < principleRefs.length; i++) {
    const ref = principleRefs[i];
    if (!ref) continue;

    const isLast = i === principleRefs.length - 1;
    const prefix = isLast ? '└──' : '├──';
    const childPrefix = isLast ? '    ' : '│   ';

    lines.push(`${prefix} Principle: "${ref.text}" (N=${ref.n_count})`);

    // Get full principle for signal details
    const principle = principleMap.get(ref.id);
    if (principle) {
      const signalRefs = principle.derived_from.signals;
      for (let j = 0; j < signalRefs.length; j++) {
        const signalRef = signalRefs[j];
        if (!signalRef) continue;

        const isLastSignal = j === signalRefs.length - 1;
        const signalPrefix = isLastSignal ? '└──' : '├──';

        // Try to get full signal for more details
        const fullSignal = signalMap.get(signalRef.id);
        const source = fullSignal?.source || signalRef.source;
        const location = source.line
          ? `${source.file}:${source.line}`
          : source.file;

        const signalText = fullSignal?.text || signalRef.id;
        const displayText = signalText.length > 50
          ? signalText.slice(0, 47) + '...'
          : signalText;

        lines.push(`${childPrefix}${signalPrefix} Signal: "${displayText}" (${location})`);
      }
    }
  }

  // Creation timestamp
  lines.push('');
  lines.push(`Created: ${axiom.derived_from.promoted_at}`);

  return lines.join('\n');
}

function formatAxiomList(axioms: Axiom[]): string {
  const lines: string[] = [
    '# Axiom List',
    '',
    '| ID | Notation | Tier | Dimension | Principles |',
    '|----|----------|------|-----------|------------|',
  ];

  for (const axiom of axioms) {
    const notation = axiom.canonical?.notated || axiom.text.slice(0, 30);
    const principleCount = axiom.derived_from.principles.length;

    lines.push(
      `| ${axiom.id} | ${notation} | ${axiom.tier} | ${axiom.dimension} | ${principleCount} |`
    );
  }

  return lines.join('\n');
}

function formatStats(
  axioms: Axiom[],
  principles: Principle[],
  signals: Signal[]
): string {
  const lines: string[] = [
    '# Audit Statistics',
    '',
  ];

  // Axiom stats
  const tierCounts: Record<string, number> = {};
  const dimensionCounts: Record<string, number> = {};

  for (const axiom of axioms) {
    tierCounts[axiom.tier] = (tierCounts[axiom.tier] || 0) + 1;
    dimensionCounts[axiom.dimension] = (dimensionCounts[axiom.dimension] || 0) + 1;
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Signals | ${signals.length} |`);
  lines.push(`| Principles | ${principles.length} |`);
  lines.push(`| Axioms | ${axioms.length} |`);
  lines.push('');

  lines.push('## By Tier');
  lines.push('');
  lines.push('| Tier | Count |');
  lines.push('|------|-------|');
  for (const [tier, count] of Object.entries(tierCounts).sort()) {
    lines.push(`| ${tier} | ${count} |`);
  }
  lines.push('');

  lines.push('## By Dimension');
  lines.push('');
  lines.push('| Dimension | Count |');
  lines.push('|-----------|-------|');
  for (const [dim, count] of Object.entries(dimensionCounts).sort()) {
    lines.push(`| ${dim} | ${count} |`);
  }

  // Dimension coverage
  const coveredDimensions = Object.keys(dimensionCounts).length;
  lines.push('');
  lines.push(`**Dimension Coverage**: ${coveredDimensions}/7 (${Math.round(coveredDimensions / 7 * 100)}%)`);

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('\n🔍 NEON-SOUL Audit\n');

  const { axioms, principles, signals } = loadData(options.workspacePath);
  const principleMap = new Map(principles.map((p) => [p.id, p]));
  const signalMap = new Map(signals.map((s) => [s.id, s]));

  if (axioms.length === 0) {
    console.log('No axioms found. Run synthesis first:');
    console.log('  npx tsx src/commands/synthesize.ts');
    console.log('');
    console.log(`Workspace: ${options.workspacePath}`);
    return;
  }

  if (options.showStats) {
    console.log(formatStats(axioms, principles, signals));
    return;
  }

  if (options.listAll) {
    console.log(formatAxiomList(axioms));
    return;
  }

  if (options.axiomId) {
    const axiom = axioms.find(
      (a) => a.id === options.axiomId || a.canonical?.notated?.includes(options.axiomId ?? '')
    );

    if (!axiom) {
      console.log(`Axiom not found: ${options.axiomId}`);
      console.log('\nAvailable axioms:');
      for (const a of axioms.slice(0, 10)) {
        console.log(`  - ${a.id} (${a.canonical?.notated || a.text.slice(0, 30)})`);
      }
      if (axioms.length > 10) {
        console.log(`  ... and ${axioms.length - 10} more`);
      }
      return;
    }

    console.log(formatProvenanceTree(axiom, principleMap, signalMap));
    return;
  }

  // Default: show help
  printHelp();
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
    const { axioms, principles, signals } = loadData(options.workspacePath);

    if (axioms.length === 0) {
      return {
        success: false,
        error: 'No axioms found. Run synthesis first.',
      };
    }

    if (options.showStats) {
      const tierCounts: Record<string, number> = {};
      const dimensionCounts: Record<string, number> = {};

      for (const axiom of axioms) {
        tierCounts[axiom.tier] = (tierCounts[axiom.tier] || 0) + 1;
        dimensionCounts[axiom.dimension] = (dimensionCounts[axiom.dimension] || 0) + 1;
      }

      return {
        success: true,
        data: {
          counts: {
            signals: signals.length,
            principles: principles.length,
            axioms: axioms.length,
          },
          byTier: tierCounts,
          byDimension: dimensionCounts,
        },
      };
    }

    if (options.listAll) {
      return {
        success: true,
        data: {
          axioms: axioms.map(a => ({
            id: a.id,
            notated: a.canonical?.notated,
            text: a.text,
            tier: a.tier,
            dimension: a.dimension,
            principleCount: a.derived_from.principles.length,
          })),
        },
      };
    }

    if (options.axiomId) {
      const axiom = axioms.find(
        (a) => a.id === options.axiomId || a.canonical?.notated?.includes(options.axiomId ?? '')
      );

      if (!axiom) {
        return {
          success: false,
          error: `Axiom not found: ${options.axiomId}`,
          data: {
            availableAxioms: axioms.slice(0, 5).map(a => a.id),
          },
        };
      }

      const principleMap = new Map(principles.map((p) => [p.id, p]));

      return {
        success: true,
        data: {
          axiom: {
            id: axiom.id,
            notated: axiom.canonical?.notated,
            text: axiom.text,
            tier: axiom.tier,
            dimension: axiom.dimension,
            createdAt: axiom.derived_from.promoted_at,
          },
          principles: axiom.derived_from.principles.map(ref => {
            const principle = principleMap.get(ref.id);
            return {
              id: ref.id,
              text: ref.text,
              nCount: ref.n_count,
              signals: principle?.derived_from.signals.map(s => ({
                id: s.id,
                source: s.source,
              })) ?? [],
            };
          }),
        },
      };
    }

    return {
      success: true,
      message: 'Use --list, --stats, or provide an axiom ID',
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
