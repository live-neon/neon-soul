/**
 * Signal types for capturing behavioral patterns from memory.
 */

import type { ArtifactProvenance } from './provenance.js';

/**
 * PBD Stance: How the signal is presented
 * Canonical names from: multiverse/artifacts/guides/methodology/PBD_VOCABULARY.md
 *
 * Maps to F-Count: F=1 (assert/AFFIRMING) / F=1.25 (qualify/QUALIFYING) /
 *                  F=1.5 (tensioning/TENSIONING) / F=2 (question/QUESTIONING, deny/DENYING)
 */
export type SignalStance = 'assert' | 'deny' | 'question' | 'qualify' | 'tensioning';

/** PBD Importance: How central to identity */
export type SignalImportance = 'core' | 'supporting' | 'peripheral';

/**
 * Signal elicitation type: how the signal originated in conversation.
 * Captures conversation context (how signal was elicited).
 * Note: SignalSourceType (below) captures file source - these are distinct concepts.
 */
export type SignalElicitationType =
  | 'agent-initiated' // Agent volunteers unprompted (high identity signal)
  | 'user-elicited' // Agent responds to direct request (low identity signal)
  | 'context-dependent' // Agent adapts to context (exclude from identity)
  | 'consistent-across-context'; // Same behavior across contexts (strong identity signal)

/**
 * Map canonical PBD vocabulary to SignalStance.
 * Used for interop with systems using canonical names (e.g., essence-router).
 * See: multiverse/artifacts/guides/methodology/PBD_VOCABULARY.md
 */
export function mapCanonicalStance(canonical: string): SignalStance {
  switch (canonical.toUpperCase()) {
    case 'AFFIRMING':
    case 'ASSERT':
      return 'assert';
    case 'QUALIFYING':
    case 'QUALIFY':
      return 'qualify';
    case 'TENSIONING':
      return 'tensioning';
    case 'QUESTIONING':
    case 'QUESTION':
      return 'question';
    case 'DENYING':
    case 'DENY':
      return 'deny';
    default:
      return 'assert';
  }
}

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

  /**
   * PBD stance: how the signal is presented (default: assert)
   * @see mapCanonicalStance for vocabulary mapping
   */
  stance?: SignalStance;

  /**
   * PBD importance: how central to identity (default: supporting)
   */
  importance?: SignalImportance;

  /**
   * Artifact provenance for anti-echo-chamber (default: self)
   * @see ArtifactProvenance in provenance.ts
   */
  provenance?: ArtifactProvenance;

  /**
   * Signal elicitation type for identity validity (default: user-elicited)
   */
  elicitationType?: SignalElicitationType;
}

/**
 * Default values for optional PBD fields:
 * - stance: 'assert' (affirming statements are most common)
 * - importance: 'supporting' (neutral default, not core)
 * - provenance: 'self' (conservative default for anti-echo-chamber)
 * - elicitationType: 'user-elicited' (conservative default for identity validity)
 */

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
