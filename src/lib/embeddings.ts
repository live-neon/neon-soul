/**
 * Embedding infrastructure using @xenova/transformers.
 * Provides local embeddings without API keys.
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

const EXPECTED_DIM = 384; // all-MiniLM-L6-v2 produces 384-dim vectors
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractor: FeatureExtractionPipeline | null = null;
let initPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initialize the embedding model (lazy, cached).
 */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) {
    return extractor;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = await pipeline('feature-extraction', DEFAULT_MODEL, {
          quantized: true,
        });
        extractor = model;
        return model;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }

    throw new Error(
      `Failed to load embedding model after ${maxRetries} retries: ${lastError?.message}`
    );
  })();

  return initPromise;
}

/**
 * Generate embedding for a single text.
 * Returns 384-dimensional vector (L2 normalized).
 */
export async function embed(text: string): Promise<number[]> {
  const model = await getExtractor();
  const result = await model(text, { pooling: 'mean', normalize: true });

  // Extract the embedding array
  const embedding = Array.from(result.data as Float32Array);

  // Runtime validation - fail fast if model changes
  if (embedding.length !== EXPECTED_DIM) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EXPECTED_DIM}, got ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch processing).
 *
 * IM-1 Note: @xenova/transformers pipelines process texts sequentially internally.
 * True GPU batching would require passing arrays directly to the underlying model,
 * which is not exposed in the current pipeline API. This implementation uses
 * Promise.all for concurrent processing which still provides speedup on multi-core
 * systems. For true transformer batching, consider:
 * - Using the raw model API with tokenizer batching
 * - Switching to a batch-native embedding service (OpenAI, Cohere, etc.)
 *
 * More efficient than calling embed() multiple times due to parallel execution.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const model = await getExtractor();
  const embeddings: number[][] = [];

  // Process in batches to manage memory
  const batchSize = 32;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (text) => {
        const result = await model(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(result.data as Float32Array);

        if (embedding.length !== EXPECTED_DIM) {
          throw new Error(
            `Embedding dimension mismatch: expected ${EXPECTED_DIM}, got ${embedding.length}`
          );
        }

        return embedding;
      })
    );
    embeddings.push(...results);
  }

  return embeddings;
}
