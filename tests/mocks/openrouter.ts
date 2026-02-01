/**
 * OpenRouter API mock factory for testing LLM services.
 */
import { vi } from "vitest";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterChoice {
  index: number;
  message: OpenRouterMessage;
  finish_reason: "stop" | "length" | "content_filter" | null;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Creates a valid OpenRouter API response
 */
export function createMockOpenRouterResponse(options?: {
  content?: string;
  model?: string;
  finishReason?: OpenRouterChoice["finish_reason"];
}): OpenRouterResponse {
  return {
    id: "gen-test-123",
    model: options?.model ?? "openai/gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: options?.content ?? "This is a test response from the LLM.",
        },
        finish_reason: options?.finishReason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

/**
 * Creates an OpenRouter error response
 */
export function createMockOpenRouterError(options?: {
  message?: string;
  type?: string;
  code?: string;
}): OpenRouterErrorResponse {
  return {
    error: {
      message: options?.message ?? "An error occurred",
      type: options?.type ?? "invalid_request_error",
      code: options?.code ?? "invalid_api_key",
    },
  };
}

/**
 * Creates a mock fetch function that simulates OpenRouter API responses
 */
export function createMockFetch(options?: {
  response?: OpenRouterResponse | OpenRouterErrorResponse;
  status?: number;
  shouldTimeout?: boolean;
  shouldNetworkError?: boolean;
}) {
  return vi.fn().mockImplementation((url: string, _init?: RequestInit) => {
    // Handle network error
    if (options?.shouldNetworkError) {
      return Promise.reject(new Error("Network error"));
    }

    // Handle timeout
    if (options?.shouldTimeout) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 100);
      });
    }

    const status = options?.status ?? 200;
    const response = options?.response ?? createMockOpenRouterResponse();

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      url,
    });
  });
}

/**
 * Creates mock for API key validation endpoint
 */
export function createMockApiKeyValidationFetch(options?: {
  isValid?: boolean;
  hasQuota?: boolean;
  shouldFail?: boolean;
}) {
  const isValid = options?.isValid ?? true;
  const hasQuota = options?.hasQuota ?? true;

  if (options?.shouldFail) {
    return createMockFetch({ shouldNetworkError: true });
  }

  if (!isValid) {
    return createMockFetch({
      status: 401,
      response: createMockOpenRouterError({ code: "invalid_api_key", message: "Invalid API key" }),
    });
  }

  if (!hasQuota) {
    return createMockFetch({
      status: 402,
      response: createMockOpenRouterError({ code: "insufficient_quota", message: "Quota exhausted" }),
    });
  }

  return createMockFetch({
    status: 200,
    response: createMockOpenRouterResponse({ content: "API key is valid" }),
  });
}

/**
 * Creates mock for transcription API
 */
export function createMockTranscriptionFetch(options?: { transcript?: string; shouldFail?: boolean }) {
  if (options?.shouldFail) {
    return createMockFetch({
      status: 500,
      response: createMockOpenRouterError({ message: "Transcription failed" }),
    });
  }

  return createMockFetch({
    response: createMockOpenRouterResponse({
      content: options?.transcript ?? "This is the transcribed audio content.",
    }),
  });
}
