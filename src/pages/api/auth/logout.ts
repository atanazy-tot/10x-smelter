import type { APIContext } from "astro";
import { logout } from "@/lib/services/auth.service";
import { UnauthorizedError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // Check if user is authenticated using the new middleware locals
    if (!context.locals.isAuthenticated || !context.locals.user) {
      throw new UnauthorizedError("NOT LOGGED IN");
    }

    await logout(context.locals.supabase);

    // Session cookies are automatically cleared by Supabase SSR
    return jsonResponse({ message: "LOGGED OUT" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
