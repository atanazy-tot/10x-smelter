import type { APIContext } from "astro";
import { getProfile } from "@/lib/services/profile.service";
import { UnauthorizedError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const profile = await getProfile(context.locals.supabase, user.id);

    return jsonResponse(profile);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
