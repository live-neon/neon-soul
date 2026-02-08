# Greenfield Guide: Bootstrap → Learn → Enforce for Soul Synthesis

**Based on**: [Multiverse Greenfield Methodology](../../../../artifacts/guides/methodology/GREENFIELD_GUIDE.md)
**Purpose**: Apply Bootstrap → Learn → Enforce to NEON-SOUL trajectory metrics
**Status**: Bootstrap Phase (current)

## The Problem

We're building a soul synthesis system from scratch. Research papers ([Reflective Manifold](../research/reflective-manifold-trajectory-metrics.md)) suggest souls converge to "attractor basins" in 3-7 iterations with specific thresholds.

**But we don't actually know:**
- What "convergence" looks like for our specific system
- Whether 3-7 iterations applies to our implementation
- What threshold values indicate quality vs noise
- Which metrics actually matter vs which seem important

**The Greenfield trap we must avoid:** Hardcoding thresholds from research papers before measuring our actual system.

## Core Principle

> "Thresholds emerge, they aren't declared. 'Normal' is discovered by observing the system, not defined before the system exists."
> — Greenfield Guide, Principle #7

## Three Phases for Soul Synthesis

### Phase 1: Bootstrap (Current Phase)

**Duration**: 2-4 weeks of synthesis runs (minimum 100 souls)

**What we do:**
```typescript
interface BootstrapConfig {
  // Capture everything, enforce nothing
  captureAllMetrics: true;
  enforceThresholds: false;

  // Log broadly
  logLevel: 'verbose';
  logTrajectory: true;
  logEmbeddings: true;
  logTimings: true;

  // Safety caps only (prevent runaway)
  maxIterations: 10;  // Parametric: research_max × 1.5
  maxProcessingTime: 300000;  // 5 min safety cap
  maxMemoryUsage: 2048;  // MB
}
```

**What we measure (without judging):**
- How many iterations until embeddings stabilize?
- What's the distribution of convergence times?
- What's the variance in trajectory paths?
- Which templates converge quickly vs slowly?
- What patterns emerge naturally?

**What we DON'T do:**
- ❌ Reject souls that don't converge in 3-5 iterations
- ❌ Enforce "attractor basin" requirements
- ❌ Optimize for compression ratio
- ❌ Apply style coherence thresholds

**Safety caps (non-negotiable):**
```typescript
// Based on system constraints, not research papers
const SAFETY_CAPS = {
  maxIterations: Math.min(
    10,  // Reasonable upper bound
    INFRASTRUCTURE_TIMEOUT / AVG_ITERATION_TIME
  ),
  maxEmbeddingSize: AVAILABLE_MEMORY / EXPECTED_SOULS / 2,
  costAlert: MONTHLY_LLM_BUDGET / 30 * 2  // Alert at 2x daily
};
```

**Phase Gate to Learn:**
- [ ] Completed 100+ synthesis runs
- [ ] 7-day rolling p95 convergence time stable (< 10% change)
- [ ] Observed at least 10 failures/timeouts
- [ ] No major code changes in last 7 days

### Phase 2: Learn (After Bootstrap)

**Duration**: 1-2 weeks of analysis

**What we discover from Bootstrap data:**

```typescript
interface LearnedThresholds {
  // Discovered from actual distributions
  convergenceIterations: {
    p50: number;  // e.g., 4 iterations
    p95: number;  // e.g., 7 iterations
    p99: number;  // e.g., 9 iterations
  };

  semanticPreservation: {
    distribution: number[];  // Actual measured values
    threshold: number;  // p95 - margin
  };

  styleCoherence: {
    observed: number[];  // What we actually see
    minimum: number;  // Where quality degrades
  };
}
```

**Statistical analysis required:**
- Compute percentiles with confidence intervals
- Identify which metrics correlate with human-rated quality
- Distinguish signal from noise
- Validate patterns with holdout data (last 20% of Bootstrap)

**Key questions to answer:**
1. What convergence rate indicates a healthy soul?
2. Which metrics predict user satisfaction?
3. Are attractor basins real in our system?
4. Does style actually matter more than content?

**Validation experiments:**
- Change one variable, measure effect
- Test hypothesis: "Souls with X characteristic are rated higher"
- Backtest: Would these thresholds have caught known bad souls?

**Phase Gate to Enforce:**
- [ ] Can state thresholds with 95% confidence intervals
- [ ] Identified top 3 metrics that explain quality variance
- [ ] Backtest shows rules would improve quality with < 5% false positives
- [ ] Hypothesis validated experimentally

### Phase 3: Enforce (After Learn)

**What we implement (based on evidence):**

```typescript
interface EnforceConfig {
  // Thresholds discovered in Learn phase
  convergenceThreshold: LEARNED_P95_CONVERGENCE;
  semanticThreshold: LEARNED_SEMANTIC_MINIMUM;
  styleThreshold: LEARNED_STYLE_MINIMUM;

  // Adaptive mechanisms
  adaptiveMode: 'static' | 'rolling' | 'self-regulating';

  // Continue measuring for drift
  continuousBootstrap: {
    sampleRate: 0.1;  // 10% full instrumentation
    alertOnDrift: true;
  };
}
```

**Maturity ladder:**

**Level 1 (Static)** - Start here:
```typescript
if (convergenceIteration > LEARNED_P95) {
  return { accept: false, reason: 'Slow convergence' };
}
```

**Level 2 (Adaptive)** - After 1-3 months:
```typescript
const threshold = rollingAverage(p95_convergence, '4_weeks') + 2 * stdDev;
if (convergenceIteration > threshold) {
  return { accept: false, reason: 'Outside normal range' };
}
```

**Level 3 (Self-Regulating)** - After deep understanding:
```typescript
if (quality < TARGET) {
  tightenThresholds(0.95);  // Gradually improve
  increaseIterations(1);
} else if (quality > TARGET * 1.1) {
  relaxThresholds(1.05);  // Allow more variation
}
```

## Current Status (2026-02-07)

We are in **Bootstrap Phase**. This means:

✅ **DO:**
- Log all trajectory metrics
- Run many synthesis attempts
- Try different templates and memories
- Measure everything without judgment
- Document surprises and failures

❌ **DON'T:**
- Enforce convergence requirements yet
- Reject "slow" souls
- Optimize for metrics
- Apply thresholds from research papers
- Skip Bootstrap because "research says 3-5 iterations"

## Implementation Checklist

### Bootstrap Phase (NOW)
```typescript
// In src/lib/pipeline.ts
export async function synthesizeSoul(config: BootstrapConfig) {
  const metrics: TrajectoryMetrics[] = [];

  // Run synthesis loop
  for (let i = 0; i < config.maxIterations; i++) {
    const soul = await iterate();
    const metric = await measureEverything(soul);
    metrics.push(metric);

    // Log verbosely, judge nothing
    logger.verbose('Iteration', { i, metric });

    // Safety cap only
    if (i >= config.maxIterations) {
      logger.info('Safety cap reached', { iterations: i });
      break;
    }
  }

  // Store for Learn phase
  await storeBootstrapData(metrics);

  // Accept everything during Bootstrap
  return { soul, metrics, accepted: true };
}
```

### Learn Phase (FUTURE)
```typescript
// In scripts/analyze-bootstrap.ts
async function analyzeBootstrapData() {
  const data = await loadBootstrapData();

  // Compute distributions
  const convergence = computePercentiles(data.iterations);
  const semantic = computePercentiles(data.semanticScores);

  // Find correlations
  const qualityPredictors = correlationAnalysis(data);

  // Validate with experiments
  const hypothesis = 'Convergence < 5 predicts quality';
  const validated = await runExperiment(hypothesis);

  // Output learned thresholds
  return {
    convergenceP95: convergence.p95,
    semanticMinimum: semantic.p25,  // Conservative
    styleImportance: qualityPredictors.style.r2
  };
}
```

## Common Mistakes to Avoid

### Mistake 1: "Research says 3-5 iterations"
**Wrong**: Hardcode `maxIterations: 5`
**Right**: Measure actual distribution, discover our p95

### Mistake 2: "Style should be ≥0.70"
**Wrong**: Reject souls with style < 0.70
**Right**: Measure style distribution, find where quality drops

### Mistake 3: "Skip Bootstrap, we know the domain"
**Wrong**: Jump straight to thresholds
**Right**: 2-4 weeks measuring reality first

### Mistake 4: "Optimize during Bootstrap"
**Wrong**: Add caching to speed up iteration 3
**Right**: Measure first, optimize after Learn phase

## Integration with Plans

### Phase 1 (Template Compression)
- **Stage 1.5**: Collect metrics, don't enforce
- Store all trajectory data for Learn phase
- Success = data collected, not thresholds met

### Phase 3 (Memory Ingestion)
- **Stage 3.1**: Iterative synthesis with logging
- **Stage 3.5**: Store everything for analysis
- Accept all souls during Bootstrap

### Master Plan Success Criteria
**Bootstrap criteria** (temporary):
- ✅ Trajectory data collected for 100+ souls
- ✅ Metrics logged comprehensively
- ✅ No premature optimization

**Learn criteria** (future):
- 📊 Thresholds discovered from data
- 📊 Patterns validated experimentally
- 📊 Confidence intervals computed

**Enforce criteria** (eventual):
- 🎯 Evidence-based thresholds applied
- 🎯 Continuous measurement for drift
- 🎯 Adaptive mechanisms implemented

## When to Transition Phases

### Bootstrap → Learn
After ALL true:
- Synthesized 100+ souls across diverse inputs
- Distributions stabilized (p95 change < 10% for 2 weeks)
- Observed edge cases and failures
- No major code changes planned

### Learn → Enforce
After ALL true:
- Computed thresholds with confidence intervals
- Validated patterns experimentally
- Backtested on holdout data
- Documented rollback procedures

## Anti-Patterns

❌ **Sampling in Bootstrap** - You don't know what's signal vs noise yet
❌ **Optimizing before measuring** - You'll optimize wrong things
❌ **Setting thresholds from papers** - Your system is unique
❌ **Infinite Bootstrap** - It has a purpose and endpoint
❌ **No safety caps** - Runaway costs/time are real risks

## FAQ

**Q: But the research says 3-7 iterations?**
A: That's their system. Yours might be 2-4 or 5-10. Measure to find out.

**Q: Can we at least reject obviously bad souls?**
A: During Bootstrap, log them as "would reject" but keep them. You're learning what "obviously bad" means.

**Q: This seems slow?**
A: 2-4 weeks of Bootstrap prevents 6 months of wrong optimization.

**Q: What if our Bootstrap data is wrong?**
A: That's what Learn phase discovers. Better to find out then than after Enforce.

## Related Documents

- [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md) - Research insights (not thresholds!)
- [Bootstrap Master Plan](../plans/2026-02-07-soul-bootstrap-master.md) - Implementation phases
- [Multiverse Greenfield Guide](../../../../artifacts/guides/methodology/GREENFIELD_GUIDE.md) - Full methodology

## Key Takeaway

The Reflective Manifold research provides **hypotheses to test**, not **thresholds to enforce**. Our Bootstrap phase will discover what convergence actually means for NEON-SOUL.

**Current mode**: Bootstrap (measure everything, enforce nothing)
**Next milestone**: 100+ souls synthesized
**Then**: Analyze and learn what "normal" looks like

---

*Remember: You can't optimize what you haven't measured. Reality beats assumptions. Let the system teach you what it needs.*