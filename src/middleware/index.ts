import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { Database } from "@/db/database.types";

/**
 * Middleware that sets up cookie-based Supabase authentication.
 * Creates an authenticated Supabase client and validates the user session.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase client with cookie-based auth
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get("Cookie") ?? "");
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, {
            path: options?.path ?? "/",
            secure: import.meta.env.PROD,
            httpOnly: true,
            sameSite: "lax",
            maxAge: options?.maxAge,
          });
        });
      },
    },
  });

  // Validate user session - this also refreshes the session if needed
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Set locals for use in routes
  context.locals.supabase = supabase;
  context.locals.user = user;
  context.locals.isAuthenticated = !!user && !error;
  context.locals.accessToken = null; // Deprecated - kept for backwards compatibility

  return next();
});
