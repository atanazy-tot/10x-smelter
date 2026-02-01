/**
 * Tests for usage schema.
 */
import { describe, expect, it } from "vitest";

import {
  usageAnonymousSchema,
  usageAuthenticatedSchema,
  usageResponseSchema,
  usageUnlimitedSchema,
} from "@/lib/schemas/usage.schema";

describe("usageAnonymousSchema", () => {
  it("should accept valid anonymous usage data", () => {
    const result = usageAnonymousSchema.safeParse({
      type: "anonymous",
      smelts_used_today: 0,
      daily_limit: 1,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("should reject wrong type literal", () => {
    const result = usageAnonymousSchema.safeParse({
      type: "authenticated",
      smelts_used_today: 0,
      daily_limit: 1,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative smelts_used_today", () => {
    const result = usageAnonymousSchema.safeParse({
      type: "anonymous",
      smelts_used_today: -1,
      daily_limit: 1,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-positive daily_limit", () => {
    const result = usageAnonymousSchema.safeParse({
      type: "anonymous",
      smelts_used_today: 0,
      daily_limit: 0,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid datetime format", () => {
    const result = usageAnonymousSchema.safeParse({
      type: "anonymous",
      smelts_used_today: 0,
      daily_limit: 1,
      can_process: true,
      resets_at: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("usageAuthenticatedSchema", () => {
  it("should accept valid authenticated usage data", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: 5,
      weekly_credits_max: 5,
      can_process: true,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 7,
    });
    expect(result.success).toBe(true);
  });

  it("should accept with optional message", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: 0,
      weekly_credits_max: 5,
      can_process: false,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 3,
      message: "Credits exhausted",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Credits exhausted");
    }
  });

  it("should accept without message", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: 3,
      weekly_credits_max: 5,
      can_process: true,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBeUndefined();
    }
  });

  it("should reject negative credits_remaining", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: -1,
      weekly_credits_max: 5,
      can_process: false,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-positive weekly_credits_max", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: 0,
      weekly_credits_max: 0,
      can_process: false,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative days_until_reset", () => {
    const result = usageAuthenticatedSchema.safeParse({
      type: "authenticated",
      credits_remaining: 5,
      weekly_credits_max: 5,
      can_process: true,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("usageUnlimitedSchema", () => {
  it("should accept valid unlimited usage data", () => {
    const result = usageUnlimitedSchema.safeParse({
      type: "unlimited",
      api_key_status: "valid",
      can_process: true,
    });
    expect(result.success).toBe(true);
  });

  it.each(["none", "pending", "valid", "invalid"])("should accept api_key_status: %s", (status) => {
    const result = usageUnlimitedSchema.safeParse({
      type: "unlimited",
      api_key_status: status,
      can_process: status === "valid",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid api_key_status", () => {
    const result = usageUnlimitedSchema.safeParse({
      type: "unlimited",
      api_key_status: "unknown",
      can_process: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("usageResponseSchema (discriminated union)", () => {
  it("should parse anonymous response", () => {
    const data = {
      type: "anonymous",
      smelts_used_today: 0,
      daily_limit: 1,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    };
    const result = usageResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("anonymous");
    }
  });

  it("should parse authenticated response", () => {
    const data = {
      type: "authenticated",
      credits_remaining: 5,
      weekly_credits_max: 5,
      can_process: true,
      resets_at: "2024-01-08T00:00:00.000Z",
      days_until_reset: 7,
    };
    const result = usageResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("authenticated");
    }
  });

  it("should parse unlimited response", () => {
    const data = {
      type: "unlimited",
      api_key_status: "valid",
      can_process: true,
    };
    const result = usageResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("unlimited");
    }
  });

  it("should reject unknown type", () => {
    const data = {
      type: "premium",
      some_field: "value",
    };
    const result = usageResponseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should reject missing required fields for type", () => {
    // anonymous type missing daily_limit
    const data = {
      type: "anonymous",
      smelts_used_today: 0,
      can_process: true,
      resets_at: "2024-01-01T00:00:00.000Z",
    };
    const result = usageResponseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
