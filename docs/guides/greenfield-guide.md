# Greenfield Guide: Autonomous Threshold Adaptation for Soul Synthesis

**Based on**: [Multiverse Greenfield Methodology](../../../../artifacts/guides/methodology/GREENFIELD_GUIDE.md)
**Purpose**: Document autonomous cascading threshold behavior in NEON-SOUL
**Status**: Production (cascading thresholds implemented)

## The Solution: Cascading Thresholds

NEON-SOUL uses **autonomous cascading thresholds** that adapt to data quality without manual configuration. This aligns with the Greenfield principle: "Thresholds emerge, they aren't declared."

### How It Works

```
Try N>=3 (high confidence) --> got >= 3 axioms? --> done
     |
     v (< 3 axioms)
Try N>=2 (medium confidence) --> got >= 3 axioms? --> done
     |
     v (< 3 axioms)
Try N>=1 (low confidence) --> use whatever we got
     |
     v
Tier assignment based on ACTUAL N-count (not cascade level):
  N>=5 --> Core tier | N>=3 --> Domain tier | N<3 --> Emerging tier
```

**Key insight**: The cascade level determines which axioms are *included*, but the tier label reflects *actual evidence strength*. An axiom with N=1 is always "Emerging" regardless of which cascade level produced it.

## Core Principle

> "Thresholds emerge, they aren't declared. 'Normal' is discovered by observing the system, not defined before the system exists."
> — Greenfield Guide, Principle #7

The cascading threshold approach embodies this principle: instead of hardcoding thresholds, the system discovers what works based on actual evidence.

## Tier Labels (User-Facing)

Axioms are assigned tiers based on their actual N-count (evidence strength):

| Tier | N-count | Meaning |
|------|---------|---------|
| **Core** | N>=5 | Highest evidence, most reliable. These patterns appear repeatedly across your data. |
| **Domain** | N>=3 | Solid evidence. These patterns have good support but less than Core tier. |
| **Emerging** | N<3 | Still learning. These patterns are new or have limited evidence - use with caution. |

The cascade feedback message will indicate which threshold was used:
- "Effective N-threshold: 3 (high confidence)"
- "Cascaded to N>=2 (sparse evidence in input)"
- "Fell back to N>=1 (very sparse evidence)"

## Research-Backed Guardrails

The system logs warnings (but never blocks) based on cognitive science research:

| Guardrail | Trigger | Source |
|-----------|---------|--------|
| Expansion warning | axioms > signals | Compression should reduce, not expand |
| Cognitive load warning | axioms > min(signals*0.5, 30) | Miller's Law, Ten Commandments |
| Fallback warning | effectiveThreshold === 1 | Sparse evidence indicator |

See [`docs/research/optimal-axiom-count.md`](../research/optimal-axiom-count.md) for full research basis.

## What This Replaces

The cascading threshold approach eliminates previous complexity:

| Removed | Why |
|---------|-----|
| GreenfieldMode type | No modes needed - system adapts |
| Bootstrap/Learn/Enforce phases | Autonomous behavior replaces manual phase switching |
| Arbitrary 200 axiom limit | Research-backed guardrails (warnings) instead |
| User configuration for thresholds | System just works |

## N-Count Carryover

The PrincipleStore now persists across reflective loop iterations:

- Same store is reused (not recreated each iteration)
- N-counts accumulate as signals re-match existing principles
- Similarity threshold still tightens each iteration (+0.02)
- Later iterations with stricter thresholds may not match existing principles (acceptable - only strong matches reinforce)

This enables axiom emergence: principles that accumulate N>=3 evidence get promoted.

## Convergence Behavior

With preserved PrincipleStore, convergence detection works differently:

1. **Faster stabilization**: N-counts accumulate, so the axiom set stabilizes faster
2. **Consistent tier distribution**: Output reflects actual evidence strength, not cascade artifacts
3. **Trajectory tracking**: The `TrajectoryTracker` measures stabilization rate and attractor strength

Expected behavior:
- Synthesis converges when axiom set embedding similarity >= 0.95
- Typical stabilization: 3-5 iterations (varies by input quality)
- High-quality input (N>=3 naturally): No cascade needed
- Sparse input (N<3 common): Cascade to lower threshold, honest tier labeling

## Related Documents

- [Reflective Manifold Trajectory Metrics](../research/reflective-manifold-trajectory-metrics.md) - Research insights
- [Optimal Axiom Count Research](../research/optimal-axiom-count.md) - Cognitive load limits, tier caps
- [Bootstrap Master Plan](../plans/2026-02-07-soul-bootstrap-master.md) - Historical context
- [Axiom Emergence Bootstrap Plan](../plans/2026-02-09-axiom-emergence-bootstrap.md) - Cascading threshold implementation
- [Multiverse Greenfield Guide](../../../../artifacts/guides/methodology/GREENFIELD_GUIDE.md) - Full methodology

## Key Takeaway

The system is now autonomous. Instead of manual phase switching (Bootstrap → Learn → Enforce), cascading thresholds adapt to data quality automatically:

- **High evidence**: Uses N>=3 (high confidence output)
- **Medium evidence**: Cascades to N>=2 (honest tier labels)
- **Sparse evidence**: Falls back to N>=1 (Emerging tier, use with caution)

The user gets working output regardless of input quality, with tier labels that honestly reflect evidence strength.

---

*"Thresholds emerge, they aren't declared." The cascade discovers what works for your specific data.*