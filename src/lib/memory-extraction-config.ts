/**
 * Memory-Specific Signal Extraction Configuration
 *
 * Configures the shared signal-extractor.ts for OpenClaw memory file processing.
 * Uses LLM-based semantic classification for dimension and section type inference.
 *
 * Usage:
 *   import { memoryExtractionConfig, extractSignalsFromMemory } from './memory-extraction-config.js';
 *   const signals = await extractSignalsFromMemory(memoryFile, llmProvider);
 *
 * Reuses from Phase 0:
 *   - signal-extractor.ts (core extraction)
 *   - embeddings.ts (384-dim vectors)
 *   - provenance.ts (audit trail)
 *   - semantic-classifier.ts (LLM-based classification)
 */

import { randomUUID } from 'node:crypto';
import type { Signal, SignalType, SoulCraftDimension } from '../types/signal.js';
import type { MemoryFile, MemoryCategory } from './memory-walker.js';
import type { LLMProvider } from '../types/llm.js';
import { classifyDimension, classifySectionType, type SectionType } from './semantic-classifier.js';

/**
 * Extraction configuration for memory files.
 */
export interface MemoryExtractionConfig {
  /** LLM prompt template for signal extraction */
  promptTemplate: string;
  /** Source type for provenance */
  sourceType: 'memory';
  /** Minimum confidence to keep a signal */
  minConfidence: number;
  /** Maximum signals per file */
  maxSignalsPerFile: number;
}

/**
 * Memory-specific extraction prompt.
 */
const MEMORY_EXTRACTION_PROMPT = `Extract identity signals from this OpenClaw memory file.

File: {path}
Category: {category}

Content:
{content}

For each signal, identify:
- Type: preference | correction | boundary | value | reinforcement
  - preference: User likes/prefers something
  - correction: User corrects a previous assumption
  - boundary: User sets a limit or constraint
  - value: User expresses what matters to them
  - reinforcement: User repeats or strengthens an existing pattern
- Text: The core statement (1-2 sentences)
- Confidence: 0-1 how clear this signal is
- Dimension: Which aspect of identity this relates to:
  - identity-core: Fundamental self-conception
  - character-traits: Behavioral patterns
  - voice-presence: Communication style
  - honesty-framework: Truth-telling approach
  - boundaries-ethics: Ethical limits
  - relationship-dynamics: Interpersonal patterns
  - continuity-growth: Development trajectory

Return as JSON array:
[
  {
    "type": "preference",
    "text": "Prefers written communication over verbal for complex topics",
    "confidence": 0.9,
    "dimension": "voice-presence",
    "context": "I find I communicate better in writing when..."
  }
]

Focus on identity-relevant signals. Skip factual content (knowledge/) unless it reveals values.
Maximum 10 signals per file. Quality over quantity.`;

/**
 * Default memory extraction configuration.
 */
// MN-4 FIX: Aligned maxSignalsPerFile with prompt instruction ("Maximum 10 signals per file")
export const memoryExtractionConfig: MemoryExtractionConfig = {
  promptTemplate: MEMORY_EXTRACTION_PROMPT,
  sourceType: 'memory',
  minConfidence: 0.6,
  maxSignalsPerFile: 10,
};

/**
 * Map memory category to likely SoulCraft dimensions.
 */
export function getDimensionsForCategory(category: MemoryCategory): SoulCraftDimension[] {
  const mapping: Record<MemoryCategory, SoulCraftDimension[]> = {
    diary: ['voice-presence', 'character-traits', 'continuity-growth'],
    experiences: ['character-traits', 'voice-presence', 'boundaries-ethics'],
    goals: ['identity-core', 'continuity-growth', 'character-traits'],
    knowledge: [], // Usually not identity-relevant
    relationships: ['relationship-dynamics', 'boundaries-ethics', 'voice-presence'],
    preferences: ['character-traits', 'boundaries-ethics', 'voice-presence'],
    unknown: [],
  };

  return mapping[category];
}

/**
 * Estimated signal density by category.
 */
export function getSignalDensity(category: MemoryCategory): 'low' | 'medium' | 'high' {
  const densityMap: Record<MemoryCategory, 'low' | 'medium' | 'high'> = {
    preferences: 'high',
    relationships: 'high',
    goals: 'high',
    diary: 'medium',
    experiences: 'medium',
    knowledge: 'low',
    unknown: 'low',
  };

  return densityMap[category];
}

/**
 * Raw extracted signal before processing.
 */
interface RawExtractedSignal {
  type: SignalType;
  text: string;
  confidence: number;
  dimension: SoulCraftDimension;
  context: string;
}

/**
 * Extract signals from a memory file.
 * Uses LLM-based semantic classification for dimension and section type inference.
 *
 * @param memoryFile - The memory file to extract signals from
 * @param llm - LLM provider for semantic classification (required)
 * @param config - Extraction configuration
 * @returns Array of extracted signals
 */
export async function extractSignalsFromMemory(
  memoryFile: MemoryFile,
  llm: LLMProvider,
  config: MemoryExtractionConfig = memoryExtractionConfig
): Promise<Signal[]> {
  let signals: Signal[] = [];

  // Extract from frontmatter (no LLM needed - metadata-based)
  const frontmatterSignals = extractFromFrontmatter(memoryFile);
  signals.push(...frontmatterSignals);

  // Extract from sections (LLM-based semantic classification)
  const sectionSignals = await extractFromSections(memoryFile, llm);
  signals.push(...sectionSignals);

  // IM-2 FIX: Filter by minConfidence threshold
  signals = signals.filter((s) => s.confidence >= config.minConfidence);

  // IM-2 FIX: Limit to maxSignalsPerFile (keep highest confidence)
  if (signals.length > config.maxSignalsPerFile) {
    signals.sort((a, b) => b.confidence - a.confidence);
    signals = signals.slice(0, config.maxSignalsPerFile);
  }

  return signals;
}

/**
 * Extract signals from frontmatter metadata.
 */
function extractFromFrontmatter(memoryFile: MemoryFile): Signal[] {
  const signals: Signal[] = [];
  const { frontmatter, path, category } = memoryFile;

  // Tags often indicate values
  if (Array.isArray(frontmatter['tags'])) {
    const tags = frontmatter['tags'] as string[];
    if (tags.length > 0) {
      signals.push(createSignal({
        type: 'value',
        text: `Values related to: ${tags.join(', ')}`,
        confidence: 0.6,
        dimension: 'identity-core',
        context: `Tags from ${category} file`,
      }, path, category, 'frontmatter'));
    }
  }

  // Priority indicates importance
  if (frontmatter['priority'] === 'high') {
    signals.push(createSignal({
      type: 'value',
      text: 'This topic is a high priority',
      confidence: 0.7,
      dimension: 'identity-core',
      context: `High priority ${category} file`,
    }, path, category, 'frontmatter'));
  }

  return signals;
}

/**
 * Map section type to signal type.
 */
function sectionTypeToSignalType(sectionType: SectionType): SignalType {
  const mapping: Record<SectionType, SignalType> = {
    'core-truths': 'value',
    'boundaries': 'boundary',
    'vibe-tone': 'value',
    'examples': 'value',
    'preferences': 'preference',
    'other': 'value',
  };
  return mapping[sectionType];
}

/**
 * Get confidence level based on section type.
 */
function sectionTypeToConfidence(sectionType: SectionType): number {
  const confidenceMap: Record<SectionType, number> = {
    'core-truths': 0.85,
    'boundaries': 0.9,
    'vibe-tone': 0.8,
    'examples': 0.75,
    'preferences': 0.85,
    'other': 0.6,
  };
  return confidenceMap[sectionType];
}

/**
 * Extract signals from markdown sections using LLM-based semantic classification.
 *
 * @param memoryFile - Memory file containing sections to process
 * @param llm - LLM provider for semantic classification
 * @returns Array of extracted signals
 */
async function extractFromSections(memoryFile: MemoryFile, llm: LLMProvider): Promise<Signal[]> {
  const signals: Signal[] = [];
  const { sections, path } = memoryFile;

  for (const section of sections) {
    // Use LLM to classify section type semantically
    const sectionType = await classifySectionType(llm, section.title, section.content);

    // Skip 'other' sections with low identity relevance
    if (sectionType === 'other') {
      continue;
    }

    // Determine signal type and confidence based on section classification
    const signalType = sectionTypeToSignalType(sectionType);
    const baseConfidence = sectionTypeToConfidence(sectionType);

    // Extract items from list-based sections
    if (sectionType === 'preferences' || sectionType === 'boundaries') {
      const items = extractListItems(section.content);
      for (const item of items.slice(0, 5)) {
        // Use LLM to classify dimension for each item
        const dimension = await classifyDimension(llm, item);
        signals.push({
          id: randomUUID(),
          type: signalType,
          text: item,
          confidence: baseConfidence,
          dimension,
          source: {
            type: 'memory',
            file: path,
            section: section.title,
            line: section.startLine,
            context: section.content.slice(0, 200),
            extractedAt: new Date(),
          },
        });
      }
    } else {
      // For non-list sections (core-truths, vibe-tone, examples), extract as single signal
      const content = section.content.trim();
      if (content.length > 20) {
        // Use LLM to classify dimension for content
        const dimension = await classifyDimension(llm, content.slice(0, 500));
        signals.push({
          id: randomUUID(),
          type: signalType,
          text: content.slice(0, 200),
          confidence: baseConfidence,
          dimension,
          source: {
            type: 'memory',
            file: path,
            section: section.title,
            line: section.startLine,
            context: content.slice(0, 200),
            extractedAt: new Date(),
          },
        });
      }
    }
  }

  return signals;
}

/**
 * Extract list items from markdown content.
 */
function extractListItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match markdown list items
    const match = line.match(/^[-*+]\s+(.+)$/);
    if (match && match[1]) {
      items.push(match[1].trim());
    }
  }

  return items;
}


/**
 * Helper to create a signal with common structure.
 */
function createSignal(
  raw: RawExtractedSignal,
  path: string,
  _category: MemoryCategory,
  section: string
): Signal {
  return {
    id: randomUUID(),
    type: raw.type,
    text: raw.text,
    confidence: raw.confidence,
    dimension: raw.dimension,
    source: {
      type: 'memory',
      file: path,
      section,
      context: raw.context,
      extractedAt: new Date(),
    },
  };
}

/**
 * Batch extract signals from multiple memory files.
 *
 * @param memoryFiles - Array of memory files to process
 * @param llm - LLM provider for semantic classification (required)
 * @param config - Extraction configuration
 * @param onProgress - Optional progress callback
 * @returns Object containing extracted signals and statistics
 */
export async function batchExtractSignals(
  memoryFiles: MemoryFile[],
  llm: LLMProvider,
  config: MemoryExtractionConfig = memoryExtractionConfig,
  onProgress?: (current: number, total: number) => void
): Promise<{
  signals: Signal[];
  stats: {
    totalFiles: number;
    totalSignals: number;
    byCategory: Record<MemoryCategory, number>;
    byDimension: Record<SoulCraftDimension, number>;
  };
}> {
  const allSignals: Signal[] = [];
  const stats = {
    totalFiles: memoryFiles.length,
    totalSignals: 0,
    byCategory: {} as Record<MemoryCategory, number>,
    byDimension: {} as Record<SoulCraftDimension, number>,
  };

  for (let i = 0; i < memoryFiles.length; i++) {
    const file = memoryFiles[i]!;
    onProgress?.(i + 1, memoryFiles.length);

    const signals = await extractSignalsFromMemory(file, llm, config);
    allSignals.push(...signals);

    // Update category stats
    stats.byCategory[file.category] = (stats.byCategory[file.category] || 0) + signals.length;

    // Update dimension stats
    for (const signal of signals) {
      if (signal.dimension) {
        stats.byDimension[signal.dimension] = (stats.byDimension[signal.dimension] || 0) + 1;
      }
    }
  }

  stats.totalSignals = allSignals.length;

  return { signals: allSignals, stats };
}
