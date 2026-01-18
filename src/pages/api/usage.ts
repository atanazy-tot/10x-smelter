import type { APIContext } from "astro";
import { getUsage } from "@/lib/services/usage.service";
import { toAppError, jsonResponse } from "@/lib/utils/errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    const userId = user?.id ?? null;

    const clientIp =
      context.request.headers.get("x-forwarded-for")?.split(",")[0] ??
      context.request.headers.get("x-real-ip") ??
      "unknown";

    const usage = await getUsage(context.locals.supabase, userId, clientIp);

    return jsonResponse(usage);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
