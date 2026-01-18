import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create per-request client (not shared singleton)
  const supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Extract and set session from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: "",
    });
  }

  context.locals.supabase = supabase;

  return next();
});
