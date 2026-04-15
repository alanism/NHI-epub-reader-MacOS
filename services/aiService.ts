import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import {
  ANALYSIS_FOCUS_INSTRUCTIONS,
  BASE_SYSTEM_PROMPT,
  CURATED_MODELS,
  EXPLANATION_DEPTH_INSTRUCTIONS,
  PERSONAS,
  PROVIDER_LABELS,
} from '../constants';
import {
  AIProvider,
  ExplanationDepth,
  NormalizedAIRequest,
  NormalizedAIResponse,
  QuizConfig,
  QuizQuestion,
  TokenBudgetClass,
} from '../types';
import { aiSettingsService } from './aiSettingsService';

type AIProviderClient = {
  generate<T = unknown>(request: NormalizedAIRequest): Promise<NormalizedAIResponse<T>>;
};

const TOKEN_BUDGETS: Record<TokenBudgetClass, number> = {
  small: 12_000,
  medium: 28_000,
  large: 60_000,
};

const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          explanation: { type: 'string' },
          sourceType: { type: 'string', enum: ['whole-book', 'ledger'] },
        },
        required: ['id', 'prompt', 'choices', 'correctIndex', 'explanation', 'sourceType'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

type QuizEnvelope = {
  questions: QuizQuestion[];
};

class OpenAIClient implements AIProviderClient {
  private client: OpenAI;

  constructor(private readonly apiKey: string, private readonly model: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async generate<T = unknown>(request: NormalizedAIRequest): Promise<NormalizedAIResponse<T>> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: request.systemInstruction,
      input: applyTokenBudget(request.inputText, request.tokenBudgetClass),
      temperature: request.temperature,
      text:
        request.outputMode === 'json'
          ? {
              format: {
                type: 'json_schema',
                name: `${request.taskType}_response`,
                schema: request.jsonSchema ?? {},
                strict: true,
              },
            }
          : {
              format: {
                type: 'text',
              },
            },
    });

    const text = response.output_text?.trim() ?? '';
    if (request.outputMode === 'json') {
      return {
        text,
        data: JSON.parse(text) as T,
      };
    }

    return { text };
  }
}

class GeminiClient implements AIProviderClient {
  private client: GoogleGenAI;

  constructor(private readonly apiKey: string, private readonly model: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate<T = unknown>(request: NormalizedAIRequest): Promise<NormalizedAIResponse<T>> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: applyTokenBudget(request.inputText, request.tokenBudgetClass),
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
        ...(request.outputMode === 'json'
          ? {
              responseMimeType: 'application/json',
              responseSchema: request.jsonSchema,
            }
          : {}),
      },
    });

    const text = response.text?.trim() ?? '';
    if (request.outputMode === 'json') {
      return {
        text,
        data: JSON.parse(text) as T,
      };
    }

    return { text };
  }
}

const applyTokenBudget = (text: string, budgetClass: TokenBudgetClass) => {
  const cleaned = text.trim();
  if (cleaned.length <= TOKEN_BUDGETS[budgetClass]) {
    return cleaned;
  }

  const target = TOKEN_BUDGETS[budgetClass];
  const windowSize = Math.floor((target - 160) / 3);
  const head = cleaned.slice(0, windowSize);
  const middleStart = Math.max(0, Math.floor(cleaned.length / 2) - Math.floor(windowSize / 2));
  const middle = cleaned.slice(middleStart, middleStart + windowSize);
  const tail = cleaned.slice(-windowSize);

  return [
    '[Excerpt: opening]',
    head,
    '[Excerpt: middle]',
    middle,
    '[Excerpt: ending]',
    tail,
  ].join('\n\n');
};

const budgetLedgerEntries = (entries: string[], maxEntries: number, maxCharsPerEntry: number) =>
  entries
    .slice(-maxEntries)
    .map((entry, index) => `[Ledger ${index + 1}]\n${entry.slice(0, maxCharsPerEntry)}`)
    .join('\n\n---\n\n');

const ensureKey = (provider: AIProvider, key: string) => {
  if (!key.trim()) {
    throw new Error(`${PROVIDER_LABELS[provider]} API key is missing. Add it in AI Settings.`);
  }
};

const buildClient = async (providerOverride?: AIProvider, apiKeyOverride?: string, modelOverride?: string) => {
  const bundle = await aiSettingsService.loadBundle();
  const provider = providerOverride ?? bundle.settings.activeProvider;
  const apiKey = (apiKeyOverride ?? bundle.keysByProvider[provider]).trim();
  const model = modelOverride ?? bundle.settings.activeModelByProvider[provider];

  ensureKey(provider, apiKey);

  if (provider === 'openai') {
    return {
      provider,
      model,
      client: new OpenAIClient(apiKey, model),
    };
  }

  return {
    provider,
    model,
    client: new GeminiClient(apiKey, model),
  };
};

const normalizeError = (provider: AIProvider, error: unknown) => {
  const baseMessage = error instanceof Error ? error.message : 'Unknown request failure.';
  if (/401|unauthorized|invalid api key|incorrect api key|api key not valid/i.test(baseMessage)) {
    return `${PROVIDER_LABELS[provider]} rejected the API key. Validate it in AI Settings.`;
  }

  return `${PROVIDER_LABELS[provider]} request failed: ${baseMessage}`;
};

const generateTextRequest = async (
  request: Omit<NormalizedAIRequest, 'outputMode' | 'model'> & { model?: string },
) => {
  const { provider, model, client } = await buildClient(undefined, undefined, request.model);

  try {
    return await client.generate({
      ...request,
      model,
      outputMode: 'text',
    });
  } catch (error) {
    throw new Error(normalizeError(provider, error));
  }
};

const generateJsonRequest = async <T>(
  request: Omit<NormalizedAIRequest, 'outputMode' | 'model'> & {
    model?: string;
    jsonSchema: Record<string, unknown>;
  },
) => {
  const { provider, model, client } = await buildClient(undefined, undefined, request.model);

  try {
    return await client.generate<T>({
      ...request,
      model,
      outputMode: 'json',
    });
  } catch (error) {
    throw new Error(normalizeError(provider, error));
  }
};

export const aiService = {
  async generateText(request: Omit<NormalizedAIRequest, 'outputMode' | 'model'> & { model?: string }) {
    return generateTextRequest(request);
  },

  async generateJson<T>(
    request: Omit<NormalizedAIRequest, 'outputMode' | 'model'> & { model?: string; jsonSchema: Record<string, unknown> },
  ) {
    return generateJsonRequest<T>(request);
  },

  async validateKey(provider: AIProvider, apiKey: string) {
    const model = CURATED_MODELS[provider][0];
    const { client } = await buildClient(provider, apiKey, model);

    try {
      const response = await client.generate({
        taskType: 'analysis',
        model,
        inputText: 'Reply with exactly OK.',
        systemInstruction: 'Return only the word OK.',
        outputMode: 'text',
        temperature: 0,
        tokenBudgetClass: 'small',
      });

      return response.text.toUpperCase().includes('OK');
    } catch (error) {
      throw new Error(normalizeError(provider, error));
    }
  },

  async analyzeText(
    text: string,
    personaId: string,
    focus: string,
    depth: ExplanationDepth,
    bookTitle?: string,
    bookAuthor?: string,
  ): Promise<string> {
    if (!text.trim()) {
      return '';
    }

    const persona = PERSONAS.find((candidate) => candidate.persona_id === personaId);
    if (!persona) {
      throw new Error('Invalid persona selection.');
    }

    const focusInstruction = ANALYSIS_FOCUS_INSTRUCTIONS[focus] || ANALYSIS_FOCUS_INSTRUCTIONS.Expert;
    const depthInstruction =
      EXPLANATION_DEPTH_INSTRUCTIONS[depth] || EXPLANATION_DEPTH_INSTRUCTIONS['8th Grader'];

    const systemInstruction = `${BASE_SYSTEM_PROMPT}

SOURCE CONTEXT:
Book Title: ${bookTitle || 'Unknown'}
Book Author: ${bookAuthor || 'Unknown'}

Use the book title and author as contextual grounding for tone, references, and assumptions, but do not restate them unless relevant.

PERSONA DEFINITION (Use this JSON as source of truth):
${JSON.stringify(persona, null, 2)}

${depthInstruction}

${focusInstruction}
`;

    const response = await generateTextRequest({
      taskType: 'analysis',
      inputText: text,
      systemInstruction,
      temperature: 0.5,
      tokenBudgetClass: 'small',
    });

    return response.text;
  },

  async generateQuiz(
    bookTitle: string,
    bookAuthor: string,
    bookContext: string,
    ledgerContext: string[],
    config: QuizConfig,
  ): Promise<QuizQuestion[]> {
    const systemInstruction = `
You are an expert educator and quiz generator.
Your goal is to create high-quality, multiple-choice questions that test application and cognition, not just rote recall.

CONTEXT:
Book: "${bookTitle}" by ${bookAuthor}
Mode: ${config.mode}
Difficulty: ${config.difficulty}
Target Count: ${config.questionCount}

INSTRUCTIONS:
1. Generate exactly ${config.questionCount} questions.
2. If Mode is 'ledger-weighted', aim for roughly 40% of questions to come from the provided ledger excerpts and 60% from the book excerpts.
3. If Mode is 'whole-book', use only book excerpts.
4. Questions should verify understanding of concepts, ability to distinguish similar ideas, or application of ideas to scenarios.
5. Provide 4 choices per question.
6. Return valid JSON only.
7. Output must be an object in this shape:
{
  "questions": [ ... ]
}
`;

    const sections = [
      `BOOK CONTEXT (Sampled Excerpts):\n${applyTokenBudget(bookContext, 'large')}`,
    ];

    if (config.mode === 'ledger-weighted' && ledgerContext.length > 0) {
      sections.push(`LEDGER ENTRIES:\n${budgetLedgerEntries(ledgerContext, 8, 2_500)}`);
    }

    sections.push('Generate the quiz now.');

    const response = await generateJsonRequest<QuizEnvelope>({
      taskType: 'quiz',
      inputText: sections.join('\n\n'),
      systemInstruction,
      temperature: 0.4,
      jsonSchema: QUIZ_SCHEMA,
      tokenBudgetClass: 'large',
    });

    return response.data?.questions ?? [];
  },

  async generateLessonPlan(
    bookTitle: string,
    bookAuthor: string,
    studentAge: number,
    focus: string,
    ledgerContext: string,
  ): Promise<string> {
    const duration = studentAge + 1;

    const systemInstruction = `
You are a neutral, expert lesson planner. Your goal is to synthesize research into a structured lesson plan.

SOURCE CONTEXT:
Book Title: ${bookTitle}
Book Author: ${bookAuthor}

STUDENT PARAMETERS:
Age: ${studentAge}
Lecture Duration Target: ${duration} minutes

INSTRUCTIONS:
1. The lesson must fit within exactly ${duration} minutes.
2. The language must be calibrated for a student of age ${studentAge}.
3. The lesson focus should be: ${focus}.
4. Use the provided ledger entries as the core source material.

STRUCTURE YOUR OUTPUT EXACTLY AS FOLLOWS:

## 1. Key Message
1-2 clear sentences.

## 2. Lesson Outline (Time Structured)
Must include:
- Opening Hook (minutes)
- Core Concepts (minutes)
- Example or Case (minutes)
- Guided Discussion (minutes)
- Closing Synthesis (minutes)
Total must equal exactly ${duration} minutes.

## 3. Lecture Script
Full spoken script calibrated for age ${studentAge}. Length must correspond to the lecture duration.

## 4. Discussion Questions
3-5 questions increasing in depth.

## 5. Reinforcement Activity
Short application-based activity.
`;

    const inputText = [
      `Focus: ${focus}`,
      `Ledger Excerpts:\n${applyTokenBudget(ledgerContext, 'medium')}`,
      `Generate a ${focus} lesson plan for a ${studentAge} year old.`,
    ].join('\n\n');

    const response = await generateTextRequest({
      taskType: 'lesson_plan',
      inputText,
      systemInstruction,
      temperature: 0.3,
      tokenBudgetClass: 'medium',
    });

    return response.text;
  },
};
