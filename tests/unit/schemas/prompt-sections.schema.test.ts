/**
 * Tests for prompt sections schema.
 */
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

import {
  listSectionsQuerySchema,
  reorderItemSchema,
  sectionCreateSchema,
  sectionsReorderSchema,
  sectionUpdateSchema,
  uuidParamSchema,
} from "@/lib/schemas/prompt-sections.schema";

describe("listSectionsQuerySchema", () => {
  it("should accept empty query (uses defaults)", () => {
    const result = listSectionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("position");
      expect(result.data.order).toBe("asc");
    }
  });

  it("should accept valid sort options", () => {
    const sorts = ["position", "title", "created_at"];
    for (const sort of sorts) {
      const result = listSectionsQuerySchema.safeParse({ sort });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid sort option", () => {
    const result = listSectionsQuerySchema.safeParse({ sort: "updated_at" });
    expect(result.success).toBe(false);
  });

  it("should accept valid order options", () => {
    const result1 = listSectionsQuerySchema.safeParse({ order: "asc" });
    const result2 = listSectionsQuerySchema.safeParse({ order: "desc" });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it("should reject invalid order option", () => {
    const result = listSectionsQuerySchema.safeParse({ order: "random" });
    expect(result.success).toBe(false);
  });
});

describe("sectionCreateSchema", () => {
  it("should accept valid section data", () => {
    const result = sectionCreateSchema.safeParse({
      title: "My Section",
    });
    expect(result.success).toBe(true);
  });

  it("should accept section with position", () => {
    const result = sectionCreateSchema.safeParse({
      title: "My Section",
      position: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(3);
    }
  });

  it("should reject empty title", () => {
    const result = sectionCreateSchema.safeParse({
      title: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("SECTION TITLE REQUIRED");
    }
  });

  it("should reject title over 100 characters", () => {
    const result = sectionCreateSchema.safeParse({
      title: "a".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("SECTION TITLE TOO LONG");
    }
  });

  it("should accept title exactly 100 characters", () => {
    const result = sectionCreateSchema.safeParse({
      title: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("should reject negative position", () => {
    const result = sectionCreateSchema.safeParse({
      title: "Section",
      position: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept position 0", () => {
    const result = sectionCreateSchema.safeParse({
      title: "Section",
      position: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("sectionUpdateSchema", () => {
  it("should accept update with title only", () => {
    const result = sectionUpdateSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("should accept update with position only", () => {
    const result = sectionUpdateSchema.safeParse({ position: 5 });
    expect(result.success).toBe(true);
  });

  it("should accept update with both title and position", () => {
    const result = sectionUpdateSchema.safeParse({
      title: "New Title",
      position: 2,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty object (at least one field required)", () => {
    const result = sectionUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID UPDATE DATA");
    }
  });

  it("should reject title over 100 characters", () => {
    const result = sectionUpdateSchema.safeParse({ title: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("should reject empty title string", () => {
    const result = sectionUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("should reject negative position", () => {
    const result = sectionUpdateSchema.safeParse({ position: -1 });
    expect(result.success).toBe(false);
  });
});

describe("uuidParamSchema", () => {
  it("should accept valid UUID", () => {
    const result = uuidParamSchema.safeParse({ id: faker.string.uuid() });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = uuidParamSchema.safeParse({ id: "invalid-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID SECTION ID");
    }
  });

  it("should reject empty string", () => {
    const result = uuidParamSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
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

  it("should accept high position values", () => {
    const result = reorderItemSchema.safeParse({
      id: faker.string.uuid(),
      position: 999,
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer position", () => {
    const result = reorderItemSchema.safeParse({
      id: faker.string.uuid(),
      position: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("sectionsReorderSchema", () => {
  it("should accept valid reorder request", () => {
    const result = sectionsReorderSchema.safeParse({
      order: [
        { id: faker.string.uuid(), position: 0 },
        { id: faker.string.uuid(), position: 1 },
        { id: faker.string.uuid(), position: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept single item reorder", () => {
    const result = sectionsReorderSchema.safeParse({
      order: [{ id: faker.string.uuid(), position: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty order array", () => {
    const result = sectionsReorderSchema.safeParse({
      order: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID ORDER DATA");
    }
  });

  it("should reject missing order field", () => {
    const result = sectionsReorderSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
