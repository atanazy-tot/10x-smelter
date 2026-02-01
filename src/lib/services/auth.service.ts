import type { SupabaseClient } from "@/db/supabase.client";
import type { User } from "@supabase/supabase-js";
import { hashIp } from "@/lib/utils/hash";
import type {
  RegisterResponseDTO,
  LoginResponseDTO,
  SessionAuthenticatedDTO,
  SessionAnonymousDTO,
  SessionDTO,
} from "@/types";
import {
  AppError,
  EmailExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidTokenError,
  RateLimitedError,
  SamePasswordError,
  InternalError,
} from "@/lib/utils/auth-errors";
import { ANONYMOUS_DAILY_LIMIT } from "@/lib/constants";

/**
 * Cutover date for email verification requirement.
 * Users created before this date are grandfathered and don't need to verify email.
 */
const EMAIL_VERIFICATION_CUTOVER_DATE = new Date("2026-02-15T00:00:00Z");

/**
 * Check if a user was created after the email verification cutover date.
 */
function requiresEmailVerification(user: User): boolean {
  if (!user.created_at) return true;
  return new Date(user.created_at) > EMAIL_VERIFICATION_CUTOVER_DATE;
}

/**
 * Register a new user account.
 * Sends verification email for new users.
 * Returns message instead of tokens (cookies handled by Supabase SSR).
 */
export async function register(
  supabase: SupabaseClient,
  email: string,
  password: string,
  emailRedirectTo?: string
): Promise<RegisterResponseDTO> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailRedirectTo ?? `${getBaseUrl()}/api/auth/callback`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already registered")) {
        throw new EmailExistsError();
      }
      if (msg.includes("rate limit")) throw new RateLimitedError();
      throw error;
    }

    if (!data.user || !data.user.email) {
      throw new InternalError();
    }

    return {
      user: { id: data.user.id, email: data.user.email },
      message: "CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Registration error:", error);
    throw new InternalError();
  }
}

/**
 * Login with email and password.
 * Checks email verification for users created after cutover date.
 * Session is set via cookies by Supabase SSR.
 */
export async function login(supabase: SupabaseClient, email: string, password: string): Promise<LoginResponseDTO> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        throw new InvalidCredentialsError();
      }
      if (msg.includes("email not confirmed")) {
        throw new EmailNotVerifiedError();
      }
      if (msg.includes("rate limit")) throw new RateLimitedError();
      throw error;
    }

    if (!data.user.email) {
      throw new InternalError();
    }

    // Check email verification for new users (grandfathering)
    if (requiresEmailVerification(data.user) && !data.user.email_confirmed_at) {
      // Sign out since we can't let them in
      await supabase.auth.signOut({ scope: "local" });
      throw new EmailNotVerifiedError();
    }

    // Get profile for response
    const profile = await getAuthenticatedSession(supabase, data.user.id, data.user.email);

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        email_verified: !!data.user.email_confirmed_at,
      },
      profile: profile.profile,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Login error:", error);
    throw new InternalError();
  }
}

/**
 * Logout the current user.
 * Clears the session cookie.
 */
export async function logout(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Logout error:", error);
    throw new InternalError();
  }
}

/**
 * Get current session status.
 * Returns authenticated or anonymous session based on cookie-based auth.
 */
export async function getSession(supabase: SupabaseClient, clientIp: string, user?: User | null): Promise<SessionDTO> {
  try {
    // Use provided user or fetch from session
    const currentUser = user ?? (await supabase.auth.getUser()).data.user;

    if (currentUser && currentUser.email) {
      return getAuthenticatedSession(supabase, currentUser.id, currentUser.email);
    }
    return getAnonymousSession(supabase, clientIp);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Session error:", error);
    throw new InternalError();
  }
}

/**
 * Exchange PKCE code for session.
 * Used in callback after email verification or password reset.
 */
export async function exchangeCodeForSession(
  supabase: SupabaseClient,
  code: string
): Promise<{ user: User; type: "signup" | "recovery" | "magiclink" }> {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid")) {
        throw new InvalidTokenError();
      }
      throw error;
    }

    if (!data.user) {
      throw new InternalError();
    }

    // Determine the type based on session metadata
    const type = data.session?.user?.app_metadata?.provider === "email" ? "signup" : "recovery";
    const actualType = data.user.email_confirmed_at && !data.user.last_sign_in_at ? "signup" : type;

    return {
      user: data.user,
      type: actualType as "signup" | "recovery" | "magiclink",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Code exchange error:", error);
    throw new InternalError();
  }
}

/**
 * Send password reset email.
 */
export async function resetPassword(supabase: SupabaseClient, email: string, redirectTo?: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? `${getBaseUrl()}/api/auth/callback?type=recovery`,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit")) throw new RateLimitedError();
      // Don't throw on user not found - security best practice
      if (!msg.includes("not found")) throw error;
    }
    // Always return success to prevent email enumeration
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Reset password error:", error);
    throw new InternalError();
  }
}

/**
 * Update password for authenticated user.
 * Used after password reset flow or in settings.
 */
export async function updatePassword(supabase: SupabaseClient, password: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("same password")) {
        throw new SamePasswordError();
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Update password error:", error);
    throw new InternalError();
  }
}

/**
 * Resend email verification.
 */
export async function resendVerification(supabase: SupabaseClient, email: string, redirectTo?: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectTo ?? `${getBaseUrl()}/api/auth/callback`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit")) throw new RateLimitedError();
      // Don't throw on user not found - security best practice
      if (!msg.includes("not found")) throw error;
    }
    // Always return success to prevent email enumeration
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Resend verification error:", error);
    throw new InternalError();
  }
}

/**
 * Refresh the current session.
 * Called to extend session before expiry.
 */
export async function refreshSession(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Refresh session error:", error);
    throw new InternalError();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getAuthenticatedSession(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<SessionAuthenticatedDTO> {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("credits_remaining, weekly_credits_max, credits_reset_at, api_key_status, api_key_validated_at")
    .eq("user_id", userId)
    .single();

  if (error) throw error;

  return {
    authenticated: true,
    user: { id: userId, email },
    profile: {
      credits_remaining: profile.credits_remaining,
      weekly_credits_max: profile.weekly_credits_max,
      credits_reset_at: profile.credits_reset_at,
      api_key_status: profile.api_key_status,
      api_key_validated_at: profile.api_key_validated_at,
    },
  };
}

async function getAnonymousSession(supabase: SupabaseClient, clientIp: string): Promise<SessionAnonymousDTO> {
  const ipHash = hashIp(clientIp);

  const { data, error } = await supabase.rpc("get_anonymous_usage", { ip_hash_param: ipHash });

  if (error) throw error;

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    authenticated: false,
    anonymous_usage: {
      smelts_used_today: data ?? 0,
      daily_limit: ANONYMOUS_DAILY_LIMIT,
      resets_at: tomorrow.toISOString(),
    },
  };
}

/**
 * Get base URL for redirects.
 * Uses environment or falls back to localhost for development.
 */
function getBaseUrl(): string {
  // Check for explicit site URL first
  if (typeof import.meta.env.SITE_URL === "string" && import.meta.env.SITE_URL) {
    return import.meta.env.SITE_URL;
  }
  // Fall back to localhost for development
  return import.meta.env.PROD ? "https://smelt.app" : "http://localhost:4321";
}
