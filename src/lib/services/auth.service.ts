import type { SupabaseClient } from "@/db/supabase.client";
import { hashIp } from "@/lib/utils/hash";
import type { AuthResponseDTO, SessionAuthenticatedDTO, SessionAnonymousDTO, SessionDTO } from "@/types";
import {
  AppError,
  EmailExistsError,
  InvalidCredentialsError,
  RateLimitedError,
  InternalError,
} from "@/lib/utils/auth-errors";
import { ANONYMOUS_DAILY_LIMIT } from "@/lib/constants";

export async function register(supabase: SupabaseClient, email: string, password: string): Promise<AuthResponseDTO> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already registered")) {
        throw new EmailExistsError();
      }
      if (msg.includes("rate limit")) throw new RateLimitedError();
      throw error;
    }

    if (!data.user || !data.session || !data.user.email || !data.session.expires_at) {
      throw new InternalError();
    }

    return {
      user: { id: data.user.id, email: data.user.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Registration error:", error);
    throw new InternalError();
  }
}

export async function login(supabase: SupabaseClient, email: string, password: string): Promise<AuthResponseDTO> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        throw new InvalidCredentialsError();
      }
      if (msg.includes("rate limit")) throw new RateLimitedError();
      throw error;
    }

    if (!data.user.email || !data.session.expires_at) {
      throw new InternalError();
    }

    return {
      user: { id: data.user.id, email: data.user.email },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Login error:", error);
    throw new InternalError();
  }
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Logout error:", error);
    throw new InternalError();
  }
}

export async function getSession(
  supabase: SupabaseClient,
  clientIp: string,
  accessToken?: string | null
): Promise<SessionDTO> {
  try {
    const {
      data: { user },
    } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

    if (user && user.email) {
      return getAuthenticatedSession(supabase, user.id, user.email);
    }
    return getAnonymousSession(supabase, clientIp);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Session error:", error);
    throw new InternalError();
  }
}

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
