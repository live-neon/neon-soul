#!/usr/bin/env node

/**
 * Build the neon-soul skill bundle.
 * Compiles src/cli.ts into a single .mjs file with all dependencies.
 */

import { buildSync } from 'esbuild';
import { mkdirSync } from 'node:fs';

const outfile = 'skills/neon-soul/scripts/neon-soul.mjs';

// Ensure output directory exists
mkdirSync('skills/neon-soul/scripts', { recursive: true });

const result = buildSync({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile,
  minify: true,
  banner: {
    js: [
      '#!/usr/bin/env node',
      '// NEON-SOUL bundled CLI - compiled from TypeScript sources',
      '// All dependencies included. Zero runtime deps beyond Node.js.',
      'process.env.NEON_SOUL_BUNDLED = "1";',
      '// Shim require() for ESM bundle (needed by some CJS dependencies)',
      'import { createRequire as _createRequire } from "module";',
      'const require = _createRequire(import.meta.url);',
    ].join('\n'),
  },
});

if (result.errors.length > 0) {
  console.error('Build failed:', result.errors);
  process.exit(1);
}

console.log(`Built ${outfile} (${(result.outputFiles?.[0]?.contents.length ?? 0) || 'check file size'})`);
