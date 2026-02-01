/**
 * Tests for smelts schema.
 */
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";

import {
  defaultPromptNameSchema,
  listSmeltsQuerySchema,
  MAX_FILE_SIZE,
  MAX_FILES,
  MAX_TEXT_LENGTH,
  smeltCreateSchema,
  smeltIdParamSchema,
  smeltModeSchema,
  smeltStatusFilterSchema,
  validateAudioFile,
  VALID_AUDIO_EXTENSIONS,
  VALID_AUDIO_TYPES,
} from "@/lib/schemas/smelts.schema";
import { SmeltFileTooLargeError, SmeltInvalidFormatError } from "@/lib/utils/smelt-errors";

import { createMockAudioFile, createMockFile, createOversizedFile, createUnsupportedFile } from "../../mocks/file";

describe("constants", () => {
  it("should have correct MAX_FILE_SIZE", () => {
    expect(MAX_FILE_SIZE).toBe(25 * 1024 * 1024);
  });

  it("should have correct MAX_FILES", () => {
    expect(MAX_FILES).toBe(5);
  });

  it("should have correct MAX_TEXT_LENGTH", () => {
    expect(MAX_TEXT_LENGTH).toBe(50000);
  });

  it("should have valid audio extensions", () => {
    expect(VALID_AUDIO_EXTENSIONS).toEqual(["mp3", "wav", "m4a"]);
  });

  it("should have valid audio types", () => {
    expect(VALID_AUDIO_TYPES).toContain("audio/mpeg");
    expect(VALID_AUDIO_TYPES).toContain("audio/wav");
    expect(VALID_AUDIO_TYPES).toContain("audio/m4a");
  });
});

describe("defaultPromptNameSchema", () => {
  it.each(["summarize", "action_items", "detailed_notes", "qa_format", "table_of_contents"])(
    "should accept %s",
    (name) => {
      const result = defaultPromptNameSchema.safeParse(name);
      expect(result.success).toBe(true);
    }
  );

  it("should reject invalid prompt name", () => {
    const result = defaultPromptNameSchema.safeParse("invalid_prompt");
    expect(result.success).toBe(false);
  });
});

describe("smeltModeSchema", () => {
  it("should accept 'separate'", () => {
    const result = smeltModeSchema.safeParse("separate");
    expect(result.success).toBe(true);
  });

  it("should accept 'combine'", () => {
    const result = smeltModeSchema.safeParse("combine");
    expect(result.success).toBe(true);
  });

  it("should reject invalid mode", () => {
    const result = smeltModeSchema.safeParse("merge");
    expect(result.success).toBe(false);
  });
});

describe("smeltStatusFilterSchema", () => {
  it.each(["pending", "completed", "failed"])("should accept %s", (status) => {
    const result = smeltStatusFilterSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("should reject processing states as filter", () => {
    const result = smeltStatusFilterSchema.safeParse("transcribing");
    expect(result.success).toBe(false);
  });
});

describe("smeltCreateSchema", () => {
  it("should accept minimal valid input (empty object uses defaults)", () => {
    const result = smeltCreateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("separate");
    }
  });

  it("should accept text input", () => {
    const result = smeltCreateSchema.safeParse({
      text: "This is some text to process",
    });
    expect(result.success).toBe(true);
  });

  it("should accept mode selection", () => {
    const result = smeltCreateSchema.safeParse({
      mode: "combine",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("combine");
    }
  });

  it("should accept default prompt names array", () => {
    const result = smeltCreateSchema.safeParse({
      default_prompt_names: ["summarize", "action_items"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default_prompt_names).toHaveLength(2);
    }
  });

  it("should accept user_prompt_id", () => {
    const uuid = faker.string.uuid();
    const result = smeltCreateSchema.safeParse({
      user_prompt_id: uuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user_prompt_id).toBe(uuid);
    }
  });

  it("should accept null user_prompt_id", () => {
    const result = smeltCreateSchema.safeParse({
      user_prompt_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject text over 50000 characters", () => {
    const result = smeltCreateSchema.safeParse({
      text: "a".repeat(50001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("50000");
    }
  });

  it("should accept text exactly 50000 characters", () => {
    const result = smeltCreateSchema.safeParse({
      text: "a".repeat(50000),
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid mode", () => {
    const result = smeltCreateSchema.safeParse({
      mode: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid user_prompt_id", () => {
    const result = smeltCreateSchema.safeParse({
      user_prompt_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID PROMPT ID");
    }
  });
});

describe("listSmeltsQuerySchema", () => {
  it("should accept empty query (uses defaults)", () => {
    const result = listSmeltsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("created_at");
      expect(result.data.order).toBe("desc");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should accept status filter", () => {
    const result = listSmeltsQuerySchema.safeParse({ status: "completed" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("completed");
    }
  });

  it("should accept valid sort options", () => {
    const result1 = listSmeltsQuerySchema.safeParse({ sort: "created_at" });
    const result2 = listSmeltsQuerySchema.safeParse({ sort: "completed_at" });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it("should reject invalid sort option", () => {
    const result = listSmeltsQuerySchema.safeParse({ sort: "status" });
    expect(result.success).toBe(false);
  });

  it("should coerce string numbers", () => {
    const result = listSmeltsQuerySchema.safeParse({ page: "3", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });

  it("should reject limit over 50", () => {
    const result = listSmeltsQuerySchema.safeParse({ limit: "51" });
    expect(result.success).toBe(false);
  });

  it("should reject page less than 1", () => {
    const result = listSmeltsQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });
});

describe("smeltIdParamSchema", () => {
  it("should accept valid UUID", () => {
    const result = smeltIdParamSchema.safeParse({ id: faker.string.uuid() });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = smeltIdParamSchema.safeParse({ id: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID SMELT ID");
    }
  });
});

describe("validateAudioFile", () => {
  describe("valid files", () => {
    it.each([
      ["mp3", "audio/mpeg"],
      ["wav", "audio/wav"],
      ["m4a", "audio/m4a"],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ])("should accept valid %s file", (ext, _mime) => {
      const file = createMockAudioFile({ format: ext as "mp3" | "wav" | "m4a" });
      expect(() => validateAudioFile(file)).not.toThrow();
    });

    it("should accept file by extension when MIME is generic", () => {
      const file = createMockFile({
        name: "audio.mp3",
        type: "application/octet-stream",
        size: 1024 * 1024,
      });
      expect(() => validateAudioFile(file)).not.toThrow();
    });
  });

  describe("invalid format", () => {
    it("should throw SmeltInvalidFormatError for unsupported format", () => {
      const file = createUnsupportedFile();
      expect(() => validateAudioFile(file)).toThrow(SmeltInvalidFormatError);
    });

    it("should throw for video files", () => {
      const file = createMockFile({
        name: "video.mp4",
        type: "video/mp4",
        size: 1024 * 1024,
      });
      expect(() => validateAudioFile(file)).toThrow(SmeltInvalidFormatError);
    });
  });

  describe("file size", () => {
    it("should throw SmeltFileTooLargeError for oversized file", () => {
      const file = createOversizedFile();
      expect(() => validateAudioFile(file)).toThrow(SmeltFileTooLargeError);
    });

    it("should include size in error message", () => {
      const file = createOversizedFile({ sizeMB: 30 });
      try {
        validateAudioFile(file);
      } catch (error) {
        expect(error).toBeInstanceOf(SmeltFileTooLargeError);
        expect((error as SmeltFileTooLargeError).message).toContain("30.0MB");
      }
    });

    it("should accept file exactly at limit", () => {
      const file = createMockAudioFile({ size: 25 * 1024 * 1024 });
      expect(() => validateAudioFile(file)).not.toThrow();
    });
  });
});
