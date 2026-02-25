/**
 * Unit Tests: Semantic Classifier
 *
 * Tests for LLM-based semantic classification functions.
 * Verifies LLMRequiredError is thrown when LLM not provided.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyDimension,
  classifySignalType,
  classifySectionType,
  classifyCategory,
  classifySignalStructured,
  parseStructuredClassification,
} from '../../src/lib/semantic-classifier.js';
import { LLMRequiredError } from '../../src/types/llm.js';
import type { GenerationResult } from '../../src/types/llm.js';
import {
  createMockLLM,
  createSemanticEquivalenceMockLLM,
} from '../mocks/llm-mock.js';

describe('Semantic Classifier', () => {
  describe('classifyDimension', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(classifyDimension(null, 'test text')).rejects.toThrow(
        LLMRequiredError
      );
    });

    it('throws LLMRequiredError when LLM is undefined', async () => {
      await expect(classifyDimension(undefined, 'test text')).rejects.toThrow(
        LLMRequiredError
      );
    });

    it('classifies text into a valid SoulCraft dimension', async () => {
      const llm = createMockLLM();
      const result = await classifyDimension(llm, 'I am always honest');

      const validDimensions = [
        'identity-core',
        'character-traits',
        'voice-presence',
        'honesty-framework',
        'boundaries-ethics',
        'relationship-dynamics',
        'continuity-growth',
      ];

      expect(validDimensions).toContain(result);
    });

    it('records classification call', async () => {
      const llm = createMockLLM();
      await classifyDimension(llm, 'Test signal');

      expect(llm.getCallCount()).toBe(1);
      const calls = llm.getCalls();
      expect(calls[0]?.prompt).toContain('Test signal');
    });
  });

  describe('classifySignalType', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(classifySignalType(null, 'test text')).rejects.toThrow(
        LLMRequiredError
      );
    });

    it('classifies text into a valid signal type', async () => {
      const llm = createMockLLM();
      const result = await classifySignalType(llm, 'I prefer concise responses');

      const validTypes = [
        'value',
        'belief',
        'preference',
        'goal',
        'constraint',
        'relationship',
        'pattern',
        'correction',
        'boundary',
        'reinforcement',
      ];

      expect(validTypes).toContain(result);
    });
  });

  describe('classifySectionType', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(
        classifySectionType(null, 'Core Values')
      ).rejects.toThrow(LLMRequiredError);
    });

    it('classifies section title into valid section type', async () => {
      const llm = createMockLLM();
      const result = await classifySectionType(llm, 'My Boundaries');

      const validTypes = [
        'core-truths',
        'boundaries',
        'vibe-tone',
        'examples',
        'preferences',
        'other',
      ];

      expect(validTypes).toContain(result);
    });

    it('accepts optional content parameter', async () => {
      const llm = createMockLLM();
      const result = await classifySectionType(
        llm,
        'Values',
        'I believe in honesty above all else.'
      );

      expect(result).toBeDefined();
    });
  });

  describe('classifyCategory', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(classifyCategory(null, 'My diary entry')).rejects.toThrow(
        LLMRequiredError
      );
    });

    it('classifies content into a valid memory category', async () => {
      const llm = createMockLLM();
      const result = await classifyCategory(llm, 'Today I learned about trees');

      const validCategories = [
        'diary',
        'experiences',
        'goals',
        'knowledge',
        'relationships',
        'preferences',
        'unknown',
      ];

      expect(validCategories).toContain(result);
    });
  });
});

describe('Semantic Equivalence', () => {
  describe('dimension classification', () => {
    it('"be concise" and "prefer brevity" classify to same dimension', async () => {
      const llm = createSemanticEquivalenceMockLLM();

      const result1 = await classifyDimension(llm, 'be concise');
      const result2 = await classifyDimension(llm, 'prefer brevity');

      expect(result1).toBe(result2);
      expect(result1).toBe('voice-presence');
    });

    it('"honest" and "truthful" classify to same dimension', async () => {
      const llm = createSemanticEquivalenceMockLLM();

      const result1 = await classifyDimension(llm, 'I am honest');
      const result2 = await classifyDimension(llm, 'I am truthful');

      expect(result1).toBe(result2);
      expect(result1).toBe('honesty-framework');
    });

    it('"help others" and "assist people" classify to same dimension', async () => {
      const llm = createSemanticEquivalenceMockLLM();

      const result1 = await classifyDimension(llm, 'I help others');
      const result2 = await classifyDimension(llm, 'I assist people');

      expect(result1).toBe(result2);
    });
  });
});

describe('parseStructuredClassification', () => {
  it('parses valid JSON with all 3 fields', () => {
    const result = parseStructuredClassification(
      '{"dimension":"identity-core","importance":"core","stance":"assert"}'
    );
    expect(result).toEqual({
      dimension: 'identity-core',
      importance: 'core',
      stance: 'assert',
    });
  });

  it('parses JSON wrapped in markdown code blocks', () => {
    const result = parseStructuredClassification(
      '```json\n{"dimension":"voice-presence","importance":"supporting","stance":"qualify"}\n```'
    );
    expect(result).toEqual({
      dimension: 'voice-presence',
      importance: 'supporting',
      stance: 'qualify',
    });
  });

  it('parses JSON with leading/trailing text', () => {
    const result = parseStructuredClassification(
      'Here is the classification:\n{"dimension":"boundaries-ethics","importance":"peripheral","stance":"deny"}\nDone.'
    );
    expect(result).toEqual({
      dimension: 'boundaries-ethics',
      importance: 'peripheral',
      stance: 'deny',
    });
  });

  it('returns null for empty input', () => {
    expect(parseStructuredClassification('')).toBeNull();
    expect(parseStructuredClassification('  ')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseStructuredClassification('not json at all')).toBeNull();
    expect(parseStructuredClassification('{broken json')).toBeNull();
  });

  it('returns null for missing fields', () => {
    expect(parseStructuredClassification('{"dimension":"identity-core"}')).toBeNull();
    expect(parseStructuredClassification('{"dimension":"identity-core","importance":"core"}')).toBeNull();
  });

  it('returns null for invalid dimension value', () => {
    expect(parseStructuredClassification(
      '{"dimension":"invalid-dim","importance":"core","stance":"assert"}'
    )).toBeNull();
  });

  it('returns null for invalid importance value', () => {
    expect(parseStructuredClassification(
      '{"dimension":"identity-core","importance":"high","stance":"assert"}'
    )).toBeNull();
  });

  it('returns null for invalid stance value', () => {
    expect(parseStructuredClassification(
      '{"dimension":"identity-core","importance":"core","stance":"agree"}'
    )).toBeNull();
  });

  it('handles all valid dimension values', () => {
    const dimensions = [
      'identity-core', 'character-traits', 'voice-presence',
      'honesty-framework', 'boundaries-ethics', 'relationship-dynamics',
      'continuity-growth',
    ];
    for (const dim of dimensions) {
      const result = parseStructuredClassification(
        `{"dimension":"${dim}","importance":"supporting","stance":"assert"}`
      );
      expect(result?.dimension).toBe(dim);
    }
  });

  it('handles all valid stance values', () => {
    const stances = ['assert', 'deny', 'question', 'qualify', 'tensioning'];
    for (const stance of stances) {
      const result = parseStructuredClassification(
        `{"dimension":"identity-core","importance":"supporting","stance":"${stance}"}`
      );
      expect(result?.stance).toBe(stance);
    }
  });

  it('handles all valid importance values', () => {
    const importances = ['core', 'supporting', 'peripheral'];
    for (const imp of importances) {
      const result = parseStructuredClassification(
        `{"dimension":"identity-core","importance":"${imp}","stance":"assert"}`
      );
      expect(result?.importance).toBe(imp);
    }
  });
});

describe('classifySignalStructured', () => {
  it('throws LLMRequiredError when LLM is null', async () => {
    await expect(classifySignalStructured(null, 'test text')).rejects.toThrow(
      LLMRequiredError
    );
  });

  it('throws LLMRequiredError when LLM is undefined', async () => {
    await expect(classifySignalStructured(undefined, 'test text')).rejects.toThrow(
      LLMRequiredError
    );
  });

  it('returns valid classification from combined call (happy path)', async () => {
    const llm = createMockLLM();
    const result = await classifySignalStructured(llm, 'I am always honest about my limitations');

    expect(result.dimension).toBeDefined();
    expect(result.importance).toBeDefined();
    expect(result.stance).toBeDefined();

    // Verify dimension is valid
    const validDimensions = [
      'identity-core', 'character-traits', 'voice-presence',
      'honesty-framework', 'boundaries-ethics', 'relationship-dynamics',
      'continuity-growth',
    ];
    expect(validDimensions).toContain(result.dimension);

    // Verify importance is valid
    expect(['core', 'supporting', 'peripheral']).toContain(result.importance);

    // Verify stance is valid
    expect(['assert', 'deny', 'question', 'qualify', 'tensioning']).toContain(result.stance);
  });

  it('uses single generate call (not 3 classify calls)', async () => {
    const llm = createMockLLM();
    const callsBefore = llm.getCallCount();
    await classifySignalStructured(llm, 'I believe in honesty');
    const callsAfter = llm.getCallCount();

    // Should be exactly 1 call (the combined generate)
    expect(callsAfter - callsBefore).toBe(1);
  });

  it('falls back to individual calls when generate returns invalid JSON', async () => {
    const baseMock = createMockLLM();
    let generateCallCount = 0;

    // Create mock that returns invalid JSON from generate but works for classify
    const llm = {
      ...baseMock,
      async generate(): Promise<GenerationResult> {
        generateCallCount++;
        return { text: 'this is not json' };
      },
    };

    const result = await classifySignalStructured(llm, 'I prefer clear communication');

    // Should have tried 3 generate calls (initial + 2 retries), then fell back to 3 classify calls
    expect(generateCallCount).toBe(3);

    // Should still return valid results from fallback
    expect(result.dimension).toBeDefined();
    expect(result.importance).toBeDefined();
    expect(result.stance).toBeDefined();
  });

  it('retries with corrective feedback before falling back', async () => {
    const baseMock = createMockLLM();
    const generatePrompts: string[] = [];

    // First 2 calls return garbage, third returns valid JSON
    let callCount = 0;
    const llm = {
      ...baseMock,
      async generate(prompt: string): Promise<GenerationResult> {
        generatePrompts.push(prompt);
        callCount++;
        if (callCount <= 2) {
          return { text: 'invalid garbage' };
        }
        return { text: '{"dimension":"identity-core","importance":"core","stance":"assert"}' };
      },
    };

    const result = await classifySignalStructured(llm, 'I am who I am');

    // The third attempt (attempt index 2) succeeds
    expect(result.dimension).toBe('identity-core');
    expect(result.importance).toBe('core');
    expect(result.stance).toBe('assert');

    // Second and third prompts should contain corrective feedback
    expect(generatePrompts[1]).toContain('Previous response was not valid');
    expect(generatePrompts[1]).toContain('invalid garbage');
    expect(generatePrompts[2]).toContain('Previous response was not valid');
  });
});

describe('Error Handling', () => {
  it('LLMRequiredError includes operation name', async () => {
    try {
      await classifyDimension(null, 'test');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMRequiredError);
      expect((error as LLMRequiredError).operation).toBe('classifyDimension');
      expect((error as LLMRequiredError).message).toContain('classifyDimension');
    }
  });
});
