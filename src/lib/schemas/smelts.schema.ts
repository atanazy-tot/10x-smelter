/**
 * Zod validation schemas for Smelts API.
 * Uses database enums from Constants for type safety.
 */

import { z } from "zod";
import { Constants } from "@/db/database.types";
import { SmeltFileTooLargeError, SmeltInvalidFormatError } from "@/lib/utils/smelt-errors";

// =============================================================================
// Constants
// =============================================================================

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_FILES = 5;
export const MAX_TEXT_LENGTH = 50000;

const VALID_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a"];
const VALID_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

// =============================================================================
// Enum Schemas (from database)
// =============================================================================

export const defaultPromptNameSchema = z.enum(Constants.public.Enums.default_prompt_name as [string, ...string[]]);

export const smeltModeSchema = z.enum(Constants.public.Enums.smelt_mode as [string, ...string[]]);

export const smeltStatusFilterSchema = z.enum(["pending", "completed", "failed"]);

// =============================================================================
// Create Smelt Schema
// =============================================================================

export const smeltCreateSchema = z.object({
  text: z.string().max(MAX_TEXT_LENGTH, "TEXT TOO LONG. MAX 50000 CHARS").optional(),
  mode: smeltModeSchema.default("separate"),
  default_prompt_names: z.array(defaultPromptNameSchema).optional(),
  user_prompt_id: z.string().uuid("INVALID PROMPT ID").nullable().optional(),
});

export type SmeltCreateInput = z.infer<typeof smeltCreateSchema>;

// =============================================================================
// List Smelts Query Schema
// =============================================================================

export const listSmeltsQuerySchema = z.object({
  status: smeltStatusFilterSchema.optional(),
  sort: z.enum(["created_at", "completed_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListSmeltsQuery = z.infer<typeof listSmeltsQuerySchema>;

// =============================================================================
// UUID Param Schema
// =============================================================================

export const smeltIdParamSchema = z.object({
  id: z.string().uuid("INVALID SMELT ID"),
});

// =============================================================================
// File Validation Helper
// =============================================================================

/**
 * Validates an audio file for smelt processing.
 * Throws on invalid file format or size exceeding limit.
 *
 * @param file - The File object to validate
 * @throws SmeltInvalidFormatError if file format is not supported
 * @throws SmeltFileTooLargeError if file exceeds 25MB
 */
export function validateAudioFile(file: File): void {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeValid = VALID_AUDIO_TYPES.includes(file.type.toLowerCase());
  const extValid = VALID_AUDIO_EXTENSIONS.includes(ext);

  if (!mimeValid && !extValid) {
    throw new SmeltInvalidFormatError();
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new SmeltFileTooLargeError(sizeMB);
  }
}

// =============================================================================
// Exports
// =============================================================================

export { VALID_AUDIO_EXTENSIONS, VALID_AUDIO_TYPES };
