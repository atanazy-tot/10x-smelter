/**
 * User test fixtures using Faker.
 */
import { faker } from "@faker-js/faker";

import type { Database } from "@/db/database.types";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type ApiKeyStatus = Database["public"]["Enums"]["api_key_status"];

/**
 * Creates a mock authenticated user object (Supabase auth.users format)
 */
export function createMockUser(overrides?: {
  id?: string;
  email?: string;
  created_at?: string;
  email_confirmed_at?: string | null;
}) {
  const now = new Date().toISOString();

  return {
    id: overrides?.id ?? faker.string.uuid(),
    email: overrides?.email ?? faker.internet.email(),
    created_at: overrides?.created_at ?? now,
    email_confirmed_at: overrides && "email_confirmed_at" in overrides ? overrides.email_confirmed_at : now,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
  };
}

/**
 * Creates a mock user profile (user_profiles table)
 */
export function createMockUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    user_id: overrides?.user_id ?? faker.string.uuid(),
    credits_remaining: overrides?.credits_remaining ?? 5,
    weekly_credits_max: overrides?.weekly_credits_max ?? 5,
    credits_reset_at: overrides?.credits_reset_at ?? nextWeek,
    api_key_status: overrides?.api_key_status ?? "none",
    api_key_validated_at: overrides?.api_key_validated_at ?? null,
    created_at: overrides?.created_at ?? now,
    updated_at: overrides?.updated_at ?? now,
  };
}

/**
 * Creates a user profile with valid API key (unlimited access)
 */
export function createMockUserWithApiKey(overrides?: Partial<UserProfile>): UserProfile {
  return createMockUserProfile({
    ...overrides,
    api_key_status: "valid" as ApiKeyStatus,
    api_key_validated_at: new Date().toISOString(),
  });
}

/**
 * Creates a user profile with exhausted credits
 */
export function createMockUserWithNoCredits(overrides?: Partial<UserProfile>): UserProfile {
  return createMockUserProfile({
    ...overrides,
    credits_remaining: 0,
  });
}

/**
 * Creates a mock session object
 */
export function createMockSession(user?: ReturnType<typeof createMockUser>) {
  const mockUser = user ?? createMockUser();

  return {
    access_token: faker.string.alphanumeric(64),
    refresh_token: faker.string.alphanumeric(64),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer" as const,
    user: mockUser,
  };
}

/**
 * Creates mock anonymous usage data
 */
export function createMockAnonymousUsage(overrides?: { smelts_used?: number; ip_hash?: string }) {
  return {
    ip_hash: overrides?.ip_hash ?? faker.string.hexadecimal({ length: 64 }).toLowerCase(),
    date_utc: new Date().toISOString().split("T")[0],
    smelts_used: overrides?.smelts_used ?? 0,
  };
}

/**
 * Creates a user that requires email verification (created after cutover)
 */
export function createMockUnverifiedUser() {
  return createMockUser({
    // Date after the EMAIL_VERIFICATION_CUTOVER (2025-05-01)
    created_at: "2025-06-01T00:00:00.000Z",
    email_confirmed_at: null,
  });
}

/**
 * Creates a legacy user that doesn't require email verification
 */
export function createMockLegacyUser() {
  return createMockUser({
    // Date before the EMAIL_VERIFICATION_CUTOVER
    created_at: "2024-01-01T00:00:00.000Z",
    email_confirmed_at: null,
  });
}

/**
 * Common test user IDs for consistent test references
 */
export const TEST_USER_IDS = {
  authenticated: "00000000-0000-0000-0000-000000000001",
  anonymous: "00000000-0000-0000-0000-000000000002",
  admin: "00000000-0000-0000-0000-000000000003",
} as const;

/**
 * Common test IP hashes
 */
export const TEST_IP_HASHES = {
  default: "a".repeat(64),
  alternate: "b".repeat(64),
} as const;
