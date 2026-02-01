/**
 * Tests for prompts schema.
 */
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

import {
  listPromptsQuerySchema,
  promptCreateSchema,
  promptsReorderSchema,
  promptUpdateSchema,
  promptUploadMetaSchema,
  reorderItemSchema,
  uuidParamSchema,
} from "@/lib/schemas/prompts.schema";

describe("listPromptsQuerySchema", () => {
  it("should accept empty query (uses defaults)", () => {
    const result = listPromptsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("position");
      expect(result.data.order).toBe("asc");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    }
  });

  it("should accept valid section_id UUID", () => {
    const uuid = faker.string.uuid();
    const result = listPromptsQuerySchema.safeParse({ section_id: uuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.section_id).toBe(uuid);
    }
  });

  it("should transform 'null' string to null for unsectioned prompts", () => {
    const result = listPromptsQuerySchema.safeParse({ section_id: "null" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.section_id).toBeNull();
    }
  });

  it("should accept valid sort options", () => {
    const sorts = ["position", "title", "created_at", "updated_at"];
    for (const sort of sorts) {
      const result = listPromptsQuerySchema.safeParse({ sort });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid sort option", () => {
    const result = listPromptsQuerySchema.safeParse({ sort: "invalid" });
    expect(result.success).toBe(false);
  });

  it("should accept valid order options", () => {
    const result1 = listPromptsQuerySchema.safeParse({ order: "asc" });
    const result2 = listPromptsQuerySchema.safeParse({ order: "desc" });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it("should coerce page and limit to numbers", () => {
    const result = listPromptsQuerySchema.safeParse({ page: "2", limit: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("should reject page less than 1", () => {
    const result = listPromptsQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("should reject limit greater than 100", () => {
    const result = listPromptsQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });
});

describe("promptCreateSchema", () => {
  it("should accept valid prompt data", () => {
    const result = promptCreateSchema.safeParse({
      title: "Test Prompt",
      body: "This is the prompt content.",
    });
    expect(result.success).toBe(true);
  });

  it("should accept prompt with section_id", () => {
    const result = promptCreateSchema.safeParse({
      title: "Test Prompt",
      body: "Content",
      section_id: faker.string.uuid(),
    });
    expect(result.success).toBe(true);
  });

  it("should accept prompt with null section_id", () => {
    const result = promptCreateSchema.safeParse({
      title: "Test Prompt",
      body: "Content",
      section_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("should accept prompt with position", () => {
    const result = promptCreateSchema.safeParse({
      title: "Test Prompt",
      body: "Content",
      position: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(5);
    }
  });

  it("should reject empty title", () => {
    const result = promptCreateSchema.safeParse({
      title: "",
      body: "Content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PROMPT TITLE REQUIRED");
    }
  });

  it("should reject title over 200 characters", () => {
    const result = promptCreateSchema.safeParse({
      title: "a".repeat(201),
      body: "Content",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PROMPT TITLE TOO LONG");
    }
  });

  it("should reject empty body", () => {
    const result = promptCreateSchema.safeParse({
      title: "Title",
      body: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PROMPT CONTENT REQUIRED");
    }
  });

  it("should reject body over 4000 characters", () => {
    const result = promptCreateSchema.safeParse({
      title: "Title",
      body: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("4,000 CHARS");
    }
  });

  it("should reject invalid section_id UUID", () => {
    const result = promptCreateSchema.safeParse({
      title: "Title",
      body: "Content",
      section_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative position", () => {
    const result = promptCreateSchema.safeParse({
      title: "Title",
      body: "Content",
      position: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("promptUpdateSchema", () => {
  it("should accept partial update with title only", () => {
    const result = promptUpdateSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("should accept partial update with body only", () => {
    const result = promptUpdateSchema.safeParse({ body: "New content" });
    expect(result.success).toBe(true);
  });

  it("should accept update with section_id", () => {
    const result = promptUpdateSchema.safeParse({ section_id: faker.string.uuid() });
    expect(result.success).toBe(true);
  });

  it("should accept update with position", () => {
    const result = promptUpdateSchema.safeParse({ position: 3 });
    expect(result.success).toBe(true);
  });

  it("should accept empty object (no fields required)", () => {
    const result = promptUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject body over 4000 characters", () => {
    const result = promptUpdateSchema.safeParse({ body: "a".repeat(4001) });
    expect(result.success).toBe(false);
  });
});

describe("uuidParamSchema", () => {
  it("should accept valid UUID", () => {
    const result = uuidParamSchema.safeParse({ id: faker.string.uuid() });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = uuidParamSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID PROMPT ID");
    }
  });
});

describe("promptUploadMetaSchema", () => {
  it("should accept empty object", () => {
    const result = promptUploadMetaSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept title", () => {
    const result = promptUploadMetaSchema.safeParse({ title: "My Prompt" });
    expect(result.success).toBe(true);
  });

  it("should transform 'null' string to null for section_id", () => {
    const result = promptUploadMetaSchema.safeParse({ section_id: "null" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.section_id).toBeNull();
    }
  });

  it("should transform empty string to null for section_id", () => {
    const result = promptUploadMetaSchema.safeParse({ section_id: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.section_id).toBeNull();
    }
  });

  it("should accept valid UUID section_id", () => {
    const uuid = faker.string.uuid();
    const result = promptUploadMetaSchema.safeParse({ section_id: uuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.section_id).toBe(uuid);
    }
  });
});

describe("reorderItemSchema", () => {
  it("should accept valid reorder item", () => {
    const result = reorderItemSchema.safeParse({
      id: faker.string.uuid(),
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = reorderItemSchema.safeParse({
      id: "invalid",
      position: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative position", () => {
    const result = reorderItemSchema.safeParse({
      id: faker.string.uuid(),
      position: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("promptsReorderSchema", () => {
  it("should accept valid reorder request", () => {
    const result = promptsReorderSchema.safeParse({
      section_id: faker.string.uuid(),
      order: [
        { id: faker.string.uuid(), position: 0 },
        { id: faker.string.uuid(), position: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept null section_id for unsectioned prompts", () => {
    const result = promptsReorderSchema.safeParse({
      section_id: null,
      order: [{ id: faker.string.uuid(), position: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty order array", () => {
    const result = promptsReorderSchema.safeParse({
      section_id: null,
      order: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID ORDER DATA");
    }
  });
});
