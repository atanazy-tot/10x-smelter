import type { APIContext } from "astro";
import { updatePasswordSchema } from "@/lib/schemas/auth.schema";
import { updatePassword } from "@/lib/services/auth.service";
import { ValidationError, UnauthorizedError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // Require authentication
    if (!context.locals.isAuthenticated || !context.locals.user) {
      throw new UnauthorizedError("LOGIN REQUIRED TO UPDATE PASSWORD");
    }

    const body = await context.request.json();
    const validation = updatePasswordSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      throw new ValidationError("weak_password", firstError.message);
    }

    await updatePassword(context.locals.supabase, validation.data.password);

    return jsonResponse({ message: "PASSWORD UPDATED" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
