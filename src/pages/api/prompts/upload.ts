import type { APIContext } from "astro";
import { promptUploadMetaSchema } from "@/lib/schemas/prompts.schema";
import { createPromptFromFile } from "@/lib/services/prompts.service";
import { FileRequiredError, jsonResponse, toAppError, UnauthorizedError } from "@/lib/utils/prompt-errors";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const {
      data: { user },
    } = context.locals.accessToken
      ? await context.locals.supabase.auth.getUser(context.locals.accessToken)
      : await context.locals.supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    // Parse form data safely - throws FileRequiredError if not multipart
    let formData: FormData;
    try {
      formData = await context.request.formData();
    } catch {
      throw new FileRequiredError();
    }

    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const sectionId = formData.get("section_id") as string | null;

    if (!file || !(file instanceof File) || file.size === 0) throw new FileRequiredError();

    // Parse and validate metadata
    const metaValidation = promptUploadMetaSchema.safeParse({
      title: title ?? undefined,
      section_id: sectionId ?? undefined,
    });

    const meta = metaValidation.success ? metaValidation.data : {};

    const result = await createPromptFromFile(context.locals.supabase, user.id, file, meta);

    return jsonResponse(result, 201);
  } catch (error) {
    return toAppError(error).toResponse();
  }
}
