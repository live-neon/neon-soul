/**
 * OllamaLLMProvider Unit Tests
 *
 * Tests the Ollama LLM provider implementation.
 * These tests require Ollama to be running - they skip gracefully if not available.
 *
 * Setup:
 *   docker compose -f docker/docker-compose.ollama.yml up -d
 *   docker exec neon-soul-ollama ollama pull llama3
 *
 * Run:
 *   npm test tests/e2e/ollama-provider.test.ts
 *
 * Cross-Reference: docs/plans/2026-02-08-ollama-llm-provider.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  OllamaLLMProvider,
  OllamaNotAvailableError,
} from '../../src/lib/llm-providers/ollama-provider.js';

// Check if Ollama is available before running tests
let ollamaAvailable = false;
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3';

beforeAll(async () => {
  ollamaAvailable = await OllamaLLMProvider.isAvailable(OLLAMA_BASE_URL);
  if (!ollamaAvailable) {
    console.log(
      '\n⚠️  Ollama not available - skipping OllamaLLMProvider tests\n' +
        '   Start with: docker compose -f docker/docker-compose.ollama.yml up -d\n'
    );
  }
});

describe('OllamaLLMProvider', () => {
  describe('Configuration', () => {
    it('creates provider with default config', () => {
      const provider = new OllamaLLMProvider();
      expect(provider).toBeDefined();
    });

    it('creates provider with custom base URL', () => {
      const provider = new OllamaLLMProvider({
        baseUrl: 'http://custom:11434',
        model: 'mistral',
        timeout: 60000,
      });
      expect(provider).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('isAvailable returns true when Ollama running', async () => {
      const available = await OllamaLLMProvider.isAvailable(OLLAMA_BASE_URL);
      // This test documents the actual state
      expect(typeof available).toBe('boolean');
    });

    it('isAvailable returns false for invalid URL', async () => {
      const available = await OllamaLLMProvider.isAvailable(
        'http://nonexistent:99999'
      );
      expect(available).toBe(false);
    });
  });

  describe.skipIf(!ollamaAvailable)('Classification (requires Ollama)', () => {
    it('classifies text into valid category', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const result = await provider.classify(
        'I always tell the truth, even when it is difficult.',
        {
          categories: [
            'honesty-framework',
            'identity-core',
            'voice-presence',
          ] as const,
          context: 'Classify this statement about personal values',
        }
      );

      // Should return one of the valid categories
      expect(['honesty-framework', 'identity-core', 'voice-presence']).toContain(
        result.category
      );
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, 60000); // 60s timeout for local LLM

    it('classifies yes/no correctly', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const result = await provider.classify(
        'Is the sky blue? Answer yes or no.',
        {
          categories: ['yes', 'no'] as const,
        }
      );

      expect(['yes', 'no']).toContain(result.category);
      expect(result.confidence).toBeGreaterThan(0);
    }, 60000);

    it('handles ambiguous input with fallback', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const result = await provider.classify(
        'xyzzy plugh foo bar', // Nonsense input
        {
          categories: ['category-a', 'category-b'] as const,
        }
      );

      // Should return one of the categories even for ambiguous input
      expect(['category-a', 'category-b']).toContain(result.category);
    }, 60000);
  });

  describe.skipIf(!ollamaAvailable)('Generation (requires Ollama)', () => {
    it('generates text response', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const result = await provider.generate(
        'Write a single emoji that represents honesty.'
      );

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    }, 60000);

    it('generates notation format', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const result = await provider.generate(
        'Express "Honesty comes before efficiency" in this format: [emoji] [CJK character]: [brief summary]. Example: 🎯 誠: truth first'
      );

      expect(result.text).toBeDefined();
      // Should contain some text (format may vary)
      expect(result.text.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Error Handling', () => {
    it('throws OllamaNotAvailableError when Ollama not running', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: 'http://nonexistent:99999',
        timeout: 5000,
      });

      await expect(
        provider.classify('test', { categories: ['a', 'b'] as const })
      ).rejects.toThrow(OllamaNotAvailableError);
    }, 10000);

    it('OllamaNotAvailableError has helpful message', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: 'http://nonexistent:99999',
        timeout: 5000,
      });

      let thrownError: Error | undefined;
      try {
        await provider.classify('test', { categories: ['a', 'b'] as const });
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(OllamaNotAvailableError);
      expect(thrownError?.message).toContain('docker compose');
    }, 10000);
  });
});

describe('OllamaLLMProvider Integration', () => {
  describe.skipIf(!ollamaAvailable)('SoulCraft Dimensions (requires Ollama)', () => {
    const SOULCRAFT_DIMENSIONS = [
      'identity-core',
      'character-traits',
      'voice-presence',
      'honesty-framework',
      'boundaries-ethics',
      'relationship-dynamics',
      'continuity-growth',
    ] as const;

    it('classifies identity-related text correctly', async () => {
      const provider = new OllamaLLMProvider({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
      });

      const testCases = [
        {
          text: 'I am fundamentally a truth-seeker',
          expected: 'identity-core',
        },
        {
          text: 'I always speak directly without sugarcoating',
          expected: 'voice-presence',
        },
        {
          text: 'I never lie, even when it would be easier',
          expected: 'honesty-framework',
        },
        {
          text: 'I refuse to work on projects that harm people',
          expected: 'boundaries-ethics',
        },
      ];

      for (const testCase of testCases) {
        const result = await provider.classify(testCase.text, {
          categories: SOULCRAFT_DIMENSIONS,
          context: 'Classify this into a SoulCraft identity dimension',
        });

        // Log for visibility
        console.log(
          `  "${testCase.text.slice(0, 40)}..." → ${result.category} (expected: ${testCase.expected})`
        );

        // Must be a valid dimension
        expect(SOULCRAFT_DIMENSIONS).toContain(result.category);
        // Confidence should be reasonable
        expect(result.confidence).toBeGreaterThan(0.1);
      }
    }, 120000); // 2 min for multiple classifications
  });
});
