/**
 * Prompt loader service.
 * Loads predefined prompts from the database and custom prompts from the prompts table.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { DefaultPromptName } from "@/types";
import { NotFoundError, InternalError } from "@/lib/utils/errors";

// Cache for predefined prompts (keyed by prompt name)
const promptCache = new Map<DefaultPromptName, { title: string; body: string }>();

/**
 * Display names for prompts (for UI/logging).
 * These are also stored in the database, but kept here for backwards compatibility.
 */
export const PROMPT_DISPLAY_NAMES: Record<DefaultPromptName, string> = {
  summarize: "Summary",
  action_items: "Action Items",
  detailed_notes: "Detailed Notes",
  qa_format: "Q&A Format",
  table_of_contents: "Table of Contents",
};

/**
 * Loads a predefined prompt by name from the database.
 * Caches prompts in memory after first load.
 */
export async function getPredefinedPrompt(supabase: SupabaseClient, name: DefaultPromptName): Promise<string> {
  // Check cache first
  const cached = promptCache.get(name);
  if (cached) {
    return cached.body;
  }

  const { data, error } = await supabase.from("default_prompts").select("title, body").eq("name", name).maybeSingle();

  if (error) {
    console.error(`[PromptLoader] Database error loading predefined prompt ${name}:`, error);
    throw new InternalError();
  }

  if (!data) {
    throw new NotFoundError("prompt_not_found", `PREDEFINED PROMPT NOT FOUND: ${name}`);
  }

  // Cache the result
  promptCache.set(name, { title: data.title, body: data.body });
  return data.body;
}

/**
 * Loads a custom user prompt from the database.
 */
export async function getCustomPrompt(supabase: SupabaseClient, promptId: string): Promise<string> {
  const { data, error } = await supabase.from("prompts").select("body").eq("id", promptId).maybeSingle();

  if (error) {
    console.error("[PromptLoader] Database error loading custom prompt:", error);
    throw new InternalError();
  }

  if (!data) {
    throw new NotFoundError("prompt_not_found", "CUSTOM PROMPT NOT FOUND");
  }

  return data.body;
}

/**
 * Loads all specified prompts (predefined and/or custom).
 * Returns an array of {name, content} pairs.
 */
export async function loadPrompts(
  supabase: SupabaseClient,
  defaultPromptNames: DefaultPromptName[],
  customPromptId?: string | null
): Promise<{ name: string; content: string }[]> {
  const prompts: { name: string; content: string }[] = [];

  // Load predefined prompts
  for (const name of defaultPromptNames) {
    const content = await getPredefinedPrompt(supabase, name);
    prompts.push({
      name: PROMPT_DISPLAY_NAMES[name],
      content,
    });
  }

  // Load custom prompt if specified
  if (customPromptId) {
    const content = await getCustomPrompt(supabase, customPromptId);
    prompts.push({
      name: "Custom Prompt",
      content,
    });
  }

  return prompts;
}

/**
 * Preloads all predefined prompts into cache.
 * Call this during server startup for faster first requests.
 */
export async function preloadPredefinedPrompts(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.from("default_prompts").select("name, title, body");

  if (error) {
    console.error("[PromptLoader] Failed to preload predefined prompts:", error);
    return;
  }

  if (data) {
    for (const prompt of data) {
      promptCache.set(prompt.name as DefaultPromptName, {
        title: prompt.title,
        body: prompt.body,
      });
    }
    console.log(`[PromptLoader] Predefined prompts preloaded (${data.length} prompts)`);
  }
}

/**
 * Gets all available predefined prompt names with display names.
 */
export function getAvailablePredefinedPrompts(): { name: DefaultPromptName; displayName: string }[] {
  return Object.entries(PROMPT_DISPLAY_NAMES).map(([name, displayName]) => ({
    name: name as DefaultPromptName,
    displayName,
  }));
}

/**
 * Clears the prompt cache. Useful for testing or when prompts are updated.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
