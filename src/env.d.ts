/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: User | null;
      isAuthenticated: boolean;
      /** @deprecated Use cookie-based auth instead. Will be removed. */
      accessToken: string | null;
    }
  }
}

interface ImportMetaEnv {
  // Server-side only
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly API_KEY_ENCRYPTION_SECRET: string;
  // Client-side (PUBLIC_ prefix exposes to browser)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  // Mock mode for frontend-only testing (set to "true" to enable)
  readonly PUBLIC_MOCK_PROCESSING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
