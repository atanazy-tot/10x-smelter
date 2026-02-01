/**
 * API client wrapper with cookie-based authentication.
 * Uses credentials: "same-origin" to include cookies with requests.
 */

/**
 * Fetch wrapper that includes cookies for authentication.
 * Use this for all API calls that should be authenticated.
 *
 * @example
 * const response = await apiFetch("/api/usage");
 * const data = await response.json();
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);

  // Set default content type for JSON if body is present and not FormData
  if (options?.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin", // Include cookies for authentication
  });
}
