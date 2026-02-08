/**
 * Memory File Walker
 *
 * Traverses OpenClaw's memory directory structure for signal extraction.
 * Uses shared markdown-reader.ts for parsing with memory-specific metadata.
 *
 * Usage:
 *   const walker = createMemoryWalker('~/.openclaw/workspace/memory');
 *   const files = await walker.walk();
 *   const changes = walker.getChangedFiles(previousRun);
 *
 * Directory structure:
 *   ~/.openclaw/workspace/memory/
 *   ├── diary/        - Journal entries
 *   ├── experiences/  - Event memories
 *   ├── goals/        - Aspirations
 *   ├── knowledge/    - Learned facts
 *   ├── relationships/- People & connections
 *   └── preferences/  - Explicit preferences
 */

import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, sep, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseMarkdown, type ParsedMarkdown } from './markdown-reader.js';

/**
 * Memory categories from OpenClaw structure.
 */
export type MemoryCategory =
  | 'diary'
  | 'experiences'
  | 'goals'
  | 'knowledge'
  | 'relationships'
  | 'preferences'
  | 'unknown';

/**
 * Extended parsed markdown with memory-specific metadata.
 */
export interface MemoryFile extends ParsedMarkdown {
  /** Absolute path to file */
  path: string;
  /** Relative path from memory root */
  relativePath: string;
  /** Memory category derived from directory */
  category: MemoryCategory;
  /** File modification time */
  lastModified: Date;
  /** Content hash for change detection */
  contentHash: string;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * Cache entry for incremental processing.
 */
export interface CacheEntry {
  path: string;
  contentHash: string;
  lastProcessed: Date;
}

/**
 * Walk statistics.
 */
export interface WalkStats {
  totalFiles: number;
  byCategory: Record<MemoryCategory, number>;
  totalBytes: number;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Creates a memory walker instance.
 */
export function createMemoryWalker(memoryRoot: string): MemoryWalker {
  return new MemoryWalker(memoryRoot);
}

/**
 * Memory directory walker.
 */
export class MemoryWalker {
  private memoryRoot: string;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(memoryRoot: string) {
    // Expand ~ to home directory
    this.memoryRoot = memoryRoot.replace(/^~/, process.env['HOME'] || '');
  }

  /**
   * Walk the memory directory and return all markdown files.
   */
  async walk(): Promise<{ files: MemoryFile[]; stats: WalkStats }> {
    const files: MemoryFile[] = [];
    const stats: WalkStats = {
      totalFiles: 0,
      byCategory: {
        diary: 0,
        experiences: 0,
        goals: 0,
        knowledge: 0,
        relationships: 0,
        preferences: 0,
        unknown: 0,
      },
      totalBytes: 0,
      errors: [],
    };

    await this.walkDirectory(this.memoryRoot, files, stats);

    return { files, stats };
  }

  /**
   * Get files that have changed since last run.
   */
  getChangedFiles(
    files: MemoryFile[],
    previousCache: CacheEntry[]
  ): { added: MemoryFile[]; modified: MemoryFile[]; removed: string[] } {
    const previousMap = new Map(previousCache.map((e) => [e.path, e]));

    const added: MemoryFile[] = [];
    const modified: MemoryFile[] = [];
    const currentPaths = new Set<string>();

    for (const file of files) {
      currentPaths.add(file.path);
      const prev = previousMap.get(file.path);

      if (!prev) {
        added.push(file);
      } else if (prev.contentHash !== file.contentHash) {
        modified.push(file);
      }
    }

    const removed = previousCache
      .filter((e) => !currentPaths.has(e.path))
      .map((e) => e.path);

    return { added, modified, removed };
  }

  /**
   * Update cache with processed files.
   */
  updateCache(files: MemoryFile[]): CacheEntry[] {
    const entries: CacheEntry[] = [];

    for (const file of files) {
      const entry: CacheEntry = {
        path: file.path,
        contentHash: file.contentHash,
        lastProcessed: new Date(),
      };
      this.cache.set(file.path, entry);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Load cache from JSON.
   */
  loadCache(entries: CacheEntry[]): void {
    this.cache.clear();
    for (const entry of entries) {
      this.cache.set(entry.path, entry);
    }
  }

  /**
   * Export cache to JSON.
   */
  exportCache(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * IM-7 FIX: Persist cache to disk for incremental processing across restarts.
   */
  async persistCache(filePath: string): Promise<void> {
    const entries = this.exportCache();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  /**
   * IM-7 FIX: Load cache from disk.
   */
  async loadCacheFromDisk(filePath: string): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const entries = JSON.parse(content) as CacheEntry[];
      this.loadCache(entries);
      return true;
    } catch {
      // File doesn't exist or is invalid - start fresh
      return false;
    }
  }

  // Private methods

  private async walkDirectory(
    dir: string,
    files: MemoryFile[],
    stats: WalkStats
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories
          if (entry.name.startsWith('.')) continue;
          await this.walkDirectory(fullPath, files, stats);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const memoryFile = await this.parseMemoryFile(fullPath);
            files.push(memoryFile);
            stats.totalFiles++;
            stats.byCategory[memoryFile.category]++;
            stats.totalBytes += memoryFile.sizeBytes;
          } catch (error) {
            stats.errors.push({
              path: fullPath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        stats.errors.push({
          path: dir,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async parseMemoryFile(filePath: string): Promise<MemoryFile> {
    // Get file stats
    const fileStat = await stat(filePath);

    // Read content
    const content = await readFile(filePath, 'utf-8');

    // Parse markdown
    const parsed = parseMarkdown(content);

    // MN-3 FIX: Use SHA-256 instead of MD5 for content hashing
    const contentHash = createHash('sha256').update(content).digest('hex');

    // Determine category from path
    const relativePath = relative(this.memoryRoot, filePath);
    const category = this.getCategoryFromPath(relativePath);

    return {
      ...parsed,
      path: filePath,
      relativePath,
      category,
      lastModified: fileStat.mtime,
      contentHash,
      sizeBytes: fileStat.size,
    };
  }

  private getCategoryFromPath(relativePath: string): MemoryCategory {
    // MN-1 FIX: Use path.sep for cross-platform compatibility
    const parts = relativePath.split(sep);
    const topDir = parts[0] ?? '';

    const categoryMap: Record<string, MemoryCategory> = {
      diary: 'diary',
      experiences: 'experiences',
      goals: 'goals',
      knowledge: 'knowledge',
      relationships: 'relationships',
      preferences: 'preferences',
    };

    return categoryMap[topDir] ?? 'unknown';
  }
}

/**
 * Format walk statistics for display.
 */
export function formatWalkStats(stats: WalkStats): string {
  const lines: string[] = [
    '# Memory Walk Statistics',
    '',
    `**Total files**: ${stats.totalFiles}`,
    `**Total size**: ${(stats.totalBytes / 1024).toFixed(1)} KB`,
    '',
    '## By Category',
    '',
    '| Category | Count |',
    '|----------|-------|',
  ];

  for (const [category, count] of Object.entries(stats.byCategory)) {
    if (count > 0) {
      lines.push(`| ${category} | ${count} |`);
    }
  }

  if (stats.errors.length > 0) {
    lines.push('');
    lines.push(`## Errors (${stats.errors.length})`);
    lines.push('');
    for (const error of stats.errors.slice(0, 10)) {
      lines.push(`- ${error.path}: ${error.error}`);
    }
    if (stats.errors.length > 10) {
      lines.push(`- ... and ${stats.errors.length - 10} more`);
    }
  }

  return lines.join('\n');
}
