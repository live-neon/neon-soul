/**
 * NEON-SOUL CLI Entry Point
 *
 * Thin dispatcher for bundled skill execution.
 * Compiled with esbuild into a single .mjs file for inclusion
 * in the OpenClaw skill package.
 *
 * Usage:
 *   node neon-soul.mjs <command> [options]
 *
 * Commands:
 *   synthesize  Run soul synthesis pipeline
 *   status      Show current soul state
 *   rollback    Restore previous SOUL.md
 *   audit       Explore provenance
 *   trace       Quick axiom provenance lookup
 *
 * Examples:
 *   node neon-soul.mjs synthesize --force
 *   node neon-soul.mjs status
 *   node neon-soul.mjs audit --list
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runCommand, type CommandContext } from './skill-entry.js';
import { OllamaLLMProvider } from './lib/llm-providers/ollama-provider.js';
import { logger } from './lib/logger.js';

const COMMANDS = ['synthesize', 'status', 'rollback', 'audit', 'trace'] as const;

/**
 * Detect workspace from CWD.
 * If the current directory has a `memory/` subdirectory, it's a workspace.
 * Falls back to null (let commands use their own defaults).
 */
function detectWorkspace(): string | null {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'memory'))) {
    return cwd;
  }
  return null;
}

function printUsage(): void {
  console.error('NEON-SOUL CLI');
  console.error('');
  console.error('Usage: node neon-soul.mjs <command> [options]');
  console.error('');
  console.error('Commands:');
  console.error('  synthesize  Run soul synthesis pipeline');
  console.error('  status      Show current soul state');
  console.error('  rollback    Restore previous SOUL.md');
  console.error('  audit       Explore provenance');
  console.error('  trace       Quick axiom provenance lookup');
  console.error('');
  console.error('Examples:');
  console.error('  node neon-soul.mjs synthesize --force');
  console.error('  node neon-soul.mjs synthesize --dry-run');
  console.error('  node neon-soul.mjs status');
  console.error('  node neon-soul.mjs audit --list');
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = argv.slice(1);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  if (!COMMANDS.includes(command as typeof COMMANDS[number])) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${COMMANDS.join(', ')}`);
    process.exit(1);
  }

  // Build context — auto-detect LLM for commands that need it
  const context: CommandContext = {};

  if (command === 'synthesize') {
    const baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';

    if (await OllamaLLMProvider.isAvailable(baseUrl)) {
      // Auto-detect model if OLLAMA_MODEL is not set
      if (!process.env['OLLAMA_MODEL']) {
        try {
          const resp = await fetch(`${baseUrl}/api/tags`);
          if (resp.ok) {
            const data = await resp.json() as { models?: Array<{ name: string }> };
            const models = data.models ?? [];
            const firstModel = models[0];
            if (models.length > 0 && firstModel) {
              const selectedModel = firstModel.name;
              process.env['OLLAMA_MODEL'] = selectedModel;

              // Auto-tune timeout and concurrency for large models (>30B params)
              // Large models need more time per request and less concurrency
              const modelLower = selectedModel.toLowerCase();
              const isLargeModel = /\b(120b|70b|72b|65b|480b|110b|80b|90b)\b/i.test(modelLower) ||
                modelLower.includes('gpt-oss') || modelLower.includes('qwen3-coder');

              if (isLargeModel) {
                // 5 min timeout (large models are slow), reduce concurrency
                if (!process.env['OLLAMA_TIMEOUT']) {
                  process.env['OLLAMA_TIMEOUT'] = '300000';
                }
                if (!process.env['NEON_SOUL_LLM_CONCURRENCY']) {
                  process.env['NEON_SOUL_LLM_CONCURRENCY'] = '2';
                }
                process.stderr.write(
                  `[neon-soul] Large model detected (${selectedModel}): timeout=300s, concurrency=2\n`
                );
              }
            }
          }
        } catch { /* ignore, will use default */ }
      }

      // Always enable telemetry and info-level logging when running as CLI
      process.env['NEON_SOUL_LLM_TELEMETRY'] = '1';
      logger.configure({ level: 'info' });

      context.llm = new OllamaLLMProvider();
    } else {
      console.error(JSON.stringify({
        success: false,
        error: `No LLM provider available. Ollama not reachable at ${baseUrl}.`,
        hint: 'Start Ollama: ollama serve (or docker compose up)',
      }));
      process.exit(1);
    }
  }

  // Auto-detect workspace from CWD and inject paths if not explicitly provided
  const workspace = detectWorkspace();
  if (workspace) {
    if (command === 'synthesize') {
      if (!args.includes('--memory-path')) {
        args.push('--memory-path', join(workspace, 'memory'));
      }
      if (!args.includes('--output-path')) {
        args.push('--output-path', join(workspace, 'SOUL.md'));
      }
    }
    if (['status', 'rollback', 'audit', 'trace'].includes(command)) {
      if (!args.includes('--workspace')) {
        args.push('--workspace', workspace);
      }
    }
  }

  const result = await runCommand(command, args, context);

  // Output result as JSON for agent consumption
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ success: false, error: message }));
  process.exit(1);
});
