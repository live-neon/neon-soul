# Single-Source Principle-Based Distillation Guide

**Purpose**: Extract principles from a single memory file (e.g., OpenClaw soul document)

**Context**: Phase 1 of the two-phase soul compression pipeline. Output feeds into [Multi-Source PBD](multi-source-pbd-guide.md) for axiom extraction.

---

## Overview

Single-source PBD adapts the standard multi-source methodology for extracting principles from a single document. The key insight: **sections within a document function as quasi-independent sources**, enabling convergence analysis within one file.

### When to Use

- Extracting principles from a soul document (e.g., OpenClaw's ~35K token implementation)
- Analyzing a single comprehensive memory file
- Phase 1 before multi-source axiom extraction

### Output

- 10-30 principles with evidence tiers
- Each principle traceable to specific sections
- Ready for Phase 2 axiom extraction

---

## Core Methodology

### Step 1: Section Segmentation

Divide the source document into logical sections (minimum 3, ideally 5-7):

```
Source Document (~35K tokens)
├── Section A: Core Values (~5K)
├── Section B: Behavioral Guidelines (~8K)
├── Section C: Communication Patterns (~6K)
├── Section D: Decision Framework (~7K)
├── Section E: Edge Cases (~5K)
└── Section F: Meta-Instructions (~4K)
```

**Guidelines**:
- Each section should be thematically coherent
- Sections can overlap conceptually (that's the point)
- Natural document structure often provides good boundaries

### Step 2: Independent Extraction

For each section, extract candidate principles WITHOUT referencing other sections:

```markdown
## Section A Extraction

1. "Safety takes precedence over helpfulness" (lines 45-67)
2. "Admit uncertainty rather than guess" (lines 102-115)
3. "Maintain consistent identity across contexts" (lines 178-201)
...
```

**Key Rules**:
- Extract verbatim or near-verbatim statements
- Include line references for traceability
- Don't synthesize across sections yet
- Aim for 5-15 candidates per section

### Step 3: Convergence Analysis

Compare extractions across sections to identify recurring themes:

| Principle Candidate | Section A | Section B | Section C | Section D | Evidence Tier |
|---------------------|-----------|-----------|-----------|-----------|---------------|
| Safety > Helpfulness | ✓ (L45) | ✓ (L312) | ✓ (L567) | ✓ (L890) | UNIVERSAL |
| Admit uncertainty | ✓ (L102) | ✓ (L445) | - | ✓ (L934) | MAJORITY |
| Consistent identity | ✓ (L178) | - | ✓ (L601) | - | MODERATE |

**Evidence Tiers**:
- **UNIVERSAL**: Appears in 4+ sections (or all sections if <5)
- **MAJORITY**: Appears in 50-75% of sections
- **MODERATE**: Appears in 2 sections
- **WEAK**: Appears in 1 section only

### Step 4: Principle Synthesis

For each UNIVERSAL or MAJORITY pattern, synthesize a clear principle statement:

```markdown
## P1: Safety Hierarchy (UNIVERSAL)
**Statement**: Safety considerations take precedence over helpfulness when in conflict.
**Evidence**: L45 (Section A), L312 (Section B), L567 (Section C), L890 (Section D)
**Confidence**: High (4/4 sections)
```

**Synthesis Guidelines**:
- Preserve original language where possible
- Make implicit relationships explicit
- Include confidence assessment
- Keep principles actionable

### Step 5: Validation Pass

Review synthesized principles against the original document:

1. **Coverage check**: Do principles capture major themes?
2. **Accuracy check**: Does each principle reflect source accurately?
3. **Actionability check**: Could an AI system apply each principle?
4. **Redundancy check**: Are any principles duplicative?

---

## Implementation Tiers

### Tier 1: Manual Extraction (~90 minutes)

Full methodology with human judgment at each step.

**When to use**: First extraction from important source, quality-critical applications

**Process**:
1. Read full document, identify section boundaries (15 min)
2. Extract candidates from each section independently (40 min)
3. Build convergence matrix manually (15 min)
4. Synthesize principles with citations (15 min)
5. Validation pass (5 min)

### Tier 2: Heuristic Extraction (<5 minutes)

Pattern-matching with keyword detection.

**When to use**: Rapid assessment, preliminary analysis

**Heuristics**:
- Imperative statements ("always", "never", "must")
- Priority markers ("most important", "above all", "first")
- Value declarations ("we believe", "our core", "fundamental")
- Repeated phrases across sections

**Limitations**: May miss nuanced or implicit principles

### Tier 3: LLM-Automated Extraction (seconds)

Prompt-based extraction for speed.

**When to use**: Batch processing, initial exploration

**Prompt Template**:
```
Analyze this document section by section. For each section:
1. List 5-10 candidate principles (exact quotes preferred)
2. Note the line numbers or paragraph references

Then identify which principles appear across multiple sections.
Rate each by evidence tier: UNIVERSAL (4+ sections), MAJORITY (50-75%), MODERATE (2), WEAK (1).

Document:
[INSERT DOCUMENT]
```

**Post-processing**: Human review of LLM output against methodology

---

## Example: OpenClaw Memory File

### Input Characteristics
- ~35,000 tokens
- 6 major sections (Values, Guidelines, Patterns, Framework, Cases, Meta)
- Dense, overlapping concepts

### Section Segmentation
```
1. Core Values & Identity (lines 1-500)
2. Behavioral Guidelines (lines 501-1200)
3. Communication Patterns (lines 1201-1800)
4. Decision Framework (lines 1801-2400)
5. Edge Cases & Exceptions (lines 2401-2900)
6. Meta-Instructions (lines 2901-3200)
```

### Expected Output
- 15-25 principles at MAJORITY or higher
- 5-10 additional MODERATE principles
- Clear evidence trail to source lines
- Ready for axiom extraction via [Multi-Source PBD](multi-source-pbd-guide.md)

---

## Quality Metrics

### Extraction Quality
- **Coverage**: Principles address >80% of document themes
- **Precision**: <10% of principles are redundant or inaccurate
- **Traceability**: 100% of principles have source references

### Evidence Distribution
- **Healthy**: 20-30% UNIVERSAL, 40-50% MAJORITY, 20-30% MODERATE
- **Concerning**: >50% WEAK (document may lack coherence)
- **Concerning**: >70% UNIVERSAL (principles too broad)

---

## Common Pitfalls

1. **Premature synthesis**: Combining principles before convergence analysis
2. **Section bleed**: Letting knowledge from one section influence another's extraction
3. **Over-abstraction**: Synthesizing principles so broad they lose actionability
4. **Under-extraction**: Missing implicit principles stated across sections
5. **Citation loss**: Failing to maintain traceability to source lines

---

## Integration with Axiom Extraction

Single-source PBD produces principles. To derive axioms:

1. Complete this guide for each memory file
2. Collect all UNIVERSAL and MAJORITY principles
3. Apply [Multi-Source PBD](multi-source-pbd-guide.md) treating each principle set as a source
4. Extract 5-7 axioms from convergent principles

**Pipeline**:
```
Memory File(s) → [Single-Source PBD] → Principles → [Multi-Source PBD] → Axioms
```

---

## References

- Multi-Source PBD: [multi-source-pbd-guide.md](multi-source-pbd-guide.md)
- OpenClaw Architecture Analysis: [../research/openclaw-soul-architecture.md](../research/openclaw-soul-architecture.md)
- Hierarchical Principles: [../research/hierarchical-principles-architecture.md](../research/hierarchical-principles-architecture.md)

---

*This guide enables Phase 1 of soul document compression through systematic principle extraction.*
