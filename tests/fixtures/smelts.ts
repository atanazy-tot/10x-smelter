/**
 * Smelt test fixtures using Faker.
 */
import { faker } from "@faker-js/faker";

import type { Database } from "@/db/database.types";

type Smelt = Database["public"]["Tables"]["smelts"]["Row"];
type SmeltFile = Database["public"]["Tables"]["smelt_files"]["Row"];
type SmeltStatus = Database["public"]["Enums"]["smelt_status"];
type SmeltMode = Database["public"]["Enums"]["smelt_mode"];
type SmeltFileStatus = Database["public"]["Enums"]["smelt_file_status"];
type InputType = Database["public"]["Enums"]["input_type"];
type DefaultPromptName = Database["public"]["Enums"]["default_prompt_name"];

/**
 * Creates a mock smelt record
 */
export function createMockSmelt(overrides?: Partial<Smelt>): Smelt {
  const now = new Date().toISOString();

  return {
    id: overrides?.id ?? faker.string.uuid(),
    user_id: overrides?.user_id ?? faker.string.uuid(),
    status: overrides?.status ?? ("pending" as SmeltStatus),
    mode: overrides?.mode ?? ("separate" as SmeltMode),
    default_prompt_names: overrides?.default_prompt_names ?? (["summarize"] as DefaultPromptName[]),
    user_prompt_id: overrides?.user_prompt_id ?? null,
    error_code: overrides?.error_code ?? null,
    error_message: overrides?.error_message ?? null,
    created_at: overrides?.created_at ?? now,
    completed_at: overrides?.completed_at ?? null,
  };
}

/**
 * Creates a mock smelt file record
 */
export function createMockSmeltFile(overrides?: Partial<SmeltFile>): SmeltFile {
  const now = new Date().toISOString();

  return {
    id: overrides?.id ?? faker.string.uuid(),
    smelt_id: overrides?.smelt_id ?? faker.string.uuid(),
    filename: overrides?.filename ?? `${faker.word.noun()}.mp3`,
    input_type: overrides?.input_type ?? ("audio" as InputType),
    status: overrides?.status ?? ("pending" as SmeltFileStatus),
    size_bytes: overrides?.size_bytes ?? faker.number.int({ min: 100000, max: 10000000 }),
    duration_seconds: overrides?.duration_seconds ?? faker.number.int({ min: 30, max: 600 }),
    position: overrides?.position ?? 0,
    error_code: overrides?.error_code ?? null,
    created_at: overrides?.created_at ?? now,
    completed_at: overrides?.completed_at ?? null,
  };
}

/**
 * Creates a completed smelt with files
 */
export function createMockCompletedSmelt(overrides?: { userId?: string; fileCount?: number }) {
  const smeltId = faker.string.uuid();
  const userId = overrides?.userId ?? faker.string.uuid();
  const now = new Date().toISOString();

  const smelt = createMockSmelt({
    id: smeltId,
    user_id: userId,
    status: "completed",
    completed_at: now,
  });

  const fileCount = overrides?.fileCount ?? 1;
  const files = Array.from({ length: fileCount }, (_, i) =>
    createMockSmeltFile({
      smelt_id: smeltId,
      status: "completed",
      position: i,
      completed_at: now,
    })
  );

  return { smelt, files };
}

/**
 * Creates a failed smelt
 */
export function createMockFailedSmelt(overrides?: {
  userId?: string;
  errorCode?: Database["public"]["Enums"]["smelt_error_code"];
}) {
  return createMockSmelt({
    user_id: overrides?.userId,
    status: "failed",
    error_code: overrides?.errorCode ?? "transcription_failed",
    error_message: "TRANSCRIPTION FAILED",
  });
}

/**
 * Creates an anonymous smelt (no user_id)
 */
export function createMockAnonymousSmelt(overrides?: Partial<Smelt>): Smelt {
  return createMockSmelt({
    ...overrides,
    user_id: null,
  });
}

/**
 * Creates a smelt in processing state
 */
export function createMockProcessingSmelt(
  status: Extract<SmeltStatus, "validating" | "decoding" | "transcribing" | "synthesizing">
) {
  return createMockSmelt({ status });
}

/**
 * Creates a text-based smelt file (paste)
 */
export function createMockTextSmeltFile(overrides?: Partial<SmeltFile>): SmeltFile {
  return createMockSmeltFile({
    ...overrides,
    input_type: "text",
    filename: null,
    duration_seconds: null,
    size_bytes: faker.number.int({ min: 100, max: 50000 }),
  });
}

/**
 * Creates a smelt with combine mode
 */
export function createMockCombineSmelt(overrides?: { userId?: string; fileCount?: number }) {
  const smeltId = faker.string.uuid();
  const fileCount = overrides?.fileCount ?? 2;

  const smelt = createMockSmelt({
    id: smeltId,
    user_id: overrides?.userId,
    mode: "combine",
  });

  const files = Array.from({ length: fileCount }, (_, i) =>
    createMockSmeltFile({
      smelt_id: smeltId,
      position: i,
    })
  );

  return { smelt, files };
}

/**
 * Creates mock smelt list response for pagination testing
 */
export function createMockSmeltList(options?: { count?: number; userId?: string; status?: SmeltStatus }) {
  const count = options?.count ?? 10;
  const userId = options?.userId ?? faker.string.uuid();

  return Array.from({ length: count }, (_, i) =>
    createMockSmelt({
      user_id: userId,
      status: options?.status,
      created_at: new Date(Date.now() - i * 60000).toISOString(), // Each 1 minute apart
    })
  );
}

/**
 * Default prompt names for testing
 */
export const TEST_DEFAULT_PROMPTS: DefaultPromptName[] = [
  "summarize",
  "action_items",
  "detailed_notes",
  "qa_format",
  "table_of_contents",
];

/**
 * Common test smelt IDs
 */
export const TEST_SMELT_IDS = {
  pending: "00000000-0000-0000-0000-000000000010",
  completed: "00000000-0000-0000-0000-000000000011",
  failed: "00000000-0000-0000-0000-000000000012",
} as const;
