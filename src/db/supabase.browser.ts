/**
 * Browser-side Supabase client for cookie-based authentication.
 * Uses @supabase/ssr for automatic cookie handling.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Gets the singleton browser Supabase client.
 * The client automatically handles cookie-based auth.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  return browserClient;
}
