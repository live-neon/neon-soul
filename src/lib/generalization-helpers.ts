/**
 * Signal Generalization Helpers
 *
 * Pure functions for prompt building and validation.
 * Extracted from signal-generalizer.ts for MCE compliance.
 */

import { sanitizeForPrompt as baseSanitize } from './semantic-classifier.js';

/** Maximum allowed length for generalized output */
export const MAX_OUTPUT_LENGTH = 150;

/** Maximum input length for prompt safety (stricter than base 1000) */
export const MAX_INPUT_LENGTH = 500;

/**
 * Regex pattern for pronouns that should not appear in actor-agnostic output.
 * Uses word boundaries to catch all cases (end of string, punctuation, etc.)
 */
export const PRONOUN_PATTERN = /\b(I|we|you|my|our|your|me|us|myself|ourselves|yourself|yourselves)\b/i;

/**
 * Sanitize input for generalization prompts.
 * M-1 FIX: Builds on base sanitizeForPrompt from semantic-classifier.ts
 * but adds generalization-specific processing (stricter length, markdown removal).
 *
 * Note: This is intentionally more aggressive than the base sanitizer.
 */
function sanitizeForGeneralization(text: string): string {
  // Apply base sanitization first (XML escaping, 1000-char truncation)
  const base = baseSanitize(text);
  // Add generalization-specific processing
  return base
    .slice(0, MAX_INPUT_LENGTH) // Stricter length limit
    .replace(/`/g, "'") // Remove markdown code markers
    .replace(/\n/g, ' ') // Normalize newlines
    .trim();
}

/**
 * Build the generalization prompt for a signal.
 */
export function buildPrompt(signalText: string, dimension?: string): string {
  const sanitizedText = sanitizeForGeneralization(signalText);
  const dimensionContext = dimension ?? 'general';

  return `Transform this specific statement into an abstract principle.

The principle should:
- Capture the core value or preference
- Be general enough to match similar statements
- Be actionable (can guide behavior)
- Stay under 150 characters
- Use imperative form (e.g., "Values X over Y", "Prioritizes Z")
- Do NOT add policies or concepts not present in the original
- Do NOT use pronouns (I, we, you) - abstract the actor
- If the original has conditions, preserve them

<signal_text>
${sanitizedText}
</signal_text>

<dimension_context>
${dimensionContext}
</dimension_context>

Output ONLY the generalized principle, nothing else.`;
}

/**
 * Validation result for generalized output.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate generalized output meets constraints.
 * Returns validation result with reason if failed.
 */
export function validateGeneralization(
  original: string,
  generalized: string
): ValidationResult {
  // Check non-empty
  if (!generalized || generalized.trim().length === 0) {
    return { valid: false, reason: 'empty output' };
  }

  // Check length cap
  if (generalized.length > MAX_OUTPUT_LENGTH) {
    return { valid: false, reason: `exceeds ${MAX_OUTPUT_LENGTH} chars (got ${generalized.length})` };
  }

  // Check for forbidden pronouns using word boundary regex
  const pronounMatch = generalized.match(PRONOUN_PATTERN);
  if (pronounMatch) {
    return { valid: false, reason: `contains pronoun "${pronounMatch[0]}"` };
  }

  // Basic sanity check - output shouldn't be dramatically longer than input
  // (allows for some expansion but catches runaway generation)
  if (generalized.length > original.length * 3 && generalized.length > 100) {
    return { valid: false, reason: 'output too long relative to input' };
  }

  return { valid: true };
}
