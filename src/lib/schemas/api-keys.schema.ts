import { z } from "zod";

// OpenAI/OpenRouter API key format: sk-... or sk-proj-...
const OPENAI_KEY_REGEX = /^sk-(?:proj-)?[a-zA-Z0-9]{20,}$/;

export const apiKeyCreateSchema = z.object({
  api_key: z.string().min(1, "API KEY REQUIRED").regex(OPENAI_KEY_REGEX, "INVALID API KEY FORMAT"),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
