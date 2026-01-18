import type { APIContext } from "astro";
import { apiKeyCreateSchema } from "@/lib/schemas/api-keys.schema";
import { validateAndStoreApiKey, deleteApiKey } from "@/lib/services/api-keys.service";
import { ApiKeyInvalidFormatError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/api-key-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await context.request.json();
    const validation = apiKeyCreateSchema.safeParse(body);

    if (!validation.success) throw new ApiKeyInvalidFormatError();

    const result = await validateAndStoreApiKey(context.locals.supabase, user.id, validation.data.api_key);

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

    const result = await deleteApiKey(context.locals.supabase, user.id);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
