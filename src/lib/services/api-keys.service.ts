import type { SupabaseClient } from "@/db/supabase.client";
import type { ApiKeyValidationDTO, ApiKeyStatusDTO, ApiKeyDeleteResponseDTO } from "@/types";
import { encrypt } from "@/lib/utils/encryption";
import {
  ApiKeyInvalidError,
  ApiKeyQuotaExhaustedError,
  ApiKeyValidationFailedError,
  NoApiKeyError,
} from "@/lib/utils/api-key-errors";
import { AppError, InternalError } from "@/lib/utils/errors";

/**
 * Validates an API key with OpenRouter and stores it encrypted.
 * Updates user profile with validation status.
 */
export async function validateAndStoreApiKey(
  supabase: SupabaseClient,
  userId: string,
  apiKey: string
): Promise<ApiKeyValidationDTO> {
  try {
    await validateWithOpenRouter(apiKey);

    const encryptedKey = encrypt(apiKey);
    const validatedAt = new Date().toISOString();

    const { error: keyError } = await supabase.from("user_api_keys").upsert({
      user_id: userId,
      encrypted_key: encryptedKey,
      updated_at: validatedAt,
    });

    if (keyError) throw keyError;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        api_key_status: "valid",
        api_key_validated_at: validatedAt,
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    return {
      status: "valid",
      validated_at: validatedAt,
      message: "KEY VALID",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("API key storage error:", error);
    throw new InternalError();
  }
}

/**
 * Gets the current API key status for a user.
 */
export async function getApiKeyStatus(supabase: SupabaseClient, userId: string): Promise<ApiKeyStatusDTO> {
  try {
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("api_key_status, api_key_validated_at")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return {
      has_key: !!keyData,
      status: profile.api_key_status,
      validated_at: profile.api_key_validated_at,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("API key status error:", error);
    throw new InternalError();
  }
}

/**
 * Deletes a user's API key and updates profile status.
 * Returns remaining credits info after deletion.
 */
export async function deleteApiKey(supabase: SupabaseClient, userId: string): Promise<ApiKeyDeleteResponseDTO> {
  try {
    const { data: keyData, error: checkError } = await supabase
      .from("user_api_keys")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (checkError || !keyData) throw new NoApiKeyError();

    const { error: deleteError } = await supabase.from("user_api_keys").delete().eq("user_id", userId);

    if (deleteError) throw deleteError;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({
        api_key_status: "none",
        api_key_validated_at: null,
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    const { data: profile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("credits_remaining, credits_reset_at")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    return {
      message: "API KEY REMOVED",
      credits_remaining: profile.credits_remaining,
      credits_reset_at: profile.credits_reset_at,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("API key deletion error:", error);
    throw new InternalError();
  }
}

/**
 * Validates an API key by making a test request to OpenRouter.
 * Throws typed errors for different failure modes.
 */
async function validateWithOpenRouter(apiKey: string): Promise<void> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) return;

    if (response.status === 401) throw new ApiKeyInvalidError();
    if (response.status === 402 || response.status === 429) {
      throw new ApiKeyQuotaExhaustedError();
    }

    throw new ApiKeyValidationFailedError();
  } catch (error) {
    if (error instanceof ApiKeyInvalidError) throw error;
    if (error instanceof ApiKeyQuotaExhaustedError) throw error;
    if (error instanceof ApiKeyValidationFailedError) throw error;
    console.error("API key validation error:", error);
    throw new ApiKeyValidationFailedError();
  }
}
