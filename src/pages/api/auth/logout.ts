import type { APIContext } from "astro";
import { logout } from "@/lib/services/auth.service";
import { UnauthorizedError, jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError("NOT LOGGED IN");

    await logout(context.locals.supabase);

    return jsonResponse({ message: "LOGGED OUT" });
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
