/**
 * Signal types for capturing behavioral patterns from memory.
 */

export type SignalType =
  | 'value'
  | 'belief'
  | 'preference'
  | 'goal'
  | 'constraint'
  | 'relationship'
  | 'pattern'
  | 'correction'
  | 'boundary'
  | 'reinforcement';

/**
 * SoulCraft dimensions for organizing identity signals.
 */
export type SoulCraftDimension =
  | 'identity-core'
  | 'character-traits'
  | 'voice-presence'
  | 'honesty-framework'
  | 'boundaries-ethics'
  | 'relationship-dynamics'
  | 'continuity-growth';

/**
 * Source type for signal provenance.
 */
export type SignalSourceType = 'memory' | 'interview' | 'template';

export interface SignalSource {
  /** Type of source (memory, interview, template) */
  type: SignalSourceType;
  /** Source file path */
  file: string;
  /** Section within file (header, question ID, etc.) */
  section?: string;
  /** Line number in source file (if applicable) */
  line?: number;
  /** Surrounding context text */
  context: string;
  /** When the signal was extracted */
  extractedAt: Date;
}

export interface Signal {
  id: string;
  type: SignalType;
  text: string;
  confidence: number;
  embedding: number[]; // 384-dim from all-MiniLM-L6-v2
  /** SoulCraft dimension this signal relates to */
  dimension?: SoulCraftDimension;
  source: SignalSource;
}

/**
 * Provenance metadata for signal generalization.
 * Tracks LLM model, prompt version, and fallback status.
 */
export interface GeneralizationProvenance {
  /** Original signal text (what user wrote) */
  original_text: string;
  /** Generalized principle text (what was used for matching) */
  generalized_text: string;
  /** LLM model used for generalization */
  model: string;
  /** Prompt template version (e.g., "v1.0.0") */
  prompt_version: string;
  /** When generalization occurred */
  timestamp: string;
  /** Optional confidence score from LLM (0-1) */
  confidence?: number;
  /** Whether fallback to original was triggered */
  used_fallback: boolean;
}

/**
 * Signal with LLM-based generalization for improved clustering.
 * The generalized text is used for embedding and matching,
 * while original text is preserved for provenance.
 *
 * ## Mixed Embedding Space Warning
 *
 * When `provenance.used_fallback` is true, the embedding is generated from
 * the original signal text, NOT the generalized text. This creates a mixed
 * embedding space where some vectors represent generalized abstractions and
 * others represent raw user signals.
 *
 * Monitor fallback rate (logged at 10% threshold). High fallback rates may
 * invalidate clustering assumptions.
 *
 * @see docs/issues/2026-02-09-signal-generalization-impl-findings.md (Finding #2, #14)
 */
export interface GeneralizedSignal {
  /** Original signal (preserved for provenance) */
  original: Signal;
  /** Abstract principle statement from LLM generalization */
  generalizedText: string;
  /**
   * Embedding of the generalized text (384-dim from all-MiniLM-L6-v2).
   *
   * **Important**: When `provenance.used_fallback` is true, this embedding
   * is generated from the original signal text, not the generalized text.
   * This may affect clustering quality if fallback rate is high.
   */
  embedding: number[];
  /** Full provenance metadata */
  provenance: GeneralizationProvenance;
}
