/**
 * Tests for API keys service.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { deleteApiKey, getApiKeyStatus, validateAndStoreApiKey } from "@/lib/services/api-keys.service";
import { ApiKeyInvalidError, ApiKeyQuotaExhaustedError, ApiKeyValidationFailedError, NoApiKeyError } from "@/lib/utils/api-key-errors";
import { InternalError } from "@/lib/utils/errors";

import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase";
import { createMockApiKeyValidationFetch } from "../../mocks/openrouter";
import { TEST_USER_IDS } from "../../fixtures/users";

// Mock encryption module
vi.mock("@/lib/utils/encryption", () => ({
  encrypt: vi.fn((key: string) => `encrypted:${key}`),
}));

describe("api-keys.service", () => {
  let mockSupabase: MockSupabaseClient;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    originalFetch = globalThis.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("validateAndStoreApiKey", () => {
    it("should validate and store a valid API key", async () => {
      globalThis.fetch = createMockApiKeyValidationFetch({ isValid: true });

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") return { upsert: upsertMock };
        if (table === "user_profiles") return { update: updateMock };
        return {};
      });

      const result = await validateAndStoreApiKey(
        mockSupabase as never,
        TEST_USER_IDS.authenticated,
        "sk-or-valid-key-123"
      );

      expect(result.status).toBe("valid");
      expect(result.message).toBe("KEY VALID");
      expect(result.validated_at).toBeDefined();
      expect(upsertMock).toHaveBeenCalled();
    });

    it("should throw ApiKeyInvalidError for invalid key", async () => {
      globalThis.fetch = createMockApiKeyValidationFetch({ isValid: false });

      await expect(
        validateAndStoreApiKey(mockSupabase as never, TEST_USER_IDS.authenticated, "sk-invalid-key")
      ).rejects.toThrow(ApiKeyInvalidError);
    });

    it("should throw ApiKeyQuotaExhaustedError for exhausted quota", async () => {
      globalThis.fetch = createMockApiKeyValidationFetch({ isValid: true, hasQuota: false });

      await expect(
        validateAndStoreApiKey(mockSupabase as never, TEST_USER_IDS.authenticated, "sk-exhausted-key")
      ).rejects.toThrow(ApiKeyQuotaExhaustedError);
    });

    it("should throw ApiKeyValidationFailedError on network error", async () => {
      globalThis.fetch = createMockApiKeyValidationFetch({ shouldFail: true });

      await expect(
        validateAndStoreApiKey(mockSupabase as never, TEST_USER_IDS.authenticated, "sk-test-key")
      ).rejects.toThrow(ApiKeyValidationFailedError);
    });

    it("should throw InternalError on database error", async () => {
      globalThis.fetch = createMockApiKeyValidationFetch({ isValid: true });

      const upsertMock = vi.fn().mockResolvedValue({ error: { message: "DB error" } });

      mockSupabase.from = vi.fn().mockReturnValue({ upsert: upsertMock });

      await expect(
        validateAndStoreApiKey(mockSupabase as never, TEST_USER_IDS.authenticated, "sk-valid-key")
      ).rejects.toThrow(InternalError);
    });
  });

  describe("getApiKeyStatus", () => {
    it("should return status when key exists", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: TEST_USER_IDS.authenticated }, error: null }),
        }),
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { api_key_status: "valid", api_key_validated_at: "2024-01-01T00:00:00Z" },
            error: null,
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") return { select: selectKeyMock };
        if (table === "user_profiles") return { select: selectProfileMock };
        return {};
      });

      const result = await getApiKeyStatus(mockSupabase as never, TEST_USER_IDS.authenticated);

      expect(result.has_key).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.validated_at).toBe("2024-01-01T00:00:00Z");
    });

    it("should return has_key false when no key exists", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { api_key_status: "none", api_key_validated_at: null },
            error: null,
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") return { select: selectKeyMock };
        if (table === "user_profiles") return { select: selectProfileMock };
        return {};
      });

      const result = await getApiKeyStatus(mockSupabase as never, TEST_USER_IDS.authenticated);

      expect(result.has_key).toBe(false);
      expect(result.status).toBe("none");
    });

    it("should throw InternalError on database error", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") return { select: selectKeyMock };
        if (table === "user_profiles") return { select: selectProfileMock };
        return {};
      });

      await expect(getApiKeyStatus(mockSupabase as never, TEST_USER_IDS.authenticated)).rejects.toThrow(InternalError);
    });
  });

  describe("deleteApiKey", () => {
    it("should delete API key successfully", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: TEST_USER_IDS.authenticated }, error: null }),
        }),
      });

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const selectProfileMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { credits_remaining: 5, credits_reset_at: "2024-01-08T00:00:00Z" },
            error: null,
          }),
        }),
      });

      let callCount = 0;
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") {
          return { select: selectKeyMock, delete: deleteMock };
        }
        if (table === "user_profiles") {
          callCount++;
          if (callCount === 1) return { update: updateMock };
          return { select: selectProfileMock };
        }
        return {};
      });

      const result = await deleteApiKey(mockSupabase as never, TEST_USER_IDS.authenticated);

      expect(result.message).toBe("API KEY REMOVED");
      expect(result.credits_remaining).toBe(5);
    });

    it("should throw NoApiKeyError when no key exists", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectKeyMock });

      await expect(deleteApiKey(mockSupabase as never, TEST_USER_IDS.authenticated)).rejects.toThrow(NoApiKeyError);
    });

    it("should throw InternalError on delete error", async () => {
      const selectKeyMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: TEST_USER_IDS.authenticated }, error: null }),
        }),
      });

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === "user_api_keys") {
          return { select: selectKeyMock, delete: deleteMock };
        }
        return {};
      });

      await expect(deleteApiKey(mockSupabase as never, TEST_USER_IDS.authenticated)).rejects.toThrow(InternalError);
    });
  });
});
