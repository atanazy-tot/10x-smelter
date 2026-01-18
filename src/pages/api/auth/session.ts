import type { APIContext } from "astro";
import { getSession } from "@/lib/services/auth.service";
import { jsonResponse, toAppError } from "@/lib/utils/auth-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const clientIp =
      context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      context.request.headers.get("x-real-ip") ??
      "unknown";

    const session = await getSession(context.locals.supabase, clientIp, context.locals.accessToken);

    return jsonResponse(session);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
