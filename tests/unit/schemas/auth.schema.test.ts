/**
 * Tests for auth schemas.
 */
import { describe, expect, it } from "vitest";

import {
  authCredentialsSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "@/lib/schemas/auth.schema";

describe("loginSchema", () => {
  it("should accept valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("EMAIL REQUIRED");
    }
  });

  it("should reject invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("INVALID EMAIL FORMAT");
    }
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PASSWORD REQUIRED");
    }
  });

  it("should accept any non-empty password (lenient validation)", () => {
    // Login doesn't enforce password strength - just checks it exists
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "1",
    });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("should accept valid email and strong password", () => {
    const result = registerSchema.safeParse({
      email: "newuser@example.com",
      password: "securePassword123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PASSWORD TOO WEAK. MIN 8 CHARS");
    }
  });

  it("should reject password longer than 72 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("PASSWORD TOO LONG. MAX 72 CHARS");
    }
  });

  it("should accept password exactly 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("should accept password exactly 72 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(72),
    });
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("should accept valid email", () => {
    const result = resetPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = resetPasswordSchema.safeParse({
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty email", () => {
    const result = resetPasswordSchema.safeParse({
      email: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("should accept valid password", () => {
    const result = updatePasswordSchema.safeParse({
      password: "newSecurePassword",
    });
    expect(result.success).toBe(true);
  });

  it("should reject weak password", () => {
    const result = updatePasswordSchema.safeParse({
      password: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("should reject too long password", () => {
    const result = updatePasswordSchema.safeParse({
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });
});

describe("resendVerificationSchema", () => {
  it("should accept valid email", () => {
    const result = resendVerificationSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = resendVerificationSchema.safeParse({
      email: "not-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("authCredentialsSchema", () => {
  it("should be same as registerSchema", () => {
    const input = {
      email: "user@example.com",
      password: "password123",
    };
    const registerResult = registerSchema.safeParse(input);
    const authResult = authCredentialsSchema.safeParse(input);
    expect(registerResult.success).toBe(authResult.success);
  });
});
