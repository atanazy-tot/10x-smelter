import type { APIContext } from "astro";
import { getApiKeyStatus } from "@/lib/services/api-keys.service";
import { jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/api-key-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const status = await getApiKeyStatus(context.locals.supabase, user.id);

    return jsonResponse(status);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
