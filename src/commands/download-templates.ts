/**
 * Download SOUL.md templates from souls.directory
 * Usage: npx ts-node src/commands/download-templates.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SOULS_API_BASE = 'https://souls.directory/api/souls';

interface TemplateSource {
  owner: string;
  slug: string;
  category: string;
}

// Diverse templates across categories
const TEMPLATES: TemplateSource[] = [
  // Technical
  { owner: 'thedaviddias', slug: 'code-reviewer', category: 'technical' },
  { owner: 'thedaviddias', slug: 'security-auditor', category: 'technical' },
  { owner: 'thedaviddias', slug: 'devops-engineer', category: 'technical' },
  { owner: 'thedaviddias', slug: 'database-whisperer', category: 'technical' },
  { owner: 'thedaviddias', slug: 'data-scientist', category: 'technical' },
  { owner: 'thedaviddias', slug: 'architect', category: 'technical' },
  // Professional
  { owner: 'thedaviddias', slug: 'technical-writer', category: 'professional' },
  { owner: 'thedaviddias', slug: 'product-manager', category: 'professional' },
  { owner: 'thedaviddias', slug: 'executive-assistant', category: 'professional' },
  // Wellness/Personal
  { owner: 'thedaviddias', slug: 'mindful-companion', category: 'wellness' },
  // Educational
  { owner: 'thedaviddias', slug: 'kuma', category: 'educational' },
  // Playful
  { owner: 'thedaviddias', slug: 'pirate-captain', category: 'playful' },
  { owner: 'thedaviddias', slug: 'groot', category: 'playful' },
  // Experimental
  { owner: 'thedaviddias', slug: 'chucky', category: 'experimental' },
];

interface TemplateMetadata {
  downloaded_at: string;
  templates: Array<{
    slug: string;
    owner: string;
    category: string;
    source_url: string;
    local_path: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

async function downloadTemplate(
  source: TemplateSource,
  outputDir: string,
  maxRetries: number = 3
): Promise<{ success: boolean; path?: string; error?: string }> {
  const url = `${SOULS_API_BASE}/${source.owner}/${source.slug}.md`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s

        if (attempt < maxRetries - 1) {
          process.stdout.write(`(rate limited, waiting ${waitTime / 1000}s)... `);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return { success: false, error: `HTTP 429 after ${maxRetries} retries` };
      }

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const content = await response.text();
      // CR-5 FIX: Sanitize slug to prevent path traversal (defensive, even though slugs are hardcoded)
      const safeSlug = source.slug.replace(/[^a-zA-Z0-9-_]/g, '');
      const filename = `${safeSlug}.md`;
      const filepath = resolve(outputDir, filename);

      writeFileSync(filepath, content, 'utf-8');
      return { success: true, path: filepath };
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

async function main() {
  const outputDir = resolve(
    process.cwd(),
    'test-fixtures',
    'souls',
    'raw'
  );

  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Downloading ${TEMPLATES.length} templates to ${outputDir}...`);

  const metadata: TemplateMetadata = {
    downloaded_at: new Date().toISOString(),
    templates: [],
  };

  for (const template of TEMPLATES) {
    process.stdout.write(`  ${template.slug}... `);

    const result = await downloadTemplate(template, outputDir);

    const entry: (typeof metadata.templates)[number] = {
      slug: template.slug,
      owner: template.owner,
      category: template.category,
      source_url: `${SOULS_API_BASE}/${template.owner}/${template.slug}.md`,
      local_path: result.path ?? '',
      status: result.success ? 'success' : 'failed',
    };
    if (result.error !== undefined) {
      entry.error = result.error;
    }
    metadata.templates.push(entry);

    if (result.success) {
      console.log('✓');
    } else {
      console.log(`✗ (${result.error})`);
    }

    // Delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Write metadata
  const metadataPath = resolve(outputDir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  const successful = metadata.templates.filter((t) => t.status === 'success');
  console.log(
    `\nDownloaded ${successful.length}/${TEMPLATES.length} templates.`
  );
  console.log(`Metadata saved to ${metadataPath}`);
}

main().catch(console.error);
