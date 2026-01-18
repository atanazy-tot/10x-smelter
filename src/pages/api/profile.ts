import type { APIContext } from "astro";
import { getProfile } from "@/lib/services/profile.service";
import { errorResponse, jsonResponse } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
      error: authError,
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse({
        status: 401,
        code: "unauthorized",
        message: "LOGIN REQUIRED",
      });
    }

    const profile = await getProfile(context.locals.supabase, user.id);

    if (!profile) {
      return errorResponse({
        status: 404,
        code: "profile_not_found",
        message: "PROFILE NOT FOUND",
      });
    }

    return jsonResponse(profile);
  } catch {
    return errorResponse({
      status: 500,
      code: "internal_error",
      message: "SOMETHING WENT WRONG. TRY AGAIN",
    });
  }
}
