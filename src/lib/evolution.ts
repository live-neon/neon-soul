/**
 * Soul Evolution Tracking
 *
 * Tracks how the soul changes over time through multiple synthesis runs.
 * Stores historical versions with embeddings and metrics for analysis.
 *
 * Usage:
 *   const tracker = createEvolutionTracker('output/souls/history');
 *   await tracker.saveVersion(soul, metrics);
 *   const history = await tracker.getHistory();
 *
 * Storage structure:
 *   output/souls/history/
 *   ├── latest -> 2026-02-07T12:00:00Z/
 *   ├── 2026-02-07T12:00:00Z/
 *   │   ├── soul.md
 *   │   ├── soul-embedding.json
 *   │   ├── metrics.json
 *   │   ├── trajectory.json
 *   │   └── provenance.json
 *   └── ...
 */

import { mkdir, writeFile, readFile, readdir, symlink, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { TrajectoryMetrics } from './trajectory.js';
import type { GeneratedSoul } from './soul-generator.js';

/**
 * Soul version metadata.
 */
export interface SoulVersion {
  /** Version timestamp */
  timestamp: string;
  /** Version directory path */
  path: string;
  /** Soul content hash */
  contentHash: string;
  /** Token count */
  tokenCount: number;
  /** Axiom count */
  axiomCount: number;
  /** Dimension coverage */
  coverage: number;
}

/**
 * Evolution metrics between versions.
 */
export interface EvolutionMetrics {
  /** Semantic similarity to previous version */
  previousSimilarity: number;
  /** Semantic similarity to first version */
  originSimilarity: number;
  /** Axiom retention rate (% preserved) */
  axiomRetention: number;
  /** Semantic drift from v0 */
  semanticDrift: number;
  /** Voice coherence score */
  voiceCoherence: number;
}

/**
 * Full evolution history.
 */
export interface EvolutionHistory {
  /** All versions, oldest first */
  versions: SoulVersion[];
  /** Latest version */
  latest: SoulVersion | undefined;
  /** First version */
  origin: SoulVersion | undefined;
  /** Total version count */
  count: number;
}

/**
 * Saved version data.
 */
export interface VersionData {
  /** Soul markdown content */
  soulContent: string;
  /**
   * @deprecated Since v0.2.0, embeddings are no longer generated.
   * This field is kept for backward compatibility with existing version files.
   */
  embedding?: number[];
  /** Metrics */
  metrics: {
    tokenCount: number;
    axiomCount: number;
    principleCount: number;
    coverage: number;
    compressionRatio: number;
  };
  /** Trajectory metrics */
  trajectory: TrajectoryMetrics | undefined;
  /** Evolution metrics (if not first version) */
  evolution: EvolutionMetrics | undefined;
}

/**
 * Evolution tracker instance.
 */
export interface EvolutionTracker {
  /** Save new version */
  saveVersion: (soul: GeneratedSoul, trajectory?: TrajectoryMetrics) => Promise<SoulVersion>;
  /** Get version history */
  getHistory: () => Promise<EvolutionHistory>;
  /** Get specific version */
  getVersion: (timestamp: string) => Promise<VersionData | undefined>;
  /** Get latest version */
  getLatest: () => Promise<VersionData | undefined>;
  /** Compare two versions */
  compare: (v1: string, v2: string) => Promise<EvolutionMetrics | undefined>;
}

/**
 * Create evolution tracker.
 */
export function createEvolutionTracker(historyPath: string): EvolutionTracker {
  const basePath = resolve(historyPath);

  async function ensureDir(): Promise<void> {
    if (!existsSync(basePath)) {
      await mkdir(basePath, { recursive: true });
    }
  }

  async function getVersionDirs(): Promise<string[]> {
    await ensureDir();
    const entries = await readdir(basePath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== 'latest')
      .map((e) => e.name)
      .sort(); // Oldest first
  }

  async function loadVersionData(timestamp: string): Promise<VersionData | undefined> {
    const versionPath = join(basePath, timestamp);
    if (!existsSync(versionPath)) {
      return undefined;
    }

    try {
      const soulContent = await readFile(join(versionPath, 'soul.md'), 'utf-8');
      const metricsJson = await readFile(join(versionPath, 'metrics.json'), 'utf-8');

      // Try to load embedding (may not exist in v0.2.0+ versions)
      let embedding: number[] | undefined;
      const embeddingPath = join(versionPath, 'soul-embedding.json');
      if (existsSync(embeddingPath)) {
        try {
          embedding = JSON.parse(await readFile(embeddingPath, 'utf-8'));
        } catch {
          // Ignore corrupt embedding files
        }
      }

      let trajectory: TrajectoryMetrics | undefined;
      const trajectoryPath = join(versionPath, 'trajectory.json');
      if (existsSync(trajectoryPath)) {
        trajectory = JSON.parse(await readFile(trajectoryPath, 'utf-8'));
      }

      let evolution: EvolutionMetrics | undefined;
      const evolutionPath = join(versionPath, 'evolution.json');
      if (existsSync(evolutionPath)) {
        evolution = JSON.parse(await readFile(evolutionPath, 'utf-8'));
      }

      const versionData: VersionData = {
        soulContent,
        metrics: JSON.parse(metricsJson),
        trajectory,
        evolution,
      };
      if (embedding !== undefined) {
        versionData.embedding = embedding;
      }
      return versionData;
    } catch {
      return undefined;
    }
  }

  return {
    async saveVersion(
      soul: GeneratedSoul,
      trajectory?: TrajectoryMetrics
    ): Promise<SoulVersion> {
      await ensureDir();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const versionPath = join(basePath, timestamp);
      await mkdir(versionPath, { recursive: true });

      // Calculate content hash
      const contentHash = simpleHash(soul.content);

      // Count axioms
      let axiomCount = 0;
      for (const axioms of soul.byDimension.values()) {
        axiomCount += axioms.length;
      }

      // Save soul content
      await writeFile(join(versionPath, 'soul.md'), soul.content);

      // Save metrics
      const metrics = {
        tokenCount: soul.tokenCount,
        axiomCount,
        principleCount: 0, // Would need to be passed in
        coverage: soul.coverage,
        compressionRatio: soul.compressionRatio,
      };
      await writeFile(
        join(versionPath, 'metrics.json'),
        JSON.stringify(metrics, null, 2)
      );

      // Save trajectory if provided
      if (trajectory) {
        await writeFile(
          join(versionPath, 'trajectory.json'),
          JSON.stringify(trajectory, null, 2)
        );
      }

      // Calculate evolution metrics if not first version
      const history = await this.getHistory();
      if (history.latest) {
        const prevData = await this.getLatest();
        if (prevData) {
          const evolution = calculateEvolutionMetrics(
            soul.content,
            prevData.soulContent,
            history.origin ? (await loadVersionData(history.origin.timestamp))?.soulContent : undefined,
            axiomCount,
            prevData.metrics.axiomCount
          );

          await writeFile(
            join(versionPath, 'evolution.json'),
            JSON.stringify(evolution, null, 2)
          );
        }
      }

      // Update latest symlink
      const latestPath = join(basePath, 'latest');
      try {
        await unlink(latestPath);
      } catch {
        // Symlink doesn't exist
      }
      await symlink(timestamp, latestPath);

      return {
        timestamp,
        path: versionPath,
        contentHash,
        tokenCount: soul.tokenCount,
        axiomCount,
        coverage: soul.coverage,
      };
    },

    async getHistory(): Promise<EvolutionHistory> {
      const dirs = await getVersionDirs();
      const versions: SoulVersion[] = [];

      for (const dir of dirs) {
        const versionPath = join(basePath, dir);
        try {
          const metricsJson = await readFile(
            join(versionPath, 'metrics.json'),
            'utf-8'
          );
          const metrics = JSON.parse(metricsJson);
          const soulContent = await readFile(join(versionPath, 'soul.md'), 'utf-8');

          versions.push({
            timestamp: dir,
            path: versionPath,
            contentHash: simpleHash(soulContent),
            tokenCount: metrics.tokenCount,
            axiomCount: metrics.axiomCount,
            coverage: metrics.coverage,
          });
        } catch {
          // Skip invalid versions
        }
      }

      return {
        versions,
        latest: versions[versions.length - 1],
        origin: versions[0],
        count: versions.length,
      };
    },

    async getVersion(timestamp: string): Promise<VersionData | undefined> {
      return loadVersionData(timestamp);
    },

    async getLatest(): Promise<VersionData | undefined> {
      const history = await this.getHistory();
      if (!history.latest) {
        return undefined;
      }
      return loadVersionData(history.latest.timestamp);
    },

    async compare(v1: string, v2: string): Promise<EvolutionMetrics | undefined> {
      const data1 = await loadVersionData(v1);
      const data2 = await loadVersionData(v2);

      if (!data1 || !data2) {
        return undefined;
      }

      return calculateEvolutionMetrics(
        data2.soulContent,
        data1.soulContent,
        undefined,
        data2.metrics.axiomCount,
        data1.metrics.axiomCount
      );
    },
  };
}

/**
 * Calculate Jaccard similarity between two sets of words.
 * Used for text-based similarity comparison.
 */
function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 1;
  return intersection.size / union.size;
}

/**
 * Calculate evolution metrics between versions.
 * Uses text-based Jaccard similarity (embeddings deprecated in v0.2.0).
 */
function calculateEvolutionMetrics(
  currentContent: string,
  previousContent: string,
  originContent: string | undefined,
  currentAxiomCount: number,
  previousAxiomCount: number
): EvolutionMetrics {
  const previousSimilarity = jaccardSimilarity(currentContent, previousContent);
  const originSimilarity = originContent
    ? jaccardSimilarity(currentContent, originContent)
    : previousSimilarity;

  // Axiom retention (approximate - would need actual comparison)
  const axiomRetention = previousAxiomCount > 0
    ? Math.min(1, currentAxiomCount / previousAxiomCount)
    : 1;

  // Semantic drift is inverse of origin similarity
  const semanticDrift = 1 - originSimilarity;

  // Voice coherence approximated by previous similarity
  const voiceCoherence = previousSimilarity;

  return {
    previousSimilarity,
    originSimilarity,
    axiomRetention,
    semanticDrift,
    voiceCoherence,
  };
}

/**
 * Simple hash for content comparison.
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Format evolution history as report.
 */
export function formatEvolutionReport(history: EvolutionHistory): string {
  const lines: string[] = [
    '# Soul Evolution History',
    '',
    `**Total versions**: ${history.count}`,
    '',
  ];

  if (history.versions.length === 0) {
    lines.push('*No versions recorded yet.*');
    return lines.join('\n');
  }

  lines.push('## Versions');
  lines.push('');
  lines.push('| Timestamp | Tokens | Axioms | Coverage |');
  lines.push('|-----------|--------|--------|----------|');

  for (const version of history.versions) {
    const coveragePct = Math.round(version.coverage * 100);
    lines.push(
      `| ${version.timestamp} | ${version.tokenCount} | ${version.axiomCount} | ${coveragePct}% |`
    );
  }

  return lines.join('\n');
}
