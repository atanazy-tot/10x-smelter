import type { APIContext } from "astro";
import { refreshSession } from "@/lib/services/auth.service";
import { jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

/**
 * Silent token refresh endpoint.
 * Called by the frontend to extend the session before expiry.
 * Session cookies are automatically updated by Supabase SSR.
 */
export async function POST(context: APIContext) {
  try {
    await refreshSession(context.locals.supabase);
    return jsonResponse({ message: "SESSION REFRESHED" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
