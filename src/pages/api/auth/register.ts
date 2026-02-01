import type { APIContext } from "astro";
import { registerSchema } from "@/lib/schemas/auth.schema";
import { register } from "@/lib/services/auth.service";
import { ValidationError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const code = firstError.path[0] === "email" ? "invalid_email" : "weak_password";
      throw new ValidationError(code, firstError.message);
    }

    // Build redirect URL for email verification
    const origin = new URL(context.request.url).origin;
    const emailRedirectTo = `${origin}/api/auth/callback`;

    const result = await register(
      context.locals.supabase,
      validation.data.email,
      validation.data.password,
      emailRedirectTo
    );

    return jsonResponse(result, 201);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
