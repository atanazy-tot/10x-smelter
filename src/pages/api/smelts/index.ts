import type { APIContext } from "astro";
import { smeltCreateSchema, validateAudioFile, listSmeltsQuerySchema, MAX_FILES } from "@/lib/schemas/smelts.schema";
import { createSmelt, listSmelts } from "@/lib/services/smelts.service";
import { SmeltValidationError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/smelt-errors";

export const prerender = false;

/**
 * POST /api/smelts
 * Creates a new smelt for audio/text processing.
 * Accepts multipart/form-data with files or text.
 */
export async function POST(context: APIContext) {
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

    const formData = await context.request.formData();

    // Extract files
    const files: File[] = [];
    for (const entry of formData.getAll("files[]")) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    // Validate file count early
    if (files.length > MAX_FILES) {
      throw new SmeltValidationError("too_many_files", "MAX 5 FILES ALLOWED");
    }

    // Validate each file (throws on error)
    for (const file of files) {
      validateAudioFile(file);
    }

    // Parse form fields (convert null to undefined for optional fields)
    const textValue = formData.get("text");
    const modeValue = formData.get("mode");
    const userPromptIdValue = formData.get("user_prompt_id");
    const defaultPromptNames = formData.getAll("default_prompt_names[]") as string[];

    const rawInput: Record<string, unknown> = {
      mode: typeof modeValue === "string" ? modeValue : undefined,
    };

    // Only include text if it's a non-empty string
    if (typeof textValue === "string" && textValue.trim()) {
      rawInput.text = textValue;
    }

    // Only include user_prompt_id if it's a valid string
    if (typeof userPromptIdValue === "string" && userPromptIdValue.trim()) {
      rawInput.user_prompt_id = userPromptIdValue;
    }

    // Only include default_prompt_names if array is not empty
    if (defaultPromptNames.length > 0) {
      rawInput.default_prompt_names = defaultPromptNames;
    }

    const validation = smeltCreateSchema.safeParse(rawInput);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      throw new SmeltValidationError("invalid_data", firstError.message);
    }

    const result = await createSmelt(context.locals.supabase, userId, files, validation.data, clientIp);

    return jsonResponse(result, 201);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}

/**
 * GET /api/smelts
 * Lists smelts for the authenticated user with pagination.
 */
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
      status: url.searchParams.get("status") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validation = listSmeltsQuerySchema.safeParse(queryParams);
    const query = validation.success
      ? validation.data
      : { sort: "created_at" as const, order: "desc" as const, page: 1, limit: 20 };

    const result = await listSmelts(context.locals.supabase, user.id, query);

    return jsonResponse(result);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
