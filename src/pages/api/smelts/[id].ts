import type { APIContext } from "astro";
import { smeltIdParamSchema } from "@/lib/schemas/smelts.schema";
import { getSmelt } from "@/lib/services/smelts.service";
import { SmeltNotFoundError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/smelt-errors";

export const prerender = false;

/**
 * GET /api/smelts/:id
 * Gets a single smelt by ID with all associated files.
 * Returns different shapes based on smelt status.
 */
export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const paramValidation = smeltIdParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) {
      throw new SmeltNotFoundError();
    }

    const result = await getSmelt(context.locals.supabase, user.id, paramValidation.data.id);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
