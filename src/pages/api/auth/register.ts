import type { APIContext } from "astro";
import { authCredentialsSchema } from "@/lib/schemas/auth.schema";
import { register } from "@/lib/services/auth.service";
import { mapSupabaseAuthError, errorResponse, jsonResponse } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = authCredentialsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const code = firstError.path[0] === "email" ? "invalid_email" : "weak_password";
      return errorResponse({ status: 400, code, message: firstError.message });
    }

    const result = await register(context.locals.supabase, validation.data.email, validation.data.password);

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(mapSupabaseAuthError(error));
  }
}
