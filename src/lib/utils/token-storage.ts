/**
 * Token storage utilities - DEPRECATED
 *
 * This module is deprecated. Authentication is now handled via HTTP-only cookies
 * using @supabase/ssr. These functions are kept for backwards compatibility
 * and to clear any existing tokens from localStorage.
 *
 * @deprecated Use cookie-based authentication instead. Tokens are managed
 * automatically by Supabase SSR via secure HTTP-only cookies.
 */

import type { AuthSessionDTO } from "@/types";

const TOKEN_KEYS = {
  ACCESS_TOKEN: "smelt_access_token",
  REFRESH_TOKEN: "smelt_refresh_token",
  EXPIRES_AT: "smelt_token_expires_at",
} as const;

/**
 * @deprecated Tokens are now managed via HTTP-only cookies.
 * This function is kept for backwards compatibility only.
 */
export function saveTokens(session: AuthSessionDTO): void {
  console.warn("saveTokens is deprecated. Authentication now uses HTTP-only cookies.");
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, session.access_token);
  localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, session.refresh_token);
  localStorage.setItem(TOKEN_KEYS.EXPIRES_AT, session.expires_at.toString());
}

/**
 * @deprecated Tokens are now managed via HTTP-only cookies.
 * This function is kept for backwards compatibility only.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Clear all authentication tokens from localStorage.
 * Call this to clean up any legacy tokens after migrating to cookie-based auth.
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.EXPIRES_AT);
}

/**
 * Migrate from localStorage tokens to cookie-based auth.
 * Clears any existing tokens and logs a migration message.
 * Safe to call multiple times.
 */
export function migrateFromLocalStorage(): void {
  if (typeof window === "undefined") return;

  const hasTokens = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  if (hasTokens) {
    console.info("Migrating to cookie-based authentication. Clearing localStorage tokens.");
    clearTokens();
  }
}

// Auto-migrate on module load in browser
if (typeof window !== "undefined") {
  migrateFromLocalStorage();
}
