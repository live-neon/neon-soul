/**
 * Trajectory tracking for soul synthesis stabilization.
 * Based on Reflective Manifold Trajectory Metrics research.
 */

import { cosineSimilarity } from './matcher.js';

// IM-11 FIX: Cap trajectory points to prevent unbounded memory growth
const MAX_TRAJECTORY_POINTS = 100;

export interface TrajectoryPoint {
  iteration: number;
  principleCount: number;
  axiomCount: number;
  centroidDrift: number; // Average drift from previous iteration
  timestamp: string;
}

export interface TrajectoryMetrics {
  stabilizationRate: number; // Iterations to converge (target: 3-5)
  attractorStrength: number; // Consistency of convergence (0-1)
  trajectoryVariance: number; // Spread before stabilization
  semanticDrift: number[]; // Distance per iteration
  isStable: boolean; // Whether trajectory has stabilized
}

export interface StyleMetrics {
  voiceCoherence: number; // Style embedding similarity
  contentSimilarity: number; // Semantic embedding similarity
  styleContentRatio: number; // Balance (target: style >= 0.7)
}

/**
 * Track trajectory over multiple synthesis iterations.
 *
 * IM-11: Uses sliding window to prevent unbounded memory growth.
 * Keeps only the most recent MAX_TRAJECTORY_POINTS points.
 */
export class TrajectoryTracker {
  private points: TrajectoryPoint[] = [];
  private previousCentroids: Map<string, number[]> = new Map();
  private stabilizationThreshold = 0.02; // Drift below this = stable
  private maxPoints = MAX_TRAJECTORY_POINTS;

  /**
   * Record a trajectory point.
   */
  recordPoint(
    principleCount: number,
    axiomCount: number,
    currentCentroids: Map<string, number[]>
  ): TrajectoryPoint {
    // Calculate average centroid drift
    let totalDrift = 0;
    let driftCount = 0;

    for (const [id, centroid] of currentCentroids) {
      const previous = this.previousCentroids.get(id);
      if (previous) {
        // Drift = 1 - cosine similarity
        const similarity = cosineSimilarity(centroid, previous);
        totalDrift += 1 - similarity;
        driftCount++;
      }
    }

    const avgDrift = driftCount > 0 ? totalDrift / driftCount : 0;

    const point: TrajectoryPoint = {
      iteration: this.points.length + 1,
      principleCount,
      axiomCount,
      centroidDrift: avgDrift,
      timestamp: new Date().toISOString(),
    };

    this.points.push(point);

    // IM-11 FIX: Enforce sliding window - remove oldest points if over limit
    if (this.points.length > this.maxPoints) {
      this.points = this.points.slice(-this.maxPoints);
    }

    this.previousCentroids = new Map(currentCentroids);

    return point;
  }

  /**
   * Calculate trajectory metrics.
   */
  getMetrics(): TrajectoryMetrics {
    if (this.points.length < 2) {
      return {
        stabilizationRate: 0,
        attractorStrength: 0,
        trajectoryVariance: 0,
        semanticDrift: [],
        isStable: false,
      };
    }

    const drifts = this.points.map((p) => p.centroidDrift);

    // Find stabilization point (first iteration where drift stays below threshold)
    let stabilizationPoint = this.points.length;
    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      if (point && point.centroidDrift < this.stabilizationThreshold) {
        // Check if it stays stable
        const remainingDrifts = drifts.slice(i);
        const allStable = remainingDrifts.every(
          (d) => d < this.stabilizationThreshold
        );
        if (allStable) {
          stabilizationPoint = i;
          break;
        }
      }
    }

    // Calculate variance of pre-stabilization drifts
    const preStabDrifts = drifts.slice(0, stabilizationPoint);
    const variance = this.calculateVariance(preStabDrifts);

    // Attractor strength: how consistently do we converge?
    // Higher = more consistent convergence
    const lastDrift = drifts[drifts.length - 1] ?? 0;
    const attractorStrength = Math.max(0, 1 - lastDrift * 10);

    return {
      stabilizationRate: stabilizationPoint,
      attractorStrength,
      trajectoryVariance: variance,
      semanticDrift: drifts,
      isStable: lastDrift < this.stabilizationThreshold,
    };
  }

  /**
   * Calculate variance of a number array.
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get trajectory points for logging/visualization.
   */
  getPoints(): TrajectoryPoint[] {
    return [...this.points];
  }

  /**
   * Reset tracker for new synthesis run.
   */
  reset(): void {
    this.points = [];
    this.previousCentroids.clear();
  }
}

/**
 * Calculate style metrics for voice preservation.
 * Compares style-focused vs content-focused embeddings.
 *
 * MN-5: styleWeight parameter removed as it was unused.
 * If weighted style/content calculation is needed in the future,
 * implement it with the actual weighting logic.
 */
export function calculateStyleMetrics(
  originalEmbedding: number[],
  compressedEmbedding: number[]
): StyleMetrics {
  const contentSimilarity = cosineSimilarity(
    originalEmbedding,
    compressedEmbedding
  );

  // Voice coherence approximated by checking if similarity is high
  // In production, would use style-specific embeddings
  const voiceCoherence = Math.min(1, contentSimilarity * 1.1);

  return {
    voiceCoherence,
    contentSimilarity,
    styleContentRatio:
      voiceCoherence / Math.max(0.1, voiceCoherence + contentSimilarity),
  };
}

/**
 * Format trajectory metrics as report.
 */
export function formatTrajectoryReport(metrics: TrajectoryMetrics): string {
  const lines = [
    '## Trajectory Metrics',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Stabilization rate | ${metrics.stabilizationRate} iterations |`,
    `| Attractor strength | ${metrics.attractorStrength.toFixed(3)} |`,
    `| Trajectory variance | ${metrics.trajectoryVariance.toFixed(4)} |`,
    `| Is stable | ${metrics.isStable ? 'Yes' : 'No'} |`,
    '',
    '### Semantic Drift per Iteration',
    '',
  ];

  for (let i = 0; i < metrics.semanticDrift.length; i++) {
    const drift = metrics.semanticDrift[i];
    if (drift !== undefined) {
      const bar = '█'.repeat(Math.min(20, Math.round(drift * 100)));
      lines.push(`${i + 1}. ${drift.toFixed(4)} ${bar}`);
    }
  }

  return lines.join('\n');
}
