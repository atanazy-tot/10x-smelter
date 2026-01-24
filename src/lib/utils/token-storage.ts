/**
 * Token storage utilities for managing authentication tokens in localStorage.
 */

import type { AuthSessionDTO } from "@/types";

const TOKEN_KEYS = {
  ACCESS_TOKEN: "smelt_access_token",
  REFRESH_TOKEN: "smelt_refresh_token",
  EXPIRES_AT: "smelt_token_expires_at",
} as const;

/**
 * Save authentication tokens to localStorage.
 */
export function saveTokens(session: AuthSessionDTO): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, session.access_token);
  localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, session.refresh_token);
  localStorage.setItem(TOKEN_KEYS.EXPIRES_AT, session.expires_at.toString());
}

/**
 * Get the current access token from localStorage.
 * Returns null if not found or if running on server.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
}

/**
 * Clear all authentication tokens from localStorage.
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.EXPIRES_AT);
}
