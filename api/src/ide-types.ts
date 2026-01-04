/**
 * IDE API Types
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface IdeGenerateRequest {
  currentProse: string;
  history: Message[];
  prompt: string;
}

export interface IdeGenerateError {
  error: string;
  code?: string;
}
