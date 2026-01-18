import type { SupabaseClient } from "@/db/supabase.client";
import type { PromptDTO, PromptsListDTO, PromptDeleteResponseDTO, ReorderResponseDTO } from "@/types";
import type {
  ListPromptsQuery,
  PromptCreateInput,
  PromptUpdateInput,
  PromptUploadMeta,
  PromptsReorderInput,
} from "@/lib/schemas/prompts.schema";
import {
  AppError,
  InternalError,
  PromptNotFoundError,
  PromptsNotFoundError,
  SectionNotFoundError,
  InvalidFileFormatError,
  FileTooLargeError,
  ContentTooLongError,
} from "@/lib/utils/prompt-errors";

const MAX_FILE_SIZE = 10 * 1024; // 10KB
const MAX_BODY_LENGTH = 4000;

/**
 * Maps a database prompt row to PromptDTO.
 */
function toPromptDTO(row: {
  id: string;
  title: string;
  body: string;
  section_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}): PromptDTO {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    section_id: row.section_id,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Gets the next position for a prompt in a section.
 */
async function getNextPosition(
  supabase: SupabaseClient,
  userId: string,
  sectionId: string | null
): Promise<number> {
  let query = supabase.from("prompts").select("position").eq("user_id", userId);

  if (sectionId === null) {
    query = query.is("section_id", null);
  } else {
    query = query.eq("section_id", sectionId);
  }

  const { data } = await query.order("position", { ascending: false }).limit(1).maybeSingle();

  return (data?.position ?? -1) + 1;
}

/**
 * Verifies that a section exists and belongs to the user.
 */
async function verifySectionOwnership(
  supabase: SupabaseClient,
  userId: string,
  sectionId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("prompt_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new SectionNotFoundError();
}

/**
 * Lists prompts for a user with pagination and filtering.
 */
export async function listPrompts(
  supabase: SupabaseClient,
  userId: string,
  query: ListPromptsQuery
): Promise<PromptsListDTO> {
  try {
    const { section_id, sort, order, page, limit } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from("prompts")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // Filter by section if specified
    if (section_id !== undefined) {
      if (section_id === null) {
        queryBuilder = queryBuilder.is("section_id", null);
      } else {
        queryBuilder = queryBuilder.eq("section_id", section_id);
      }
    }

    const { data, error, count } = await queryBuilder
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const prompts = (data ?? []).map(toPromptDTO);
    const total = count ?? 0;
    const total_pages = Math.ceil(total / limit);

    return {
      prompts,
      pagination: { page, limit, total, total_pages },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("List prompts error:", error);
    throw new InternalError();
  }
}

/**
 * Gets a single prompt by ID.
 */
export async function getPrompt(
  supabase: SupabaseClient,
  userId: string,
  promptId: string
): Promise<PromptDTO> {
  try {
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new PromptNotFoundError();

    return toPromptDTO(data);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Get prompt error:", error);
    throw new InternalError();
  }
}

/**
 * Creates a new prompt for a user.
 */
export async function createPrompt(
  supabase: SupabaseClient,
  userId: string,
  input: PromptCreateInput
): Promise<PromptDTO> {
  try {
    // Verify section ownership if provided
    if (input.section_id) {
      await verifySectionOwnership(supabase, userId, input.section_id);
    }

    // Auto-assign position if not provided
    const position = input.position ?? (await getNextPosition(supabase, userId, input.section_id ?? null));

    const { data, error } = await supabase
      .from("prompts")
      .insert({
        user_id: userId,
        title: input.title,
        body: input.body,
        section_id: input.section_id ?? null,
        position,
      })
      .select()
      .single();

    if (error) throw error;

    return toPromptDTO(data);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Create prompt error:", error);
    throw new InternalError();
  }
}

/**
 * Updates an existing prompt.
 */
export async function updatePrompt(
  supabase: SupabaseClient,
  userId: string,
  promptId: string,
  input: PromptUpdateInput
): Promise<PromptDTO> {
  try {
    // Verify prompt ownership
    const { data: existing, error: fetchError } = await supabase
      .from("prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new PromptNotFoundError();

    // Verify new section ownership if changing to a new section
    if (input.section_id !== undefined && input.section_id !== null) {
      await verifySectionOwnership(supabase, userId, input.section_id);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.section_id !== undefined) updateData.section_id = input.section_id;
    if (input.position !== undefined) updateData.position = input.position;

    const { data, error } = await supabase
      .from("prompts")
      .update(updateData)
      .eq("id", promptId)
      .select()
      .single();

    if (error) throw error;

    return toPromptDTO(data);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Update prompt error:", error);
    throw new InternalError();
  }
}

/**
 * Deletes a prompt.
 */
export async function deletePrompt(
  supabase: SupabaseClient,
  userId: string,
  promptId: string
): Promise<PromptDeleteResponseDTO> {
  try {
    // Verify prompt ownership
    const { data: existing, error: fetchError } = await supabase
      .from("prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new PromptNotFoundError();

    const { error } = await supabase.from("prompts").delete().eq("id", promptId);

    if (error) throw error;

    return { message: "PROMPT DELETED" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Delete prompt error:", error);
    throw new InternalError();
  }
}

/**
 * Creates a prompt from an uploaded .md file.
 */
export async function createPromptFromFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  meta: PromptUploadMeta
): Promise<PromptDTO> {
  try {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".md")) {
      throw new InvalidFileFormatError();
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError();
    }

    // Read file content
    const content = await file.text();

    // Validate content length
    if (content.length > MAX_BODY_LENGTH) {
      throw new ContentTooLongError();
    }

    // Determine title (use provided or filename without extension)
    const title = meta.title ?? file.name.replace(/\.md$/i, "");

    // Create prompt
    return createPrompt(supabase, userId, {
      title,
      body: content,
      section_id: meta.section_id,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Create prompt from file error:", error);
    throw new InternalError();
  }
}

/**
 * Reorders prompts within a section using batch RPC.
 */
export async function reorderPrompts(
  supabase: SupabaseClient,
  userId: string,
  input: PromptsReorderInput
): Promise<ReorderResponseDTO> {
  try {
    const { section_id, order } = input;
    const promptIds = order.map((item) => item.id);

    // Verify all prompts exist, belong to user, and are in the specified section
    let queryBuilder = supabase
      .from("prompts")
      .select("id")
      .eq("user_id", userId)
      .in("id", promptIds);

    if (section_id === null) {
      queryBuilder = queryBuilder.is("section_id", null);
    } else {
      queryBuilder = queryBuilder.eq("section_id", section_id);
    }

    const { data: existingPrompts, error: fetchError } = await queryBuilder;

    if (fetchError) throw fetchError;

    if ((existingPrompts?.length ?? 0) !== promptIds.length) {
      throw new PromptsNotFoundError();
    }

    // Use RPC for batch update
    const { data: updatedCount, error: rpcError } = await supabase.rpc("reorder_prompts", {
      p_user_id: userId,
      p_section_id: section_id,
      p_updates: order,
    });

    if (rpcError) throw rpcError;

    return {
      message: "PROMPTS REORDERED",
      updated_count: updatedCount ?? 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Reorder prompts error:", error);
    throw new InternalError();
  }
}
