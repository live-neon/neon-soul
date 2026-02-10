---
created: 2026-02-09
updated: 2026-02-09
type: implementation-plan
status: Draft
language: typescript
code_examples: forbidden
review_principles: |
  1. No Code: Do NOT add code examples. Plans describe WHAT/WHY, not HOW.
  2. No Hardcoding: Do NOT add values that depend on implementation.
  3. Suggest Intent: File paths, interfaces, acceptance criteria instead.
  4. Flag, Don't Fix: If plan has code, flag for removal.
trigger: think hard
---

# Plan: Add Signal Generalization Step (PBD Alignment)

## Problem Statement

The synthesis pipeline produces near 1:1 signal-to-axiom ratios (50→49→49) because semantically related signals don't cluster. Root cause: missing **principle synthesis** step from PBD methodology.

**Current flow** (broken):
```
Signal (specific) → Embed → Match → Principle (specific) → Axiom
                           ↑
            "Prioritize honesty over comfort"
                           ↓
            similarity = 0.25 to similar signals (NO_MATCH)
```

**Expected flow** (per PBD guides):
```
Signal (specific) → LLM Generalize → Principle (abstract) → Embed → Match → Axiom
                           ↑
            "Prioritize honesty over comfort"
                           ↓
            "Values truthfulness over social comfort"
                           ↓
            similarity = 0.87 to similar signals (MATCH!)
```

---

## Solution: LLM-Based Signal Generalization

Add a generalization step that transforms specific signals into abstract principles before embedding and matching.

### Key Insight

From `docs/guides/single-source-pbd-guide.md`:
> "Make implicit relationships explicit... Keep principles actionable"

From `docs/guides/multi-source-pbd-guide.md`:
> Before: "Never lie", "Always truthful", "Honesty paramount"
> After: "Maintain truthfulness in all communications"

### What Changes

| Step | Before | After |
|------|--------|-------|
| Signal extraction | ✅ No change | ✅ No change |
| **Generalization** | ❌ Missing | ✅ Add LLM step |
| Embedding | On signal.text | On generalized principle text |
| Matching | Low similarity | Higher similarity |
| N-counts | All N=1 | N=2, N=3+ |
| Cascade | Falls to N>=1 | Uses N>=2 or N>=3 |

---

## Stages

### Stage 1: Create Generalization Module

**File(s)**: `src/lib/signal-generalizer.ts`

**Purpose**: LLM-based transformation of specific signals to abstract principles

**Interface**:
```
generalizeSignal(llm, signal) → Promise<GeneralizedSignal>

GeneralizedSignal {
  original: Signal           // Keep original for provenance
  generalizedText: string    // Abstract principle statement
  embedding: number[]        // Embedding of generalized text
}
```

**LLM Prompt Design**:
- Input: Signal text, dimension (optional)
- Output: Generalized principle (1 sentence, abstract, actionable)
- Constraint: Preserve semantic meaning while abstracting surface form

**Batch Support**:
- `generalizeSignals(llm, signals[]) → Promise<GeneralizedSignal[]>`
- Use `classifyBatch` pattern from semantic-classifier.ts

**Acceptance Criteria**:
- [ ] `generalizeSignal()` returns abstract principle text
- [ ] Generalized text is shorter and more abstract than original
- [ ] Provenance links back to original signal
- [ ] Batch version handles multiple signals efficiently

**Commit**: `feat(neon-soul): add signal generalization module`

---

### Stage 2: Integrate Into Principle Store

**File(s)**: `src/lib/principle-store.ts`, `src/lib/reflection-loop.ts`

**Purpose**: Use generalized text for principle creation and matching

**Current behavior** (principle-store.ts:200):
```
principle.text = signal.text
principle.embedding = signal.embedding
```

**New behavior**:
```
principle.text = generalizedSignal.generalizedText
principle.embedding = generalizedSignal.embedding
principle.original_signal = signal.text  // Keep for provenance
```

**Integration Points**:
1. `addSignal()` accepts `GeneralizedSignal` instead of raw `Signal`
2. OR: Add optional `generalizedText` parameter to `addSignal()`
3. Reflection loop calls `generalizeSignals()` before feeding to store

**Provenance**:
- Principle should trace back to both:
  - Original signal text (what user actually wrote)
  - Generalized form (what was used for matching)

**Acceptance Criteria**:
- [ ] Principles store generalized text
- [ ] Embeddings are of generalized text
- [ ] Original signal preserved in provenance
- [ ] Matching uses generalized embeddings

**Commit**: `refactor(neon-soul): integrate generalization into principle store`

---

### Stage 3: Update Reflection Loop

**File(s)**: `src/lib/reflection-loop.ts`

**Purpose**: Call generalization before principle store operations

**New Flow**:
```
1. Extract signals from memory
2. Generalize signals (NEW - LLM call)
3. Feed generalized signals to principle store
4. Match/cluster based on generalized embeddings
5. Compress to axioms
```

**Optimization**:
- Batch generalization (1 LLM call per iteration, not per signal)
- Cache generalized forms if signals repeat across iterations

**Metrics**:
- Track generalization time
- Log sample generalizations at debug level

**Acceptance Criteria**:
- [ ] Generalization happens before store.addSignal()
- [ ] Batch processing minimizes LLM calls
- [ ] Debug logs show generalization examples
- [ ] Overall pipeline still completes in reasonable time

**Commit**: `feat(neon-soul): add generalization step to reflection loop`

---

### Stage 4: Verify Clustering Improvement

**Purpose**: Confirm generalization improves semantic matching

**Verification**:
```bash
$ npx tsx src/commands/synthesize.ts --dry-run --verbose

# Expected (before):
# [matching] NO_MATCH: similarity=0.25 "Prioritize honesty..."
# [matching] NO_MATCH: similarity=0.31 "Clear, direct feedback..."
# Compression: 1.02:1

# Expected (after):
# [matching] MATCH: similarity=0.87 "Values truthfulness..."
# [matching] MATCH: similarity=0.89 "Prefers explicit communication..."
# Compression: 3:1 or better
```

**Success Metrics**:
- Compression ratio >= 3:1 (vs current ~1:1)
- Average N-count >= 2 (vs current 1)
- Cascade selects N>=2 or N>=3 (not always N>=1)

**Acceptance Criteria**:
- [ ] Related signals cluster (similarity > 0.85)
- [ ] N-counts reach 2+ for common themes
- [ ] Compression ratio improves significantly
- [ ] Cascade uses higher thresholds

**Commit**: `test(neon-soul): verify generalization improves clustering`

---

### Stage 5: Documentation

**File(s)**: `docs/ARCHITECTURE.md`, `docs/guides/greenfield-guide.md`

**Purpose**: Document the generalization step

**Updates**:
- ARCHITECTURE.md: Update pipeline diagram to show generalization step
- greenfield-guide.md: Reference PBD alignment
- Add inline comments in new module

**Acceptance Criteria**:
- [ ] Pipeline diagram shows generalization step
- [ ] PBD guides referenced in architecture docs
- [ ] New module has clear doc comments

**Commit**: `docs(neon-soul): document signal generalization step`

---

## Generalization Prompt Design

**Input Example**:
```
Signal: "Prioritize honesty over comfort"
Dimension: honesty-framework
```

**Prompt Template** (conceptual, not literal):
```
Transform this specific statement into an abstract principle.
The principle should:
- Capture the core value or preference
- Be general enough to match similar statements
- Be actionable (can guide behavior)
- Be concise (1 sentence)

Signal: {signal.text}
Dimension: {signal.dimension}

Output only the generalized principle, nothing else.
```

**Expected Output**:
```
Values truthfulness and directness over social comfort
```

---

## Risk Mitigation

### Risk: LLM adds latency

**Mitigation**:
- Batch generalization (1 call per iteration)
- Cache generalized forms
- Use fast model (Ollama llama3 is local)

### Risk: LLM generalizes incorrectly

**Mitigation**:
- Keep original signal in provenance
- Log sample generalizations for review
- Add validation step comparing generalized to original

### Risk: Over-generalization loses meaning

**Mitigation**:
- Prompt constrains output to be actionable
- Include dimension context in prompt
- Human review of generated SOUL.md

---

## Success Criteria

1. Semantically related signals cluster (similarity > 0.85)
2. Compression ratio improves from ~1:1 to at least 3:1
3. N-counts reach 2+ for common themes
4. Cascade can use N>=2 or N>=3 thresholds
5. Original signals preserved in provenance

---

## Related

**Issue**: [`docs/issues/missing-signal-generalization-step.md`](../issues/missing-signal-generalization-step.md)

**Code Review**: [`docs/issues/code-review-2026-02-09-signal-generalization.md`](../issues/code-review-2026-02-09-signal-generalization.md)

**PBD Guides**:
- [`docs/guides/single-source-pbd-guide.md`](../guides/single-source-pbd-guide.md) - Step 4: Principle Synthesis
- [`docs/guides/multi-source-pbd-guide.md`](../guides/multi-source-pbd-guide.md) - Step 2: Principle Normalization

**Code**:
- `src/lib/principle-store.ts` - Integration point
- `src/lib/reflection-loop.ts` - Call site
- `src/lib/semantic-classifier.ts` - Pattern for LLM classification

---

*Plan drafted 2026-02-09 - Aligns implementation with PBD methodology*
