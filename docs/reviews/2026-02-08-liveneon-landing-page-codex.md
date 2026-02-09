# liveneon.org Landing Page Plan Review - Codex

**Date**: 2026-02-08
**Reviewer**: 審碼 (codex-gpt51-examiner)
**Model**: gpt-5.1-codex-max
**Files Reviewed**: `docs/plans/2026-02-08-liveneon-landing-page.md`

## Summary

The plan is well-structured with clear stages, acceptance criteria, and brand vision. However, it has three critical blockers: GitHub Pages cannot deploy from a `website/` subdirectory, performance targets lack implementation strategy, and the "Quick start commands" section conflicts with the `code_examples: forbidden` frontmatter. Important gaps exist in accessibility, SEO, and hosting architecture.

## Frontmatter Compliance

The plan correctly declares `code_examples: forbidden` (line 6) and includes review principles (lines 7-11). **No code blocks appear in the plan** - it describes WHAT/WHY appropriately. However, Stage 3's "Quick start commands" requirement (line 139) creates tension with this constraint.

## Findings

### Critical

| Location | Issue |
|----------|-------|
| Stage 5, line 246-247 | **GitHub Pages subdirectory deployment infeasible**: GitHub Pages cannot publish from `website/` subdirectory directly. Pages only supports root, `/docs`, or a dedicated branch. Plan needs hosting structure decision before Stage 0. |
| Success Criteria, line 289 | **Performance targets unachievable as planned**: "<2s on 3G" and "90+ Lighthouse" declared without performance budgets, image optimization strategy, font loading approach, or caching headers. With neon glow effects and custom assets, targets are not feasible without explicit tactics. |
| Stage 3, line 139 vs line 6 | **Frontmatter conflict**: "Quick start commands" in Start section will force code snippets, violating `code_examples: forbidden`. Rephrase as "link to getting-started guide" or "reference to installation docs". |

### Important

| Location | Issue |
|----------|-------|
| Stage 2, line 150 | **Accessibility incomplete**: Only "skip links" mentioned. Missing: color contrast requirements (WCAG AA), focus/hover states for keyboard nav, ARIA landmarks, form handling for email capture if added. |
| Stage 5, lines 239-264 | **Hosting architecture underspecified**: No decision on Pages vs. alternative host/CDN. Missing: www-to-apex redirect implementation, caching/headers config, build/deploy workflow (branch vs. GitHub Action). No fallback if domain/DNS delayed. |
| Not present | **SEO essentials missing**: No mention of sitemap.xml, robots.txt, canonical tags, JSON-LD schema (Organization/WebSite), or favicon/manifest files. |
| Stage 3, lines 179-182 | **Asset sourcing unclear**: Logo, OG image, architecture diagram listed but no sourcing/licensing plan. Font licenses (Space Grotesk, Inter, JetBrains Mono) and hosting method (self-host vs. CDN) unspecified. Risk of scope creep. |
| Lines 58-63 | **Audience layering lacks navigation strategy**: Four audience layers defined but no content map, anchors, or progressive disclosure mechanism. Risk of muddled messaging - users may not find their lane in "10 seconds" (success criterion line 290). |
| Open Questions, lines 309-314 | **Blocking decisions unresolved**: Domain registration, analytics, and email capture are open questions that block deployment or alter privacy footprint. Need resolution before Stage 5. |
| Various stages | **Acceptance criteria gaps**: Design system, content, and polish stages lack testable criteria for performance, accessibility, and responsiveness beyond breakpoint checks. No review gates beyond "8th-grade reading level". |

### Minor

| Location | Issue |
|----------|-------|
| Effort Estimate, line 307 | **Timeline unrealistic**: 6 hours underestimates custom asset creation (logo, OG image, diagram), copy development, QA, and deployment debugging. Expect multi-day elapsed time. |
| Stage 2, line 138 | **Diagram format underspecified**: "ASCII or SVG" leaves ambiguity. ASCII clashes with neon aesthetic and has accessibility issues. Recommend choosing SVG only. |
| Stage 3, line 204 | **Architecture linkage weak**: "matches getting-started guide" noted but no linkage to authoritative architecture doc or update plan when architecture evolves. |
| Line 19 | **OpenClaw audience unaddressed**: Problem statement mentions "OpenClaw users" but no specific content or messaging tailored to them. Either add or narrow audience scope. |
| Not present | **Post-deploy monitoring absent**: No mention of uptime checks, status badges, or periodic verification beyond initial link testing. |

## Alternative Framing

**Is this the right problem?** The plan assumes a landing page is the solution to "no public web presence." This is valid but consider:

1. **GitHub README as landing page**: For developer-focused projects, a polished README with badges and GIFs may serve better than a separate domain. Is the domain needed now, or is it premature optimization?

2. **Audience prioritization**: Trying to serve everyone (developers, AI enthusiasts, OpenClaw users, general public) risks serving no one well. Consider: who is the primary audience at this project stage?

3. **CJK accents accessibility**: The heavy use of kanji (言霊, 魂, 型) and emoji equations may confuse Western audiences unfamiliar with these symbols. Consider whether these enhance or obscure the value proposition.

## Recommendations

1. **Resolve hosting structure first**: Choose between:
   - Move site to `/docs` directory (Pages-compatible)
   - Use dedicated `gh-pages` branch with GitHub Action
   - Alternative host (Netlify, Cloudflare Pages - both support subdirectories)

2. **Create performance budget**: Before Stage 1, define asset budgets (total page weight, critical CSS, font strategy) to ensure targets are achievable.

3. **Rephrase "Quick start commands"**: Change to "Link to installation documentation" or "Getting Started CTA" to comply with no-code constraint.

4. **Add accessibility acceptance criteria**: Include WCAG AA color contrast, keyboard navigation, and ARIA landmarks in Stage 2.

5. **Resolve open questions as Stage 0.5**: Domain, analytics, and email decisions should precede implementation, not remain open through deployment.

## Raw Output

<details>
<summary>Full CLI output</summary>

```
**Critical**
- Stage 5 ("Deployment"): GitHub Pages cannot publish a subdirectory like `website/` directly; Pages supports root, `/docs`, or a dedicated branch. The current step 1 is infeasible as written and needs a host/structure decision.
- Success Criteria: "<2s on 3G" and "90+ Lighthouse" are declared without performance budgets or tactics (image optimization, font loading, caching). With neon effects and custom assets, these targets are not currently achievable as planned.
- Frontmatter `code_examples: forbidden` conflicts with Stage 3 "Start" requiring "Quick start commands"; this will force code snippets into the plan unless rephrased as links or descriptions.

**Important**
- Accessibility: only "skip links" are mentioned (Stage 2). Missing color-contrast requirements, focus/hover states for keyboard and screen readers, aria landmarks, reduced-motion fallbacks, and form handling if email capture is added.
- Hosting/architecture: No decision on Pages vs. alternative static host/CDN; no plan for redirects (www → apex), caching/headers, or build/deploy workflow (branch vs. action). HTTPS verification is noted, but no fallback path if domain/DNS is delayed.
- SEO basics missing: sitemap/robots, canonical tags, schema (Organization/WebSite), favicon/manifests.
- Branding assets: Logo/wordmark, OG image, and architecture diagram creation are listed, but sourcing/licensing and file specs (formats, sizes, font licenses for Space Grotesk/Inter/JetBrains Mono) are unspecified; risk of scope creep.
- Audience layering: No content map or navigation strategy to keep four audiences from colliding (e.g., anchors, in-page nav, or progressive disclosure). Risk of muddled messaging and users not finding their lane in "10 seconds."
- Risk register is thin: No fallback for missing domain registration, analytics decision, or email capture choice—these block deployment or alter privacy footprint.
- Acceptance Criteria: Several sections (design system, content, polish) lack testable criteria for performance, accessibility, and responsiveness beyond breakpoints; no review gates for readability/tone beyond "8th-grade" copy check.

**Minor**
- Effort estimate (~6 hours) is unrealistic given custom assets, copy, QA, and deployment; expect multi-day elapsed time.
- "ASCII or SVG" diagram is underspecified; ASCII likely clashes with the neon aesthetic and accessibility; choose a single accessible format.
- "Architecture diagram matches getting-started guide" is noted, but no linkage to the actual architecture doc/authority or update plan when the architecture evolves.
- Problem framing mentions "OpenClaw users" but the plan doesn't address their specific needs; either tailor content or narrow the audience.
- No mention of monitoring/uptime checks or post-deploy verification beyond link testing; a basic checklist (status badge or periodic check) would reduce drift.

Open questions/assumptions
- Hosting path (GitHub Pages branch/root vs. another static host); confirm before structuring `website/`.
- Domain ownership/availability for liveneon.org and timeline for DNS/SSL.
- Whether analytics/email capture are in-scope now; affects privacy disclosures and UI.
- Acceptable fonts/licensing and where they will be served from (self-host vs. external).
```

</details>

---

*Review completed 2026-02-08 by 審碼 (codex-gpt51-examiner)*
