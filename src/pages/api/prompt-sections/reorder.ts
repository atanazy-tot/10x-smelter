import type { APIContext } from "astro";
import { sectionsReorderSchema } from "@/lib/schemas/prompt-sections.schema";
import { reorderSections } from "@/lib/services/prompt-sections.service";
import { InvalidOrderDataError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/prompt-section-errors";

export const prerender = false;

export async function PATCH(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await context.request.json();
    const validation = sectionsReorderSchema.safeParse(body);

    if (!validation.success) throw new InvalidOrderDataError();

    const result = await reorderSections(context.locals.supabase, user.id, validation.data);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
