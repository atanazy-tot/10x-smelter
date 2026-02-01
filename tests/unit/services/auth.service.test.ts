/**
 * Tests for auth service.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  exchangeCodeForSession,
  getSession,
  login,
  logout,
  refreshSession,
  register,
  resendVerification,
  resetPassword,
  updatePassword,
} from "@/lib/services/auth.service";
import {
  EmailExistsError,
  EmailNotVerifiedError,
  InternalError,
  InvalidCredentialsError,
  InvalidTokenError,
  RateLimitedError,
  SamePasswordError,
} from "@/lib/utils/auth-errors";

import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase";
import { createMockUser, createMockUserProfile, createMockSession } from "../../fixtures/users";

describe("auth.service", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const mockUser = createMockUser({ email: "test@example.com" });
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await register(mockSupabase as never, "test@example.com", "password123");

      expect(result.user.email).toBe("test@example.com");
      expect(result.message).toBe("CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT");
    });

    it("should throw EmailExistsError when email is already registered", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered", code: "user_already_exists" },
      });

      await expect(register(mockSupabase as never, "existing@example.com", "password123")).rejects.toThrow(
        EmailExistsError
      );
    });

    it("should throw RateLimitedError on rate limit", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Rate limit exceeded", code: "rate_limit" },
      });

      await expect(register(mockSupabase as never, "test@example.com", "password123")).rejects.toThrow(
        RateLimitedError
      );
    });

    it("should throw InternalError when user data is missing", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(register(mockSupabase as never, "test@example.com", "password123")).rejects.toThrow(InternalError);
    });

    it("should pass emailRedirectTo option when provided", async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      await register(mockSupabase as never, "test@example.com", "password123", "https://custom.redirect.com");

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          emailRedirectTo: "https://custom.redirect.com",
        },
      });
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      const mockUser = createMockUser({ email: "test@example.com" });
      const mockProfile = createMockUserProfile({ user_id: mockUser.id });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: createMockSession(mockUser) },
        error: null,
      });

      // Mock the profile query
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      mockSupabase.from = fromMock;

      const result = await login(mockSupabase as never, "test@example.com", "password123");

      expect(result.user.email).toBe("test@example.com");
      expect(result.profile).toBeDefined();
    });

    it("should throw InvalidCredentialsError on wrong credentials", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials", code: "invalid_credentials" },
      });

      await expect(login(mockSupabase as never, "test@example.com", "wrongpassword")).rejects.toThrow(
        InvalidCredentialsError
      );
    });

    it("should throw EmailNotVerifiedError when email not confirmed", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Email not confirmed", code: "email_not_confirmed" },
      });

      await expect(login(mockSupabase as never, "test@example.com", "password123")).rejects.toThrow(
        EmailNotVerifiedError
      );
    });

    it("should throw EmailNotVerifiedError for unverified user created after cutover", async () => {
      // User created after cutover date (2026-02-15) without email confirmation
      const mockUser = createMockUser({
        email: "test@example.com",
        created_at: "2026-03-01T00:00:00.000Z",
        email_confirmed_at: null,
      });
      const mockProfile = createMockUserProfile({ user_id: mockUser.id });

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: createMockSession(mockUser) },
        error: null,
      });

      // Mock the profile query - needed before email check
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      mockSupabase.from = fromMock;

      await expect(login(mockSupabase as never, "test@example.com", "password123")).rejects.toThrow(
        EmailNotVerifiedError
      );

      // Should sign out the user
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("should throw RateLimitedError on rate limit", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Rate limit exceeded", code: "rate_limit" },
      });

      await expect(login(mockSupabase as never, "test@example.com", "password123")).rejects.toThrow(RateLimitedError);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await expect(logout(mockSupabase as never)).resolves.toBeUndefined();
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("should throw InternalError on error", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: "Unknown error" },
      });

      await expect(logout(mockSupabase as never)).rejects.toThrow(InternalError);
    });
  });

  describe("getSession", () => {
    it("should return authenticated session for logged in user", async () => {
      const mockUser = createMockUser({ email: "test@example.com" });
      const mockProfile = createMockUserProfile({ user_id: mockUser.id });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      mockSupabase.from = fromMock;

      const result = await getSession(mockSupabase as never, "127.0.0.1");

      expect(result.authenticated).toBe(true);
      if (result.authenticated) {
        expect(result.user.email).toBe("test@example.com");
      }
    });

    it("should return anonymous session when not logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: 0,
        error: null,
      });

      const result = await getSession(mockSupabase as never, "127.0.0.1");

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.anonymous_usage.smelts_used_today).toBe(0);
      }
    });

    it("should use provided user instead of fetching", async () => {
      const mockUser = createMockUser({ email: "provided@example.com" });
      const mockProfile = createMockUserProfile({ user_id: mockUser.id });

      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      mockSupabase.from = fromMock;

      const result = await getSession(mockSupabase as never, "127.0.0.1", mockUser as never);

      // Should not call getUser since user was provided
      expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
      expect(result.authenticated).toBe(true);
    });
  });

  describe("exchangeCodeForSession", () => {
    it("should exchange code successfully", async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          user: mockUser,
          session: createMockSession(mockUser),
        },
        error: null,
      });

      const result = await exchangeCodeForSession(mockSupabase as never, "valid-code");

      expect(result.user).toBeDefined();
      expect(["signup", "recovery", "magiclink"]).toContain(result.type);
    });

    it("should throw InvalidTokenError for expired code", async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Token expired", code: "token_expired" },
      });

      await expect(exchangeCodeForSession(mockSupabase as never, "expired-code")).rejects.toThrow(InvalidTokenError);
    });

    it("should throw InvalidTokenError for invalid code", async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid token", code: "invalid_token" },
      });

      await expect(exchangeCodeForSession(mockSupabase as never, "invalid-code")).rejects.toThrow(InvalidTokenError);
    });

    it("should throw InternalError when user is missing", async () => {
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(exchangeCodeForSession(mockSupabase as never, "code")).rejects.toThrow(InternalError);
    });
  });

  describe("resetPassword", () => {
    it("should send reset email successfully", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(resetPassword(mockSupabase as never, "test@example.com")).resolves.toBeUndefined();
    });

    it("should not throw on user not found (security)", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: "User not found", code: "user_not_found" },
      });

      // Should not throw to prevent email enumeration
      await expect(resetPassword(mockSupabase as never, "nonexistent@example.com")).resolves.toBeUndefined();
    });

    it("should throw RateLimitedError on rate limit", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: "Rate limit exceeded", code: "rate_limit" },
      });

      await expect(resetPassword(mockSupabase as never, "test@example.com")).rejects.toThrow(RateLimitedError);
    });
  });

  describe("updatePassword", () => {
    it("should update password successfully", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      });

      await expect(updatePassword(mockSupabase as never, "newPassword123")).resolves.toBeUndefined();
    });

    it("should throw SamePasswordError when using same password", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "New password should be different from same password", code: "same_password" },
      });

      await expect(updatePassword(mockSupabase as never, "samePassword")).rejects.toThrow(SamePasswordError);
    });

    it("should throw InternalError on other errors", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Unknown error", code: "unknown" },
      });

      await expect(updatePassword(mockSupabase as never, "newPassword")).rejects.toThrow(InternalError);
    });
  });

  describe("resendVerification", () => {
    it("should resend verification email successfully", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: {},
        error: null,
      });

      await expect(resendVerification(mockSupabase as never, "test@example.com")).resolves.toBeUndefined();
    });

    it("should not throw on user not found (security)", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: {},
        error: { message: "User not found", code: "user_not_found" },
      });

      await expect(resendVerification(mockSupabase as never, "nonexistent@example.com")).resolves.toBeUndefined();
    });

    it("should throw RateLimitedError on rate limit", async () => {
      mockSupabase.auth.resend.mockResolvedValue({
        data: {},
        error: { message: "Rate limit exceeded", code: "rate_limit" },
      });

      await expect(resendVerification(mockSupabase as never, "test@example.com")).rejects.toThrow(RateLimitedError);
    });
  });

  describe("refreshSession", () => {
    it("should refresh session successfully", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: createMockUser(), session: createMockSession() },
        error: null,
      });

      await expect(refreshSession(mockSupabase as never)).resolves.toBeUndefined();
    });

    it("should throw InternalError on error", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Session expired", code: "session_expired" },
      });

      await expect(refreshSession(mockSupabase as never)).rejects.toThrow(InternalError);
    });
  });
});
