/**
 * Interview Question Bank
 *
 * Contains all interview questions organized by SoulCraft dimension.
 * Questions are designed to supplement sparse memory areas.
 *
 * See: docs/research/interview-questions.md for full documentation
 */

import type { InterviewQuestion, QuestionBank } from '../types/interview.js';
import type { SoulCraftDimension } from '../types/signal.js';

/**
 * All interview questions.
 */
const QUESTIONS: InterviewQuestion[] = [
  // Identity Core
  {
    id: 'IC-1',
    dimension: 'identity-core',
    text: 'What defines you that wouldn\'t change, even in different circumstances?',
    followUps: [
      {
        id: 'IC-1-F1',
        trigger: 'always|never|core|fundamental',
        text: 'Can you give an example of when this was tested?',
        signalType: 'reinforcement',
      },
    ],
    signalType: 'value',
    required: true,
    priority: 1,
    tags: ['core', 'identity', 'values'],
  },
  {
    id: 'IC-2',
    dimension: 'identity-core',
    text: 'If someone who knew you well described your core, what would they say?',
    followUps: [],
    signalType: 'value',
    required: true,
    priority: 2,
    tags: ['perception', 'identity'],
  },
  {
    id: 'IC-3',
    dimension: 'identity-core',
    text: 'What principles guide your decisions when facing difficult choices?',
    followUps: [
      {
        id: 'IC-3-F1',
        trigger: 'learned|experience|shaped',
        text: 'Was this always true, or did something shape this belief?',
        signalType: 'value',
      },
    ],
    signalType: 'value',
    required: false,
    priority: 2,
    tags: ['principles', 'decisions'],
  },

  // Character Traits
  {
    id: 'CT-1',
    dimension: 'character-traits',
    text: 'How do you typically approach problems - methodically, intuitively, or collaboratively?',
    followUps: [
      {
        id: 'CT-1-F1',
        trigger: 'depends|context|situation',
        text: 'Is this different in personal vs professional contexts?',
        signalType: 'preference',
      },
    ],
    signalType: 'preference',
    required: true,
    priority: 1,
    tags: ['problem-solving', 'approach'],
  },
  {
    id: 'CT-2',
    dimension: 'character-traits',
    text: 'What\'s your default response when something unexpected happens?',
    followUps: [],
    signalType: 'preference',
    required: true,
    priority: 2,
    tags: ['adaptability', 'reaction'],
  },
  {
    id: 'CT-3',
    dimension: 'character-traits',
    text: 'How do others describe your working style?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 2,
    tags: ['perception', 'style'],
  },
  {
    id: 'CT-4',
    dimension: 'character-traits',
    text: 'What energizes you, and what drains you?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 3,
    tags: ['energy', 'motivation'],
  },

  // Voice & Presence
  {
    id: 'VP-1',
    dimension: 'voice-presence',
    text: 'How would you describe your communication style in one sentence?',
    followUps: [],
    signalType: 'preference',
    required: true,
    priority: 1,
    tags: ['communication', 'style'],
  },
  {
    id: 'VP-2',
    dimension: 'voice-presence',
    text: 'When you write or speak, what tone do you naturally gravitate toward?',
    followUps: [
      {
        id: 'VP-2-F1',
        trigger: 'example|instance|time',
        text: 'Can you give an example?',
        signalType: 'reinforcement',
      },
    ],
    signalType: 'preference',
    required: true,
    priority: 1,
    tags: ['tone', 'voice'],
  },
  {
    id: 'VP-3',
    dimension: 'voice-presence',
    text: 'What kind of communication annoys or frustrates you?',
    followUps: [],
    signalType: 'boundary',
    required: false,
    priority: 2,
    tags: ['boundaries', 'pet-peeves'],
  },
  {
    id: 'VP-4',
    dimension: 'voice-presence',
    text: 'Do you prefer directness or diplomacy when giving feedback?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 2,
    tags: ['feedback', 'directness'],
  },
  {
    id: 'VP-5',
    dimension: 'voice-presence',
    text: 'How do you adapt your communication for different audiences?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 3,
    tags: ['adaptation', 'audience'],
  },

  // Honesty Framework
  {
    id: 'HF-1',
    dimension: 'honesty-framework',
    text: 'When is it acceptable to withhold truth?',
    followUps: [
      {
        id: 'HF-1-F1',
        trigger: 'tested|situation|example',
        text: 'Has this principle been tested?',
        signalType: 'reinforcement',
      },
    ],
    signalType: 'boundary',
    required: true,
    priority: 1,
    tags: ['honesty', 'truth', 'ethics'],
  },
  {
    id: 'HF-2',
    dimension: 'honesty-framework',
    text: 'How do you handle situations where honesty might hurt someone?',
    followUps: [],
    signalType: 'value',
    required: true,
    priority: 1,
    tags: ['empathy', 'truth', 'tact'],
  },
  {
    id: 'HF-3',
    dimension: 'honesty-framework',
    text: 'What\'s the difference between lying and being strategic with information?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 2,
    tags: ['nuance', 'truth'],
  },
  {
    id: 'HF-4',
    dimension: 'honesty-framework',
    text: 'How do you prefer to receive difficult feedback?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 2,
    tags: ['feedback', 'receiving'],
  },
  {
    id: 'HF-5',
    dimension: 'honesty-framework',
    text: 'Are there topics where you believe absolute honesty isn\'t necessary?',
    followUps: [],
    signalType: 'boundary',
    required: false,
    priority: 3,
    tags: ['boundaries', 'topics'],
  },

  // Boundaries & Ethics
  {
    id: 'BE-1',
    dimension: 'boundaries-ethics',
    text: 'What would you never do, even if asked or pressured?',
    followUps: [
      {
        id: 'BE-1-F1',
        trigger: 'tested|pressure|situation',
        text: 'Can you share a time when this was tested?',
        signalType: 'reinforcement',
      },
    ],
    signalType: 'boundary',
    required: true,
    priority: 1,
    tags: ['hard-limits', 'ethics'],
  },
  {
    id: 'BE-2',
    dimension: 'boundaries-ethics',
    text: 'How do you handle requests that feel ethically gray?',
    followUps: [],
    signalType: 'value',
    required: true,
    priority: 1,
    tags: ['ethics', 'gray-areas'],
  },
  {
    id: 'BE-3',
    dimension: 'boundaries-ethics',
    text: 'What are your non-negotiable work-life boundaries?',
    followUps: [],
    signalType: 'boundary',
    required: false,
    priority: 2,
    tags: ['work-life', 'boundaries'],
  },
  {
    id: 'BE-4',
    dimension: 'boundaries-ethics',
    text: 'When is it acceptable to bend rules?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 2,
    tags: ['rules', 'flexibility'],
  },
  {
    id: 'BE-5',
    dimension: 'boundaries-ethics',
    text: 'How do you handle situations where your ethics conflict with expectations?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 3,
    tags: ['conflict', 'ethics'],
  },

  // Relationship Dynamics
  {
    id: 'RD-1',
    dimension: 'relationship-dynamics',
    text: 'How do you prefer to work with others - independently or collaboratively?',
    followUps: [],
    signalType: 'preference',
    required: true,
    priority: 1,
    tags: ['collaboration', 'independence'],
  },
  {
    id: 'RD-2',
    dimension: 'relationship-dynamics',
    text: 'What do you value most in professional relationships?',
    followUps: [],
    signalType: 'value',
    required: true,
    priority: 1,
    tags: ['values', 'professional'],
  },
  {
    id: 'RD-3',
    dimension: 'relationship-dynamics',
    text: 'How do you handle disagreements with people you respect?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 2,
    tags: ['conflict', 'disagreement'],
  },
  {
    id: 'RD-4',
    dimension: 'relationship-dynamics',
    text: 'What kind of people do you work best with?',
    followUps: [],
    signalType: 'preference',
    required: false,
    priority: 2,
    tags: ['compatibility', 'teamwork'],
  },
  {
    id: 'RD-5',
    dimension: 'relationship-dynamics',
    text: 'How do you maintain important relationships over time?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 3,
    tags: ['maintenance', 'long-term'],
  },

  // Continuity & Growth
  {
    id: 'CG-1',
    dimension: 'continuity-growth',
    text: 'What are you actively working to improve about yourself?',
    followUps: [
      {
        id: 'CG-1-F1',
        trigger: 'year|month|time|long',
        text: 'How long have you been working on this?',
        signalType: 'reinforcement',
      },
    ],
    signalType: 'value',
    required: true,
    priority: 1,
    tags: ['growth', 'self-improvement'],
  },
  {
    id: 'CG-2',
    dimension: 'continuity-growth',
    text: 'How do you track your own growth and progress?',
    followUps: [],
    signalType: 'preference',
    required: true,
    priority: 2,
    tags: ['tracking', 'progress'],
  },
  {
    id: 'CG-3',
    dimension: 'continuity-growth',
    text: 'What lessons have most shaped who you are today?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 2,
    tags: ['lessons', 'formation'],
  },
  {
    id: 'CG-4',
    dimension: 'continuity-growth',
    text: 'Where do you see yourself in five years, and why does that matter?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 3,
    tags: ['vision', 'future'],
  },
  {
    id: 'CG-5',
    dimension: 'continuity-growth',
    text: 'What growth patterns do you want to maintain across different life phases?',
    followUps: [],
    signalType: 'value',
    required: false,
    priority: 3,
    tags: ['patterns', 'continuity'],
  },
];

/**
 * Build question bank from question array.
 */
function buildQuestionBank(questions: InterviewQuestion[]): QuestionBank {
  const bank: QuestionBank = {
    version: '1.0.0',
    questions: new Map(),
    byDimension: new Map(),
  };

  // Index by ID
  for (const q of questions) {
    bank.questions.set(q.id, q);
  }

  // Group by dimension
  const dimensions: SoulCraftDimension[] = [
    'identity-core',
    'character-traits',
    'voice-presence',
    'honesty-framework',
    'boundaries-ethics',
    'relationship-dynamics',
    'continuity-growth',
  ];

  for (const dim of dimensions) {
    const dimQuestions = questions.filter((q) => q.dimension === dim);
    bank.byDimension.set(dim, dimQuestions);
  }

  return bank;
}

/**
 * The complete question bank.
 */
export const QUESTION_BANK = buildQuestionBank(QUESTIONS);

/**
 * Get statistics about the question bank.
 */
export function getQuestionBankStats(): {
  total: number;
  required: number;
  byDimension: Record<string, number>;
} {
  const byDimension: Record<string, number> = {};

  for (const [dim, questions] of QUESTION_BANK.byDimension) {
    byDimension[dim] = questions.length;
  }

  return {
    total: QUESTION_BANK.questions.size,
    required: QUESTIONS.filter((q) => q.required).length,
    byDimension,
  };
}
