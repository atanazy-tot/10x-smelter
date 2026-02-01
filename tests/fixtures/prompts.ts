/**
 * Prompt test fixtures using Faker.
 */
import { faker } from "@faker-js/faker";

import type { Database } from "@/db/database.types";

type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
type PromptSection = Database["public"]["Tables"]["prompt_sections"]["Row"];

/**
 * Creates a mock prompt record
 */
export function createMockPrompt(overrides?: Partial<Prompt>): Prompt {
  const now = new Date().toISOString();

  return {
    id: overrides?.id ?? faker.string.uuid(),
    user_id: overrides?.user_id ?? faker.string.uuid(),
    title: overrides?.title ?? faker.lorem.words(3),
    body: overrides?.body ?? faker.lorem.paragraphs(2),
    section_id: overrides?.section_id ?? null,
    position: overrides?.position ?? 0,
    created_at: overrides?.created_at ?? now,
    updated_at: overrides?.updated_at ?? now,
  };
}

/**
 * Creates a mock prompt section record
 */
export function createMockPromptSection(overrides?: Partial<PromptSection>): PromptSection {
  const now = new Date().toISOString();

  return {
    id: overrides?.id ?? faker.string.uuid(),
    user_id: overrides?.user_id ?? faker.string.uuid(),
    title: overrides?.title ?? faker.lorem.words(2),
    position: overrides?.position ?? 0,
    created_at: overrides?.created_at ?? now,
    updated_at: overrides?.updated_at ?? now,
  };
}

/**
 * Creates a prompt within a section
 */
export function createMockPromptInSection(sectionId: string, overrides?: Partial<Prompt>): Prompt {
  return createMockPrompt({
    ...overrides,
    section_id: sectionId,
  });
}

/**
 * Creates a section with prompts
 */
export function createMockSectionWithPrompts(options?: { userId?: string; promptCount?: number }) {
  const userId = options?.userId ?? faker.string.uuid();
  const sectionId = faker.string.uuid();
  const promptCount = options?.promptCount ?? 3;

  const section = createMockPromptSection({
    id: sectionId,
    user_id: userId,
  });

  const prompts = Array.from({ length: promptCount }, (_, i) =>
    createMockPrompt({
      user_id: userId,
      section_id: sectionId,
      position: i,
    })
  );

  return { section, prompts };
}

/**
 * Creates a list of unsectioned prompts
 */
export function createMockUnsectionedPrompts(options?: { userId?: string; count?: number }): Prompt[] {
  const userId = options?.userId ?? faker.string.uuid();
  const count = options?.count ?? 5;

  return Array.from({ length: count }, (_, i) =>
    createMockPrompt({
      user_id: userId,
      section_id: null,
      position: i,
    })
  );
}

/**
 * Creates multiple sections with prompts for pagination testing
 */
export function createMockPromptStructure(options?: { userId?: string; sectionCount?: number; promptsPerSection?: number }) {
  const userId = options?.userId ?? faker.string.uuid();
  const sectionCount = options?.sectionCount ?? 3;
  const promptsPerSection = options?.promptsPerSection ?? 2;

  const sections = Array.from({ length: sectionCount }, (_, i) =>
    createMockPromptSection({
      user_id: userId,
      position: i,
    })
  );

  const prompts = sections.flatMap((section) =>
    Array.from({ length: promptsPerSection }, (_, i) =>
      createMockPrompt({
        user_id: userId,
        section_id: section.id,
        position: i,
      })
    )
  );

  // Add some unsectioned prompts
  const unsectioned = createMockUnsectionedPrompts({ userId, count: 2 });

  return { sections, prompts: [...prompts, ...unsectioned] };
}

/**
 * Creates a prompt body at max length (4000 chars)
 */
export function createMaxLengthPromptBody(): string {
  return faker.lorem.paragraphs(20).slice(0, 4000);
}

/**
 * Creates a prompt body that exceeds max length
 */
export function createOversizedPromptBody(): string {
  return faker.lorem.paragraphs(30).slice(0, 4500); // Exceeds 4000 char limit
}

/**
 * Creates valid prompt input data for create/update tests
 */
export function createValidPromptInput(overrides?: { title?: string; body?: string; section_id?: string | null }) {
  return {
    title: overrides?.title ?? faker.lorem.words(3),
    body: overrides?.body ?? faker.lorem.paragraphs(1),
    section_id: overrides?.section_id ?? null,
  };
}

/**
 * Creates valid section input data
 */
export function createValidSectionInput(overrides?: { title?: string; position?: number }) {
  return {
    title: overrides?.title ?? faker.lorem.words(2),
    position: overrides?.position,
  };
}

/**
 * Creates reorder input for prompts
 */
export function createPromptReorderInput(prompts: Prompt[], newOrder: number[]) {
  return {
    section_id: prompts[0]?.section_id ?? null,
    order: newOrder.map((newPosition, idx) => ({
      id: prompts[idx].id,
      position: newPosition,
    })),
  };
}

/**
 * Creates reorder input for sections
 */
export function createSectionReorderInput(sections: PromptSection[], newOrder: number[]) {
  return {
    order: newOrder.map((newPosition, idx) => ({
      id: sections[idx].id,
      position: newPosition,
    })),
  };
}

/**
 * Common test prompt IDs
 */
export const TEST_PROMPT_IDS = {
  default: "00000000-0000-0000-0000-000000000020",
  alternate: "00000000-0000-0000-0000-000000000021",
} as const;

/**
 * Common test section IDs
 */
export const TEST_SECTION_IDS = {
  default: "00000000-0000-0000-0000-000000000030",
  alternate: "00000000-0000-0000-0000-000000000031",
} as const;
