# Research: Optimal Number of Core Axioms

**Date**: 2026-02-09
**Status**: Active
**Purpose**: Evidence-based framework for axiom count limits and tier structure

---

## Summary

Research across cognitive science, organizational design, legal frameworks, and design systems converges on consistent patterns for optimal principle/value counts. This informs NEON-SOUL's axiom tier structure and replaces arbitrary limits (e.g., "200 axioms") with principled constraints.

---

## Evidence from Multiple Domains

### Cognitive Science

**Miller's Law (1956)**: "The Magical Number Seven, Plus or Minus Two"
- Original finding: 5-9 items in working memory
- Modern revision: True limit is **3-4 chunks** (Cowan, 2001)
- Key insight: Chunking allows more items via hierarchical grouping

> "The true limit appears to be about 3 or 4 distinct chunks, consistent with many modern studies, but also equivalent to about 7 uncompressed items of typical compressibility."

**Sources**:
- [Miller's Law - Laws of UX](https://lawsofux.com/millers-law/)
- [PMC: George Miller's Magical Number in Retrospect](https://pmc.ncbi.nlm.nih.gov/articles/PMC4486516/)
- [Wikipedia: The Magical Number Seven](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two)

---

### Organizational Values

**Jim Collins - Built to Last (1994)**:
- Visionary companies have **3-6 core values** (sometimes cited as 3-5)
- "Keep them few and meaningful"
- Core values are timeless; operating practices adapt

> "Visionary companies tend to have only a few core values, usually between three and six."

**Sources**:
- [Jim Collins - Building Companies to Last](https://www.jimcollins.com/article_topics/articles/building-companies.html)
- [Strategic Discipline - Collins vs Lencioni on Core Values](https://strategicdiscipline.positioningsystems.com/bid/87326/Jim-Collins-or-Patrick-Lencioni-s-Vision-of-Core-Values)

---

### Religious/Ethical Frameworks

**Ten Commandments**:
- 10 items, designed for memorability (one per finger)
- Two-tablet structure: 4 God-related, 6 human-related
- Foundational core of 613 commandments in Jewish law (~1.6% are "core")

> "The ordering into ten items allows the beginning student to use fingers to count off and verify they've included all key elements."

**Sources**:
- [Ten Commandments - Britannica](https://www.britannica.com/topic/Ten-Commandments)
- [Ten Commandments - Wikipedia](https://en.wikipedia.org/wiki/Ten_Commandments)

---

### Design Systems

**Apple Human Interface Guidelines**:
- **3 principles**: Clarity, Deference, Depth

**Google Material Design**:
- **3 principles**: Material as metaphor, Bold/graphic/intentional, Motion provides meaning

**Sources**:
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple vs Google Design Guidelines](https://medium.com/@shivaniy0211/apples-human-interface-guidelines-vs-google-s-material-design-guidelines-e28db15028c0)

---

### Software Development

**Agile Manifesto (2001)**:
- **4 core values** → **12 supporting principles** (3:1 ratio)
- Values are abstract; principles are actionable
- Hierarchical structure enables both memorability and specificity

> "The four core values of the Agile Manifesto aren't just abstract ideas—they directly inform the 12 principles."

**Sources**:
- [Agile Manifesto Principles](https://agilemanifesto.org/principles.html)
- [12 Principles - Agile Alliance](https://agilealliance.org/agile101/12-principles-behind-the-agile-manifesto/)

---

### AI Alignment

**Anthropic Constitutional AI (2026)**:
- **4-level priority hierarchy**: Safety > Ethics > Guidelines > Helpful
- Full constitution: ~23,000 words (expanded from ~2,700 in 2023)
- Structure: Hardcoded behaviors (absolute) + Softcoded defaults (adjustable)

> "The constitution establishes a clear priority hierarchy: (1) being safe and supporting human oversight, (2) behaving ethically, (3) following Anthropic's guidelines, and (4) being helpful."

**Sources**:
- [Anthropic - Claude's Constitution](https://www.anthropic.com/news/claudes-constitution)
- [TIME - Anthropic Publishes Claude AI's New Constitution](https://time.com/7354738/claude-constitution-ai-alignment/)
- [The Register - Anthropic's 23,000-word Constitution](https://www.theregister.com/2026/01/22/anthropic_claude_constitution/)

---

### Legal Frameworks

**US Legal Hierarchy**:
- **4 levels**: Constitution > Statutes > Regulations > Case Law
- Constitution: 7 articles + 27 amendments
- Each level can contain many items, but hierarchy is fixed

**Sources**:
- [US Law - Sources & Hierarchy](https://libguides.udmercy.edu/c.php?g=739072&p=5285519)
- [Hierarchy of Laws PDF](https://electionjudgments.org/api/files/1562098531081rqhs4uex06a.pdf)

---

### Knowledge Taxonomy

**Optimal depth**: 3-4 levels maximum
- Every level beyond 3 cuts findability by 20%
- Inconsistent depth breaks user mental models

> "Research shows significant drop-off after 3 levels, and if users need more than three clicks to find common information, you should restructure your top-level categories rather than adding hierarchy depth."

**Sources**:
- [Knowledge Base Taxonomy Best Practices](https://www.matrixflows.com/blog/10-best-practices-for-creating-taxonomy-for-your-company-knowledge-base)
- [Knowledge Base Taxonomy Design Principles](https://www.matrixflows.com/blog/knowledge-base-taxonomy-best-practices)

---

## Synthesis: Common Patterns

| Pattern | Evidence | Application |
|---------|----------|-------------|
| Core tier: 3-7 items | Miller (3-4 chunks), Collins (3-6), Design (3), Commandments (10) | Core axioms: 3-7 max |
| Hierarchical structure | Agile (4→12), Law (4 levels), Anthropic (4 priorities) | Tiered axiom system |
| Expansion ratio: 3:1 | Agile (4→12), Commandments (10→613 = ~60:1 with substructure) | Domain ≤ 3x Core |
| Compression, not expansion | Axioms should synthesize, not enumerate | axioms < signals |

---

## Proposed Framework for NEON-SOUL

### Tiered Structure

| Tier | N-count | Max Count | Rationale |
|------|---------|-----------|-----------|
| **Core** | N≥5 | 3-7 | Working memory limit, highest evidence |
| **Domain** | N≥3 | 15-20 | ~3:1 ratio from core (Agile pattern) |
| **Emerging** | N<3 | Uncapped | Learning buffer, not production |

### Limit Formulas

**Ratio-based limit** (preferred):
```
max_axioms = min(signals * 0.5, 30)
```
- Axioms should compress, not expand (≤50% of signals)
- Hard cap of 30 aligns with manageable cognitive load
- 47 signals → max 23 axioms

**Abort condition** (replace arbitrary 200):
```
if (axioms.length > signals.length) {
  abort("Axiom count exceeds signal count - expansion instead of compression")
}
```
- Principled: axioms must always be fewer than signals
- Signals clustering problem, not threshold problem

### Tier Caps

| Tier | Formula | Example (47 signals) |
|------|---------|---------------------|
| Core | ≤7 | 5-7 axioms |
| Domain | ≤ core × 3 | 15-21 axioms |
| Total | ≤ signals × 0.5 | ≤23 axioms |

---

## Implications for Implementation

1. **N-count threshold (N≥3)**: Aligns with evidence-based tier structure
2. **Tier-based caps**: Enforce cognitive load limits at each tier
3. **Compression ratio**: Track as health metric (should be >2:1)
4. **Abort conditions**: Based on ratio violations, not arbitrary counts

---

## Open Questions

1. Should tier caps be configurable or hardcoded?
2. How do we handle edge cases (very few signals, very diverse input)?
3. Should we track compression ratio across runs for trend analysis?

---

## Cross-References

- **Issue**: `docs/issues/code-review-2026-02-09-axiom-emergence-bootstrap.md`
- **Plan**: `docs/plans/2026-02-09-axiom-emergence-bootstrap.md`
- **Implementation**: `src/lib/compressor.ts`

---

*Research compiled 2026-02-09 from web search across cognitive science, organizational design, and systems architecture domains.*
