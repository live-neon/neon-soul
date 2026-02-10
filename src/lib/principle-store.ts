/**
 * Principle store with embedding index for signal accumulation and matching.
 * Handles bootstrap (first signal creates first principle) and centroid updates.
 */

import { randomUUID } from 'node:crypto';
import type { Signal, GeneralizedSignal } from '../types/signal.js';
import type { Principle, PrincipleProvenance } from '../types/principle.js';
import type { SoulCraftDimension } from '../types/dimensions.js';
import type { LLMProvider } from '../types/llm.js';
import { cosineSimilarity } from './matcher.js';
import { classifyDimension } from './semantic-classifier.js';
import { logger } from './logger.js';

export interface PrincipleStore {
  principles: Map<string, Principle>;
  addSignal(signal: Signal, dimension?: SoulCraftDimension): Promise<AddSignalResult>;
  /** Add a generalized signal (uses generalized text for principle, preserves original in provenance) */
  addGeneralizedSignal(generalizedSignal: GeneralizedSignal, dimension?: SoulCraftDimension): Promise<AddSignalResult>;
  getPrinciples(): Principle[];
  getPrinciplesAboveN(threshold: number): Principle[];
  /** Update similarity threshold for future signal matching (N-counts preserved) */
  setThreshold(threshold: number): void;
}

export interface AddSignalResult {
  action: 'created' | 'reinforced';
  principleId: string;
  similarity: number;
}

/**
 * Normalize a vector to unit length (L2 norm).
 */
function normalize(vector: number[]): number[] {
  let sumSq = 0;
  for (const v of vector) {
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Update centroid by incorporating a new signal.
 * Returns L2-normalized centroid.
 */
function updateCentroid(
  currentCentroid: number[],
  currentCount: number,
  newEmbedding: number[]
): number[] {
  const newCentroid = currentCentroid.map((v, i) => {
    const newVal = newEmbedding[i];
    if (newVal === undefined) return v;
    return (v * currentCount + newVal) / (currentCount + 1);
  });
  return normalize(newCentroid);
}

/**
 * Generate unique ID for principles.
 * IM-6 FIX: Use crypto.randomUUID() for consistency with signal-extractor and compressor.
 */
function generatePrincipleId(): string {
  return `pri_${randomUUID()}`;
}

/**
 * Create a new principle store.
 *
 * @param llm - LLM provider for semantic dimension classification
 * @param similarityThreshold - Threshold for principle matching (default 0.85)
 */
export function createPrincipleStore(
  llm: LLMProvider,
  initialThreshold: number = 0.85
): PrincipleStore {
  const principles = new Map<string, Principle>();
  let similarityThreshold = initialThreshold;

  /**
   * Update similarity threshold for future signal matching.
   * Existing principles and their N-counts are preserved.
   */
  function setThreshold(threshold: number): void {
    similarityThreshold = threshold;
  }

  async function addSignal(
    signal: Signal,
    dimension?: SoulCraftDimension
  ): Promise<AddSignalResult> {
    // Bootstrap: first signal always creates first principle
    if (principles.size === 0) {
      const principleId = generatePrincipleId();
      // If dimension provided, use it; otherwise classify via LLM
      const effectiveDimension = dimension ?? await classifyDimension(llm, signal.text);

      const provenance: PrincipleProvenance = {
        signals: [
          {
            id: signal.id,
            similarity: 1.0,
            source: signal.source,
          },
        ],
        merged_at: new Date().toISOString(),
      };

      const principle: Principle = {
        id: principleId,
        text: signal.text,
        dimension: effectiveDimension,
        strength: signal.confidence,
        n_count: 1,
        embedding: [...signal.embedding],
        similarity_threshold: similarityThreshold,
        derived_from: provenance,
        history: [
          {
            type: 'created',
            timestamp: new Date().toISOString(),
            details: `Created from signal ${signal.id}`,
          },
        ],
      };

      principles.set(principleId, principle);
      return { action: 'created', principleId, similarity: 1.0 };
    }

    // Find best match among existing principles
    let bestPrinciple: Principle | null = null;
    let bestSimilarity = -1;

    for (const principle of principles.values()) {
      const similarity = cosineSimilarity(signal.embedding, principle.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestPrinciple = principle;
      }
    }

    // Diagnostic: Log matching decision
    const matchDecision = bestSimilarity >= similarityThreshold ? 'MATCH' : 'NO_MATCH';
    logger.debug(`[matching] ${matchDecision}: similarity=${bestSimilarity.toFixed(3)} threshold=${similarityThreshold.toFixed(2)} signal="${signal.text.slice(0, 50)}..."`);

    // If similarity >= threshold, reinforce existing principle
    if (bestPrinciple && bestSimilarity >= similarityThreshold) {
      const currentCount = bestPrinciple.n_count;
      const newCentroid = updateCentroid(
        bestPrinciple.embedding,
        currentCount,
        signal.embedding
      );

      // Update principle
      bestPrinciple.embedding = newCentroid;
      bestPrinciple.n_count = currentCount + 1;
      bestPrinciple.strength = Math.min(
        1.0,
        bestPrinciple.strength + signal.confidence * 0.1
      );
      bestPrinciple.derived_from.signals.push({
        id: signal.id,
        similarity: bestSimilarity,
        source: signal.source,
      });
      bestPrinciple.history.push({
        type: 'reinforced',
        timestamp: new Date().toISOString(),
        details: `Reinforced by signal ${signal.id} (similarity: ${bestSimilarity.toFixed(3)})`,
      });

      return {
        action: 'reinforced',
        principleId: bestPrinciple.id,
        similarity: bestSimilarity,
      };
    }

    // Create new principle candidate
    const principleId = generatePrincipleId();
    // If dimension provided, use it; otherwise classify via LLM
    const effectiveDimension = dimension ?? await classifyDimension(llm, signal.text);

    const provenance: PrincipleProvenance = {
      signals: [
        {
          id: signal.id,
          similarity: 1.0,
          source: signal.source,
        },
      ],
      merged_at: new Date().toISOString(),
    };

    const principle: Principle = {
      id: principleId,
      text: signal.text,
      dimension: effectiveDimension,
      strength: signal.confidence,
      n_count: 1,
      embedding: [...signal.embedding],
      similarity_threshold: similarityThreshold,
      derived_from: provenance,
      history: [
        {
          type: 'created',
          timestamp: new Date().toISOString(),
          details: `Created from signal ${signal.id} (best match was ${bestSimilarity.toFixed(3)})`,
        },
      ],
    };

    principles.set(principleId, principle);
    return { action: 'created', principleId, similarity: bestSimilarity };
  }

  /**
   * Add a generalized signal to the principle store.
   * Uses generalized text for principle text and matching,
   * while preserving original signal text in provenance.
   */
  async function addGeneralizedSignal(
    generalizedSignal: GeneralizedSignal,
    dimension?: SoulCraftDimension
  ): Promise<AddSignalResult> {
    const { original: signal, generalizedText, embedding, provenance } = generalizedSignal;

    // Bootstrap: first signal always creates first principle
    if (principles.size === 0) {
      const principleId = generatePrincipleId();
      const effectiveDimension = dimension ?? signal.dimension ?? await classifyDimension(llm, generalizedText);

      const principleProvenance: PrincipleProvenance = {
        signals: [
          {
            id: signal.id,
            similarity: 1.0,
            source: signal.source,
            original_text: signal.text,
          },
        ],
        merged_at: new Date().toISOString(),
        generalization: provenance,
      };

      const principle: Principle = {
        id: principleId,
        text: generalizedText, // Use generalized text
        dimension: effectiveDimension,
        strength: signal.confidence,
        n_count: 1,
        embedding: [...embedding], // Use embedding of generalized text
        similarity_threshold: similarityThreshold,
        derived_from: principleProvenance,
        history: [
          {
            type: 'created',
            timestamp: new Date().toISOString(),
            details: `Created from signal ${signal.id} (generalized${provenance.used_fallback ? ', fallback' : ''})`,
          },
        ],
      };

      principles.set(principleId, principle);
      return { action: 'created', principleId, similarity: 1.0 };
    }

    // Find best match among existing principles (using generalized embedding)
    let bestPrinciple: Principle | null = null;
    let bestSimilarity = -1;

    for (const principle of principles.values()) {
      const similarity = cosineSimilarity(embedding, principle.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestPrinciple = principle;
      }
    }

    // Diagnostic: Log matching decision
    const matchDecision = bestSimilarity >= similarityThreshold ? 'MATCH' : 'NO_MATCH';
    logger.debug(`[matching] ${matchDecision}: similarity=${bestSimilarity.toFixed(3)} threshold=${similarityThreshold.toFixed(2)} generalized="${generalizedText.slice(0, 50)}..."`);

    // If similarity >= threshold, reinforce existing principle
    if (bestPrinciple && bestSimilarity >= similarityThreshold) {
      const currentCount = bestPrinciple.n_count;
      const newCentroid = updateCentroid(
        bestPrinciple.embedding,
        currentCount,
        embedding
      );

      // Update principle
      bestPrinciple.embedding = newCentroid;
      bestPrinciple.n_count = currentCount + 1;
      bestPrinciple.strength = Math.min(
        1.0,
        bestPrinciple.strength + signal.confidence * 0.1
      );
      bestPrinciple.derived_from.signals.push({
        id: signal.id,
        similarity: bestSimilarity,
        source: signal.source,
        original_text: signal.text,
      });
      bestPrinciple.history.push({
        type: 'reinforced',
        timestamp: new Date().toISOString(),
        details: `Reinforced by signal ${signal.id} (similarity: ${bestSimilarity.toFixed(3)}, generalized${provenance.used_fallback ? ', fallback' : ''})`,
      });

      return {
        action: 'reinforced',
        principleId: bestPrinciple.id,
        similarity: bestSimilarity,
      };
    }

    // Create new principle candidate
    const principleId = generatePrincipleId();
    const effectiveDimension = dimension ?? signal.dimension ?? await classifyDimension(llm, generalizedText);

    const principleProvenance: PrincipleProvenance = {
      signals: [
        {
          id: signal.id,
          similarity: 1.0,
          source: signal.source,
          original_text: signal.text,
        },
      ],
      merged_at: new Date().toISOString(),
      generalization: provenance,
    };

    const principle: Principle = {
      id: principleId,
      text: generalizedText, // Use generalized text
      dimension: effectiveDimension,
      strength: signal.confidence,
      n_count: 1,
      embedding: [...embedding], // Use embedding of generalized text
      similarity_threshold: similarityThreshold,
      derived_from: principleProvenance,
      history: [
        {
          type: 'created',
          timestamp: new Date().toISOString(),
          details: `Created from signal ${signal.id} (best match was ${bestSimilarity.toFixed(3)}, generalized${provenance.used_fallback ? ', fallback' : ''})`,
        },
      ],
    };

    principles.set(principleId, principle);
    return { action: 'created', principleId, similarity: bestSimilarity };
  }

  function getPrinciples(): Principle[] {
    return Array.from(principles.values());
  }

  function getPrinciplesAboveN(threshold: number): Principle[] {
    return Array.from(principles.values()).filter((p) => p.n_count >= threshold);
  }

  return {
    principles,
    addSignal,
    addGeneralizedSignal,
    getPrinciples,
    getPrinciplesAboveN,
    setThreshold,
  };
}
