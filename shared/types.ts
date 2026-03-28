/**
 * Shared types between client and server.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMChatRequest {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMChatResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
  }>;
}
