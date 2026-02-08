/**
 * Provenance chain builders for audit trails.
 * Every axiom traces back to source signals.
 */

import type { SignalSource, Signal } from '../types/signal.js';
import type { Principle, PrincipleProvenance } from '../types/principle.js';
import type { Axiom, AxiomProvenance } from '../types/axiom.js';
import type { ProvenanceChain } from '../types/provenance.js';

/**
 * Create a signal source with timestamp.
 */
export function createSignalSource(
  file: string,
  line: number,
  context: string,
  type: 'memory' | 'interview' | 'template' = 'memory'
): SignalSource {
  return {
    type,
    file,
    line,
    context,
    extractedAt: new Date(),
  };
}

/**
 * Create principle provenance from contributing signals.
 */
export function createPrincipleProvenance(
  signals: Array<{ signal: Signal; similarity: number }>
): PrincipleProvenance {
  return {
    signals: signals.map(({ signal, similarity }) => ({
      id: signal.id,
      similarity,
      source: signal.source,
    })),
    merged_at: new Date().toISOString(),
  };
}

/**
 * Create axiom provenance from contributing principles.
 */
export function createAxiomProvenance(
  principles: Principle[]
): AxiomProvenance {
  return {
    principles: principles.map((p) => ({
      id: p.id,
      text: p.text,
      n_count: p.n_count,
    })),
    promoted_at: new Date().toISOString(),
  };
}

/**
 * Build full provenance chain from axiom to original sources.
 * Used for transparency and audit trails.
 */
export function traceToSource(
  axiom: Axiom,
  principleMap: Map<string, Principle>,
  signalMap: Map<string, Signal>
): ProvenanceChain {
  const principles: ProvenanceChain['principles'] = [];
  const signals: ProvenanceChain['signals'] = [];

  for (const principleRef of axiom.derived_from.principles) {
    principles.push({
      id: principleRef.id,
      text: principleRef.text,
      n_count: principleRef.n_count,
    });

    // Get the full principle to access its signals
    const principle = principleMap.get(principleRef.id);
    if (principle) {
      for (const signalRef of principle.derived_from.signals) {
        const signal = signalMap.get(signalRef.id);
        if (signal) {
          signals.push({
            id: signal.id,
            text: signal.text,
            source: signal.source,
          });
        }
      }
    }
  }

  return {
    axiom: {
      id: axiom.id,
      text: axiom.text,
    },
    principles,
    signals,
  };
}
