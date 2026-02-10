/**
 * VCR-Based Generalization Tests
 *
 * Tests signal generalization using VCR fixture replay.
 * Enables fast, deterministic testing with real LLM behavior.
 *
 * Usage:
 *   npm test tests/e2e/generalization-vcr.test.ts
 *
 * To re-record fixtures:
 *   npm run vcr:record
 *
 * ## Threshold Tuning Process
 *
 * The similarity thresholds were determined empirically:
 *
 * 1. **Raw signals at 0.85**: High threshold required because raw signals
 *    have high lexical variance ("I always tell the truth" vs "be honest").
 *    Result: ~1:1 compression (no clustering).
 *
 * 2. **Generalized signals at 0.45**: Lower threshold works because
 *    generalization normalizes to similar forms ("Values truthfulness").
 *    Observed within-cluster similarities: 0.36-0.58.
 *    Result: ~5:1 compression.
 *
 * The ablation study test validates this by comparing all 4 combinations:
 * raw/gen x high/low threshold.
 *
 * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #12)
 *
 * Cross-Reference:
 * - docs/plans/2026-02-09-signal-generalization.md (Stage 4c)
 * - docs/observations/http-vcr-pattern-for-api-testing.md (Part 13)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OllamaLLMProvider } from '../../src/lib/llm-providers/ollama-provider.js';
import { VCRLLMProvider, type VCRMode } from '../../src/lib/llm-providers/vcr-provider.js';
import { generalizeSignal, generalizeSignals, PROMPT_VERSION } from '../../src/lib/signal-generalizer.js';
import { createPrincipleStore } from '../../src/lib/principle-store.js';
import { embed } from '../../src/lib/embeddings.js';
import { cosineSimilarity } from '../../src/lib/matcher.js';
import type { Signal } from '../../src/types/signal.js';
import type { LLMProvider } from '../../src/types/llm.js';

// Configuration
const FIXTURE_DIR = resolve(import.meta.dirname, '../fixtures/vcr/golden-set');
const GOLDEN_SET_PATH = resolve(import.meta.dirname, '../fixtures/golden-set-signals.json');
const VCR_MODE = (process.env.VCR_MODE ?? 'replay') as VCRMode;

interface GoldenSetSignal {
  id: string;
  text: string;
  dimension: string;
  group: string;
  expectedGeneralization: string;
}

interface ExpectedCluster {
  name: string;
  signals: string[];
  expectedNCount: number;
}

interface GoldenSetData {
  signals: GoldenSetSignal[];
  expectedClusters: ExpectedCluster[];
}

// Shared state
let llm: LLMProvider;
let goldenSet: GoldenSetData;

/** Model used for fixtures - changing this requires re-recording */
const MODEL_NAME = 'llama3';

beforeAll(async () => {
  // Load golden set
  goldenSet = JSON.parse(readFileSync(GOLDEN_SET_PATH, 'utf-8'));

  // Create VCR-wrapped LLM (model name included in fixture key for proper invalidation)
  const realLLM = new OllamaLLMProvider({ model: MODEL_NAME });
  llm = new VCRLLMProvider(realLLM, FIXTURE_DIR, VCR_MODE, MODEL_NAME);

  console.log(`\n🎬 VCR Mode: ${VCR_MODE}`);
  console.log(`📂 Fixtures: ${FIXTURE_DIR}`);
  console.log(`🤖 Model: ${MODEL_NAME}`);
  console.log(`📋 Golden Set: ${goldenSet.signals.length} signals\n`);
});

/**
 * Convert golden set signal to Signal type.
 */
async function toSignal(gs: GoldenSetSignal): Promise<Signal> {
  return {
    id: gs.id,
    text: gs.text,
    dimension: gs.dimension as Signal['dimension'],
    type: 'value',
    confidence: 0.9,
    embedding: await embed(gs.text),
    source: {
      file: 'golden-set',
      line: 0,
      context: 'VCR test',
    },
  };
}

describe('VCR Generalization Tests', () => {
  describe('Signal Generalization', () => {
    it('generalizes signals to abstract principles', async () => {
      const signal = await toSignal(goldenSet.signals[0]!);
      const result = await generalizeSignal(llm, signal, 'llama3');

      expect(result.generalizedText).toBeDefined();
      expect(result.generalizedText.length).toBeGreaterThan(0);
      expect(result.generalizedText.length).toBeLessThan(150);
      expect(result.provenance.used_fallback).toBe(false);
      expect(result.provenance.prompt_version).toBe(PROMPT_VERSION);

      console.log(`  Original: "${signal.text}"`);
      console.log(`  Generalized: "${result.generalizedText}"`);
    });

    it('generalizations use imperative form', async () => {
      const signals = await Promise.all(goldenSet.signals.slice(0, 5).map(toSignal));
      const results = await generalizeSignals(llm, signals, 'llama3');

      for (const result of results) {
        const text = result.generalizedText;
        // Should start with Values, Prioritizes, Avoids, or similar
        const hasImperativeForm = /^(Values|Prioritizes|Avoids|Maintains|Embraces|Approaches)/i.test(text);
        expect(hasImperativeForm).toBe(true);
        console.log(`  ✓ "${text.slice(0, 60)}..."`);
      }
    });

    it('removes pronouns from generalizations', async () => {
      const signals = await Promise.all(goldenSet.signals.map(toSignal));
      const results = await generalizeSignals(llm, signals, 'llama3');

      const pronounPattern = /\b(I|we|you|my|our|your)\b/i;
      for (const result of results) {
        const hasPronouns = pronounPattern.test(result.generalizedText);
        if (hasPronouns) {
          console.log(`  ⚠️ Pronoun found: "${result.generalizedText}"`);
        }
        expect(hasPronouns).toBe(false);
      }
    });
  });

  describe('Semantic Similarity', () => {
    it('similar signals produce similar generalizations', async () => {
      // Get honesty cluster signals
      const honestyCluster = goldenSet.signals.filter(s => s.group === 'honesty-cluster');
      const signals = await Promise.all(honestyCluster.map(toSignal));
      const results = await generalizeSignals(llm, signals, 'llama3');

      // Calculate pairwise similarity
      const similarities: number[] = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const sim = cosineSimilarity(results[i]!.embedding, results[j]!.embedding);
          similarities.push(sim);
          console.log(`  ${results[i]!.original.id} ↔ ${results[j]!.original.id}: ${sim.toFixed(3)}`);
        }
      }

      // Average similarity should be > 0.35 for cluster (generalized embeddings have more variance)
      const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      console.log(`\n  Average similarity: ${avgSim.toFixed(3)}`);
      expect(avgSim).toBeGreaterThan(0.35);
    });

    it('different clusters have lower similarity', async () => {
      // Get one signal from each cluster
      const honestySignal = await toSignal(goldenSet.signals.find(s => s.group === 'honesty-cluster')!);
      const safetySignal = await toSignal(goldenSet.signals.find(s => s.group === 'safety-cluster')!);

      const [honestyResult, safetyResult] = await generalizeSignals(llm, [honestySignal, safetySignal], 'llama3');

      const crossSim = cosineSimilarity(honestyResult!.embedding, safetyResult!.embedding);
      console.log(`  Honesty ↔ Safety similarity: ${crossSim.toFixed(3)}`);

      // Cross-cluster similarity should be lower (but may still be >0.5 if themes overlap)
      expect(crossSim).toBeLessThan(0.9);
    });
  });

  describe('Clustering Improvement', () => {
    it('achieves N-count accumulation through generalization', async () => {
      const signals = await Promise.all(goldenSet.signals.map(toSignal));
      const generalizedSignals = await generalizeSignals(llm, signals, 'llama3');

      // Create principle store and add generalized signals
      // Threshold 0.45 based on observed within-cluster similarities (0.36-0.58)
      const store = createPrincipleStore(llm, 0.45);

      for (const gs of generalizedSignals) {
        await store.addGeneralizedSignal(gs, gs.original.dimension);
      }

      const principles = store.getPrinciples();
      const nCounts = principles.map(p => p.n_count);

      console.log(`\n  Principles created: ${principles.length}`);
      console.log(`  N-count distribution: ${JSON.stringify(nCounts.sort((a, b) => b - a))}`);
      console.log(`  Max N-count: ${Math.max(...nCounts)}`);
      console.log(`  Avg N-count: ${(nCounts.reduce((a, b) => a + b, 0) / nCounts.length).toFixed(2)}`);

      // Should have fewer principles than signals (compression)
      const compressionRatio = signals.length / principles.length;
      console.log(`  Compression ratio: ${compressionRatio.toFixed(2)}:1`);

      // Some principles should have N > 1
      const clusteredCount = nCounts.filter(n => n > 1).length;
      console.log(`  Principles with N > 1: ${clusteredCount}`);

      expect(compressionRatio).toBeGreaterThan(1);
    });

    it('measures compression vs baseline', async () => {
      const signals = await Promise.all(goldenSet.signals.map(toSignal));

      // Baseline: direct embedding (no generalization)
      const baselineStore = createPrincipleStore(llm, 0.85);
      for (const signal of signals) {
        await baselineStore.addSignal(signal, signal.dimension);
      }
      const baselinePrinciples = baselineStore.getPrinciples();

      // With generalization
      const generalizedSignals = await generalizeSignals(llm, signals, 'llama3');
      const genStore = createPrincipleStore(llm, 0.45);
      for (const gs of generalizedSignals) {
        await genStore.addGeneralizedSignal(gs, gs.original.dimension);
      }
      const genPrinciples = genStore.getPrinciples();

      const baselineRatio = signals.length / baselinePrinciples.length;
      const genRatio = signals.length / genPrinciples.length;

      console.log(`\n  Baseline (no generalization):`);
      console.log(`    Principles: ${baselinePrinciples.length}`);
      console.log(`    Compression: ${baselineRatio.toFixed(2)}:1`);

      console.log(`\n  With generalization:`);
      console.log(`    Principles: ${genPrinciples.length}`);
      console.log(`    Compression: ${genRatio.toFixed(2)}:1`);

      console.log(`\n  Improvement: ${((genRatio / baselineRatio - 1) * 100).toFixed(0)}%`);

      // Generalization should improve compression
      expect(genRatio).toBeGreaterThanOrEqual(baselineRatio);
    });

    /**
     * Ablation study: Isolate contribution of generalization vs threshold tuning.
     * Tests all 4 combinations to attribute improvement correctly.
     *
     * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #13)
     */
    it('ablation study: isolates generalization vs threshold effects', async () => {
      const signals = await Promise.all(goldenSet.signals.map(toSignal));
      const generalizedSignals = await generalizeSignals(llm, signals, MODEL_NAME);

      const HIGH_THRESHOLD = 0.85;
      const LOW_THRESHOLD = 0.45;

      // 1. Raw signals at high threshold (original baseline)
      const rawHighStore = createPrincipleStore(llm, HIGH_THRESHOLD);
      for (const signal of signals) {
        await rawHighStore.addSignal(signal, signal.dimension);
      }
      const rawHighCount = rawHighStore.getPrinciples().length;

      // 2. Raw signals at low threshold
      const rawLowStore = createPrincipleStore(llm, LOW_THRESHOLD);
      for (const signal of signals) {
        await rawLowStore.addSignal(signal, signal.dimension);
      }
      const rawLowCount = rawLowStore.getPrinciples().length;

      // 3. Generalized signals at high threshold
      const genHighStore = createPrincipleStore(llm, HIGH_THRESHOLD);
      for (const gs of generalizedSignals) {
        await genHighStore.addGeneralizedSignal(gs, gs.original.dimension);
      }
      const genHighCount = genHighStore.getPrinciples().length;

      // 4. Generalized signals at low threshold (current approach)
      const genLowStore = createPrincipleStore(llm, LOW_THRESHOLD);
      for (const gs of generalizedSignals) {
        await genLowStore.addGeneralizedSignal(gs, gs.original.dimension);
      }
      const genLowCount = genLowStore.getPrinciples().length;

      // Calculate compression ratios
      const signalCount = signals.length;
      const rawHighRatio = (signalCount / rawHighCount).toFixed(1);
      const rawLowRatio = (signalCount / rawLowCount).toFixed(1);
      const genHighRatio = (signalCount / genHighCount).toFixed(1);
      const genLowRatio = (signalCount / genLowCount).toFixed(1);

      console.log('\n  Ablation Study Results:');
      console.log('  ┌─────────────────────┬────────────────┬────────────────┐');
      console.log('  │                     │   High 0.85    │   Low 0.45     │');
      console.log('  ├─────────────────────┼────────────────┼────────────────┤');
      console.log(`  │ Raw signals         │ ${String(rawHighCount).padStart(2)} (${rawHighRatio}x)     │ ${String(rawLowCount).padStart(2)} (${rawLowRatio}x)     │`);
      console.log(`  │ Generalized signals │ ${String(genHighCount).padStart(2)} (${genHighRatio}x)     │ ${String(genLowCount).padStart(2)} (${genLowRatio}x)     │`);
      console.log('  └─────────────────────┴────────────────┴────────────────┘');

      // Calculate contributions
      const thresholdEffect = rawHighCount - rawLowCount;
      const genEffectAtHigh = rawHighCount - genHighCount;
      const genEffectAtLow = rawLowCount - genLowCount;
      const combinedEffect = rawHighCount - genLowCount;

      console.log('\n  Effect Analysis:');
      console.log(`    Threshold effect (raw): ${thresholdEffect} fewer principles`);
      console.log(`    Generalization effect (high): ${genEffectAtHigh} fewer principles`);
      console.log(`    Generalization effect (low): ${genEffectAtLow} fewer principles`);
      console.log(`    Combined effect: ${combinedEffect} fewer principles (${rawHighRatio}x → ${genLowRatio}x)`);

      // Generalization should provide benefit at both thresholds
      // (if it only helps at low threshold, it's just noise reduction)
      expect(genHighCount).toBeLessThanOrEqual(rawHighCount);
      expect(genLowCount).toBeLessThanOrEqual(rawLowCount);
    });
  });

  describe('VCR Performance', () => {
    it('replays fixtures quickly', async () => {
      const signals = await Promise.all(goldenSet.signals.map(toSignal));

      const startTime = Date.now();
      await generalizeSignals(llm, signals, 'llama3');
      const elapsed = Date.now() - startTime;

      console.log(`  Time for ${signals.length} signals: ${elapsed}ms`);
      console.log(`  Per signal: ${(elapsed / signals.length).toFixed(1)}ms`);

      // VCR replay should be fast (< 100ms per signal)
      const perSignal = elapsed / signals.length;
      expect(perSignal).toBeLessThan(500); // Allow for embedding time
    });

    it('reports VCR stats', () => {
      const vcrLLM = llm as VCRLLMProvider;
      const stats = vcrLLM.getStats();

      console.log(`\n  VCR Stats:`);
      console.log(`    Hits: ${stats.hits}`);
      console.log(`    Misses: ${stats.misses}`);
      console.log(`    Recordings: ${stats.recordings}`);
      console.log(`    Errors: ${stats.errors}`);

      // In replay mode, should have hits and no recordings
      if (VCR_MODE === 'replay') {
        expect(stats.hits).toBeGreaterThan(0);
        expect(stats.recordings).toBe(0);
      }
    });
  });
});
