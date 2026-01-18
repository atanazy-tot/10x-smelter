import { createHash } from "crypto";
import type { SupabaseClient } from "@/db/supabase.client";
import type { AuthResponseDTO, SessionAuthenticatedDTO, SessionAnonymousDTO, SessionDTO } from "@/types";

export async function register(supabase: SupabaseClient, email: string, password: string): Promise<AuthResponseDTO> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) throw error;
  if (!data.user || !data.session || !data.user.email || !data.session.expires_at) {
    throw new Error("Registration failed");
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  };
}

export async function login(supabase: SupabaseClient, email: string, password: string): Promise<AuthResponseDTO> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (!data.user.email || !data.session.expires_at) {
    throw new Error("Login failed");
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  };
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(supabase: SupabaseClient, clientIp: string): Promise<SessionDTO> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.email) {
    return getAuthenticatedSession(supabase, user.id, user.email);
  }
  return getAnonymousSession(supabase, clientIp);
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

  // Use RPC to call security definer function
  const { data, error } = await supabase.rpc("get_anonymous_usage", { ip_hash_param: ipHash });

  if (error) throw error;

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return {
    authenticated: false,
    anonymous_usage: {
      smelts_used_today: data ?? 0,
      daily_limit: 1,
      resets_at: tomorrow.toISOString(),
    },
  };
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
