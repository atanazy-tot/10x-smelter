import type { APIContext } from "astro";
import { logout } from "@/lib/services/auth.service";
import { errorResponse, jsonResponse } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = await context.locals.supabase.auth.getUser();

    if (!user) {
      return errorResponse({ status: 401, code: "unauthorized", message: "NOT LOGGED IN" });
    }

    await logout(context.locals.supabase);

    return jsonResponse({ message: "LOGGED OUT" });
  } catch {
    return errorResponse({
      status: 500,
      code: "internal_error",
      message: "SOMETHING WENT WRONG. TRY AGAIN",
    });
  }
}
