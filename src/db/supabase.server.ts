/**
 * Server-side Supabase client for cookie-based authentication.
 * Uses @supabase/ssr for secure HTTP-only cookie session management.
 */

import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

export type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie options for Supabase auth cookies.
 * Using secure, httpOnly cookies with sameSite: lax for CSRF protection.
 */
const COOKIE_OPTIONS = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Creates a server-side Supabase client that uses cookies for auth.
 * Call this in middleware or API routes to get an authenticated client.
 *
 * @param cookieHeader - The Cookie header from the request
 * @param setCookie - Function to set cookies in the response
 */
export function createSupabaseServerClient(
  cookieHeader: string | null,
  setCookie: (name: string, value: string, options: typeof COOKIE_OPTIONS) => void
) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader ?? "");
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          setCookie(name, value, {
            ...COOKIE_OPTIONS,
            ...options,
          });
        });
      },
    },
  });
}

/**
 * Creates a server-side Supabase client using Astro's cookie API.
 * Convenience wrapper for use in Astro middleware and pages.
 *
 * @param request - The incoming request
 * @param cookies - Astro's cookies object
 */
export function createSupabaseServerClientFromAstro(request: Request, cookies: AstroCookies) {
  return createSupabaseServerClient(request.headers.get("Cookie"), (name, value, options) => {
    cookies.set(name, value, options);
  });
}

/**
 * Creates response headers with Set-Cookie from Supabase auth.
 * Use this when you need to return cookies in a Response object.
 */
export function createCookieHeaders(cookies: { name: string; value: string; options?: object }[]): Headers {
  const headers = new Headers();
  cookies.forEach(({ name, value, options }) => {
    const cookieString = serializeCookieHeader(name, value, {
      ...COOKIE_OPTIONS,
      ...options,
    });
    headers.append("Set-Cookie", cookieString);
  });
  return headers;
}
