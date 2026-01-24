/**
 * Prompt loader service.
 * Loads predefined prompts from markdown files and custom prompts from the database.
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SupabaseClient } from "@/db/supabase.client";
import type { DefaultPromptName } from "@/types";
import { NotFoundError, InternalError } from "@/lib/utils/errors";

// Cache for predefined prompts (loaded once, never changes)
const promptCache = new Map<DefaultPromptName, string>();

// Get the directory of this file for relative path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to predefined prompts directory
const PREDEFINED_PROMPTS_DIR = join(__dirname, "../../prompts/predefined");

/**
 * Maps DefaultPromptName enum values to file names.
 * Enum uses underscores (action_items) but files use the same.
 */
const PROMPT_FILE_MAP: Record<DefaultPromptName, string> = {
  summarize: "summarize.md",
  action_items: "action_items.md",
  detailed_notes: "detailed_notes.md",
  qa_format: "qa_format.md",
  table_of_contents: "table_of_contents.md",
};

/**
 * Display names for prompts (for UI/logging).
 */
export const PROMPT_DISPLAY_NAMES: Record<DefaultPromptName, string> = {
  summarize: "Summary",
  action_items: "Action Items",
  detailed_notes: "Detailed Notes",
  qa_format: "Q&A Format",
  table_of_contents: "Table of Contents",
};

/**
 * Loads a predefined prompt by name.
 * Caches prompts in memory after first load.
 */
export async function getPredefinedPrompt(name: DefaultPromptName): Promise<string> {
  // Check cache first
  const cached = promptCache.get(name);
  if (cached) {
    return cached;
  }

  const filename = PROMPT_FILE_MAP[name];
  if (!filename) {
    throw new NotFoundError("prompt_not_found", `UNKNOWN PROMPT: ${name}`);
  }

  const filePath = join(PREDEFINED_PROMPTS_DIR, filename);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    promptCache.set(name, content);
    return content;
  } catch (error) {
    console.error(`[PromptLoader] Failed to load predefined prompt ${name}:`, error);
    throw new NotFoundError("prompt_not_found", `PROMPT FILE NOT FOUND: ${name}`);
  }
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
    const content = await getPredefinedPrompt(name);
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
export async function preloadPredefinedPrompts(): Promise<void> {
  const names: DefaultPromptName[] = ["summarize", "action_items", "detailed_notes", "qa_format", "table_of_contents"];

  await Promise.all(names.map((name) => getPredefinedPrompt(name)));
  console.log("[PromptLoader] Predefined prompts preloaded");
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
