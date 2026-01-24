/**
 * OpenRouter API client with retry logic and exponential backoff.
 * Supports both text and multimodal (audio transcription) messages.
 */

import type {
  Message,
  OpenRouterRequest,
  OpenRouterResponse,
  OpenRouterError,
  CompletionOptions,
  CompletionResult,
} from "./types";
import { LLMTimeoutError, LLMRateLimitError, LLMAPIError } from "@/lib/utils/errors";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default models
const DEFAULT_TEXT_MODEL = "anthropic/claude-3.5-sonnet";
const DEFAULT_TRANSCRIPTION_MODEL = "google/gemini-2.5-pro-preview";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const REQUEST_TIMEOUT_MS = 120000; // 2 minutes for long transcriptions

/**
 * Sleeps for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter.
 */
function getRetryDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
  }
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Gets the API key to use for requests.
 * Prefers user's key if provided, otherwise uses system key.
 */
function getApiKey(userApiKey?: string): string {
  if (userApiKey) {
    return userApiKey;
  }
  const systemKey = import.meta.env.OPENROUTER_API_KEY;
  if (!systemKey) {
    throw new LLMAPIError("OPENROUTER API KEY NOT CONFIGURED");
  }
  return systemKey;
}

/**
 * Parses the Retry-After header value.
 */
function parseRetryAfter(response: Response): number | undefined {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return undefined;

  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Handle date format
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }

  return undefined;
}

/**
 * Makes a request to OpenRouter API with retry logic.
 */
async function makeRequest(
  request: OpenRouterRequest,
  apiKey: string,
  timeout: number = REQUEST_TIMEOUT_MS
): Promise<OpenRouterResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://smelt.app",
          "X-Title": "SMELT",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as OpenRouterResponse;
        return data;
      }

      // Handle rate limiting with retry
      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response);
        if (attempt < MAX_RETRIES) {
          const delay = getRetryDelay(attempt, retryAfter);
          console.log(`[OpenRouter] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }
        throw new LLMRateLimitError(retryAfter);
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        console.log(`[OpenRouter] Server error ${response.status}, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // Parse error response
      const errorData = (await response.json().catch(() => ({}))) as Partial<OpenRouterError>;
      const errorMessage = errorData.error?.message ?? `API request failed with status ${response.status}`;

      throw new LLMAPIError(errorMessage);
    } catch (error) {
      if (error instanceof LLMTimeoutError || error instanceof LLMRateLimitError || error instanceof LLMAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new LLMTimeoutError();
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        console.log(`[OpenRouter] Network error, retrying in ${delay}ms: ${lastError.message}`);
        await sleep(delay);
        continue;
      }
    }
  }

  throw new LLMAPIError(lastError?.message ?? "REQUEST FAILED AFTER RETRIES");
}

/**
 * Creates a text completion using OpenRouter.
 */
export async function createCompletion(
  messages: Message[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const apiKey = getApiKey(options.apiKey);
  const model = options.model ?? DEFAULT_TEXT_MODEL;

  const request: OpenRouterRequest = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };

  const response = await makeRequest(request, apiKey);

  const choice = response.choices[0];
  if (!choice) {
    throw new LLMAPIError("NO RESPONSE FROM MODEL");
  }

  return {
    content: choice.message.content,
    model: response.model,
    usage: response.usage,
  };
}

/**
 * Transcribes audio using a multimodal model (Gemini).
 * Expects base64-encoded audio data.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const apiKey = getApiKey(options.apiKey);
  const model = options.model ?? DEFAULT_TRANSCRIPTION_MODEL;

  const messages: Message[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Transcribe this audio recording. Output ONLY the transcript text, with no additional commentary, labels, or formatting. Preserve the speaker's words exactly as spoken, including filler words, corrections, and natural speech patterns. If there are multiple speakers, indicate speaker changes with a simple line break.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${audioBase64}`,
          },
        },
      ],
    },
  ];

  const request: OpenRouterRequest = {
    model,
    messages,
    temperature: 0.1, // Low temperature for accurate transcription
    max_tokens: 16384, // Long transcriptions
  };

  // Longer timeout for audio processing
  const response = await makeRequest(request, apiKey, 180000);

  const choice = response.choices[0];
  if (!choice) {
    throw new LLMAPIError("NO TRANSCRIPTION RESPONSE");
  }

  return {
    content: choice.message.content,
    model: response.model,
    usage: response.usage,
  };
}

/**
 * Gets the default model for text completions.
 */
export function getDefaultTextModel(): string {
  return DEFAULT_TEXT_MODEL;
}

/**
 * Gets the default model for transcription.
 */
export function getDefaultTranscriptionModel(): string {
  return DEFAULT_TRANSCRIPTION_MODEL;
}
