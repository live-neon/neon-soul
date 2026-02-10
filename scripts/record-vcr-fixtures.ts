#!/usr/bin/env npx tsx
/**
 * VCR Fixture Recording Script
 *
 * Records real Ollama LLM responses for golden set signals.
 * Creates fixtures for deterministic test replay.
 *
 * Usage:
 *   npm run vcr:record
 *   # or directly:
 *   npx tsx scripts/record-vcr-fixtures.ts
 *
 * Prerequisites:
 *   - Ollama running: ollama serve
 *   - Model available: ollama list | grep llama3
 *
 * Cross-Reference:
 * - docs/plans/2026-02-09-signal-generalization.md (Stage 4b)
 * - docs/observations/http-vcr-pattern-for-api-testing.md (Part 13)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { OllamaLLMProvider } from '../src/lib/llm-providers/ollama-provider.js';
import { VCRLLMProvider } from '../src/lib/llm-providers/vcr-provider.js';
import { generalizeSignal, PROMPT_VERSION } from '../src/lib/signal-generalizer.js';
import { embed } from '../src/lib/embeddings.js';
import type { Signal } from '../src/types/signal.js';

// Configuration
const FIXTURE_DIR = resolve(import.meta.dirname, '../tests/fixtures/vcr/golden-set');
const GOLDEN_SET_PATH = resolve(import.meta.dirname, '../tests/fixtures/golden-set-signals.json');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

interface GoldenSetSignal {
  id: string;
  text: string;
  dimension: string;
  group: string;
  expectedGeneralization: string;
}

interface GoldenSetData {
  signals: GoldenSetSignal[];
}

async function main() {
  console.log('=== VCR Fixture Recording ===\n');
  console.log(`Prompt Version: ${PROMPT_VERSION}`);
  console.log(`Fixture Dir: ${FIXTURE_DIR}`);
  console.log(`Ollama Model: ${OLLAMA_MODEL}`);
  console.log(`Ollama URL: ${OLLAMA_URL}\n`);

  // Check Ollama availability
  const ollamaAvailable = await OllamaLLMProvider.isAvailable(OLLAMA_URL);
  if (!ollamaAvailable) {
    console.error('❌ Ollama not available at', OLLAMA_URL);
    console.error('   Start Ollama: ollama serve');
    process.exit(1);
  }
  console.log('✅ Ollama available\n');

  // Load golden set signals
  const goldenSetData: GoldenSetData = JSON.parse(
    readFileSync(GOLDEN_SET_PATH, 'utf-8')
  );
  console.log(`📋 Loaded ${goldenSetData.signals.length} golden set signals\n`);

  // Create providers
  const realLLM = new OllamaLLMProvider({
    baseUrl: OLLAMA_URL,
    model: OLLAMA_MODEL,
    timeout: 60000,
  });

  const vcrLLM = new VCRLLMProvider(realLLM, FIXTURE_DIR, 'record');

  // Record fixtures for each signal
  console.log('Recording fixtures...\n');
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (const gsSignal of goldenSetData.signals) {
    try {
      // Create Signal object
      const signal: Signal = {
        id: gsSignal.id,
        text: gsSignal.text,
        dimension: gsSignal.dimension as Signal['dimension'],
        type: 'value',
        confidence: 0.9,
        embedding: await embed(gsSignal.text),
        source: {
          file: 'golden-set',
          line: 0,
          context: 'VCR recording',
        },
      };

      // Generalize (this will record the fixture)
      const result = await generalizeSignal(vcrLLM, signal, OLLAMA_MODEL);

      console.log(`✅ ${gsSignal.id}`);
      console.log(`   Original: "${gsSignal.text.slice(0, 50)}..."`);
      console.log(`   Generalized: "${result.generalizedText}"`);
      console.log(`   Fallback: ${result.provenance.used_fallback}`);
      console.log();

      successCount++;
    } catch (error) {
      console.error(`❌ ${gsSignal.id}: ${error}`);
      errorCount++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  console.log('\n=== Recording Summary ===\n');
  console.log(`Total signals: ${goldenSetData.signals.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Time: ${elapsed}s`);

  // Print VCR stats
  const stats = vcrLLM.getStats();
  console.log(`\nVCR Stats:`);
  console.log(`  Hits: ${stats.hits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Recordings: ${stats.recordings}`);
  console.log(`  Errors: ${stats.errors}`);

  // List fixture files
  console.log(`\nFixture files created:`);
  try {
    const files = readdirSync(FIXTURE_DIR);
    let totalSize = 0;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(FIXTURE_DIR, file);
        const size = statSync(filePath).size;
        totalSize += size;
        console.log(`  ${file} (${(size / 1024).toFixed(1)} KB)`);
      }
    }
    console.log(`\nTotal fixture size: ${(totalSize / 1024).toFixed(1)} KB`);
  } catch {
    console.log('  (no fixtures found)');
  }

  console.log('\n✅ Recording complete!');
  console.log('   Run tests with: npm test tests/e2e/generalization-vcr.test.ts');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
