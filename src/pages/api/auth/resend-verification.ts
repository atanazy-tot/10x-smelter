import type { APIContext } from "astro";
import { resendVerificationSchema } from "@/lib/schemas/auth.schema";
import { resendVerification } from "@/lib/services/auth.service";
import { ValidationError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = resendVerificationSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      throw new ValidationError("invalid_email", firstError.message);
    }

    // Build redirect URL for email verification
    const origin = new URL(context.request.url).origin;
    const redirectTo = `${origin}/api/auth/callback`;

    await resendVerification(context.locals.supabase, validation.data.email, redirectTo);

    // Always return success to prevent email enumeration
    return jsonResponse({ message: "IF EMAIL EXISTS, VERIFICATION LINK SENT. CHECK YOUR INBOX" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
