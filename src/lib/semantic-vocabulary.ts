/**
 * Semantic Vocabulary Definitions
 *
 * Vocabularies for semantic classification categories.
 * Used by semantic-classifier.ts for LLM-based classification.
 *
 * Note: CJK/emoji notation is now generated directly by LLM in
 * compressor.ts via generateNotatedForm(). No constrained vocabulary.
 */

import type { SignalType } from '../types/signal.js';
import type { MemoryCategory } from './memory-walker.js';

/**
 * Section types for template/memory content classification.
 */
export type SectionType =
  | 'core-truths'
  | 'boundaries'
  | 'vibe-tone'
  | 'examples'
  | 'preferences'
  | 'other';

/**
 * All valid signal types.
 */
export const SIGNAL_TYPES: readonly SignalType[] = [
  'value',
  'belief',
  'preference',
  'goal',
  'constraint',
  'relationship',
  'pattern',
  'correction',
  'boundary',
  'reinforcement',
] as const;

/**
 * All valid section types.
 */
export const SECTION_TYPES: readonly SectionType[] = [
  'core-truths',
  'boundaries',
  'vibe-tone',
  'examples',
  'preferences',
  'other',
] as const;

/**
 * All valid memory categories.
 */
export const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  'diary',
  'experiences',
  'goals',
  'knowledge',
  'relationships',
  'preferences',
  'unknown',
] as const;

