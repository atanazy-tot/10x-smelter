import type { APIContext } from "astro";
import { listSectionsQuerySchema, sectionCreateSchema } from "@/lib/schemas/prompt-sections.schema";
import { listSections, createSection } from "@/lib/services/prompt-sections.service";
import { SectionValidationError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/prompt-section-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const url = new URL(context.request.url);
    const queryParams = {
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
    };

    const validation = listSectionsQuerySchema.safeParse(queryParams);
    const query = validation.success ? validation.data : { sort: "position" as const, order: "asc" as const };

    const result = await listSections(context.locals.supabase, user.id, query);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await context.request.json();
    const validation = sectionCreateSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message ?? "SECTION TITLE REQUIRED";
      throw new SectionValidationError("missing_title", errorMessage);
    }

    const result = await createSection(context.locals.supabase, user.id, validation.data);

    return jsonResponse(result, 201);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
