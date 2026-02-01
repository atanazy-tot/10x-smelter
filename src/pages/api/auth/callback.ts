import type { APIContext } from "astro";
import { exchangeCodeForSession } from "@/lib/services/auth.service";
import { toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

/**
 * OAuth/Email callback handler.
 * Handles email verification and password reset links from Supabase.
 *
 * Query params:
 * - code: PKCE code to exchange for session
 * - type: Optional hint about the callback type (recovery, signup)
 * - next: Optional URL to redirect to after success
 */
export async function GET(context: APIContext) {
  try {
    const url = new URL(context.request.url);
    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");
    const next = url.searchParams.get("next") ?? "/";

    if (!code) {
      // No code - redirect to home
      return context.redirect("/");
    }

    // Exchange code for session
    const result = await exchangeCodeForSession(context.locals.supabase, code);

    // Determine redirect based on callback type
    if (type === "recovery" || result.type === "recovery") {
      // Password reset - redirect to update password page
      return context.redirect("/auth/update-password");
    }

    // Email verification or login - redirect to requested page or home
    return context.redirect(next);
  } catch (error) {
    const appError = toAppError(error);

    // Redirect to auth page with error
    const errorUrl = new URL("/auth", context.request.url);
    errorUrl.searchParams.set("error", appError.code);
    errorUrl.searchParams.set("message", appError.message);

    return context.redirect(errorUrl.toString());
  }
}
