/**
 * Smelt processing pipeline with real-time progress broadcasting.
 * Orchestrates the full processing workflow: validation → decoding → transcribing → synthesizing.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { SmeltStatus, SmeltErrorCode, SmeltFileStatus, SmeltFileProgressDTO, SmeltResultDTO } from "@/types";
import { SmeltBroadcaster } from "./broadcast";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Processing stage configuration
 */
interface ProcessingStage {
  status: SmeltStatus;
  percentageStart: number;
  percentageEnd: number;
  message: string;
}

const PROCESSING_STAGES: Record<string, ProcessingStage> = {
  validating: { status: "validating", percentageStart: 0, percentageEnd: 10, message: "Validating files..." },
  decoding: { status: "decoding", percentageStart: 10, percentageEnd: 20, message: "Decoding audio..." },
  transcribing: { status: "transcribing", percentageStart: 20, percentageEnd: 70, message: "Transcribing audio..." },
  synthesizing: { status: "synthesizing", percentageStart: 70, percentageEnd: 100, message: "Generating output..." },
};

/**
 * Processes a smelt through all pipeline stages with real-time progress updates.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - The smelt ID to process
 */
export async function processSmelt(supabase: SupabaseClient, smeltId: string): Promise<void> {
  const broadcaster = new SmeltBroadcaster(supabase, smeltId);

  try {
    // Initialize the broadcast channel
    await broadcaster.init();
    console.log(`[processSmelt] Started processing smelt ${smeltId}`);

    // Small delay to allow subscribers to connect
    await delay(500);

    // Stage 1: Validating (0-10%)
    await updateSmeltStatus(supabase, smeltId, "validating");
    let files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("validating", 5, "Validating files...", files);

    await delay(200);
    await validateFiles(supabase, smeltId);
    files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("validating", 10, "Files validated", files);

    // Stage 2: Decoding (10-20%)
    await delay(200);
    await updateSmeltStatus(supabase, smeltId, "decoding");
    await broadcaster.progress("decoding", 15, "Decoding audio...", files);

    await delay(200);
    await decodeAudio(supabase, smeltId);
    files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("decoding", 20, "Audio decoded", files);

    // Stage 3: Transcribing (20-70%)
    await delay(200);
    await updateSmeltStatus(supabase, smeltId, "transcribing");
    await transcribeAudio(supabase, smeltId, async (progress) => {
      const percentage = 20 + Math.floor(progress * 50);
      files = await getFileProgress(supabase, smeltId);
      await broadcaster.progress("transcribing", percentage, "Transcribing audio...", files);
      await delay(100);
    });
    files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("transcribing", 70, "Transcription complete", files);

    // Stage 4: Synthesizing (70-100%)
    await delay(200);
    await updateSmeltStatus(supabase, smeltId, "synthesizing");
    await broadcaster.progress("synthesizing", 85, "Generating output...", files);

    await delay(200);
    const results = await generateResults(supabase, smeltId);
    await broadcaster.progress("synthesizing", 95, "Finalizing...", files);

    // Complete
    await delay(100);
    await updateSmeltStatus(supabase, smeltId, "completed");
    await broadcaster.completed(results);

    console.log(`[processSmelt] Completed smelt ${smeltId}`);
  } catch (error) {
    console.error(`[processSmelt] Error processing smelt ${smeltId}:`, error);

    const errorCode = mapErrorToCode(error);
    const errorMessage = mapErrorToMessage(error);

    await updateSmeltStatus(supabase, smeltId, "failed", errorCode, errorMessage);
    await broadcaster.failed(errorCode, errorMessage);
  } finally {
    await broadcaster.cleanup();
  }
}

/**
 * Updates the smelt status in the database.
 */
async function updateSmeltStatus(
  supabase: SupabaseClient,
  smeltId: string,
  status: SmeltStatus,
  errorCode?: SmeltErrorCode,
  errorMessage?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };

  if (status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  if (status === "failed" && errorCode) {
    update.error_code = errorCode;
    update.error_message = errorMessage;
  }

  const { error } = await supabase.from("smelts").update(update).eq("id", smeltId);

  if (error) {
    console.error("Failed to update smelt status:", error);
    throw error;
  }
}

/**
 * Gets current progress for all files in a smelt.
 */
async function getFileProgress(supabase: SupabaseClient, smeltId: string): Promise<SmeltFileProgressDTO[]> {
  const { data, error } = await supabase
    .from("smelt_files")
    .select("id, status, position")
    .eq("smelt_id", smeltId)
    .order("position");

  if (error) {
    console.error("Failed to get file progress:", error);
    return [];
  }

  return (data ?? []).map((file) => ({
    id: file.id,
    status: file.status as SmeltFileStatus,
    progress: statusToProgress(file.status as SmeltFileStatus),
  }));
}

/**
 * Validates files for processing.
 * Checks file format, size limits, and content integrity.
 */
async function validateFiles(supabase: SupabaseClient, smeltId: string): Promise<void> {
  // Update file statuses to processing
  await supabase.from("smelt_files").update({ status: "processing" }).eq("smelt_id", smeltId);

  // TODO: Implement actual file validation
  // - Check file sizes against limits
  // - Validate audio formats
  // - Verify file integrity

  // For now, mark files as completed (validated)
  await supabase.from("smelt_files").update({ status: "completed" }).eq("smelt_id", smeltId);
}

/**
 * Decodes audio files to a standard format for transcription.
 */
async function decodeAudio(supabase: SupabaseClient, smeltId: string): Promise<void> {
  // Update file statuses to processing
  await supabase.from("smelt_files").update({ status: "processing" }).eq("smelt_id", smeltId);

  // TODO: Implement actual audio decoding
  // - Convert to standard format (e.g., WAV/PCM)
  // - Extract audio duration
  // - Handle different input types

  // Mark files as completed (decoded)
  await supabase.from("smelt_files").update({ status: "completed" }).eq("smelt_id", smeltId);
}

/**
 * Transcribes audio content using speech-to-text.
 * Reports incremental progress via callback.
 */
async function transcribeAudio(
  supabase: SupabaseClient,
  smeltId: string,
  onProgress: (progress: number) => Promise<void>
): Promise<void> {
  // Update file statuses to processing
  await supabase.from("smelt_files").update({ status: "processing" }).eq("smelt_id", smeltId);

  // TODO: Implement actual transcription
  // - Send to transcription service (Whisper, etc.)
  // - Handle streaming progress updates
  // - Store transcription results

  // Simulate incremental progress
  for (let i = 1; i <= 5; i++) {
    await onProgress(i / 5);
  }

  // Mark files as completed (transcribed)
  await supabase.from("smelt_files").update({ status: "completed" }).eq("smelt_id", smeltId);
}

/**
 * Generates final results by applying prompts to transcribed content.
 */
async function generateResults(supabase: SupabaseClient, smeltId: string): Promise<SmeltResultDTO[]> {
  // Get smelt with files
  const { data: smelt, error: smeltError } = await supabase
    .from("smelts")
    .select("*, smelt_files(*)")
    .eq("id", smeltId)
    .single();

  if (smeltError || !smelt) {
    throw new Error("Failed to load smelt for result generation");
  }

  // TODO: Implement actual result generation
  // - Load default prompts by name
  // - Load user prompt if specified
  // - Apply prompts to transcription
  // - Generate formatted output

  const results: SmeltResultDTO[] = (smelt.smelt_files ?? []).map((file: { id: string; filename: string | null }) => ({
    file_id: file.id,
    filename: file.filename ?? "unknown",
    content: "Processed content placeholder",
  }));

  return results;
}

/**
 * Converts file status to progress percentage.
 */
function statusToProgress(status: SmeltFileStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "processing":
      return 50;
    case "completed":
      return 100;
    case "failed":
      return 0;
    default:
      return 0;
  }
}

/**
 * Maps an error to a standardized error code.
 */
function mapErrorToCode(error: unknown): SmeltErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("too large") || message.includes("size")) {
      return "file_too_large";
    }
    if (message.includes("format") || message.includes("invalid")) {
      return "invalid_format";
    }
    if (message.includes("duration") || message.includes("long")) {
      return "duration_exceeded";
    }
    if (message.includes("corrupt")) {
      return "corrupted_file";
    }
    if (message.includes("transcri")) {
      return "transcription_failed";
    }
    if (message.includes("synthesis") || message.includes("prompt")) {
      return "synthesis_failed";
    }
    if (message.includes("rate") && message.includes("limit")) {
      return "api_rate_limited";
    }
    if (message.includes("quota") || message.includes("exhausted")) {
      return "api_quota_exhausted";
    }
    if (message.includes("api") && message.includes("key")) {
      return "api_key_invalid";
    }
    if (message.includes("connection") || message.includes("lost")) {
      return "connection_lost";
    }
  }

  return "internal_error";
}

/**
 * Maps an error to a human-readable error message.
 */
function mapErrorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred during processing";
}
