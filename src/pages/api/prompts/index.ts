import type { APIContext } from "astro";
import { listPromptsQuerySchema, promptCreateSchema } from "@/lib/schemas/prompts.schema";
import { listPrompts, createPrompt } from "@/lib/services/prompts.service";
import { PromptValidationError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/prompt-errors";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const url = new URL(context.request.url);
    const queryParams = {
      section_id: url.searchParams.get("section_id") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validation = listPromptsQuerySchema.safeParse(queryParams);
    const query = validation.success
      ? validation.data
      : { sort: "position" as const, order: "asc" as const, page: 1, limit: 50 };

    const result = await listPrompts(context.locals.supabase, user.id, query);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await context.request.json();
    const validation = promptCreateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const field = firstError?.path[0];
      const zodMessage = firstError?.message ?? "INVALID DATA";

      let code = "invalid_data";
      let message = zodMessage;

      if (field === "title") {
        const isMissing = zodMessage === "Required" || zodMessage.includes("REQUIRED");
        code = isMissing ? "missing_title" : "invalid_title";
        message = isMissing ? "PROMPT TITLE REQUIRED" : zodMessage;
      } else if (field === "body") {
        const isMissing = zodMessage === "Required" || zodMessage.includes("REQUIRED");
        code = isMissing ? "missing_body" : "body_too_long";
        message = isMissing ? "PROMPT CONTENT REQUIRED" : zodMessage;
      }

      throw new PromptValidationError(code, message);
    }

    const result = await createPrompt(context.locals.supabase, user.id, validation.data);

    return jsonResponse(result, 201);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
