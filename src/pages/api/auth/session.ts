import type { APIContext } from "astro";
import { getSession } from "@/lib/services/auth.service";
import { errorResponse, jsonResponse } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const clientIp =
      context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      context.request.headers.get("x-real-ip") ??
      "unknown";

    const session = await getSession(context.locals.supabase, clientIp, context.locals.accessToken);

    return jsonResponse(session);
  } catch {
    return errorResponse({
      status: 500,
      code: "internal_error",
      message: "SOMETHING WENT WRONG. TRY AGAIN",
    });
  }
}
