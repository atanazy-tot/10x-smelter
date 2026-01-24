import { z } from "zod";

// OpenRouter API key format: sk-or-v1-... (64 hex characters after prefix)
// Also supports OpenAI format: sk-... or sk-proj-...
// Keys must start with sk- and be at least 20 characters total
const API_KEY_REGEX = /^sk-.{16,}$/;

export const apiKeyCreateSchema = z.object({
  api_key: z.string().min(1, "API KEY REQUIRED").regex(API_KEY_REGEX, "INVALID API KEY FORMAT - MUST START WITH sk-"),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
