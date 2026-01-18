import type { SupabaseClient } from "@/db/supabase.client";
import type { UserProfileDTO } from "@/types";
import { AppError, InternalError, NotFoundError } from "@/lib/utils/auth-errors";

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<UserProfileDTO> {
  try {
    const { data: profile, error } = await supabase.rpc("get_profile_with_reset", { p_user_id: userId });

    if (error) throw error;

    if (!profile) {
      throw new NotFoundError("profile_not_found", "PROFILE NOT FOUND");
    }

    return {
      user_id: profile.user_id,
      credits_remaining: profile.credits_remaining,
      weekly_credits_max: profile.weekly_credits_max,
      credits_reset_at: profile.credits_reset_at,
      api_key_status: profile.api_key_status,
      api_key_validated_at: profile.api_key_validated_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Profile error:", error);
    throw new InternalError();
  }
}
