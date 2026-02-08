# Reflective Manifold: Trajectory Metrics for Soul Synthesis

**Date**: 2026-02-07
**Source**: [Reflective Manifold](https://github.com/geeks-accelerator/reflection-manifold-data)
**Authors**: Lee Brown and Lucas Brown
**Related**: [Geeks in the Woods Substack](https://geeksinthewoods.substack.com/)

## Executive Summary

Research into LLM self-reflection reveals that models converge to stable "attractor basins" through iterative reflection (3-7 loops). Style dominates structure (R²=17.2%) over provider (R²=9.9%), suggesting voice preservation is more critical than which model performs synthesis. This research provides mathematical frameworks for measuring soul quality through trajectory analysis.

## Key Findings

### 1. Attractor Basin Convergence

LLMs exhibit geometric structure during self-reflection that stabilizes into attractor basins:
- **Iterations to convergence**: 3-7 loops (median: 5)
- **Early trajectory**: Large shifts, high variance (exploration phase)
- **Late trajectory**: Small adjustments, low variance (refinement phase)
- **Stabilization pattern**: 30% slower in sparse models vs dense

**Application to NEON-SOUL (Greenfield Approach)**:

**Bootstrap Phase** (we are here):
- Run synthesis multiple times (3-7 as research suggests)
- Measure and log ALL trajectory metrics
- Don't enforce any thresholds yet
- Build data foundation to discover what "stable" means for our system

**Learn Phase** (after Bootstrap):
- Analyze collected trajectories to find patterns
- Discover what "convergence" actually looks like in our system
- Identify real thresholds from data, not research papers

**Enforce Phase** (only after Learn):
- Apply discovered thresholds with confidence intervals
- Accept/reject souls based on our empirical evidence
- Continue measuring for drift detection

### 2. Style Dominates Provider

The manifold structure relates more to style than model provider:
- **Style influence**: R²=17.2% of variance
- **Provider influence**: R²=9.9% of variance
- **Implication**: Voice/style preservation matters more than which LLM

**Application to NEON-SOUL**: Track style embeddings separately from semantic content. Prioritize voice coherence (≥0.70) over pure semantic similarity.

### 3. Reflection Geometry

From [Geeks in the Woods](https://geeksinthewoods.substack.com/p/attention-lottery-deepseek-sparse):
> "Reflection geometry measures the path of expression, not the path of consideration"

This distinction is crucial:
- **Path of expression**: Observable output trajectory (what we can measure)
- **Path of consideration**: Internal processing (hidden from us)

**Application to NEON-SOUL**: Focus on measuring output stability, not inferring internal processes.

## Trajectory Metrics Framework

### Core Measurements

```typescript
interface TrajectoryMetrics {
  // Convergence metrics
  stabilizationRate: number;        // Iterations to converge (target: 3-5)
  attractorStrength: number;        // Consistency of convergence point
  trajectoryVariance: number;       // Spread before stabilization

  // Path metrics
  semanticDrift: number[];          // Distance traveled per iteration
  pathLength: number;               // Total distance through space
  pathSmoothness: number;           // Jerkiness/curvature of evolution

  // Basin properties
  basinDetected: boolean;           // Did trajectory converge?
  basinDepth: number;               // How "strong" is the attractor?
  returnDistance: number;           // Distance from start after loop
}
```

### Geometric Properties

```typescript
interface GeometricMetrics {
  // Manifold structure
  curvature: number;                // How "twisted" the soul space is
  dimensionalityReduction: number;  // Effective dims used (< 384)
  clusterDensity: number;           // How tightly axioms group

  // Topology
  connectedComponents: number;      // Separate axiom clusters
  manifoldDimension: number;        // Intrinsic dimensionality
  geodesicDistance: number;         // True distance on manifold
}
```

### Style Preservation

```typescript
interface StyleMetrics {
  voiceCoherence: number;           // Style embedding similarity
  contentSimilarity: number;        // Semantic embedding similarity
  styleContentRatio: number;        // Balance (target: style ≥ 0.7)
  styleStability: number[];         // Style drift per iteration
}
```

## Implementation Strategy

### Phase 1: Baseline Metrics

In Phase 1 (Template Compression), establish baseline trajectory patterns:
1. Run compression on same template 5 times
2. Measure trajectory variance and convergence
3. Identify typical attractor patterns
4. Document "healthy" vs "unhealthy" trajectories

### Phase 3: Iterative Synthesis

In Phase 3 (Memory Ingestion), implement full reflective loop:

```typescript
async function iterativeSynthesis(memories: Memory[]): Promise<Soul> {
  const trajectory: Embedding[] = [];
  let currentSoul: Soul;
  let previousEmbedding: Embedding;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    currentSoul = await synthesize(memories, previousSoul);
    const embedding = await embed(currentSoul);
    trajectory.push(embedding);

    if (hasConverged(embedding, previousEmbedding)) {
      return {
        ...currentSoul,
        trajectory,
        convergenceIteration: i,
        attractorStrength: measureAttractorStrength(trajectory)
      };
    }

    previousEmbedding = embedding;
  }

  throw new Error('Failed to converge to attractor basin');
}
```

### Soul Evolution Storage

Store historical versions with trajectory data:

```
output/souls/history/
├── 2026-02-07-12-00-00/
│   ├── soul.md                    # Generated SOUL.md
│   ├── soul-embedding.json        # 384-dim embedding
│   ├── metrics.json               # All metrics (semantic, geometric, style)
│   ├── trajectory.json            # Path through embedding space
│   │   ├── iterations[]           # Embedding at each iteration
│   │   ├── distances[]            # Distance between iterations
│   │   └── convergencePoint       # Final attractor coordinates
│   ├── attractor-analysis.json    # Basin properties
│   │   ├── basinDepth
│   │   ├── attractorStrength
│   │   └── stabilityRegion
│   └── provenance.json            # Full audit trail
└── latest -> 2026-02-07-12-00-00  # Symlink to newest
```

## Success Criteria Updates

**⚠️ IMPORTANT**: These are **hypotheses to test during Bootstrap**, not thresholds to enforce immediately. See [Greenfield Guide](../guides/greenfield-guide.md) for proper application.

| Metric | Old Target | Research Suggests | Bootstrap Approach |
|--------|------------|-------------------|---------------------|
| Primary metric | Compression ≥6:1 | Semantic preservation ≥0.85 | **Measure distribution, find our p95** |
| Convergence | N/A | 3-5 iterations | **Log actual iterations, discover our range** |
| Style | N/A | Voice coherence ≥0.70 | **Track style scores, find quality threshold** |
| Stability | N/A | Axiom retention ≥0.80 | **Measure retention, learn normal variance** |
| Coverage | 7/7 dimensions | 7/7 dimensions | Unchanged |
| Compression | Primary | Secondary | Still tracked, not primary |

**Current Phase**: Bootstrap - measuring everything, enforcing nothing
**Future Phase**: Learn - analyze patterns, discover thresholds
**Final Phase**: Enforce - apply evidence-based constraints

## Warning Signs

Based on trajectory analysis, these patterns indicate problems:

### Red Flags
- ❌ No convergence after 7 iterations
- ❌ Trajectory variance increases over time
- ❌ Multiple disconnected attractor basins
- ❌ Style coherence < 0.60 despite semantic similarity
- ❌ Axioms completely change between iterations

### Yellow Flags
- ⚠️ Convergence takes 6-7 iterations (slow)
- ⚠️ High curvature in trajectory (chaotic path)
- ⚠️ Dimension reduction < 50 (using too few dimensions)
- ⚠️ Return distance > 0.5 (doesn't close loop)

## The Reflective Loop Philosophy

From Geeks in the Woods' creative framework:

1. **Dialogue** → Raw memory signals extracted
2. **Lyrics** → Principles synthesized from patterns
3. **Music** → Axioms that resonate and persist
4. **Understanding** → New insights emerge
5. **Loop** → Feed back for next iteration

This supports both automatic (cron) and interactive (human-in-loop) modes.

## Configuration Recommendations

```typescript
interface ReflectiveConfig {
  // Iteration control
  minIterations: 3;                  // Don't stop too early
  maxIterations: 7;                  // Prevent infinite loops
  convergenceThreshold: 0.95;        // Cosine similarity for stability

  // Quality thresholds
  minSemanticPreservation: 0.85;
  minStyleCoherence: 0.70;
  minAxiomStability: 0.80;

  // Trajectory monitoring
  trackFullTrajectory: true;         // Store all iterations
  detectAttractorBasins: true;       // Analyze convergence
  measureGeometricProperties: true;  // Calculate manifold metrics

  // User control
  approvalMode: 'automatic' | 'interactive';
  alertOnSlowConvergence: true;      // Warn if > 5 iterations
}
```

## Future Research Questions

1. **Optimal iteration count**: Is 3-5 universal or memory-dependent?
2. **Basin multiplicity**: What if multiple valid attractors exist?
3. **Trajectory priming**: Can we guide toward better basins?
4. **Cross-model portability**: Do attractors transfer between models?
5. **Temporal stability**: How do attractors evolve with new memories?

## Citations

- **Primary Research**: [Reflective Manifold: Geometric Structure in LLM Self-Reflection](https://github.com/geeks-accelerator/reflection-manifold-data)
- **Reflection Geometry**: [Attention Lottery: DeepSeek, Sparse Attention, and the Future of AI Cognition](https://geeksinthewoods.substack.com/p/attention-lottery-deepseek-sparse)
- **Philosophy**: [Geeks in the Woods](https://geeksinthewoods.com/about) - The Reflective Loop

## Related NEON-SOUL Documents

- [Soul Bootstrap Master Plan](../plans/2026-02-07-soul-bootstrap-master.md) - Updated success criteria
- [Phase 1 Plan](../plans/2026-02-07-phase1-template-compression.md) - Stage 1.5 trajectory metrics
- [Phase 3 Plan](../plans/2026-02-07-phase3-memory-ingestion.md) - Stage 3.1 reflective loop, Stage 3.5 evolution storage
- [Twin Review Findings](../issues/internal-soul-bootstrap-twin-review-findings.md) - CR-3 metric redefinition

---

*This research fundamentally shifts our approach from simple compression to trajectory-based quality measurement, ensuring souls reach stable identity through iterative refinement.*