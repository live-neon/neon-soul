/**
 * Synthesize Command
 *
 * Main command for running the soul synthesis pipeline.
 * Invoked as OpenClaw skill: /neon-soul synthesize
 *
 * Usage:
 *   npx tsx src/commands/synthesize.ts [options]
 *
 * Options:
 *   --memory-path <path>   Path to OpenClaw memory directory (default: ~/.openclaw/workspace/memory)
 *   --output-path <path>   Output path for SOUL.md (default: ~/.openclaw/workspace/SOUL.md)
 *   --format <format>      Notation format: native or notated (default: notated)
 *   --force                Run even if below content threshold
 *   --dry-run              Preview changes without writing
 *   --verbose              Show detailed progress
 *
 * Examples:
 *   npx tsx src/commands/synthesize.ts
 *   npx tsx src/commands/synthesize.ts --dry-run
 *   npx tsx src/commands/synthesize.ts --format native --force
 */

import { runPipeline, formatPipelineResult, type PipelineOptions } from '../lib/pipeline.js';
import { getDefaultMemoryPath, getDefaultOutputPath, resolvePath } from '../lib/paths.js';
import type { LLMProvider } from '../types/llm.js';
import { LLMRequiredError } from '../types/llm.js';
import { OllamaLLMProvider } from '../lib/llm-providers/ollama-provider.js';

interface CommandOptions {
  memoryPath: string;
  outputPath: string;
  format: 'native' | 'notated';
  force: boolean;
  dryRun: boolean;
  // M-1 FIX: Removed unused 'diff' option - was parsed but never used
  verbose: boolean;
}

/**
 * Skill context provided by OpenClaw when running as a skill.
 */
export interface SkillContext {
  /** LLM provider for semantic classification */
  llm: LLMProvider;
}

function parseArgs(args: string[]): CommandOptions {
  const options: CommandOptions = {
    memoryPath: getDefaultMemoryPath(),
    outputPath: getDefaultOutputPath(),
    format: 'notated',
    force: false,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--memory-path':
        if (next) {
          options.memoryPath = resolvePath(next);
          i++;
        }
        break;
      case '--output-path':
        if (next) {
          options.outputPath = resolvePath(next);
          i++;
        }
        break;
      case '--format':
        if (next && ['native', 'notated'].includes(next)) {
          options.format = next as CommandOptions['format'];
          i++;
        }
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      // M-1 FIX: Removed --diff case (was no-op)
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
NEON-SOUL Synthesize Command

Usage:
  npx tsx src/commands/synthesize.ts [options]

Options:
  --memory-path <path>   Path to OpenClaw memory directory
                         (default: ~/.openclaw/workspace/memory)
  --output-path <path>   Output path for SOUL.md
                         (default: ~/.openclaw/workspace/SOUL.md)
  --format <format>      Notation format:
                         - native: Plain English
                         - notated: LLM-generated CJK/emoji/math (default)
  --force                Run even if below content threshold
  --dry-run              Preview changes without writing
  --verbose              Show detailed progress
  --help, -h             Show this help message

Examples:
  # Full synthesis with default settings
  npx tsx src/commands/synthesize.ts

  # Preview what would happen
  npx tsx src/commands/synthesize.ts --dry-run --verbose

  # Force run with native format
  npx tsx src/commands/synthesize.ts --force --format native

  # Use custom paths
  npx tsx src/commands/synthesize.ts \\
    --memory-path ./test-fixtures/memory \\
    --output-path ./output/SOUL.md
`);
}

/**
 * Run synthesis with a detected or provided LLM provider.
 */
async function runSynthesisWithLLM(options: CommandOptions, llm: LLMProvider): Promise<void> {
  const pipelineOptions: PipelineOptions = {
    memoryPath: options.memoryPath,
    outputPath: options.outputPath,
    llm,
    format: options.format,
    force: options.force,
    dryRun: options.dryRun,
  };

  const result = await runPipeline(pipelineOptions);
  console.log(formatPipelineResult(result));

  if (!result.success && !result.skipped) {
    process.exit(1);
  }
}

/**
 * CLI entry point with LLM auto-detection.
 *
 * Detection order:
 * 1. Ollama (local, no API key needed)
 * 2. Future: ANTHROPIC_API_KEY environment variable
 * 3. Future: OPENAI_API_KEY environment variable
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.verbose) {
    console.log('Detecting LLM provider...');
  }

  // Try Ollama first (local, no API key needed)
  if (await OllamaLLMProvider.isAvailable()) {
    if (options.verbose) {
      console.log('Using Ollama LLM provider (local)');
    }
    const llm = new OllamaLLMProvider();
    await runSynthesisWithLLM(options, llm);
    return;
  }

  // Future: Check for API providers
  // if (process.env.ANTHROPIC_API_KEY) {
  //   const llm = new AnthropicLLMProvider();
  //   await runSynthesisWithLLM(options, llm);
  //   return;
  // }

  // No LLM provider available - show helpful error
  console.error('\n❌ No LLM provider available.\n');
  console.error('Options:\n');
  console.error('  1. Start Ollama (recommended for local development):');
  console.error('     docker compose -f docker/docker-compose.ollama.yml up -d');
  console.error('     docker exec neon-soul-ollama ollama pull llama3\n');
  console.error('  2. Run as OpenClaw skill (provides LLM context):');
  console.error('     /neon-soul synthesize\n');
  process.exit(1);
}

/**
 * Programmatic entry point for skill loader.
 * OpenClaw provides the skill context with LLM provider.
 *
 * @param args - Command line arguments
 * @param context - Skill context from OpenClaw (required)
 * @returns Result object with success/error status
 * @throws LLMRequiredError if context.llm is not provided
 */
export async function run(
  args: string[],
  context?: SkillContext
): Promise<{
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}> {
  // Validate LLM provider from skill context
  if (!context?.llm) {
    throw new LLMRequiredError('synthesize command');
  }

  const options = parseArgs(args);

  const pipelineOptions: PipelineOptions = {
    memoryPath: options.memoryPath,
    outputPath: options.outputPath,
    llm: context.llm,
    format: options.format,
    force: options.force,
    dryRun: options.dryRun,
    // M-1 FIX: Removed showDiff - was never used by pipeline
  };

  try {
    const result = await runPipeline(pipelineOptions);

    if (result.success && !result.skipped) {
      return {
        success: true,
        message: 'Synthesis complete',
        data: {
          axiomCount: result.metrics?.axiomCount,
          principleCount: result.metrics?.principleCount,
          signalCount: result.metrics?.signalCount,
          compressionRatio: result.metrics?.compressionRatio,
        },
      };
    } else if (result.skipped) {
      return {
        success: true,
        message: `Skipped: ${result.skipReason}`,
      };
    } else {
      return {
        success: false,
        error: result.error?.message ?? 'Unknown error',
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
