import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { SupabaseClient } from "@/db/supabase.client";
import type { UsageDTO, UsageAnonymousDTO, UsageAuthenticatedDTO, UsageUnlimitedDTO } from "@/types";
import { hashIp } from "@/lib/utils/hash";
import { InternalError } from "@/lib/utils/errors";

const ANONYMOUS_DAILY_LIMIT = 1;

/**
 * Creates a clean Supabase client without auth headers for anonymous requests.
 * This is needed because the request client may have an invalid token in headers.
 */
function createAnonymousClient(): SupabaseClient {
  return createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Gets usage information for a user (anonymous or authenticated).
 * @param supabase - Supabase client instance
 * @param userId - User ID or null for anonymous users
 * @param clientIp - Client IP address for anonymous user tracking
 * @returns Usage DTO based on user type
 */
export async function getUsage(
  supabase: SupabaseClient,
  userId: string | null,
  clientIp: string
): Promise<UsageDTO> {
  if (!userId) {
    // Use a clean client for anonymous requests to avoid issues with invalid tokens
    const anonymousClient = createAnonymousClient();
    return getAnonymousUsage(anonymousClient, clientIp);
  }
  return getAuthenticatedUsage(supabase, userId);
}

async function getAnonymousUsage(supabase: SupabaseClient, clientIp: string): Promise<UsageAnonymousDTO> {
  try {
    const ipHash = hashIp(clientIp);

    const { data, error } = await supabase.rpc("get_anonymous_usage", { ip_hash_param: ipHash });

    if (error) throw error;

    const smeltsUsedToday = data ?? 0;
    const canProcess = smeltsUsedToday < ANONYMOUS_DAILY_LIMIT;

    return {
      type: "anonymous",
      smelts_used_today: smeltsUsedToday,
      daily_limit: ANONYMOUS_DAILY_LIMIT,
      can_process: canProcess,
      resets_at: getTomorrowMidnightUtc().toISOString(),
    };
  } catch (error) {
    console.error("Anonymous usage error:", error);
    throw new InternalError();
  }
}

async function getAuthenticatedUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageAuthenticatedDTO | UsageUnlimitedDTO> {
  try {
    const { data: profile, error } = await supabase.rpc("get_profile_with_reset", { p_user_id: userId });

    if (error) throw error;

    if (!profile) {
      throw new Error("Profile not found");
    }

    // User with valid API key gets unlimited access
    if (profile.api_key_status === "valid") {
      return {
        type: "unlimited",
        api_key_status: profile.api_key_status,
        can_process: true,
      };
    }

    // Calculate days until reset
    const creditsResetAt = new Date(profile.credits_reset_at);
    const now = new Date();
    const daysUntilReset = Math.ceil((creditsResetAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const canProcess = profile.credits_remaining > 0;
    const creditsUsed = profile.weekly_credits_max - profile.credits_remaining;

    const response: UsageAuthenticatedDTO = {
      type: "authenticated",
      credits_remaining: profile.credits_remaining,
      weekly_credits_max: profile.weekly_credits_max,
      can_process: canProcess,
      resets_at: profile.credits_reset_at,
      days_until_reset: Math.max(0, daysUntilReset),
    };

    // Add message if limit reached
    if (!canProcess) {
      response.message = `${creditsUsed}/${profile.weekly_credits_max} SMELTS USED THIS WEEK. RESETS IN ${Math.max(0, daysUntilReset)} DAYS. OR ADD YOUR API KEY FOR UNLIMITED`;
    }

    return response;
  } catch (error) {
    console.error("Authenticated usage error:", error);
    throw new InternalError();
  }
}

function getTomorrowMidnightUtc(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}
