import type { APIContext } from "astro";
import { sectionUpdateSchema, uuidParamSchema } from "@/lib/schemas/prompt-sections.schema";
import { updateSection, deleteSection } from "@/lib/services/prompt-sections.service";
import {
  InvalidUpdateDataError,
  SectionNotFoundError,
  jsonResponse,
  toAppError,
  UnauthorizedError,
} from "@/lib/utils/prompt-section-errors";

export const prerender = false;

export async function PATCH(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) throw new SectionNotFoundError();

    const body = await context.request.json();
    const validation = sectionUpdateSchema.safeParse(body);

    if (!validation.success) throw new InvalidUpdateDataError();

    const result = await updateSection(context.locals.supabase, user.id, paramValidation.data.id, validation.data);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}

export async function DELETE(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) throw new SectionNotFoundError();

    const result = await deleteSection(context.locals.supabase, user.id, paramValidation.data.id);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
