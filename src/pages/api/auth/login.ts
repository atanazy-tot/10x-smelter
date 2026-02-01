import type { APIContext } from "astro";
import { loginSchema } from "@/lib/schemas/auth.schema";
import { login } from "@/lib/services/auth.service";
import { ValidationError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const code = firstError.path[0] === "email" ? "invalid_email" : "invalid_password";
      throw new ValidationError(code, firstError.message);
    }

    const result = await login(context.locals.supabase, validation.data.email, validation.data.password);

    // Session cookies are automatically set by Supabase SSR via middleware
    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
