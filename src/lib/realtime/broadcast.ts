/**
 * Server-side broadcasting functions for real-time smelt progress updates.
 * Uses Supabase Realtime channels to broadcast processing events to subscribers.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SmeltStatus, SmeltErrorCode, SmeltFileProgressDTO, SmeltResultDTO, SmeltProgressDTO } from "@/types";

/**
 * Broadcaster class that maintains a persistent channel for a smelt's processing lifecycle.
 * Creates channel once, subscribes, broadcasts multiple events, then cleans up.
 */
export class SmeltBroadcaster {
  private channel: RealtimeChannel;
  private subscribed = false;

  constructor(
    private supabase: SupabaseClient,
    private smeltId: string
  ) {
    this.channel = supabase.channel(`smelt:${smeltId}`);
  }

  /**
   * Initializes the channel by subscribing to it.
   * Must be called before broadcasting.
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          this.subscribed = true;
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(`Channel subscription failed: ${status} ${error?.message || ""}`));
        }
      });
    });
  }

  /**
   * Broadcasts a progress update.
   */
  async progress(
    status: SmeltStatus,
    percentage: number,
    message: string,
    files: SmeltFileProgressDTO[]
  ): Promise<void> {
    if (!this.subscribed) {
      console.warn("Broadcasting without subscription - message may not be delivered");
    }

    const progress: SmeltProgressDTO = {
      percentage,
      stage: status,
      message,
    };

    await this.channel.send({
      type: "broadcast",
      event: "progress",
      payload: {
        smelt_id: this.smeltId,
        status,
        progress,
        files,
      },
    });
  }

  /**
   * Broadcasts a completion event.
   */
  async completed(results: SmeltResultDTO[]): Promise<void> {
    await this.channel.send({
      type: "broadcast",
      event: "completed",
      payload: {
        smelt_id: this.smeltId,
        status: "completed",
        results,
      },
    });
  }

  /**
   * Broadcasts a failure event.
   */
  async failed(errorCode: SmeltErrorCode, errorMessage: string): Promise<void> {
    await this.channel.send({
      type: "broadcast",
      event: "failed",
      payload: {
        smelt_id: this.smeltId,
        status: "failed",
        error_code: errorCode,
        error_message: errorMessage,
      },
    });
  }

  /**
   * Cleans up the channel. Should be called when processing completes.
   */
  async cleanup(): Promise<void> {
    await this.supabase.removeChannel(this.channel);
    this.subscribed = false;
  }
}

// Legacy function exports for backwards compatibility
export async function broadcastProgress(
  supabase: SupabaseClient,
  smeltId: string,
  status: SmeltStatus,
  percentage: number,
  message: string,
  files: SmeltFileProgressDTO[]
): Promise<void> {
  const broadcaster = new SmeltBroadcaster(supabase, smeltId);
  try {
    await broadcaster.init();
    await broadcaster.progress(status, percentage, message, files);
  } finally {
    await broadcaster.cleanup();
  }
}

export async function broadcastCompleted(
  supabase: SupabaseClient,
  smeltId: string,
  results: SmeltResultDTO[]
): Promise<void> {
  const broadcaster = new SmeltBroadcaster(supabase, smeltId);
  try {
    await broadcaster.init();
    await broadcaster.completed(results);
  } finally {
    await broadcaster.cleanup();
  }
}

export async function broadcastFailed(
  supabase: SupabaseClient,
  smeltId: string,
  errorCode: SmeltErrorCode,
  errorMessage: string
): Promise<void> {
  const broadcaster = new SmeltBroadcaster(supabase, smeltId);
  try {
    await broadcaster.init();
    await broadcaster.failed(errorCode, errorMessage);
  } finally {
    await broadcaster.cleanup();
  }
}
