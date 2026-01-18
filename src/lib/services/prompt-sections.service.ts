import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromptSectionDTO,
  PromptSectionsListDTO,
  PromptSectionWithCountDTO,
  PromptSectionDeleteResponseDTO,
  ReorderResponseDTO,
} from "@/types";
import type {
  ListSectionsQuery,
  SectionCreateInput,
  SectionUpdateInput,
  SectionsReorderInput,
} from "@/lib/schemas/prompt-sections.schema";
import {
  AppError,
  InternalError,
  SectionNotFoundError,
  SectionsNotFoundError,
} from "@/lib/utils/prompt-section-errors";

/**
 * Lists all sections for a user with prompt counts.
 */
export async function listSections(
  supabase: SupabaseClient,
  userId: string,
  query: ListSectionsQuery
): Promise<PromptSectionsListDTO> {
  try {
    const { sort, order } = query;

    const { data, error } = await supabase
      .from("prompt_sections")
      .select(
        `
        id,
        title,
        position,
        created_at,
        updated_at,
        prompts(count)
      `
      )
      .eq("user_id", userId)
      .order(sort, { ascending: order === "asc" });

    if (error) throw error;

    const sections: PromptSectionWithCountDTO[] = (data ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      position: section.position,
      created_at: section.created_at,
      updated_at: section.updated_at,
      prompt_count: (section.prompts as { count: number }[])?.[0]?.count ?? 0,
    }));

    return { sections };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("List sections error:", error);
    throw new InternalError();
  }
}

/**
 * Creates a new section for a user.
 * Auto-assigns position if not provided.
 */
export async function createSection(
  supabase: SupabaseClient,
  userId: string,
  input: SectionCreateInput
): Promise<PromptSectionDTO> {
  try {
    let position = input.position;

    if (position === undefined) {
      const { data: maxPosData } = await supabase
        .from("prompt_sections")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      position = (maxPosData?.position ?? -1) + 1;
    }

    const { data, error } = await supabase
      .from("prompt_sections")
      .insert({
        user_id: userId,
        title: input.title,
        position,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Create section error:", error);
    throw new InternalError();
  }
}

/**
 * Updates an existing section.
 */
export async function updateSection(
  supabase: SupabaseClient,
  userId: string,
  sectionId: string,
  input: SectionUpdateInput
): Promise<PromptSectionDTO> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("prompt_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new SectionNotFoundError();

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.position !== undefined) updateData.position = input.position;

    const { data, error } = await supabase
      .from("prompt_sections")
      .update(updateData)
      .eq("id", sectionId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Update section error:", error);
    throw new InternalError();
  }
}

/**
 * Deletes a section and moves its prompts to unsectioned.
 */
export async function deleteSection(
  supabase: SupabaseClient,
  userId: string,
  sectionId: string
): Promise<PromptSectionDeleteResponseDTO> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("prompt_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new SectionNotFoundError();

    const { count: promptsCount } = await supabase
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId);

    await supabase.from("prompts").update({ section_id: null }).eq("section_id", sectionId);

    const { error } = await supabase.from("prompt_sections").delete().eq("id", sectionId);

    if (error) throw error;

    return {
      message: "SECTION DELETED",
      prompts_moved: promptsCount ?? 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Delete section error:", error);
    throw new InternalError();
  }
}

/**
 * Reorders sections using batch RPC.
 */
export async function reorderSections(
  supabase: SupabaseClient,
  userId: string,
  input: SectionsReorderInput
): Promise<ReorderResponseDTO> {
  try {
    const { order } = input;
    const sectionIds = order.map((item) => item.id);

    const { data: existingSections, error: fetchError } = await supabase
      .from("prompt_sections")
      .select("id")
      .eq("user_id", userId)
      .in("id", sectionIds);

    if (fetchError) throw fetchError;

    if ((existingSections?.length ?? 0) !== sectionIds.length) {
      throw new SectionsNotFoundError();
    }

    const { data: updatedCount, error: rpcError } = await supabase.rpc("reorder_sections", {
      p_user_id: userId,
      p_updates: order,
    });

    if (rpcError) throw rpcError;

    return {
      message: "SECTIONS REORDERED",
      updated_count: updatedCount ?? 0,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Reorder sections error:", error);
    throw new InternalError();
  }
}
