/**
 * Cross-Source Axiom Emergence
 *
 * Detects axioms that emerge across multiple memory categories,
 * signaling core identity patterns that transcend specific contexts.
 *
 * Usage:
 *   const emergent = detectEmergentAxioms(axioms, principles);
 *   const weighted = calculateCrossSourceStrength(principle);
 *
 * Cross-source principle:
 *   An axiom appearing in diary/, relationships/, AND preferences/
 *   is more likely to be core identity than one appearing only in
 *   a single category. The logarithmic bonus rewards diversity.
 */

import type { Principle } from '../types/principle.js';
import type { Axiom } from '../types/axiom.js';
import type { SoulCraftDimension } from '../types/signal.js';

/**
 * Emergent axiom with cross-source metadata.
 */
export interface EmergentAxiom {
  /** The underlying axiom */
  axiom: Axiom;
  /** Memory categories where signals appeared */
  sourceCategories: string[];
  /** Cross-source strength (higher = more diverse sources) */
  strength: number;
  /** Whether this spans 3+ dimensions (core identity) */
  isCoreIdentity: boolean;
  /** Dimensions this axiom touches */
  dimensions: SoulCraftDimension[];
}

/**
 * Emergence statistics.
 */
export interface EmergenceStats {
  /** Total axioms analyzed */
  totalAxioms: number;
  /** Axioms with cross-source signals */
  crossSourceAxioms: number;
  /** Core identity axioms (3+ dimensions) */
  coreIdentityAxioms: number;
  /** Average source category count */
  avgSourceCategories: number;
  /** Category distribution */
  categoryDistribution: Record<string, number>;
  /** Dimension distribution */
  dimensionDistribution: Record<SoulCraftDimension, number>;
}

/**
 * Detect emergent axioms from cross-source analysis.
 */
export function detectEmergentAxioms(
  axioms: Axiom[],
  principles: Principle[]
): EmergentAxiom[] {
  const principleMap = new Map(principles.map((p) => [p.id, p]));
  const emergent: EmergentAxiom[] = [];

  for (const axiom of axioms) {
    // Get all contributing principles
    const contributingPrinciples = axiom.derived_from.principles
      .map((ref) => principleMap.get(ref.id))
      .filter((p): p is Principle => p !== undefined);

    // Collect source categories from all signals
    const categories = new Set<string>();
    const dimensions = new Set<SoulCraftDimension>();

    for (const principle of contributingPrinciples) {
      for (const signalRef of principle.derived_from.signals) {
        const category = extractCategory(signalRef.source.file);
        if (category) {
          categories.add(category);
        }
      }

      // Track dimensions
      if (principle.dimension) {
        dimensions.add(principle.dimension);
      }
    }

    // Calculate n_count from contributing principles
    const totalNCount = axiom.derived_from.principles.reduce(
      (sum, p) => sum + p.n_count,
      0
    );

    // Calculate cross-source strength
    const strength = calculateCrossSourceStrength(categories.size, totalNCount);

    // Determine if core identity (3+ dimensions)
    const isCoreIdentity = dimensions.size >= 3;

    emergent.push({
      axiom,
      sourceCategories: Array.from(categories),
      strength,
      isCoreIdentity,
      dimensions: Array.from(dimensions),
    });
  }

  // Sort by strength (highest first)
  emergent.sort((a, b) => b.strength - a.strength);

  return emergent;
}

/**
 * Calculate cross-source strength for a principle.
 * Uses logarithmic bonus to reward source diversity.
 *
 * Formula: strength = n_count * log2(categories + 1)
 *
 * Examples:
 *   - 3 signals from 1 category: 3 * log2(2) = 3.0
 *   - 3 signals from 3 categories: 3 * log2(4) = 6.0
 *   - 5 signals from 5 categories: 5 * log2(6) = 12.9
 */
export function calculateCrossSourceStrength(
  categoryCount: number,
  nCount: number
): number {
  const crossSourceBonus = Math.log2(categoryCount + 1);
  return nCount * crossSourceBonus;
}

/**
 * Calculate strength for a principle based on its signals.
 */
export function calculatePrincipleStrength(principle: Principle): number {
  // Get unique categories from signals
  const categories = new Set<string>();
  for (const signalRef of principle.derived_from.signals) {
    const category = extractCategory(signalRef.source.file);
    if (category) {
      categories.add(category);
    }
  }

  return calculateCrossSourceStrength(categories.size, principle.n_count);
}

/**
 * Extract memory category from file path.
 */
function extractCategory(filePath: string): string | undefined {
  // Path format: .../memory/category/file.md
  const parts = filePath.split('/');
  const memoryIndex = parts.indexOf('memory');

  if (memoryIndex >= 0 && parts.length > memoryIndex + 1) {
    return parts[memoryIndex + 1];
  }

  return undefined;
}

/**
 * Calculate emergence statistics.
 */
export function calculateEmergenceStats(
  emergentAxioms: EmergentAxiom[]
): EmergenceStats {
  const categoryDistribution: Record<string, number> = {};
  const dimensionDistribution: Record<SoulCraftDimension, number> = {
    'identity-core': 0,
    'character-traits': 0,
    'voice-presence': 0,
    'honesty-framework': 0,
    'boundaries-ethics': 0,
    'relationship-dynamics': 0,
    'continuity-growth': 0,
  };

  let totalCategories = 0;
  let crossSourceCount = 0;
  let coreIdentityCount = 0;

  for (const ea of emergentAxioms) {
    totalCategories += ea.sourceCategories.length;

    if (ea.sourceCategories.length > 1) {
      crossSourceCount++;
    }

    if (ea.isCoreIdentity) {
      coreIdentityCount++;
    }

    // Count category occurrences
    for (const category of ea.sourceCategories) {
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    }

    // Count dimension occurrences
    for (const dimension of ea.dimensions) {
      dimensionDistribution[dimension]++;
    }
  }

  return {
    totalAxioms: emergentAxioms.length,
    crossSourceAxioms: crossSourceCount,
    coreIdentityAxioms: coreIdentityCount,
    avgSourceCategories:
      emergentAxioms.length > 0 ? totalCategories / emergentAxioms.length : 0,
    categoryDistribution,
    dimensionDistribution,
  };
}

/**
 * Get core identity axioms (spanning 3+ dimensions).
 */
export function getCoreIdentityAxioms(
  emergentAxioms: EmergentAxiom[]
): EmergentAxiom[] {
  return emergentAxioms.filter((ea) => ea.isCoreIdentity);
}

/**
 * Format emergence report.
 */
export function formatEmergenceReport(
  emergentAxioms: EmergentAxiom[],
  stats: EmergenceStats
): string {
  const lines: string[] = [
    '# Axiom Emergence Report',
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total axioms | ${stats.totalAxioms} |`,
    `| Cross-source axioms | ${stats.crossSourceAxioms} |`,
    `| Core identity axioms | ${stats.coreIdentityAxioms} |`,
    `| Avg source categories | ${stats.avgSourceCategories.toFixed(2)} |`,
    '',
    '## Category Distribution',
    '',
    '| Category | Axiom Count |',
    '|----------|-------------|',
  ];

  for (const [category, count] of Object.entries(stats.categoryDistribution)) {
    lines.push(`| ${category} | ${count} |`);
  }

  lines.push('');
  lines.push('## Dimension Distribution');
  lines.push('');
  lines.push('| Dimension | Axiom Count |');
  lines.push('|-----------|-------------|');

  for (const [dimension, count] of Object.entries(stats.dimensionDistribution)) {
    if (count > 0) {
      lines.push(`| ${dimension} | ${count} |`);
    }
  }

  if (stats.coreIdentityAxioms > 0) {
    lines.push('');
    lines.push('## Core Identity Axioms (3+ dimensions)');
    lines.push('');

    const coreAxioms = getCoreIdentityAxioms(emergentAxioms);
    for (const ea of coreAxioms) {
      lines.push(`### ${ea.axiom.canonical?.notated || ea.axiom.id}`);
      lines.push('');
      lines.push(`- **Text**: ${ea.axiom.text}`);
      lines.push(`- **Strength**: ${ea.strength.toFixed(2)}`);
      lines.push(`- **Sources**: ${ea.sourceCategories.join(', ')}`);
      lines.push(`- **Dimensions**: ${ea.dimensions.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
