import type { APIContext } from "astro";
import { resetPasswordSchema } from "@/lib/schemas/auth.schema";
import { resetPassword } from "@/lib/services/auth.service";
import { ValidationError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      throw new ValidationError("invalid_email", firstError.message);
    }

    // Build redirect URL for password reset
    const origin = new URL(context.request.url).origin;
    const redirectTo = `${origin}/api/auth/callback?type=recovery`;

    await resetPassword(context.locals.supabase, validation.data.email, redirectTo);

    // Always return success to prevent email enumeration
    return jsonResponse({ message: "IF EMAIL EXISTS, RESET LINK SENT. CHECK YOUR INBOX" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
