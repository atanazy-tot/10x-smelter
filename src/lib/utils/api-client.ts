/**
 * Authenticated fetch wrapper that automatically adds Authorization headers.
 */

import { getAccessToken } from "./token-storage";

/**
 * Fetch wrapper that automatically includes Authorization header if token exists.
 * Use this for all API calls that should be authenticated.
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
