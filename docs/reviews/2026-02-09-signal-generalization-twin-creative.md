# Twin Creative Review: Signal Generalization Plan

**Date**: 2026-02-09
**Reviewer**: Twin 2 (Creative & Project Reviewer)
**Plan**: `docs/plans/2026-02-09-signal-generalization.md`
**Status**: Approved with suggestions

---

## Verified Files

| File | Lines | MD5 (first 8) |
|------|-------|---------------|
| docs/plans/2026-02-09-signal-generalization.md | 397 | 4634125b |
| docs/guides/single-source-pbd-guide.md | 280 | verified |
| docs/guides/multi-source-pbd-guide.md | 347 | verified |
| docs/issues/missing-signal-generalization-step.md | 154 | verified |
| docs/issues/code-review-2026-02-09-signal-generalization.md | 270 | verified |

---

## Summary

The plan correctly identifies a real architectural gap: the missing "Principle Synthesis" step from PBD methodology. The technical solution (LLM-based generalization before embedding) is sound and well-documented. However, the plan underweights a philosophical tension at its core: **generalization inherently trades authentic voice for clustering efficiency**.

The user asks "Prioritize honesty over comfort" - and that phrase carries their fingerprint. Transforming it to "Values truthfulness over social comfort" may improve embedding similarity, but it moves from *their words* to *our abstraction*. The plan addresses this technically (via provenance tracking) but not experientially.

**Overall Assessment**: Strong technical plan. Needs creative attention to user experience and authentic voice preservation.

---

## Strengths

1. **Correct root cause identified**: The PBD guides are explicit about synthesis/normalization steps (single-source-pbd-guide.md lines 100-141, multi-source-pbd-guide.md lines 74-113). The plan correctly diagnoses that skipping these steps causes the 1:1 ratio problem.

2. **Responsive to code review**: All 11 findings from Codex and Gemini have been addressed. The plan now includes fallback mechanisms, batching policies, provenance metadata, and validation checks.

3. **Clear problem visualization**: The "Before/After" flow diagrams (lines 23-39) make the problem and solution immediately understandable.

4. **Frontmatter compliance**: Respects `code_examples: forbidden` - descriptions are prose-based with interface specifications, not code blocks.

5. **Honest about risks**: Risk mitigation section (lines 323-357) directly addresses LLM failure, latency, incorrect generalization, and over-generalization.

---

## Issues Found

### Important (Should Fix)

#### 1. Missing Philosophy: Voice Preservation vs Clustering Efficiency

**Location**: Plan overall - not addressed anywhere
**Problem**: The plan treats generalization purely as a technical optimization problem. But there's a real philosophical question the user raised: when we transform "Prioritize honesty over comfort" into "Values truthfulness over social comfort", what do we lose?

**What we gain**: Better embedding similarity, better clustering, more meaningful axioms
**What we lose**: The user's authentic phrasing, their specific word choices, their voice

The PBD guides are clear that synthesis should "abstract surface variation into semantic unity" (single-source-pbd-guide.md line 120). But they're silent on whether the *output* (SOUL.md) should use the abstracted form or preserve authentic voice.

**Suggestion**: Add a "Voice Preservation Strategy" section or note that addresses:
- Should SOUL.md display generalized principles or original signals?
- Could we cluster on generalized embeddings but *display* with original phrasing?
- Should axiom statements be in the user's voice where possible?

**Relevant Compass Principle**: Long-View & Strategy - "think 6-month-future maintainer" - except here, think "6-month-future user reading their SOUL.md"

---

#### 2. SOUL.md User Experience Undefined

**Location**: Stage 5 (Documentation), Success Criteria
**Problem**: The plan heavily focuses on *clustering metrics* but says almost nothing about what the user actually sees. Success criteria include "Compression ratio >= 3:1" and "N-counts >= 2" but nothing like:
- "User recognizes their values in generated SOUL.md"
- "Axioms feel personal, not generic"
- "Provenance is discoverable (user can trace back to their words)"

**Current Success Criteria** (lines 362-377):
- Cluster-level metrics (similarity, compression, N-counts)
- Operational metrics (provenance, fallback rate, latency)
- Downstream value metrics (principle quality rubric - but this is manual and vague)

**Suggestion**: Add explicit UX success criteria:
- [ ] SOUL.md feels personalized, not templated
- [ ] User's original phrasing appears somewhere (maybe in provenance comments?)
- [ ] Axiom statements are actionable by the user, not abstract platitudes

---

#### 3. "No Policy Invention" Constraint May Be Underspecified

**Location**: Prompt Constraints (lines 291-319)
**Problem**: The constraint "Output must not introduce concepts absent from original signal" is good but may be insufficient. Consider:

- Original: "Prioritize honesty over comfort"
- Bad generalization: "Values transparent organizational communication" - adds "organizational"
- Ambiguous case: "Values truthfulness and directness over social comfort" - adds "directness"

Is adding "directness" policy invention? The user said "honesty" not "directness". They're related but not identical.

**Suggestion**: Clarify the constraint with examples:
- Synonym expansion (honesty -> truthfulness) = OK
- Related concept addition (honesty -> honesty + directness) = Flag for review
- Domain injection (honesty -> organizational honesty) = Reject

---

### Minor (Nice to Have)

#### 4. Prompt Template is Conceptual, Not Versioned

**Location**: Lines 301-314
**Problem**: The plan says we'll track `prompt_version` in provenance, but the actual prompt template is described conceptually ("The prompt instructs the LLM to..."). For real versioning, we need a canonical prompt file.

**Suggestion**: Create `src/prompts/generalize-signal.md` as the versioned prompt. Reference it in plan. Then `prompt_version` can be a git hash or file version.

---

#### 5. Missing Example of Bad-to-Good SOUL.md

**Location**: Documentation (Stage 5)
**Problem**: The plan shows before/after for *signals* but never shows before/after for *SOUL.md*. As a creative review, I want to see:
- What does a SOUL.md generated without generalization look like? (50 near-duplicate axioms?)
- What does a SOUL.md generated *with* generalization look like? (5-7 meaningful axioms?)

**Suggestion**: Add illustrative examples in Stage 4 or Stage 5 showing the user experience difference. This grounds the technical metrics in real outcomes.

---

#### 6. "Actor-Agnostic Language" Tension

**Location**: Prompt Constraints (line 304)
**Problem**: The constraint "No I, we, you - abstract the actor" works for clustering but may create cold, impersonal axioms.

- Original (personal): "I prioritize honesty over comfort"
- Generalized (impersonal): "Prioritizes truthfulness over social comfort"

But when SOUL.md is displayed to the user, should it say "Values truthfulness" or "I value truthfulness"? The user is reading *their* soul document.

**Suggestion**: Separate the clustering form (actor-agnostic for embedding) from the display form (can re-personalize with "I" statements when rendering SOUL.md).

---

## PBD Methodology Alignment

**Question**: Does this truly implement the "Principle Synthesis" step from PBD guides?

**Assessment**: Yes, with one important caveat.

The PBD guides describe synthesis as:
> "Abstract surface variation into semantic unity" (single-source-pbd-guide.md line 120)
> "Different words expressing same concept -> unified language" (multi-source-pbd-guide.md line 108)

The plan implements this correctly. LLM generalization before embedding *is* the synthesis step.

**Caveat**: The PBD guides assume *multiple sources* being synthesized (hence needing unified language). But NEON-SOUL operates on a *single user's* signals. When one user says "honesty over comfort" and later says "clear, direct feedback", they're the same author. Do we need to "unify their language" or just *cluster* their related statements?

The plan could acknowledge this nuance: single-user synthesis is about finding patterns in *their* expression, not homogenizing *across* authors.

---

## Philosophy Alignment

**Question**: Does this preserve the user's authentic voice while abstracting?

**Assessment**: Partially. Technical provenance is excellent; experiential provenance is missing.

**Technical Provenance (Well Handled)**:
- Original signal text stored (lines 148-157)
- Model, prompt_version, timestamp tracked
- Fallback clearly marked
- Full audit trail available

**Experiential Provenance (Not Addressed)**:
- When user reads SOUL.md, do they see their words or our abstractions?
- Can they trace an axiom back to the moment they said "honesty over comfort"?
- Does the output *feel* like them or like a corporate values statement?

**The Deeper Question** (from user's review request):
> "When we abstract 'Prioritize honesty over comfort' to 'Values truthfulness over social comfort', are we gaining clustering at the cost of losing the user's authentic expression?"

**My Answer**: Yes, we lose something. The question is whether we can have both.

**Possible Solutions**:
1. **Display originals, cluster on abstractions**: SOUL.md shows "Prioritize honesty over comfort" (their words) with a hover/expansion showing related signals that clustered together.
2. **Hybrid axioms**: "Values truthfulness (see: 'honesty over comfort', 'clear direct feedback')" - abstraction with citations.
3. **Voice-preserving synthesis**: Instead of LLM abstracting to generic form, have it *select* the most representative original phrasing as the cluster label.

Option 3 is interesting: instead of "generalize these 4 signals into abstract principle", ask "which of these 4 signals best represents the cluster?" Then clustering uses embeddings, but display uses authentic voice.

---

## User Experience Review

**Question**: Will the resulting SOUL.md be readable and meaningful?

**Assessment**: Unclear - plan focuses on metrics, not UX.

**What we know**:
- Compression will improve (3:1 vs 1:1)
- N-counts will be meaningful (N>=2, N>=3)
- Axioms will be fewer and more evidence-backed

**What we don't know**:
- Will axioms feel personal or generic?
- Will the user recognize themselves in the output?
- Is "Values truthfulness over social comfort" a meaningful axiom or a platitude?

**Risk**: The generalization prompt encourages "abstract, actionable" output. But maximum abstraction approaches maximum genericness. "Values integrity in communications" could describe anyone.

**Suggestion**: Add a diversity or distinctiveness check. If the generalized form is something 80% of users would have, it may be too generic.

---

## Documentation Clarity

**Question**: Is the plan clearly written and understandable?

**Assessment**: Excellent - one of the clearer plans I've reviewed.

**What works well**:
- Problem statement is crisp (lines 19-41)
- Solution tables show before/after (lines 59-67)
- Each stage has clear acceptance criteria
- Interfaces described without code blocks (respecting frontmatter)
- Risks explicitly addressed with mitigations
- Cross-references to issues and reviews

**Minor clarity suggestions**:
- Line 50-55: The PBD guide quotes are helpful but could note *which* step from each guide
- Stage 4 could benefit from a concrete golden set example (not real data, just format)

---

## Alternative Framing Response

The user asked:
> "Consider the deeper question - when we abstract 'Prioritize honesty over comfort' to 'Values truthfulness over social comfort', are we gaining clustering at the cost of losing the user's authentic expression? Is there a way to have both?"

**My response**:

Yes, there's a way to have both - but it requires decoupling *representation* (for clustering) from *presentation* (for user experience).

**Current plan approach**:
```
Signal -> Generalize -> Store generalized -> Display generalized
```

**Alternative approach**:
```
Signal -> Generalize -> Store BOTH -> Display original with cluster context
```

**Implementation sketch**:
1. Generalize signals for embedding (as plan describes)
2. Cluster on generalized embeddings (as plan describes)
3. For each cluster, select the *most representative original signal* as the display label
4. SOUL.md shows original phrasings with evidence of clustering (N-count, related signals expandable)

This gives:
- Technical win: Good clustering from generalized embeddings
- UX win: Authentic voice in output
- Provenance win: Both forms stored for auditability

This is a significant change to the plan's output stage. If adopted, it should be a separate stage or a variant in Stage 5.

---

## Cross-References

**Plan correctly references**:
- Issue: `docs/issues/missing-signal-generalization-step.md` (confirmed)
- Code review: `docs/issues/code-review-2026-02-09-signal-generalization.md` (confirmed, marked resolved)
- PBD guides: Both single-source and multi-source (confirmed)

**Missing references**:
- `docs/ARCHITECTURE.md` - Should be updated with generalization step (noted in Stage 5 but not linked)
- This review should be linked from the plan's Related section

---

## Token Budget Check

- Plan file: 397 lines (reasonable for implementation plan)
- All stages under 50 lines each (good chunking)
- No redundant sections

---

## Organization Check

- **Directory placement**: Correct (`docs/plans/`)
- **Naming**: Correct (date-prefixed, descriptive)
- **Frontmatter**: Complete and valid
- **Cross-references**: Good but could add this review

---

## Recommendations Summary

| # | Item | Priority | Action |
|---|------|----------|--------|
| 1 | Add Voice Preservation Strategy section | Important | New section addressing authentic voice vs abstraction |
| 2 | Add UX success criteria | Important | Expand success criteria beyond clustering metrics |
| 3 | Clarify "no policy invention" with examples | Important | Add examples to prompt constraints |
| 4 | Version the prompt template as a file | Minor | Create src/prompts/generalize-signal.md |
| 5 | Add before/after SOUL.md examples | Minor | Illustrative examples in Stage 4/5 |
| 6 | Address display-time re-personalization | Minor | Note on I/we/you in output stage |

---

## Final Assessment

**Approve with suggestions**.

The plan solves the right problem (PBD alignment gap) with the right approach (LLM generalization before embedding). It's been thoroughly reviewed by technical reviewers (Codex + Gemini) and those findings are addressed.

What's missing is creative attention to the *human experience*. The user reading their SOUL.md deserves to recognize themselves in it. Right now, the plan optimizes for clustering quality but doesn't explicitly consider how to preserve what makes the output feel like *their* soul, not a generic values statement.

The technical provenance (storing original signals) makes the alternative approaches possible. The plan doesn't need major restructuring - it needs an additional consideration in Stage 5 or a variant output mode that prioritizes authentic voice.

---

*Review completed 2026-02-09 by Twin 2 (Creative & Project Reviewer)*
