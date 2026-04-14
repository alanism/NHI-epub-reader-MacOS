import { PERSONAS, BASE_SYSTEM_PROMPT, ANALYSIS_FOCUS_INSTRUCTIONS, EXPLANATION_DEPTH_INSTRUCTIONS } from '../constants';
import { ExplanationDepth, QuizConfig, QuizQuestion } from '../types';

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed.';
    throw new Error(message);
  }

  return payload as T;
};

export const geminiService = {
  async analyzeText(
    text: string, 
    personaId: string, 
    focus: string, 
    depth: ExplanationDepth, 
    bookTitle?: string, 
    bookAuthor?: string
  ): Promise<string> {
    if (!text.trim()) return "";

    const persona = PERSONAS.find(p => p.persona_id === personaId);
    if (!persona) {
        return "Error: Invalid Persona ID.";
    }

    const focusInstruction = ANALYSIS_FOCUS_INSTRUCTIONS[focus] || ANALYSIS_FOCUS_INSTRUCTIONS['Expert'];
    const depthInstruction = EXPLANATION_DEPTH_INSTRUCTIONS[depth] || EXPLANATION_DEPTH_INSTRUCTIONS['8th Grader'];

    const systemInstruction = `${BASE_SYSTEM_PROMPT}

SOURCE CONTEXT:
Book Title: ${bookTitle || "Unknown"}
Book Author: ${bookAuthor || "Unknown"}

Use the book title and author as contextual grounding for tone, references, and assumptions, but do not restate them unless relevant.

PERSONA DEFINITION (Use this JSON as source of truth):
${JSON.stringify(persona, null, 2)}

${depthInstruction}

${focusInstruction}
`;
    
    // Using gemini-3-pro-preview for deep analytical tasks and persona embodiment
    const modelName = 'gemini-3-pro-preview';

    try {
      const response = await postJson<{ text: string }>('/api/analyze', {
        model: modelName,
        text,
        systemInstruction,
        temperature: 0.5,
      });

      return response.text || "Analysis failed to generate text.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "Error: Could not complete analysis. Please check your connection or try again.";
    }
  },

  async generateQuiz(
    bookTitle: string,
    bookAuthor: string,
    bookContext: string, // Aggregated content or sample
    ledgerContext: string[], // Recent ledger entries text
    config: QuizConfig
  ): Promise<QuizQuestion[]> {
    
    const modelName = 'gemini-3-pro-preview';

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
2. If Mode is 'ledger-weighted', aim for ~40% of questions to be derived from the provided LEDGER ENTRIES, and 60% from the BOOK CONTEXT.
3. If Mode is 'whole-book', use only BOOK CONTEXT.
4. Questions should verify understanding of concepts, ability to distinguish similar ideas, or application of ideas to scenarios.
5. Provide 4 choices per question.
6. Return valid JSON only.

JSON SCHEMA:
Array of objects:
{
  "id": "string (unique)",
  "prompt": "string (the question)",
  "choices": ["string", "string", "string", "string"],
  "correctIndex": number (0-3),
  "explanation": "string (why the answer is correct)",
  "sourceType": "whole-book" | "ledger"
}
`;

    // Prepare content payload
    let contentPrompt = `BOOK CONTEXT (Sample):\n${bookContext.slice(0, 50000)}... [Truncated]\n\n`;
    
    if (config.mode === 'ledger-weighted' && ledgerContext.length > 0) {
      contentPrompt += `LEDGER ENTRIES (User Notes & Analysis):\n${ledgerContext.join('\n---\n')}\n\n`;
    }

    contentPrompt += `Generate the quiz now.`;

    const responseSchema = {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          prompt: { type: 'STRING' },
          choices: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          sourceType: { type: 'STRING', enum: ['whole-book', 'ledger'] }
        },
        required: ['id', 'prompt', 'choices', 'correctIndex', 'explanation', 'sourceType']
      }
    };

    try {
      const response = await postJson<{ questions: QuizQuestion[] }>('/api/quiz', {
        model: modelName,
        contentPrompt,
        systemInstruction,
        responseSchema,
        temperature: 0.4,
      });

      return response.questions || [];
    } catch (error) {
      console.error("Quiz Generation Error:", error);
      throw new Error("Failed to generate quiz.");
    }
  },

  async generateLessonPlan(
    bookTitle: string,
    bookAuthor: string,
    studentAge: number,
    focus: string,
    ledgerContext: string
  ): Promise<string> {
    const duration = studentAge + 1;
    const modelName = 'gemini-3-pro-preview';

    const systemInstruction = `
You are a neutral, expert lesson planner. Your goal is to synthesize research into a structured lesson plan.

SOURCE CONTEXT:
Book Title: ${bookTitle}
Book Author: ${bookAuthor}

STUDENT PARAMETERS:
Age: ${studentAge}
Lecture Duration Target: ${duration} minutes

INPUT MATERIAL (Research Ledger):
${ledgerContext}

INSTRUCTIONS:
1. The lesson must fit within exactly ${duration} minutes.
2. The language must be calibrated for a student of age ${studentAge}.
3. The lesson focus should be: ${focus}.
4. Use the provided Ledger entries as the core source material.

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

    try {
      const response = await postJson<{ text: string }>('/api/lesson-plan', {
        model: modelName,
        prompt: `Generate a ${focus} lesson plan for a ${studentAge} year old based on the provided ledger notes.`,
        systemInstruction,
        temperature: 0.3,
      });

      return response.text || "Failed to generate lesson plan.";
    } catch (error) {
      console.error("Lesson Planner Error:", error);
      throw new Error("Failed to generate lesson plan.");
    }
  }
};
