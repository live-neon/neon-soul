# Technical Review: liveneon.org Landing Page Plan

**Date**: 2026-02-08
**Reviewer**: Twin 1 (Technical Infrastructure)
**Model**: Claude Opus 4.5

## Verified Files

| File | Lines | MD5 (8-char) |
|------|-------|--------------|
| docs/plans/2026-02-08-liveneon-landing-page.md | 408 | 2e7fd8ea |

**Prior Reviews Consulted**:
- docs/reviews/2026-02-08-liveneon-landing-page-codex.md (N=2 external)
- docs/reviews/2026-02-08-liveneon-landing-page-gemini.md (N=2 external)
- docs/issues/code-review-2026-02-08-liveneon-landing-page.md (issue tracker)

---

## Summary

**Status**: Approved with suggestions

The plan is well-structured, follows template conventions, and has already incorporated N=2 code review feedback. The Railway.com pivot, 2-layer audience strategy, performance budget, accessibility requirements, and SEO additions are all solid improvements. Three areas warrant attention before implementation: cache-busting for static assets, explicit file size targets for MCE-like discipline on CSS files, and Railway-specific environment configuration.

---

## Frontmatter Compliance

**Check**: `code_examples: forbidden` declared (line 6)

| Principle | Compliance |
|-----------|------------|
| No Code | PASS - No code blocks in plan |
| No Hardcoding | PASS - Uses tokens (e.g., `--color-primary`) not hex values |
| Suggest Intent | PASS - File paths, acceptance criteria, word counts |
| Flag, Don't Fix | N/A - No violations to flag |

---

## Strengths

1. **Template alignment**: Follows implementation-plan-template.md structure exactly (frontmatter, stages, acceptance criteria, commits)

2. **Review integration**: N=2 findings systematically addressed per issue tracker - 14/15 items resolved

3. **Performance budget**: Explicit budgets (500KB total, 14KB critical CSS, 150KB fonts) make Lighthouse 90+ achievable

4. **Accessibility**: WCAG AA requirements (4.5:1 contrast, ARIA landmarks, skip links) are testable and specific

5. **2-layer audience strategy**: Research-backed decision (OpenClaw, Ollama, LM Studio analysis) - simpler than 4-audience segmentation

6. **Railway.com choice**: Avoids GitHub Pages subdirectory limitation; railway.json in Stage 0 is correct sequencing

7. **Asset licensing**: OFL fonts documented, self-hosting for privacy - no licensing surprises

---

## Findings

### Critical

None identified. The N=2 code review addressed the critical issues (GitHub Pages, performance targets, frontmatter conflict).

---

### Important

#### 1. Cache-Busting Strategy Missing

**Location**: Stage 4 (Visual Polish), Stage 5 (Deployment)
**Problem**: Performance budget addresses file sizes but not cache invalidation. Static sites need cache-busting for CSS/JS updates. Without it, users may see stale styles after deployments.

**Why it matters**: Railway auto-deploys on git push. If CSS changes but filename doesn't, CDN/browser caches serve old version.

**Suggestion**: Add to Stage 0 or Stage 5:
- File naming convention with hash (e.g., `styles.[hash].css`)
- Or: Cache-Control headers in Railway config
- Or: Simple query string approach (`styles.css?v=1.0`)

**Confidence**: HIGH - Standard static site deployment practice

---

#### 2. CSS File Size Limits Unspecified

**Location**: Stage 0 (Project Setup), lines 82-86
**Problem**: Five CSS files created but no size guidance. MCE-like discipline (極) improves maintainability for static assets too.

**Current list**:
- variables.css
- base.css
- layout.css
- components.css
- animations.css

**Suggestion**: Add advisory limits to Stage 1 acceptance criteria:
- Each CSS file: ~100-150 lines max
- Total combined: <400 lines (fits 14KB critical CSS budget)

**Confidence**: MEDIUM - Advisory, not blocking. MCE is for Go/code, but the principle (cognitive limits) applies to CSS maintainability.

---

#### 3. Railway Environment Configuration Incomplete

**Location**: Stage 5 (Deployment), lines 282-328
**Problem**: Stage mentions `railway.json` but doesn't specify required configuration. Railway static site serving requires explicit config.

**Specific gaps**:
- Build command (or `staticBuild` section)
- Start command for static server
- Node version if using build step
- Environment variables (none expected, but explicit is better)

**Suggestion**: Add to Stage 0 acceptance criteria:
- [ ] railway.json includes static site serving configuration
- [ ] Local test with `railway run` before deploy

**Why this matters**: Railway supports multiple deploy modes (Dockerfile, Nixpacks, static). Explicit config prevents deploy debugging.

**Confidence**: HIGH - Required for Railway deployment

---

#### 4. Tagline Decision Outstanding

**Location**: Lines 29, Issue tracker item #12
**Problem**: Two candidates listed ("Your AI, grounded" vs "Identity that knows where it came from"). Issue tracker marks as unresolved.

**Why it matters**: Tagline drives hero copy tone. Choosing during Stage 3 (content) adds decision overhead mid-implementation.

**Suggestion**: Resolve before Stage 3:
- "Your AI, grounded" - 3 words, punchy, memorable
- "Identity that knows where it came from" - descriptive, provenance-focused

**Recommendation**: "Your AI, grounded" (shorter is better for hero). Second option works as subhead.

**Confidence**: LOW - Creative decision outside technical scope

---

### Minor

#### 5. www Redirect Implementation Unspecified

**Location**: Stage 5, lines 304-305
**Problem**: DNS configuration mentions CNAME for www.liveneon.org but doesn't specify redirect implementation.

**Suggestion**: Add to Stage 5 acceptance criteria:
- [ ] www.liveneon.org redirects to liveneon.org (HTTP 301)

**Confidence**: HIGH - Standard practice

---

#### 6. Local Development Workflow Missing

**Location**: Stage 0, website/README.md mentioned (line 88)
**Problem**: Plan mentions README documents deployment but not local dev workflow.

**Suggestion**: Add to Stage 0 acceptance criteria:
- [ ] README includes local preview instructions (e.g., `npx serve website/` or Python http.server)

**Confidence**: HIGH - Enables iteration without deploy

---

#### 7. Font Subset Verification

**Location**: Stage 3, lines 213-215
**Problem**: Font strategy mentions "Subset fonts to Latin characters only (~50KB savings)" but no verification step.

**Suggestion**: Add to Stage 3 acceptance criteria:
- [ ] Font subset verified (woff2 file sizes match budget)

Tools: `pyftsubset` from fonttools, or Glyphhanger

**Confidence**: MEDIUM - Important for performance budget but may be caught by Lighthouse

---

#### 8. Social Preview Card Testing

**Location**: Stage 5, line 318
**Problem**: "Test social preview cards (Twitter, LinkedIn, Discord)" listed but no specific tools.

**Suggestion**: Add specific testing approach:
- opengraph.xyz for preview
- Twitter Card Validator
- LinkedIn Post Inspector

**Confidence**: MEDIUM - These tools are standard but not required to be in plan

---

## MCE Compliance (adapted for static site)

| Aspect | Status | Notes |
|--------|--------|-------|
| Plan length | PASS | 408 lines (under 500 limit for plans) |
| Single responsibility per file | PASS | CSS split by concern (variables, base, layout, components, animations) |
| Dependency count | PASS | No JS frameworks, minimal deps |
| Testable acceptance criteria | PASS | Lighthouse, contrast ratios, breakpoints all measurable |

---

## Architecture Assessment

**Approach**: Static HTML/CSS/JS on Railway.com

**Soundness**: Excellent. No build step required, deploys directly, auto-HTTPS, free tier adequate.

**Risks**:
1. Railway free tier limit (500 hours/month) - acceptable for low-traffic marketing site
2. No analytics - intentionally deferred, can add later
3. No contact form processing - email link only, acceptable

**Alternative considered (Codex review)**: GitHub README as landing page. Plan correctly proceeds with dedicated domain - establishes brand identity beyond GitHub.

---

## Testing Strategy

No automated tests required for static site. Manual testing checklist embedded in acceptance criteria:

- Lighthouse 90+ (Stage 4, line 276)
- WCAG AA contrast (Stage 2, line 168)
- Breakpoint responsiveness (Stage 2, line 172)
- Link verification (Stage 5, line 323)
- Social preview cards (Stage 5, line 318)

**Suggestion**: Add acceptance criterion for mobile emulator testing (Chrome DevTools device mode) to ensure 60%+ mobile traffic assumption is validated.

---

## Security Considerations

**Confidence**: HIGH

- Static site with no user input - minimal attack surface
- HTTPS via Railway Let's Encrypt - automatic
- Self-hosted fonts - no tracking
- No analytics - privacy-respecting
- Contact via email link - no form processing vulnerabilities
- No JavaScript dependencies - no supply chain risk

One consideration: Email link (`mailto:soul@liveneon.org`) exposes email to scrapers. Standard trade-off for contact pages.

---

## Performance Assessment

**Budget** (from Stage 4):

| Resource | Budget | Feasibility |
|----------|--------|-------------|
| Total page | <500KB | Achievable with discipline |
| Critical CSS | <14KB | Tight but doable if inline |
| Fonts | <150KB | Requires subset (3 fonts x 50KB) |
| Images | <200KB | WebP + lazy load |
| JavaScript | <50KB | Minimal, achievable |

**Risk**: Neon glow effects (CSS box-shadow, filters) can cause paint performance issues. `prefers-reduced-motion` handling (Stage 4, line 259) mitigates.

---

## Recommendations

### Before Implementation

1. **Decide tagline** - Recommend "Your AI, grounded" (punchy, memorable)
2. **Document Railway config** - Add railway.json structure to Stage 0 or create stub
3. **Choose cache-busting approach** - Query string simplest for single-page site

### During Implementation

4. **Track CSS file sizes** - Set soft limit ~100-150 lines per file
5. **Verify font subsets** - Check woff2 sizes match budget
6. **Test mobile early** - Chrome DevTools device mode in Stage 2

### Post-Implementation

7. **Social preview testing** - Use opengraph.xyz before announcing
8. **Uptime monitoring** - UptimeRobot mentioned in plan, configure promptly

---

## Comparison with N=2 Reviews

| Reviewer | Critical Issues | Important Issues | Addressed |
|----------|-----------------|------------------|-----------|
| Codex | 3 | 7 | 14/14 |
| Gemini | 0 | 2 | 2/2 |
| Twin Technical | 0 | 4 | New findings |

**New findings from this review**:
1. Cache-busting strategy
2. CSS file size limits
3. Railway environment config specifics
4. Local development workflow

These complement rather than contradict N=2 findings.

---

## Alternative Framing Considered

> If the approach itself seems wrong (not just the implementation), flag it.

**Approach is sound**. Codex raised "Is domain needed now?" - valid question answered:
- Domain establishes brand identity beyond GitHub
- liveneon.org is memorable, positions project for growth
- Static site is minimal investment (~8-10 hours)

**CJK accessibility concern** (Codex): Plan uses CJK as accent, not primary messaging. The 2-layer approach (surface for everyone, depth for technical) handles this well - CJK elements appear in depth layer where audience expects specialized vocabulary.

**No fundamental objections**. The plan solves the right problem with appropriate scope.

---

## Next Steps

1. Address Important findings 1-3 (cache-busting, CSS limits, Railway config) before implementation
2. Resolve tagline (finding 4) before Stage 3
3. Proceed with Stage 0 implementation after updates

---

*Review completed 2026-02-08 by Twin 1 (Technical Infrastructure)*
