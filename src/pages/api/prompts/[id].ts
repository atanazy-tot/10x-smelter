import type { APIContext } from "astro";
import { uuidParamSchema, promptUpdateSchema } from "@/lib/schemas/prompts.schema";
import { getPrompt, updatePrompt, deletePrompt } from "@/lib/services/prompts.service";
import {
  PromptNotFoundError,
  PromptValidationError,
  jsonResponse,
  toAppError,
  UnauthorizedError,
} from "@/lib/utils/prompt-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) throw new PromptNotFoundError();

    const result = await getPrompt(context.locals.supabase, user.id, paramValidation.data.id);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}

export async function PATCH(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) throw new PromptNotFoundError();

    const body = await context.request.json();
    const validation = promptUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const message = firstError?.message ?? "INVALID DATA";
      const code = message.includes("4,000") ? "body_too_long" : "invalid_data";
      throw new PromptValidationError(code, message);
    }

    const result = await updatePrompt(
      context.locals.supabase,
      user.id,
      paramValidation.data.id,
      validation.data
    );

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
    if (!paramValidation.success) throw new PromptNotFoundError();

    const result = await deletePrompt(context.locals.supabase, user.id, paramValidation.data.id);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
