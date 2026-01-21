/**
 * Hook for subscribing to smelt processing progress via Supabase Realtime.
 */

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { subscribeWithRetry, type SmeltSubscriptionHandle } from "@/lib/realtime/smelt-subscription";
import { useProcessingStore } from "@/store";
import type { Database } from "@/db/database.types";

export function useSmeltSubscription() {
  const subscriptionRef = useRef<SmeltSubscriptionHandle | null>(null);

  const smeltId = useProcessingStore((state) => state.smeltId);
  const status = useProcessingStore((state) => state.status);
  const handleProgress = useProcessingStore((state) => state.handleProgress);
  const handleCompleted = useProcessingStore((state) => state.handleCompleted);
  const handleFailed = useProcessingStore((state) => state.handleFailed);

  useEffect(() => {
    // Only subscribe when processing and we have a smelt ID
    if (status !== "processing" || !smeltId) {
      return;
    }

    // Create browser client for realtime subscription
    const supabase = createClient<Database>(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Subscribe to realtime updates
    subscriptionRef.current = subscribeWithRetry(supabase, smeltId, {
      onProgress: (payload) => {
        handleProgress(payload.progress, payload.files);
      },
      onCompleted: (payload) => {
        handleCompleted(payload.results);
      },
      onFailed: (payload) => {
        handleFailed(payload.error_code, payload.error_message);
      },
      onError: (error) => {
        console.error("Subscription error:", error);
        handleFailed("connection_lost", "CONNECTION LOST. CHECK YOUR INTERNET AND TRY AGAIN");
      },
    });

    // Cleanup on unmount or when dependencies change
    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [smeltId, status, handleProgress, handleCompleted, handleFailed]);
}
