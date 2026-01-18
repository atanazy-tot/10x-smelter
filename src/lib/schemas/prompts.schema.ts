import { z } from "zod";

/**
 * Query parameters for listing prompts.
 * Supports filtering by section_id (UUID, "null" for unsectioned, or omit for all).
 */
export const listPromptsQuerySchema = z.object({
  section_id: z
    .string()
    .transform((val) => (val === "null" ? null : val))
    .pipe(z.string().uuid().nullable())
    .optional(),
  sort: z.enum(["position", "title", "created_at", "updated_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Request body for creating a new prompt.
 */
export const promptCreateSchema = z.object({
  title: z.string().min(1, "PROMPT TITLE REQUIRED").max(200, "PROMPT TITLE TOO LONG"),
  body: z.string().min(1, "PROMPT CONTENT REQUIRED").max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS"),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/**
 * Request body for updating a prompt.
 */
export const promptUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS").optional(),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/**
 * UUID path parameter validation.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID PROMPT ID"),
});

/**
 * Metadata for file upload (title and section_id from form data).
 */
export const promptUploadMetaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  section_id: z
    .string()
    .transform((val) => (val === "null" || val === "" ? null : val))
    .pipe(z.string().uuid().nullable())
    .optional(),
});

/**
 * Single item in reorder request.
 */
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

/**
 * Request body for reordering prompts within a section.
 */
export const promptsReorderSchema = z.object({
  section_id: z
    .union([z.string().uuid(), z.null()])
    .describe("Section to reorder within (null for unsectioned)"),
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;
export type PromptCreateInput = z.infer<typeof promptCreateSchema>;
export type PromptUpdateInput = z.infer<typeof promptUpdateSchema>;
export type PromptUploadMeta = z.infer<typeof promptUploadMetaSchema>;
export type PromptsReorderInput = z.infer<typeof promptsReorderSchema>;
