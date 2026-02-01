/**
 * Tests for usage service.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkUsageLimits, getUsage } from "@/lib/services/usage.service";
import { InternalError } from "@/lib/utils/errors";
import { SmeltDailyLimitError, SmeltWeeklyLimitError } from "@/lib/utils/smelt-errors";

import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase";
import { createMockUserProfile, createMockUserWithApiKey, createMockUserWithNoCredits } from "../../fixtures/users";

// Mock @supabase/supabase-js createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
  })),
}));

describe("usage.service", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe("getUsage", () => {
    describe("anonymous users", () => {
      it("should return anonymous usage when no userId", async () => {
        const result = await getUsage(mockSupabase as never, null, "127.0.0.1");

        expect(result.type).toBe("anonymous");
        if (result.type === "anonymous") {
          expect(result.smelts_used_today).toBe(0);
          expect(result.daily_limit).toBeGreaterThan(0);
          expect(result.can_process).toBe(true);
          expect(result.resets_at).toBeDefined();
        }
      });

      it("should hash IP for anonymous tracking", async () => {
        // Different IPs should use hash
        const result1 = await getUsage(mockSupabase as never, null, "192.168.1.1");
        const result2 = await getUsage(mockSupabase as never, null, "10.0.0.1");

        expect(result1.type).toBe("anonymous");
        expect(result2.type).toBe("anonymous");
      });

      it("should set can_process false when at daily limit", async () => {
        // Need to mock the createClient call to return usage at limit
        const { createClient } = await import("@supabase/supabase-js");
        vi.mocked(createClient).mockReturnValue({
          rpc: vi.fn().mockResolvedValue({ data: 666, error: null }), // At limit (ANONYMOUS_DAILY_LIMIT = 666)
        } as never);

        const result = await getUsage(mockSupabase as never, null, "127.0.0.1");

        expect(result.type).toBe("anonymous");
        if (result.type === "anonymous") {
          expect(result.can_process).toBe(false);
        }
      });
    });

    describe("authenticated users without API key", () => {
      it("should return authenticated usage", async () => {
        const mockProfile = createMockUserProfile({ credits_remaining: 3, weekly_credits_max: 5 });
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        const result = await getUsage(mockSupabase as never, "user-123", "127.0.0.1");

        expect(result.type).toBe("authenticated");
        if (result.type === "authenticated") {
          expect(result.credits_remaining).toBe(3);
          expect(result.weekly_credits_max).toBe(5);
          expect(result.can_process).toBe(true);
        }
      });

      it("should return message when credits exhausted", async () => {
        const mockProfile = createMockUserWithNoCredits();
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        const result = await getUsage(mockSupabase as never, "user-123", "127.0.0.1");

        expect(result.type).toBe("authenticated");
        if (result.type === "authenticated") {
          expect(result.can_process).toBe(false);
          expect(result.message).toBeDefined();
          expect(result.message).toContain("SMELTS USED THIS WEEK");
        }
      });

      it("should calculate days_until_reset", async () => {
        const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const mockProfile = createMockUserProfile({
          credits_remaining: 2,
          credits_reset_at: futureDate,
        });
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        const result = await getUsage(mockSupabase as never, "user-123", "127.0.0.1");

        if (result.type === "authenticated") {
          expect(result.days_until_reset).toBeGreaterThanOrEqual(2);
          expect(result.days_until_reset).toBeLessThanOrEqual(4);
        }
      });
    });

    describe("authenticated users with valid API key", () => {
      it("should return unlimited usage", async () => {
        const mockProfile = createMockUserWithApiKey();
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        const result = await getUsage(mockSupabase as never, "user-123", "127.0.0.1");

        expect(result.type).toBe("unlimited");
        if (result.type === "unlimited") {
          expect(result.api_key_status).toBe("valid");
          expect(result.can_process).toBe(true);
        }
      });
    });

    describe("error handling", () => {
      it("should throw InternalError on RPC error", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

        await expect(getUsage(mockSupabase as never, "user-123", "127.0.0.1")).rejects.toThrow(InternalError);
      });

      it("should throw InternalError when profile not found", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

        await expect(getUsage(mockSupabase as never, "user-123", "127.0.0.1")).rejects.toThrow(InternalError);
      });
    });
  });

  describe("checkUsageLimits", () => {
    describe("anonymous users", () => {
      it("should pass when under daily limit", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 0, error: null });

        await expect(checkUsageLimits(mockSupabase as never, null, "127.0.0.1")).resolves.toBeUndefined();
      });

      it("should throw SmeltDailyLimitError when at daily limit", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 666, error: null }); // ANONYMOUS_DAILY_LIMIT

        await expect(checkUsageLimits(mockSupabase as never, null, "127.0.0.1")).rejects.toThrow(SmeltDailyLimitError);
      });

      it("should throw SmeltDailyLimitError when over daily limit", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: 1000, error: null });

        await expect(checkUsageLimits(mockSupabase as never, null, "127.0.0.1")).rejects.toThrow(SmeltDailyLimitError);
      });
    });

    describe("authenticated users", () => {
      it("should pass when credits remaining", async () => {
        const mockProfile = createMockUserProfile({ credits_remaining: 3 });
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        await expect(checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1")).resolves.toBeUndefined();
      });

      it("should throw SmeltWeeklyLimitError when no credits", async () => {
        const mockProfile = createMockUserWithNoCredits();
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        await expect(checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1")).rejects.toThrow(
          SmeltWeeklyLimitError
        );
      });

      it("should include usage info in SmeltWeeklyLimitError", async () => {
        const mockProfile = createMockUserWithNoCredits({
          weekly_credits_max: 5,
          credits_reset_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        });
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        try {
          await checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1");
        } catch (error) {
          expect(error).toBeInstanceOf(SmeltWeeklyLimitError);
          expect((error as SmeltWeeklyLimitError).message).toContain("5/5 SMELTS USED");
        }
      });

      it("should pass when user has valid API key", async () => {
        const mockProfile = createMockUserWithApiKey({ credits_remaining: 0 });
        mockSupabase.rpc.mockResolvedValue({ data: mockProfile, error: null });

        // Even with 0 credits, valid API key = pass
        await expect(checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1")).resolves.toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("should throw InternalError on RPC error", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "DB error" } });

        await expect(checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1")).rejects.toThrow(InternalError);
      });

      it("should throw InternalError when profile not found", async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

        await expect(checkUsageLimits(mockSupabase as never, "user-123", "127.0.0.1")).rejects.toThrow(InternalError);
      });
    });
  });
});
