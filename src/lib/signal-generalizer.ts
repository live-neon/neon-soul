/**
 * Signal Generalization (Normalization) Module
 *
 * LLM-based transformation of specific signals into abstract principles
 * (generalization) using consistent representation (normalization).
 *
 * This implements the "Principle Synthesis" step from PBD methodology,
 * enabling better semantic clustering of related signals.
 *
 * Key features:
 * - Generalizes signals before embedding for improved similarity matching
 * - Normalizes to actor-agnostic, imperative form for consistent clustering
 * - Fallback to original signal on validation failure
 * - Full provenance tracking (model, prompt version, timestamp)
 * - Batch processing with partial failure handling
 * - LRU cache with content-aware keys
 *
 * @see docs/plans/2026-02-09-signal-generalization.md
 * @see docs/guides/single-source-pbd-guide.md (Step 4: Principle Synthesis)
 */

import { createHash } from 'node:crypto';
import type { Signal, GeneralizedSignal, GeneralizationProvenance } from '../types/signal.js';
import type { LLMProvider } from '../types/llm.js';
import { requireLLM } from '../types/llm.js';
import { embed, embedBatch } from './embeddings.js';
import { logger } from './logger.js';
import { LRUCache } from 'lru-cache';

/**
 * Prompt template version for cache invalidation.
 *
 * IMPORTANT: Bump this version when:
 * - Changing prompt wording or structure in buildPrompt()
 * - Modifying validation rules in validateGeneralization()
 * - Adding/removing constraints (length, pronouns, etc.)
 *
 * Version format: semver (vMAJOR.MINOR.PATCH)
 * - Major: Breaking changes to output format
 * - Minor: New constraints or prompt sections
 * - Patch: Wording improvements
 *
 * Cache is automatically invalidated when version changes.
 */
export const PROMPT_VERSION = 'v1.0.0';

/** Maximum allowed length for generalized output */
const MAX_OUTPUT_LENGTH = 150;

/**
 * Regex pattern for pronouns that should not appear in actor-agnostic output.
 * Uses word boundaries to catch all cases (end of string, punctuation, etc.)
 */
const PRONOUN_PATTERN = /\b(I|we|you|my|our|your|me|us|myself|ourselves|yourself|yourselves)\b/i;

/** Maximum input length for prompt safety */
const MAX_INPUT_LENGTH = 500;

/**
 * Sanitize user input to prevent prompt injection.
 * Escapes XML-like tags, markdown, and limits length.
 */
function sanitizeForPrompt(text: string): string {
  return text
    .slice(0, MAX_INPUT_LENGTH)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Build the generalization prompt for a signal.
 */
function buildPrompt(signalText: string, dimension?: string): string {
  const sanitizedText = sanitizeForPrompt(signalText);
  const dimensionContext = dimension ?? 'general';

  return `Transform this specific statement into an abstract principle.

The principle should:
- Capture the core value or preference
- Be general enough to match similar statements
- Be actionable (can guide behavior)
- Stay under 150 characters
- Use imperative form (e.g., "Values X over Y", "Prioritizes Z")
- Do NOT add policies or concepts not present in the original
- Do NOT use pronouns (I, we, you) - abstract the actor
- If the original has conditions, preserve them

<signal_text>
${sanitizedText}
</signal_text>

<dimension_context>
${dimensionContext}
</dimension_context>

Output ONLY the generalized principle, nothing else.`;
}

/**
 * Validate generalized output meets constraints.
 * Returns validation result with reason if failed.
 */
function validateGeneralization(
  original: string,
  generalized: string
): { valid: boolean; reason?: string } {
  // Check non-empty
  if (!generalized || generalized.trim().length === 0) {
    return { valid: false, reason: 'empty output' };
  }

  // Check length cap
  if (generalized.length > MAX_OUTPUT_LENGTH) {
    return { valid: false, reason: `exceeds ${MAX_OUTPUT_LENGTH} chars (got ${generalized.length})` };
  }

  // Check for forbidden pronouns using word boundary regex
  const pronounMatch = generalized.match(PRONOUN_PATTERN);
  if (pronounMatch) {
    return { valid: false, reason: `contains pronoun "${pronounMatch[0]}"` };
  }

  // Basic sanity check - output shouldn't be dramatically longer than input
  // (allows for some expansion but catches runaway generation)
  if (generalized.length > original.length * 3 && generalized.length > 100) {
    return { valid: false, reason: 'output too long relative to input' };
  }

  return { valid: true };
}

/**
 * Generalize a single signal using LLM.
 *
 * @param llm - LLM provider (required)
 * @param signal - Signal to generalize
 * @param model - Model name for provenance (default: 'unknown')
 * @returns GeneralizedSignal with abstract principle and embedding
 * @throws LLMRequiredError if llm is null/undefined
 */
export async function generalizeSignal(
  llm: LLMProvider | null | undefined,
  signal: Signal,
  model: string = 'unknown'
): Promise<GeneralizedSignal> {
  requireLLM(llm, 'generalizeSignal');

  const prompt = buildPrompt(signal.text, signal.dimension);
  let generalizedText: string;
  let usedFallback = false;

  try {
    // Use generate() if available, otherwise fallback to original
    if (llm.generate) {
      const result = await llm.generate(prompt);
      generalizedText = result.text.trim();
    } else {
      // Provider lacks generate() - fallback to original signal text
      generalizedText = signal.text;
      usedFallback = true;
      logger.warn(`[generalizer] LLM lacks generate(), falling back to original for signal ${signal.id}`);
    }

    // Validate the generalization
    const validation = validateGeneralization(signal.text, generalizedText);
    if (!validation.valid) {
      logger.warn(`[generalizer] Validation failed for signal ${signal.id}: ${validation.reason}`);
      generalizedText = signal.text;
      usedFallback = true;
    }
  } catch (error) {
    // LLM failure - fallback to original
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`[generalizer] LLM failed for signal ${signal.id}: ${errorMsg}`);
    generalizedText = signal.text;
    usedFallback = true;
  }

  // Generate embedding for the (possibly fallback) text
  const embedding = await embed(generalizedText);

  const provenance: GeneralizationProvenance = {
    original_text: signal.text,
    generalized_text: generalizedText,
    model,
    prompt_version: PROMPT_VERSION,
    timestamp: new Date().toISOString(),
    used_fallback: usedFallback,
  };

  return {
    original: signal,
    generalizedText,
    embedding,
    provenance,
  };
}

/**
 * Generalize multiple signals in batch.
 *
 * Uses batch processing for efficiency with partial failure handling:
 * - Successful generalizations proceed normally
 * - Failed generalizations use original text as fallback
 *
 * @param llm - LLM provider (required)
 * @param signals - Signals to generalize
 * @param model - Model name for provenance (default: 'unknown')
 * @param options - Batch processing options
 * @returns Array of GeneralizedSignal in same order as input
 * @throws LLMRequiredError if llm is null/undefined
 */
export async function generalizeSignals(
  llm: LLMProvider | null | undefined,
  signals: Signal[],
  model: string = 'unknown',
  options: {
    /** Maximum signals per batch (default: 50) */
    batchSize?: number;
    /** Log first N generalizations per batch (default: 3) */
    logSampleSize?: number;
    /** Log random percentage of remainder (default: 0.05 = 5%) */
    logSamplePercent?: number;
  } = {}
): Promise<GeneralizedSignal[]> {
  requireLLM(llm, 'generalizeSignals');

  if (signals.length === 0) {
    return [];
  }

  const {
    batchSize = 50,
    logSampleSize = 3,
    logSamplePercent = 0.05,
  } = options;

  const results: GeneralizedSignal[] = [];
  let fallbackCount = 0;

  // Process in batches
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    const batchResults: GeneralizedSignal[] = [];

    // Generate all prompts for this batch
    const prompts = batch.map((s) => buildPrompt(s.text, s.dimension));

    // Try to generalize each signal
    const generalizedTexts: string[] = [];
    const usedFallbacks: boolean[] = [];

    for (let j = 0; j < batch.length; j++) {
      const signal = batch[j]!;
      const prompt = prompts[j]!;
      let generalizedText: string;
      let usedFallback = false;

      try {
        if (llm.generate) {
          const result = await llm.generate(prompt);
          generalizedText = result.text.trim();

          // Validate
          const validation = validateGeneralization(signal.text, generalizedText);
          if (!validation.valid) {
            logger.warn(`[generalizer] Batch validation failed for signal ${signal.id}: ${validation.reason}`);
            generalizedText = signal.text;
            usedFallback = true;
          }
        } else {
          logger.warn(`[generalizer] Batch LLM lacks generate() for signal ${signal.id}`);
          generalizedText = signal.text;
          usedFallback = true;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`[generalizer] Batch LLM failed for signal ${signal.id}: ${errorMsg}`);
        generalizedText = signal.text;
        usedFallback = true;
      }

      generalizedTexts.push(generalizedText);
      usedFallbacks.push(usedFallback);
      if (usedFallback) fallbackCount++;
    }

    // Batch embed all generalized texts
    const embeddings = await embedBatch(generalizedTexts);

    // Build results
    for (let j = 0; j < batch.length; j++) {
      const signal = batch[j]!;
      const genText = generalizedTexts[j]!;
      const fallback = usedFallbacks[j]!;
      const emb = embeddings[j]!;

      const provenance: GeneralizationProvenance = {
        original_text: signal.text,
        generalized_text: genText,
        model,
        prompt_version: PROMPT_VERSION,
        timestamp: new Date().toISOString(),
        used_fallback: fallback,
      };

      batchResults.push({
        original: signal,
        generalizedText: genText,
        embedding: emb,
        provenance,
      });
    }

    // Log samples from this batch
    const samplesToLog = Math.min(logSampleSize, batchResults.length);
    for (let j = 0; j < samplesToLog; j++) {
      const r = batchResults[j];
      if (r) {
        logger.debug(
          `[generalizer] "${r.provenance.original_text.slice(0, 40)}..." → "${r.generalizedText.slice(0, 40)}..."${r.provenance.used_fallback ? ' (fallback)' : ''}`
        );
      }
    }

    // Log random sample of remainder (avoiding duplicates)
    const remainder = batchResults.slice(samplesToLog);
    const randomSampleCount = Math.min(
      Math.ceil(remainder.length * logSamplePercent),
      remainder.length
    );
    const usedIndices = new Set<number>();
    for (let j = 0; j < randomSampleCount && usedIndices.size < remainder.length; j++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * remainder.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      const r = remainder[idx];
      if (r) {
        logger.debug(
          `[generalizer] (sample) "${r.provenance.original_text.slice(0, 40)}..." → "${r.generalizedText.slice(0, 40)}..."`
        );
      }
    }

    results.push(...batchResults);
  }

  // Log summary
  const fallbackRate = (fallbackCount / signals.length) * 100;
  logger.info(
    `[generalizer] Processed ${signals.length} signals, ${fallbackCount} used fallback (${fallbackRate.toFixed(1)}%)`
  );

  if (fallbackRate > 10) {
    logger.warn(`[generalizer] High fallback rate (${fallbackRate.toFixed(1)}%) - investigate LLM issues`);
  }

  return results;
}

/** Maximum cache size (each entry ~1.5KB with 384-float embedding) */
const CACHE_MAX_SIZE = 1000;

/**
 * LRU cache for generalized signals.
 * Key: signal.id + textHash + promptVersion
 * Size-bounded to prevent memory leaks in long-running processes.
 *
 * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #4)
 */
const generalizationCache = new LRUCache<string, GeneralizedSignal>({
  max: CACHE_MAX_SIZE,
});
let cachedPromptVersion = PROMPT_VERSION;

/**
 * Generate content hash for cache key.
 * Ensures stale cache entries are not returned when signal content changes.
 *
 * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #1)
 */
function getContentHash(signalText: string): string {
  return createHash('sha256').update(signalText).digest('hex').slice(0, 16);
}

/**
 * Get cache key for a signal.
 * Includes signal ID, content hash, and prompt version for proper invalidation.
 */
function getCacheKey(signalId: string, signalText: string): string {
  const textHash = getContentHash(signalText);
  return `${signalId}:${textHash}:${PROMPT_VERSION}`;
}

/**
 * Generalize signals with caching.
 * Cache is invalidated when prompt version changes.
 *
 * Note on fallback behavior: When a signal uses fallback (usedFallback: true),
 * the embedding is generated from the original signal text, not generalized text.
 * This creates a mixed embedding space. Monitor fallback rate and keep below 10%.
 *
 * @param llm - LLM provider (required)
 * @param signals - Signals to generalize
 * @param model - Model name for provenance
 * @param options - Batch processing options (forwarded to generalizeSignals)
 * @returns Array of GeneralizedSignal (from cache or freshly generated)
 *
 * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #2, #9)
 */
export async function generalizeSignalsWithCache(
  llm: LLMProvider | null | undefined,
  signals: Signal[],
  model: string = 'unknown',
  options: {
    batchSize?: number;
    logSampleSize?: number;
    logSamplePercent?: number;
  } = {}
): Promise<GeneralizedSignal[]> {
  // Invalidate cache if prompt version changed
  if (cachedPromptVersion !== PROMPT_VERSION) {
    generalizationCache.clear();
    cachedPromptVersion = PROMPT_VERSION;
    logger.info('[generalizer] Cache invalidated due to prompt version change');
  }

  const uncached: Signal[] = [];
  const cachedResults = new Map<string, GeneralizedSignal>();

  // Check cache for each signal (key includes content hash)
  for (const signal of signals) {
    const key = getCacheKey(signal.id, signal.text);
    const cached = generalizationCache.get(key);
    if (cached) {
      cachedResults.set(signal.id, cached);
    } else {
      uncached.push(signal);
    }
  }

  const cacheHits = signals.length - uncached.length;
  if (cacheHits > 0) {
    logger.debug(`[generalizer] Cache hits: ${cacheHits}/${signals.length}`);
  }

  // Generalize uncached signals (forwarding options)
  let freshResults: GeneralizedSignal[] = [];
  if (uncached.length > 0) {
    freshResults = await generalizeSignals(llm, uncached, model, options);

    // Store in cache (key includes content hash)
    for (const result of freshResults) {
      const key = getCacheKey(result.original.id, result.original.text);
      generalizationCache.set(key, result);
    }
  }

  // Combine results in original order
  const freshMap = new Map(freshResults.map((r) => [r.original.id, r]));
  return signals.map((signal) => {
    return cachedResults.get(signal.id) ?? freshMap.get(signal.id)!;
  });
}

/**
 * Clear the generalization cache.
 * Useful for testing or when prompt template is updated.
 */
export function clearGeneralizationCache(): void {
  generalizationCache.clear();
  logger.debug('[generalizer] Cache cleared');
}

/**
 * Get cache statistics for monitoring.
 * @returns Current cache size and max size
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: generalizationCache.size,
    maxSize: CACHE_MAX_SIZE,
  };
}
