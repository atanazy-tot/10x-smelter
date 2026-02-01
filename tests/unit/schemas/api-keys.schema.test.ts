/**
 * Tests for API keys schema.
 */
import { describe, expect, it } from "vitest";

import { apiKeyCreateSchema } from "@/lib/schemas/api-keys.schema";

describe("apiKeyCreateSchema", () => {
  describe("valid API keys", () => {
    it("should accept OpenRouter format key", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "sk-or-v1-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      });
      expect(result.success).toBe(true);
    });

    it("should accept OpenAI format key", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "sk-abcdef1234567890abcdef12345678",
      });
      expect(result.success).toBe(true);
    });

    it("should accept sk-proj format key", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "sk-proj-abcdef1234567890abcdef",
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimum valid length key (sk- + 16 chars = 19 total)", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "sk-1234567890123456",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid API keys", () => {
    it("should reject empty string", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("API KEY REQUIRED");
      }
    });

    it("should reject key not starting with sk-", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "pk-abcdef1234567890abcdef",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("MUST START WITH sk-");
      }
    });

    it("should reject key that is too short", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "sk-short",
      });
      expect(result.success).toBe(false);
    });

    it("should reject key without sk- prefix", () => {
      const result = apiKeyCreateSchema.safeParse({
        api_key: "abcdef1234567890abcdef1234567890",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing api_key field", () => {
      const result = apiKeyCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
