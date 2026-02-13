/**
 * Threshold Ablation Study
 *
 * v0.2.0: This test suite is deprecated. It was designed to test embedding-based
 * similarity thresholds. With LLM-based similarity matching, the threshold
 * mechanics are different.
 *
 * Original tests:
 * 1. Raw signals at 0.85 threshold (baseline)
 * 2. Raw signals at 0.45 threshold
 * 3. Generalized signals at 0.85 threshold (current production)
 * 4. Generalized signals at 0.45 threshold (tested behavior)
 *
 * @deprecated Since v0.2.0, embeddings removed in favor of LLM-based similarity
 * @see docs/plans/2026-02-12-llm-based-similarity.md (Stage 5)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createPrincipleStore } from '../../src/lib/principle-store.js';
import { generalizeSignalsWithCache } from '../../src/lib/signal-generalizer.js';
import { cosineSimilarity } from '../../src/lib/matcher.js';
import type { Signal } from '../../src/types/signal.js';
import type { LLMProvider } from '../../src/types/llm.js';

// Mock LLM for deterministic tests
const mockLLM: LLMProvider = {
  async classify() {
    return { category: 'identity-core' as const, confidence: 0.9, reasoning: 'mock' };
  },
  async generate() {
    return { text: 'mock generation' };
  },
};

// Test signals that should cluster (authenticity theme)
const authenticitySignals: Partial<Signal>[] = [
  { id: 'sig_1', text: 'I always try to be authentic in my interactions' },
  { id: 'sig_2', text: 'Being genuine matters more than being liked' },
  { id: 'sig_3', text: 'I value authenticity over appearance' },
  { id: 'sig_4', text: 'Showing my true self is important to me' },
  { id: 'sig_5', text: 'I prefer honest feedback over polite lies' },
];

// Test signals that should cluster (transparency theme)
const transparencySignals: Partial<Signal>[] = [
  { id: 'sig_6', text: 'I believe in being transparent about my process' },
  { id: 'sig_7', text: 'Openness builds trust in relationships' },
  { id: 'sig_8', text: 'I share my reasoning, not just conclusions' },
  { id: 'sig_9', text: 'Transparency is more valuable than privacy' },
  { id: 'sig_10', text: 'I tell people what I am thinking' },
];

// Test signals that should NOT cluster (distinct themes)
const distinctSignals: Partial<Signal>[] = [
  { id: 'sig_11', text: 'I love cooking Italian food on weekends' },
  { id: 'sig_12', text: 'Software architecture fascinates me' },
  { id: 'sig_13', text: 'I prefer morning workouts' },
];

/**
 * v0.2.0: Signals no longer require embeddings.
 */
function createFullSignals(partials: Partial<Signal>[]): Signal[] {
  return partials.map((p) => ({
    id: p.id!,
    text: p.text!,
    type: 'preference' as const,
    confidence: 0.8,
    source: { file: 'test.md', line: 1, context: p.text!, type: 'memory' as const, extractedAt: new Date() },
    dimension: 'identity-core' as const,
  }));
}

interface AblationResult {
  threshold: number;
  signalType: 'raw' | 'generalized';
  principleCount: number;
  compressionRatio: number;
  avgWithinClusterSimilarity: number;
  clusterSizes: number[];
}

describe('Threshold Ablation Study', () => {
  let allSignals: Signal[];
  let authenticityGroup: Signal[];
  let transparencyGroup: Signal[];
  let distinctGroup: Signal[];

  beforeAll(() => {
    authenticityGroup = createFullSignals(authenticitySignals);
    transparencyGroup = createFullSignals(transparencySignals);
    distinctGroup = createFullSignals(distinctSignals);
    allSignals = [...authenticityGroup, ...transparencyGroup, ...distinctGroup];
  });

  /**
   * v0.2.0: Similarity distribution tests skipped.
   * These tests relied on embedding vectors which are no longer generated.
   * @deprecated Use LLM-based similarity tests instead
   */
  describe('Similarity Distribution Analysis (deprecated)', () => {
    it.skip('measures within-group similarity for authenticity signals (embedding-based)', () => {});
    it.skip('measures within-group similarity for transparency signals (embedding-based)', () => {});
    it.skip('measures cross-group similarity (embedding-based)', () => {});
  });

  /**
   * v0.2.0: Ablation tests skipped.
   * These tests relied on embedding-based similarity for clustering.
   * With LLM-based similarity, threshold mechanics are different.
   * @deprecated Re-design needed for LLM-based similarity testing
   */
  describe('Ablation: 4 Combinations (deprecated)', () => {
    it.skip('1. Raw signals at 0.85 threshold (embedding-based)', () => {});
    it.skip('2. Raw signals at 0.45 threshold (embedding-based)', () => {});
    it.skip('3. Generalized signals at 0.85 threshold (embedding-based)', () => {});
    it.skip('4. Generalized signals at 0.45 threshold (embedding-based)', () => {});
    it.skip('prints summary table (embedding-based)', () => {});
  });

  /**
   * v0.2.0: Threshold recommendation skipped.
   * @deprecated Re-design needed for LLM-based similarity testing
   */
  describe('Threshold Recommendation (deprecated)', () => {
    it.skip('suggests optimal threshold based on results (embedding-based)', () => {});
  });
});
