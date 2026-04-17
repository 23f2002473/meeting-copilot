export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: string; // ISO string
}

export type SuggestionType =
  | 'question'
  | 'insight'
  | 'fact-check'
  | 'talking-point'
  | 'answer';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  preview: string;
  detail: string;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: string; // ISO string
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
}

export interface AppSettings {
  groqApiKey: string;
  chatModel: string;
  transcriptionModel: string;
  suggestionSystemPrompt: string;
  chatSystemPrompt: string;
  /** Characters of recent transcript used for suggestion generation */
  recentContextChars: number;
  /** Characters of full transcript used for chat/expand calls */
  fullContextChars: number;
  /** Seconds between auto-refresh cycles */
  refreshInterval: number;
}

export interface ExportData {
  exportedAt: string;
  transcript: Array<{ timestamp: string; text: string }>;
  suggestionBatches: Array<{
    timestamp: string;
    suggestions: Array<{ type: string; preview: string; detail: string }>;
  }>;
  chat: Array<{ timestamp: string; role: string; content: string }>;
}
