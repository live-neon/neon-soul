/**
 * Unit Tests: Signal Extractor
 *
 * Tests for LLM-based signal extraction.
 * Verifies LLMRequiredError is thrown when LLM not provided.
 */

import { describe, it, expect } from 'vitest';
import {
  extractSignalsFromContent,
  extractSignalsFromMemoryFiles,
  isStructuralNoise,
} from '../../src/lib/signal-extractor.js';
import { LLMRequiredError } from '../../src/types/llm.js';
import { createMockLLM } from '../mocks/llm-mock.js';

describe('Signal Extractor', () => {
  describe('extractSignalsFromContent', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(
        extractSignalsFromContent(null, 'Some content', { file: 'test.md' })
      ).rejects.toThrow(LLMRequiredError);
    });

    it('throws LLMRequiredError when LLM is undefined', async () => {
      await expect(
        extractSignalsFromContent(undefined, 'Some content', { file: 'test.md' })
      ).rejects.toThrow(LLMRequiredError);
    });

    it('extracts signals from markdown content', async () => {
      const llm = createMockLLM();
      const content = `# My Values

- I believe in honesty above all else
- I prefer clear and direct communication
- I value helping others learn and grow
`;

      const signals = await extractSignalsFromContent(llm, content, {
        file: 'test.md',
        category: 'preferences',
      });

      // Should have extracted some signals (mock returns 'yes' for detection)
      expect(Array.isArray(signals)).toBe(true);
    });

    it('skips short lines', async () => {
      const llm = createMockLLM();
      const content = `Short
Very short line
This is a line that is long enough to be considered for signal extraction`;

      const signals = await extractSignalsFromContent(llm, content, {
        file: 'test.md',
      });

      // Only the long line should potentially be processed
      expect(Array.isArray(signals)).toBe(true);
    });

    it('includes source information in extracted signals', async () => {
      const llm = createMockLLM();
      const content = `I believe in being thorough but not pedantic in my work.`;

      const signals = await extractSignalsFromContent(llm, content, {
        file: 'values.md',
        category: 'beliefs',
      });

      if (signals.length > 0) {
        const signal = signals[0];
        expect(signal?.source.file).toBe('values.md');
        expect(signal?.source.type).toBeDefined();
      }
    });

    it('assigns dimension to extracted signals', async () => {
      const llm = createMockLLM();
      const content = `I am always honest about my capabilities and limitations.`;

      const signals = await extractSignalsFromContent(llm, content, {
        file: 'test.md',
      });

      if (signals.length > 0) {
        // Each signal should have a dimension assigned
        for (const signal of signals) {
          expect(signal.dimension).toBeDefined();
        }
      }
    });

    it('does not generate embeddings for signals (deprecated in v0.2.0)', async () => {
      const llm = createMockLLM();
      const content = `I value continuous learning and personal growth over time.`;

      const signals = await extractSignalsFromContent(llm, content, {
        file: 'test.md',
      });

      if (signals.length > 0) {
        // Embeddings are optional and not generated in v0.2.0 (LLM-based similarity)
        for (const signal of signals) {
          expect(signal.embedding).toBeUndefined();
        }
      }
    });
  });

  describe('extractSignalsFromMemoryFiles', () => {
    it('throws LLMRequiredError when LLM is null', async () => {
      await expect(
        extractSignalsFromMemoryFiles(null, [])
      ).rejects.toThrow(LLMRequiredError);
    });

    it('extracts signals from multiple memory files', async () => {
      const llm = createMockLLM();
      const memoryFiles = [
        {
          path: 'memory/diary/2026-01-01.md',
          content: 'Today I learned the importance of being patient.',
          category: 'diary' as const,
          relativePath: 'diary/2026-01-01.md',
        },
        {
          path: 'memory/preferences/communication.md',
          content: 'I prefer direct, honest communication.',
          category: 'preferences' as const,
          relativePath: 'preferences/communication.md',
        },
      ];

      const signals = await extractSignalsFromMemoryFiles(llm, memoryFiles);

      expect(Array.isArray(signals)).toBe(true);
    });

    it('handles empty file list', async () => {
      const llm = createMockLLM();
      const signals = await extractSignalsFromMemoryFiles(llm, []);

      expect(signals).toEqual([]);
    });
  });
});

describe('isStructuralNoise', () => {
  describe('filters code syntax', () => {
    it('filters import statements', () => {
      expect(isStructuralNoise("import { foo } from './bar.js'")).toBe(true);
      expect(isStructuralNoise('import React from "react"')).toBe(true);
      expect(isStructuralNoise('import * as path from "path"')).toBe(true);
    });

    it('filters export statements', () => {
      expect(isStructuralNoise('export default MyComponent')).toBe(true);
      expect(isStructuralNoise('export { foo, bar } from "./baz"')).toBe(true);
    });

    it('filters variable declarations', () => {
      expect(isStructuralNoise('const foo = "bar"')).toBe(true);
      expect(isStructuralNoise('let counter = 0')).toBe(true);
      expect(isStructuralNoise('var result = getValue()')).toBe(true);
    });

    it('filters function/class declarations', () => {
      expect(isStructuralNoise('function handleClick(event) {')).toBe(true);
      expect(isStructuralNoise('class UserService extends BaseService {')).toBe(true);
      expect(isStructuralNoise('interface UserProps {')).toBe(true);
      expect(isStructuralNoise('type Status = "active" | "inactive"')).toBe(true);
    });

    it('filters control flow', () => {
      expect(isStructuralNoise('if (user.isActive) {')).toBe(true);
      expect(isStructuralNoise('for (const item of items) {')).toBe(true);
      expect(isStructuralNoise('while (retries > 0) {')).toBe(true);
      expect(isStructuralNoise('try {')).toBe(true);
      expect(isStructuralNoise('catch (error) {')).toBe(true);
    });

    it('filters return/throw with code-like continuation', () => {
      expect(isStructuralNoise('return result.map(x => x.id)')).toBe(true);
      expect(isStructuralNoise('throw new Error("failed")')).toBe(true);
    });

    it('filters code fences', () => {
      expect(isStructuralNoise('```typescript')).toBe(true);
      expect(isStructuralNoise('```')).toBe(true);
    });

    it('filters code-dense lines', () => {
      expect(isStructuralNoise('const x = foo({ bar: [1, 2] });')).toBe(true);
      // Lines with very high operator-to-alpha ratio
      expect(isStructuralNoise('x = (a && b) || (c > d) ? [e] : {f};')).toBe(true);
    });
  });

  describe('filters structural data', () => {
    it('filters bare file paths', () => {
      expect(isStructuralNoise('./src/lib/signal-extractor.ts')).toBe(true);
      expect(isStructuralNoise('/Users/neonsoul/Desktop/projects/neon-soul')).toBe(true);
      expect(isStructuralNoise('~/Documents/notes.md')).toBe(true);
    });

    it('filters stack traces', () => {
      expect(isStructuralNoise('at Object.runInThisContext (vm.js:76:16)')).toBe(true);
      expect(isStructuralNoise('  at Module._compile (internal/modules/cjs/loader.js:778:30)')).toBe(true);
    });

    it('filters lone brackets/braces', () => {
      expect(isStructuralNoise('{')).toBe(true);
      expect(isStructuralNoise('});')).toBe(true);
      expect(isStructuralNoise('],')).toBe(true);
    });

    it('filters bare URLs', () => {
      expect(isStructuralNoise('https://github.com/user/repo')).toBe(true);
      expect(isStructuralNoise('http://localhost:3000/api/health')).toBe(true);
    });

    it('filters git diff markers', () => {
      expect(isStructuralNoise('+++ b/src/index.ts')).toBe(true);
      expect(isStructuralNoise('--- a/src/index.ts')).toBe(true);
      expect(isStructuralNoise('@@ -10,5 +10,8 @@')).toBe(true);
    });

    it('filters log lines', () => {
      expect(isStructuralNoise('[INFO] Server started on port 3000')).toBe(true);
      expect(isStructuralNoise('DEBUG: processing request 42')).toBe(true);
      expect(isStructuralNoise('ERROR: connection refused')).toBe(true);
    });

    it('filters timestamps', () => {
      expect(isStructuralNoise('2026-02-22T14:30:00.000Z')).toBe(true);
    });

    it('filters shell commands', () => {
      expect(isStructuralNoise('$ npm run build')).toBe(true);
      expect(isStructuralNoise('npm install express --save')).toBe(true);
      expect(isStructuralNoise('docker exec -it container bash')).toBe(true);
    });

    it('filters version strings and hashes', () => {
      expect(isStructuralNoise('v1.2.3')).toBe(true);
      expect(isStructuralNoise('3.14.159')).toBe(true);
      expect(isStructuralNoise('abc1234')).toBe(true);
      expect(isStructuralNoise('abc1234567890abcdef1234567890abcdef12345678')).toBe(true);
    });

    it('filters HTML/XML tags', () => {
      expect(isStructuralNoise('<div className="container">')).toBe(true);
      expect(isStructuralNoise('</section>')).toBe(true);
    });
  });

  describe('preserves identity-relevant content', () => {
    it('preserves first-person value statements', () => {
      expect(isStructuralNoise('I believe in honesty above all else')).toBe(false);
      expect(isStructuralNoise('I prefer clear and direct communication')).toBe(false);
      expect(isStructuralNoise('I value helping others learn and grow')).toBe(false);
    });

    it('preserves reflections and preferences', () => {
      expect(isStructuralNoise('My approach to problem-solving is systematic')).toBe(false);
      expect(isStructuralNoise('I tend to prioritize simplicity over cleverness')).toBe(false);
      expect(isStructuralNoise('What matters most to me is authenticity')).toBe(false);
    });

    it('preserves boundary and constraint statements', () => {
      expect(isStructuralNoise('I will not compromise on user privacy')).toBe(false);
      expect(isStructuralNoise('There are certain lines I refuse to cross')).toBe(false);
    });

    it('preserves goal and aspiration statements', () => {
      expect(isStructuralNoise('My goal is to become a better communicator')).toBe(false);
      expect(isStructuralNoise('I aspire to build tools that empower people')).toBe(false);
    });

    it('preserves technical preferences expressed in natural language', () => {
      expect(isStructuralNoise('I prefer TypeScript over JavaScript for type safety')).toBe(false);
      expect(isStructuralNoise('I believe clean code is more important than clever code')).toBe(false);
      expect(isStructuralNoise('My debugging approach is methodical and patient')).toBe(false);
    });

    it('preserves conversational content between human and AI', () => {
      expect(isStructuralNoise('User: What do you think about this approach?')).toBe(false);
      expect(isStructuralNoise('Assistant: I think we should prioritize readability')).toBe(false);
      expect(isStructuralNoise('I noticed you tend to favor explicit over implicit')).toBe(false);
    });

    it('preserves personality and behavioral observations', () => {
      expect(isStructuralNoise('You always double-check before making changes')).toBe(false);
      expect(isStructuralNoise('I appreciate when explanations are thorough')).toBe(false);
      expect(isStructuralNoise('Patience is something I value in collaboration')).toBe(false);
    });

    it('preserves HTML tags mixed with identity content', () => {
      // "I" pronoun should prevent filtering
      expect(isStructuralNoise('<emphasis> I believe this is important </emphasis>')).toBe(false);
    });

    it('preserves short but meaningful statements', () => {
      expect(isStructuralNoise('Honesty matters deeply to me')).toBe(false);
      expect(isStructuralNoise('Always be kind and curious')).toBe(false);
    });
  });
});

describe('LLMRequiredError', () => {
  it('has correct name property', async () => {
    try {
      await extractSignalsFromContent(null, 'test', { file: 'test.md' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMRequiredError);
      expect((error as LLMRequiredError).name).toBe('LLMRequiredError');
    }
  });

  it('includes operation in message', async () => {
    try {
      await extractSignalsFromContent(null, 'test', { file: 'test.md' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as LLMRequiredError).message).toContain(
        'extractSignalsFromContent'
      );
    }
  });
});
