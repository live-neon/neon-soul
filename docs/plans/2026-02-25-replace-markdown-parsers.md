# Plan: Replace Heavy Markdown Parsers with Lightweight Alternatives

**Created**: 2026-02-25
**Status**: Draft
**Priority**: Medium
**Type**: Optimization / Bundle Size Reduction
**Trigger**: ClawHub scanner flagged 401KB bundle as "hard to audit by eye"; file viewer fails to load it

---

## Summary

Remove `remark-parse`, `unified`, and their transitive `micromark` ecosystem (dead dependencies — never imported), and replace `gray-matter` with a lightweight ~30-line frontmatter parser. This reduces both `node_modules` size and — more importantly — the bundled `neon-soul.mjs` output.

**Current bundle**: 191KB (minified)
**Expected after**: ~120–140KB (estimate based on dependency weight)

---

## Root Cause

The bundle includes three markdown parsing dependencies:

| Dependency | Used? | Disk Size | In Bundle? |
|-----------|-------|-----------|------------|
| `remark-parse` | **Never imported** | 40KB + micromark ecosystem (~2MB) | Yes (esbuild includes it) |
| `unified` | **Never imported** | 172KB | Yes |
| `gray-matter` | 1 file (`markdown-reader.ts`) | 76KB + js-yaml (364KB) + 3 others (68KB) | Yes |

`remark-parse` and `unified` are dead code — listed in `package.json` but never imported anywhere in `src/` or `tests/`. They were likely added during early development and never removed.

`gray-matter` is used in exactly one place (`src/lib/markdown-reader.ts:6`) for a single operation: extracting YAML frontmatter from markdown files. The actual section extraction is already done with regex (lines 30–69). gray-matter pulls in `js-yaml` (364KB) for full YAML spec parsing, but the frontmatter in memory files uses only simple key-value pairs, string arrays, and the occasional nested object.

---

## Stage 1: Remove Dead Dependencies

**Risk**: None — these are never imported.

Remove from `package.json`:
```diff
  "dependencies": {
    "gray-matter": "^4.0.3",
    "lru-cache": "^11.2.5",
-   "remark-parse": "^11.0.0",
-   "unified": "^11.0.0",
    "zod": "^3.22.0"
  }
```

Then `npm install` to update lockfile. This removes:
- `remark-parse` (40KB)
- `unified` (172KB)
- `micromark` + 20 `micromark-*` packages (~2MB total in node_modules)
- Various transitive deps (`bail`, `devlop`, `is-plain-obj`, `trough`, `vfile`, etc.)

**Verification**: `npm test` should pass unchanged — nothing imports these.

---

## Stage 2: Replace gray-matter with Lightweight Frontmatter Parser

**Risk**: Low — the replacement is a well-defined string operation.

### Current usage

`src/lib/markdown-reader.ts` line 27:
```typescript
const { data: frontmatter, content } = matter(rawContent);
```

This extracts YAML between `---` delimiters at the top of markdown files and returns the parsed object + remaining content. The section extraction (headings, line numbers) is already custom regex code.

### What frontmatter fields are actually accessed

From `src/lib/memory-extraction-config.ts` and `src/lib/source-collector.ts`:
- `frontmatter['tags']` — string array
- `frontmatter['priority']` — string (`'high'`)
- `frontmatter['name']` — string
- `frontmatter['preferences']` — object

These are all simple YAML: strings, arrays, shallow objects. No multi-line strings, anchors, aliases, or complex YAML features.

### Replacement approach

Replace `gray-matter` import with a lightweight `parseFrontmatter()` function that:
1. Detects `---` delimiters at the start of the file
2. Extracts the YAML block as a string
3. Parses it with a simple YAML subset parser (or Node.js built-in if available)

**Option A — Use `js-yaml` directly (smallest change)**

`js-yaml` is already installed as a transitive dep of gray-matter. We could depend on it directly:
```typescript
import yaml from 'js-yaml';

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data = yaml.load(match[1]) as Record<string, unknown> ?? {};
  return { data, content: match[2] ?? '' };
}
```

But this still bundles `js-yaml` (364KB unminified → ~40KB minified).

**Option B — Simple key-value parser (zero deps)**

Since the frontmatter only uses simple types:
```typescript
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, unknown> = {};
  const lines = match[1].split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      if (currentArray && currentKey) {
        data[currentKey] = currentArray;
        currentArray = null;
      }
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value === '') {
        // Could be start of array or nested object
        currentArray = [];
      } else {
        data[currentKey] = value;
      }
    } else if (line.match(/^\s+-\s+(.+)$/) && currentArray !== null) {
      currentArray.push(line.match(/^\s+-\s+(.+)$/)![1].trim());
    }
  }
  if (currentArray && currentKey) {
    data[currentKey] = currentArray;
  }

  return { data, content: match[2] ?? '' };
}
```

**Recommended: Option A** (`js-yaml` directly). It's a well-tested YAML parser, handles edge cases we might not anticipate, and the minified bundle cost (~40KB) is far less than the full gray-matter stack. If the extra 40KB matters later, we can switch to Option B.

### Files to modify

| File | Change |
|------|--------|
| `src/lib/markdown-reader.ts` | Replace `import matter from 'gray-matter'` with inline `parseFrontmatter()` using `js-yaml` |
| `package.json` | Remove `gray-matter`, add `js-yaml` (if Option A) or remove `gray-matter` entirely (if Option B) |

---

## Stage 3: Rebuild and Verify

1. `npm install` — update lockfile
2. `npm test` — all 454 tests must pass
3. `npm run build:skill` — rebuild bundled scripts
4. `cp skills/neon-soul/scripts/neon-soul.mjs skills/consciousness-soul-identity/scripts/neon-soul.mjs`
5. Compare bundle sizes before/after
6. Grep bundle for any remaining references to removed packages

---

## Expected Size Impact

### node_modules reduction
| Package | Removed |
|---------|---------|
| remark-parse | 40KB |
| unified | 172KB |
| micromark ecosystem (~20 packages) | ~2MB |
| gray-matter | 76KB |
| section-matter, strip-bom-string, kind-of | 68KB |
| js-yaml (if Option B) | 364KB |
| Other transitive deps (bail, devlop, trough, vfile, etc.) | ~200KB |

### Bundle size reduction (estimated)

| Scenario | Bundle Size | Reduction |
|----------|-------------|-----------|
| Current (minified) | 191KB | — |
| After Stage 1 only (remove dead deps) | ~160KB | ~30KB |
| After Stage 2 Option A (js-yaml) | ~140KB | ~50KB |
| After Stage 2 Option B (zero deps) | ~120KB | ~70KB |

These are estimates — esbuild's tree shaking may already exclude some unused code. Actual numbers will be confirmed after building.

---

## What We're NOT Changing

- `src/lib/markdown-reader.ts` API surface — `parseMarkdown()` returns the same `ParsedMarkdown` interface
- Section extraction logic — already custom regex, not affected
- Any downstream code that uses `frontmatter`, `content`, or `sections`
- Test fixtures or expectations

---

## Verification Checklist

- [ ] `npm test` — 454 tests pass
- [ ] `npm run build` — TypeScript compiles
- [ ] `npm run build:skill` — bundle builds without errors
- [ ] Bundle size < 160KB
- [ ] Memory file parsing produces identical output (spot-check with `--dry-run`)
- [ ] No `gray-matter`, `remark-parse`, `unified`, or `micromark` in bundle
- [ ] Both skill bundles are identical

---

## Cross-References

- `docs/plans/2026-02-25-clawhub-security-scan-resolution.md` — Parent security scan plan
- `scripts/build-skill.mjs` — Build configuration (minification added in prior commit)
- `src/lib/markdown-reader.ts` — Only file that imports gray-matter
