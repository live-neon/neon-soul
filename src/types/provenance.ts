/**
 * Provenance chain for full audit trail from axiom to source.
 */

import type { SignalSource } from './signal.js';

/**
 * ArtifactProvenance: Where the artifact came from (SSEM model)
 * See: multiverse/artifacts/guides/methodology/PBD_VOCABULARY.md
 *
 * - self: Author reflects on their own experience, thoughts, creations
 * - curated: Author selected, endorsed, or adopted this content
 * - external: Content exists independently of author's preference (research, external events)
 */
export type ArtifactProvenance = 'self' | 'curated' | 'external';

/** Check if provenance is valid */
export function isValidProvenance(p: string): p is ArtifactProvenance {
  return ['self', 'curated', 'external'].includes(p);
}

/** Provenance weight for anti-echo-chamber scoring */
export const PROVENANCE_WEIGHT: Record<ArtifactProvenance, number> = {
  external: 2.0, // Strongest - exists independently
  curated: 1.0, // Moderate - you chose it
  self: 0.5, // Weakest for diversity (still valuable for identity)
};

export interface ProvenanceChain {
  axiom: {
    id: string;
    text: string;
  };
  principles: Array<{
    id: string;
    text: string;
    n_count: number;
  }>;
  signals: Array<{
    id: string;
    text: string;
    source: SignalSource;
  }>;
}
