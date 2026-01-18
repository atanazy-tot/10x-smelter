import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract access token from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Create Supabase client with the user's token in global headers
  // This ensures RLS policies see the correct auth.uid()
  const supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  context.locals.supabase = supabase;
  context.locals.accessToken = accessToken;

  return next();
});
