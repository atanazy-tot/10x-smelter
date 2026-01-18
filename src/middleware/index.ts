import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Extract access token from Authorization header for later use
  const authHeader = context.request.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  context.locals.supabase = supabase;
  context.locals.accessToken = accessToken;

  return next();
});
