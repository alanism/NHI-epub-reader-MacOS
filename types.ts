export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  toc: ChapterRef[];
  contentMap: Record<string, string>;
}

export interface ChapterRef {
  id: string;
  label: string;
  href: string;
  subitems?: ChapterRef[];
}

export interface LedgerEntry {
  id: string;
  bookId: string;
  bookTitle: string;
  timestamp: number;
  type: 'analysis' | 'annotation' | 'note' | 'quiz';
  content: string;
  analysisResult?: string;
  contextType?: 'fiction' | 'non-fiction';
  personaId?: string;
  tags?: string[];
}

export type SourceTextMode = 'whole' | 'none' | 'partial';

export enum AppView {
  LIBRARY = 'LIBRARY',
  READER = 'READER',
}

export enum AnalysisMode {
  FICTION = 'fiction',
  NON_FICTION = 'non-fiction',
}

export enum AnalysisFocus {
  EXPERT = 'Expert',
  EXECUTIVE = 'Executive',
  STORYTELLER = 'Storyteller',
  EDUCATOR = 'Educator',
  REELS = 'Reels',
}

export enum ExplanationDepth {
  FIFTH_GRADER = '5th Grader',
  EIGHTH_GRADER = '8th Grader',
  MBA = 'MBA',
}

export type AIProvider = 'openai' | 'gemini';
export type AITaskType = 'analysis' | 'quiz' | 'lesson_plan';
export type AIOutputMode = 'text' | 'json';
export type TokenBudgetClass = 'small' | 'medium' | 'large';
export type AIValidationStatus = 'missing' | 'unknown' | 'valid' | 'invalid';

export interface AIProviderState {
  provider: AIProvider;
  model: string;
  hasKey: boolean;
  keyStatus: AIValidationStatus;
  lastValidatedAt: number | null;
  errorMessage: string | null;
}

export interface AISettings {
  activeProvider: AIProvider;
  activeModelByProvider: Record<AIProvider, string>;
  lastValidatedAtByProvider: Record<AIProvider, number | null>;
  keyStatusByProvider: Record<AIProvider, AIValidationStatus>;
  errorByProvider: Record<AIProvider, string | null>;
}

export interface AISettingsBundle {
  settings: AISettings;
  keysByProvider: Record<AIProvider, string>;
  providerStates: Record<AIProvider, AIProviderState>;
}

export interface NormalizedAIRequest {
  taskType: AITaskType;
  model: string;
  inputText: string;
  systemInstruction: string;
  temperature?: number;
  outputMode: AIOutputMode;
  jsonSchema?: Record<string, unknown>;
  tokenBudgetClass: TokenBudgetClass;
}

export interface NormalizedAIResponse<T = unknown> {
  text: string;
  data?: T;
}

export interface Persona {
  persona_id: string;
  display_name: string;
  identity: {
    core_thesis: string;
    worldview: string;
  };
  cognition: {
    thinking_modes: string[];
    default_reasoning_depth: string;
    order_of_operations: string[];
  };
  voice: {
    energy: string;
    tone: string[];
    humor: string;
    emotional_range: string;
    audience_level: string;
  };
  delivery: {
    preferred_structures: string[];
    rhetorical_tools: string[];
    typical_moves: string[];
  };
  constraints: {
    must_do: string[];
    must_avoid: string[];
  };
  closure: {
    ending_pattern: string;
    call_to_action_style: string;
  };
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  sourceType: 'whole-book' | 'ledger';
  sourceReference?: string;
}

export interface QuizConfig {
  mode: 'whole-book' | 'ledger-weighted';
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timePerQuestion: number;
}

export interface QuizAttempt {
  id: string;
  bookId: string;
  config: QuizConfig;
  questions: QuizQuestion[];
  userAnswers: Record<string, number>;
  score: number;
  startedAt: number;
  finishedAt?: number;
}
