/**
 * Client-side subscription functions for real-time smelt progress updates.
 * Provides closure-based subscription management with auto-cleanup and retry support.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { SmeltProgressEventPayloadDTO, SmeltCompletedEventPayloadDTO, SmeltFailedEventPayloadDTO } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Callbacks for smelt subscription events
 */
export interface SmeltSubscriptionCallbacks {
  onProgress?: (payload: SmeltProgressEventPayloadDTO) => void;
  onCompleted?: (payload: SmeltCompletedEventPayloadDTO) => void;
  onFailed?: (payload: SmeltFailedEventPayloadDTO) => void;
  onError?: (error: Error) => void;
}

/**
 * Handle returned by subscription functions for manual cleanup
 */
export interface SmeltSubscriptionHandle {
  unsubscribe: () => void;
}

/**
 * Subscribes to real-time progress updates for a smelt.
 * Automatically unsubscribes when completed or failed events are received.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - The smelt ID to subscribe to
 * @param callbacks - Event callbacks for progress, completion, and failure
 * @returns Handle with unsubscribe method for manual cleanup
 */
export function subscribeToSmelt(
  supabase: SupabaseClient,
  smeltId: string,
  callbacks: SmeltSubscriptionCallbacks
): SmeltSubscriptionHandle {
  let channel: RealtimeChannel | null = null;
  let isUnsubscribed = false;

  const cleanup = () => {
    if (channel && !isUnsubscribed) {
      isUnsubscribed = true;
      supabase.removeChannel(channel);
      channel = null;
    }
  };

  channel = supabase
    .channel(`smelt:${smeltId}`)
    .on("broadcast", { event: "progress" }, (message) => {
      if (isUnsubscribed) return;
      callbacks.onProgress?.(message.payload as SmeltProgressEventPayloadDTO);
    })
    .on("broadcast", { event: "completed" }, (message) => {
      if (isUnsubscribed) return;
      callbacks.onCompleted?.(message.payload as SmeltCompletedEventPayloadDTO);
      cleanup();
    })
    .on("broadcast", { event: "failed" }, (message) => {
      if (isUnsubscribed) return;
      callbacks.onFailed?.(message.payload as SmeltFailedEventPayloadDTO);
      cleanup();
    })
    .subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" && error) {
        callbacks.onError?.(new Error(`Channel error: ${error.message}`));
      }
    });

  return {
    unsubscribe: cleanup,
  };
}

/**
 * Subscribes to smelt with automatic retry on connection errors.
 * Uses exponential backoff (2^n seconds) between retry attempts.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - The smelt ID to subscribe to
 * @param callbacks - Event callbacks for progress, completion, and failure
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Handle with unsubscribe method for manual cleanup
 */
export function subscribeWithRetry(
  supabase: SupabaseClient,
  smeltId: string,
  callbacks: SmeltSubscriptionCallbacks,
  maxRetries = 3
): SmeltSubscriptionHandle {
  let currentHandle: SmeltSubscriptionHandle | null = null;
  let retryCount = 0;
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let isCancelled = false;

  const attemptSubscription = () => {
    if (isCancelled) return;

    const wrappedCallbacks: SmeltSubscriptionCallbacks = {
      onProgress: callbacks.onProgress,
      onCompleted: (payload) => {
        callbacks.onCompleted?.(payload);
      },
      onFailed: (payload) => {
        callbacks.onFailed?.(payload);
      },
      onError: (error) => {
        if (isCancelled) return;

        if (retryCount < maxRetries) {
          retryCount++;
          const delayMs = Math.pow(2, retryCount) * 1000;
          retryTimeoutId = setTimeout(attemptSubscription, delayMs);
        } else {
          callbacks.onError?.(error);
        }
      },
    };

    currentHandle = subscribeToSmelt(supabase, smeltId, wrappedCallbacks);
  };

  attemptSubscription();

  return {
    unsubscribe: () => {
      isCancelled = true;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
      currentHandle?.unsubscribe();
      currentHandle = null;
    },
  };
}
