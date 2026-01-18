import { z } from "zod";

/**
 * Query parameters for listing sections.
 */
export const listSectionsQuerySchema = z.object({
  sort: z.enum(["position", "title", "created_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Request body for creating a new section.
 */
export const sectionCreateSchema = z.object({
  title: z.string().min(1, "SECTION TITLE REQUIRED").max(100, "SECTION TITLE TOO LONG"),
  position: z.number().int().min(0).optional(),
});

/**
 * Request body for updating a section.
 * At least one field must be provided.
 */
export const sectionUpdateSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => data.title !== undefined || data.position !== undefined, {
    message: "INVALID UPDATE DATA",
  });

/**
 * UUID path parameter validation.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID SECTION ID"),
});

/**
 * Single item in reorder request.
 */
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

/**
 * Request body for reordering sections.
 */
export const sectionsReorderSchema = z.object({
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

export type ListSectionsQuery = z.infer<typeof listSectionsQuerySchema>;
export type SectionCreateInput = z.infer<typeof sectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>;
export type SectionsReorderInput = z.infer<typeof sectionsReorderSchema>;
