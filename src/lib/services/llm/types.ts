/**
 * Types for LLM service interactions with OpenRouter API.
 */

/**
 * Text content part in a message
 */
export interface TextContentPart {
  type: "text";
  text: string;
}

/**
 * Image content part (base64-encoded)
 */
export interface ImageContentPart {
  type: "image_url";
  image_url: {
    url: string; // data:mime/type;base64,{data}
  };
}

/**
 * Union type for multimodal content parts
 */
export type ContentPart = TextContentPart | ImageContentPart;

/**
 * Message with text-only content
 */
export interface TextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Message with multimodal content (text + images/audio)
 */
export interface MultimodalMessage {
  role: "user" | "assistant";
  content: ContentPart[];
}

/**
 * Union type for all message types
 */
export type Message = TextMessage | MultimodalMessage;

/**
 * OpenRouter API request body
 */
export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

/**
 * OpenRouter API response choice
 */
export interface OpenRouterChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
  };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

/**
 * OpenRouter API usage statistics
 */
export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * OpenRouter API response body
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

/**
 * OpenRouter API error response
 */
export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string | number | null;
  };
}

/**
 * Options for LLM completion requests
 */
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string; // User's API key, falls back to system key
}

/**
 * Result of a successful LLM completion
 */
export interface CompletionResult {
  content: string;
  model: string;
  usage?: OpenRouterUsage;
}
