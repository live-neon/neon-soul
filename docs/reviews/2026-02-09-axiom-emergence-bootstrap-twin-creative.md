# Axiom Emergence Bootstrap Plan Review - Twin Creative

**Date**: 2026-02-09
**Reviewer**: Twin Creative (双創)
**Focus**: UX, communication clarity, philosophy alignment

**Verified files**:
- `docs/plans/2026-02-09-axiom-emergence-bootstrap.md` (270 lines, MD5: b7a7dfcc)
- `docs/compass.md` (950 lines) - Philosophy reference
- `docs/guides/greenfield-guide.md` - Methodology reference
- Previous reviews: Gemini + Codex (both from earlier revision)

**Status**: Approved with suggestions

---

## Summary

Revision 3 represents a significant philosophical upgrade. The shift from manual mode switching to cascading thresholds transforms user experience from "configure the system" to "let the system work." This aligns with both greenfield methodology ("thresholds emerge") and the project's preference for autonomous, adaptive systems.

The earlier reviews (Gemini, Codex) critiqued Revision 1/2 - the workaround approach. Revision 3 addresses their core concerns: N-count carryover is now preserved (Stage 1), and the system adapts autonomously rather than requiring manual mode selection.

---

## Philosophy Alignment Analysis

### Does the autonomous approach align with greenfield philosophy?

**YES, but with nuance.**

**Strong Alignment**:
- Greenfield guide states: "Thresholds emerge, they aren't declared"
- Cascade logic *discovers* the right threshold at runtime rather than declaring it upfront
- The system observes its own output (axiom count) and adapts accordingly
- No user configuration required - true autonomy

**Subtle Tension**:
The cascade uses a fixed hierarchy (3 -> 2 -> 1) with a fixed target (minimum 3 axioms). These are still declared thresholds, just applied adaptively rather than upfront.

**Resolution**: This is acceptable because:
1. The cascade is a *mechanism*, not a *policy* - it's HOW to adapt, not WHAT to target
2. The target (3 axioms minimum) has research backing (cognitive load research, Core tier requirements)
3. The system remains open to revision - if 3 proves wrong, the cascade target can change

**Verdict**: Strong philosophical alignment. The remaining declared values (cascade levels 3/2/1, target 3) are minimal, justified, and easily revisable.

---

## User Experience Analysis

### Is the UX improved by removing mode complexity?

**YES, significantly.**

| Before (Modes) | After (Cascade) |
|----------------|-----------------|
| User must understand Bootstrap/Learn/Enforce | User runs synthesis |
| User must know when to switch modes | System handles transitions |
| Wrong mode = confusing failures | System adapts to data quality |
| Mental model required: "Where am I in the process?" | Mental model: "Run it, it works" |

**User Journey Comparison**:

**Before**: "My synthesis produced 0 axioms. What mode am I in? Should I be in bootstrap? How do I switch? Wait, why are there modes?"

**After**: "My synthesis produced axioms. Some are marked 'Emerging' because evidence is sparse - that makes sense."

**Communication Improvement**: The complexity is moved from *user choice* to *system feedback*. Users see tier labels (Core/Domain/Emerging) that honestly communicate evidence strength, rather than needing to configure modes they may not understand.

---

## Tier Label Analysis

### Are the tier labels (Core/Domain/Emerging) communicating the right thing?

**Mostly yes, with one suggestion.**

**What the tiers communicate**:
| Tier | N-count | User understanding |
|------|---------|-------------------|
| Core | N>=5 | "This is well-established, highly reliable" |
| Domain | N>=3 | "This is solid, good evidence" |
| Emerging | N<3 | "This is new, treat with caution" |

**Strength**: Honest labeling. If cascade falls to N>=1, users see "Emerging" and know to be cautious. No false confidence.

**Suggestion**: The label "Emerging" is good, but consider whether users understand what they're supposed to *do* with Emerging axioms.

**Possible additions to documentation**:
- "Emerging axioms may stabilize to Domain/Core with more data"
- "Consider Emerging axioms provisional - verify manually if critical"
- "Running more synthesis iterations may promote Emerging to Domain"

This gives users actionable understanding, not just a quality label.

---

## Documentation/Communication Plan Assessment

### Is the documentation plan clear?

**Adequate but could be strengthened.**

**What Stage 5 covers**:
- Remove mode references from docs
- Update architecture docs
- Mark issues resolved
- Verification command example

**What could be added**:
1. **User-facing explanation**: How do users understand the new tier labels? Where is this documented?
2. **Migration note**: If anyone was using modes (even in tests), what breaks?
3. **Observability story**: The plan mentions logging which threshold was used - where is this visible? CLI output only, or persistent logs?

**Suggestion**: Add a "User Communication" section to Stage 5:
- Update CLI help text to remove mode flags
- Add explanation of tier labels to user-facing docs
- Consider a one-line message when cascade falls back: "Note: Evidence sparse, using N>=1 threshold (Emerging tiers)"

---

## Alternative Framing: Are We Missing Something?

### What assumptions are we not questioning?

The user asked: "Is there a simpler framing we're missing?"

**Questioned Assumption 1: We need tiers at all**

Could the system just output axioms with an N-count directly?
- Instead of "Core/Domain/Emerging", show "N=7", "N=3", "N=1"
- Users see raw evidence strength, not interpreted labels

**Counter**: Labels are more accessible. "Core" is clearer than "N=5" for non-technical users. The current approach is probably right.

**Questioned Assumption 2: Cascade should aim for 3 axioms minimum**

Why 3? The plan references "Core tier research minimum" but doesn't explain the cognitive load research behind it. If the target is wrong, the cascade optimizes for the wrong goal.

**Recommendation**: Link or summarize the research supporting "3 axioms minimum" in the plan. This makes the threshold justified rather than arbitrary.

**Questioned Assumption 3: Cascade is necessary at all**

What if we just: Fix N-count carryover (Stage 1) and keep N>=3 threshold?

If N-counts now accumulate properly, maybe the cascade is unnecessary - we'd get axioms naturally at the original threshold.

**Analysis**: This is partially addressed by the cascade being a fallback. If N>=3 produces enough axioms, the cascade stops there. The cascade handles edge cases (sparse input, early-stage data) without user intervention.

**Verdict**: The cascade is a reasonable safety net. It's not over-engineering because it degrades gracefully rather than adding complexity.

---

## Does This Feel Like the Right Solution?

### Or are we still optimizing within a wrong frame?

**This feels like the right solution.**

**Why**:
1. **Addresses root cause**: N-count carryover (Stage 1) fixes the actual bug
2. **Adds graceful degradation**: Cascade handles edge cases autonomously
3. **Removes user burden**: No mode switching required
4. **Honest communication**: Tier labels reflect actual evidence strength
5. **Philosophy-aligned**: Thresholds emerge from data, not configuration

**The frame is correct**: The problem was "system requires user to manage state that the system should manage itself." The solution is "make the system manage its own state."

**What would indicate wrong frame**:
- If we were adding more modes instead of removing them
- If we were adding more user configuration
- If we were hiding quality problems instead of labeling them honestly

None of these apply. The direction is correct.

---

## Specific Findings

### Strengths

1. **Revision history is transparent**: Users can see the evolution from workaround to root-cause fix to autonomous system
2. **"What This Eliminates" table is excellent**: Clear communication of complexity reduction
3. **Tier assignment separated from cascade level**: Honest labeling regardless of which threshold was used
4. **Acceptance criteria are specific**: Each stage has testable conditions
5. **Plan adheres to `code_examples: forbidden`**: Correctly uses pseudocode/flowchart notation instead of implementation code

### Issues Found

#### Important

1. **Research citation missing for "3 axioms minimum"**
   - **Section**: Stage 2, line 124
   - **Problem**: "Minimum viable output: 3 axioms (aligns with Core tier research minimum)" - but no link or explanation
   - **Suggestion**: Add reference to `docs/research/optimal-axiom-count.md` inline, or summarize the cognitive load research

2. **User communication under-specified in Stage 5**
   - **Section**: Stage 5, lines 203-215
   - **Problem**: Documentation updates focus on internal docs (ARCHITECTURE.md, issues). What about user-facing help text?
   - **Suggestion**: Add "Update CLI --help output" and "Add tier explanation to user guide" to acceptance criteria

#### Minor

3. **Cascade diagram could show tier assignment**
   - **Section**: Solution overview, lines 46-52
   - **Problem**: Cascade shows threshold logic but not tier assignment. Users might think "falling to N>=1 means I get Core axioms at N>=1"
   - **Suggestion**: Expand diagram to show tier assignment is based on actual N-count, not cascade level used

4. **Missing migration note for test suite**
   - **Section**: Stage 3, lines 140-160
   - **Problem**: Removing `GreenfieldMode` type may break tests that use mode configuration
   - **Suggestion**: Add note in Stage 3: "Update any tests that mock or configure GreenfieldMode"

---

## Comparison with Previous Reviews

| Finding | Gemini/Codex | Status in Revision 3 |
|---------|--------------|---------------------|
| Fix incomplete for other modes | Critical | **Resolved** - No modes exist |
| Root cause unaddressed | Critical | **Resolved** - Stage 1 fixes N-count carryover |
| Underspecified Learn phase | Important | **Resolved** - No Learn phase needed; system adapts autonomously |
| Arbitrary 200 limit | Important | **Resolved** - Cascade IS the safeguard |
| Unconditional promotion noise | Critical | **Partially resolved** - Cascade prefers N>=3, falls to N>=1 only if needed |

The previous reviews were against Revision 1/2. Revision 3 addresses their core concerns by removing the mode architecture entirely.

---

## Recommendations

### Before Implementation

1. **Add research citation for "3 axioms minimum"** - Justify the cascade target
2. **Expand Stage 5 to include user-facing docs** - CLI help, tier explanation

### During Implementation

3. **Log cascade decisions verbosely** - Users should see "Using N>=2 (N>=3 produced only 2 axioms)"
4. **Consider adding one-time migration warning** - If any config files reference modes, warn on first run

### After Implementation

5. **Track cascade statistics** - How often does it fall to each level? This validates whether N-count carryover is working.
6. **User feedback on tier labels** - Do users understand "Emerging"? Consider user testing.

---

## Final Assessment

**Status**: Approved with suggestions

**Confidence**: High

**Philosophy alignment**: Strong - autonomy over configuration, emergence over declaration

**UX improvement**: Significant - removes modal complexity, adds honest feedback

**Right solution**: Yes - addresses root cause + adds graceful degradation

The plan is ready for implementation. The suggestions above are refinements, not blockers.

---

*Review generated 2026-02-09 by Twin Creative (双創)*
*Focus: Documentation quality, organizational structure, user experience*
