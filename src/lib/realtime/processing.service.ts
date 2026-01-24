/**
 * Smelt processing pipeline with real-time progress broadcasting.
 * Orchestrates the full processing workflow: validation → decoding → transcribing → synthesizing.
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type {
  SmeltStatus,
  SmeltErrorCode,
  SmeltFileStatus,
  SmeltFileProgressDTO,
  SmeltResultDTO,
  DefaultPromptName,
} from "@/types";
import { SmeltBroadcaster } from "./broadcast";
import { validateAudioBuffer } from "@/lib/services/audio/validation";
import { transcribeAudioBuffer, processTextInput, type TranscriptionResult } from "@/lib/services/audio/transcription";
import { loadPrompts } from "@/lib/services/prompts/loader";
import { synthesizeWithMultiplePrompts, combineTranscripts, createBasicOutput } from "@/lib/services/synthesis";
import { downloadFile, downloadTextContent, storeResults } from "@/lib/services/storage";
import { decrypt } from "@/lib/utils/encryption";
import {
  FileTooLargeError,
  InvalidFormatError,
  DurationExceededError,
  CorruptedFileError,
  TranscriptionError,
  SynthesisError,
  LLMRateLimitError,
  LLMAPIError,
} from "@/lib/utils/errors";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * In-memory file data for anonymous users (no storage).
 * Exported for use in smelts.service.ts.
 */
export interface InMemoryFile {
  id: string;
  filename: string;
  inputType: "audio" | "text";
  buffer?: Buffer;
  text?: string;
  mimeType?: string;
}

/**
 * Smelt options passed directly for anonymous processing.
 */
export interface AnonymousSmeltOptions {
  mode: "separate" | "combine";
  defaultPromptNames: string[];
  userPromptId: string | null;
}

/**
 * File data loaded from storage.
 */
interface LoadedFile {
  id: string;
  filename: string;
  inputType: "audio" | "text";
  buffer?: Buffer;
  text?: string;
  mimeType?: string;
  format?: string;
}

/**
 * Transcribed file with content.
 */
interface TranscribedFile {
  id: string;
  filename: string;
  transcript: string;
  durationSeconds: number;
}

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

    // Get smelt details and API key
    const smelt = await loadSmeltDetails(supabase, smeltId);
    const apiKey = await getUserApiKey(supabase, smelt.userId);

    // Stage 1: Validating (0-10%)
    await updateSmeltStatus(supabase, smeltId, "validating");
    let files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("validating", 5, "Validating files...", files);

    await delay(200);
    const loadedFiles = await validateAndLoadFiles(supabase, smeltId);
    files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("validating", 10, "Files validated", files);

    // Stage 2: Decoding (10-20%)
    await delay(200);
    await updateSmeltStatus(supabase, smeltId, "decoding");
    await broadcaster.progress("decoding", 15, "Preparing audio...", files);

    await delay(200);
    // Decoding happens as part of transcription (FFmpeg conversion)
    await markFilesStatus(supabase, smeltId, "processing");
    files = await getFileProgress(supabase, smeltId);
    await broadcaster.progress("decoding", 20, "Audio prepared", files);

    // Stage 3: Transcribing (20-70%)
    await delay(200);
    await updateSmeltStatus(supabase, smeltId, "transcribing");
    const transcribedFiles = await transcribeFiles(supabase, smeltId, loadedFiles, apiKey, async (progress) => {
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
    const results = await generateResults(supabase, smeltId, smelt, transcribedFiles, apiKey);
    await broadcaster.progress("synthesizing", 95, "Finalizing...", files);

    // Complete
    await delay(100);
    await updateSmeltStatus(supabase, smeltId, "completed");
    await broadcaster.completed(results);

    // Clean up source files from storage (keep results)
    await cleanupSourceFiles(supabase, smeltId, loadedFiles);

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
 * Processes a smelt with in-memory files (for anonymous users).
 * This version doesn't download from storage or store results - everything is in-memory.
 * Results are delivered only via WebSocket broadcast.
 *
 * @param supabase - Supabase client instance (anon client is fine)
 * @param smeltId - The smelt ID to process
 * @param files - In-memory file data
 * @param options - Smelt options (mode, prompts)
 */
export async function processSmeltWithFiles(
  supabase: SupabaseClient,
  smeltId: string,
  files: InMemoryFile[],
  options: AnonymousSmeltOptions
): Promise<void> {
  const broadcaster = new SmeltBroadcaster(supabase, smeltId);

  try {
    // Initialize the broadcast channel
    await broadcaster.init();
    console.log(`[processSmeltWithFiles] Started processing anonymous smelt ${smeltId}`);

    // Small delay to allow subscribers to connect
    await delay(500);

    // Stage 1: Validating (0-10%)
    await tryUpdateSmeltStatus(supabase, smeltId, "validating");
    let fileProgress = files.map((f) => ({ id: f.id, status: "pending" as SmeltFileStatus, progress: 0 }));
    await broadcaster.progress("validating", 5, "Validating files...", fileProgress);

    await delay(200);
    const loadedFiles = validateInMemoryFiles(files);
    fileProgress = files.map((f) => ({ id: f.id, status: "processing" as SmeltFileStatus, progress: 50 }));
    await broadcaster.progress("validating", 10, "Files validated", fileProgress);

    // Stage 2: Decoding (10-20%)
    await delay(200);
    await tryUpdateSmeltStatus(supabase, smeltId, "decoding");
    await broadcaster.progress("decoding", 15, "Preparing audio...", fileProgress);

    await delay(200);
    await broadcaster.progress("decoding", 20, "Audio prepared", fileProgress);

    // Stage 3: Transcribing (20-70%)
    await delay(200);
    await tryUpdateSmeltStatus(supabase, smeltId, "transcribing");
    const transcribedFiles = await transcribeInMemoryFiles(loadedFiles, undefined, async (progress) => {
      const percentage = 20 + Math.floor(progress * 50);
      await broadcaster.progress("transcribing", percentage, "Transcribing audio...", fileProgress);
      await delay(100);
    });
    fileProgress = files.map((f) => ({ id: f.id, status: "completed" as SmeltFileStatus, progress: 100 }));
    await broadcaster.progress("transcribing", 70, "Transcription complete", fileProgress);

    // Stage 4: Synthesizing (70-100%)
    await delay(200);
    await tryUpdateSmeltStatus(supabase, smeltId, "synthesizing");
    await broadcaster.progress("synthesizing", 85, "Generating output...", fileProgress);

    await delay(200);
    const results = await generateResultsInMemory(
      supabase,
      {
        mode: options.mode,
        defaultPromptNames: options.defaultPromptNames as DefaultPromptName[],
        userPromptId: options.userPromptId,
      },
      transcribedFiles
    );
    await broadcaster.progress("synthesizing", 95, "Finalizing...", fileProgress);

    // Complete
    await delay(100);
    await tryUpdateSmeltStatus(supabase, smeltId, "completed");
    await broadcaster.completed(results);

    console.log(`[processSmeltWithFiles] Completed anonymous smelt ${smeltId}`);
  } catch (error) {
    console.error(`[processSmeltWithFiles] Error processing anonymous smelt ${smeltId}:`, error);

    const errorCode = mapErrorToCode(error);
    const errorMessage = mapErrorToMessage(error);

    await tryUpdateSmeltStatus(supabase, smeltId, "failed", errorCode, errorMessage);
    await broadcaster.failed(errorCode, errorMessage);
  } finally {
    await broadcaster.cleanup();
  }
}

/**
 * Tries to update smelt status, but doesn't throw if it fails (for anonymous users).
 * Anonymous users may not have UPDATE permissions on smelts table.
 */
async function tryUpdateSmeltStatus(
  supabase: SupabaseClient,
  smeltId: string,
  status: SmeltStatus,
  errorCode?: SmeltErrorCode,
  errorMessage?: string
): Promise<void> {
  try {
    await updateSmeltStatus(supabase, smeltId, status, errorCode, errorMessage);
  } catch {
    // Silently ignore - WebSocket broadcast is the primary feedback for anonymous users
    console.log(`[processSmeltWithFiles] Status update skipped for anonymous smelt (expected): ${status}`);
  }
}

/**
 * Validates in-memory files and prepares them for processing.
 */
function validateInMemoryFiles(files: InMemoryFile[]): LoadedFile[] {
  const loadedFiles: LoadedFile[] = [];

  for (const file of files) {
    if (file.inputType === "audio" && file.buffer) {
      // Validate the audio file
      const { format, mimeType } = validateAudioBuffer(file.buffer, file.mimeType ?? "audio/mpeg", file.filename);

      loadedFiles.push({
        id: file.id,
        filename: file.filename,
        inputType: "audio",
        buffer: file.buffer,
        mimeType,
        format,
      });
    } else if (file.inputType === "text" && file.text) {
      loadedFiles.push({
        id: file.id,
        filename: file.filename,
        inputType: "text",
        text: file.text,
      });
    } else {
      throw new CorruptedFileError("INVALID FILE DATA");
    }
  }

  return loadedFiles;
}

/**
 * Transcribes in-memory files (no database updates).
 */
async function transcribeInMemoryFiles(
  loadedFiles: LoadedFile[],
  apiKey: string | undefined,
  onProgress: (progress: number) => Promise<void>
): Promise<TranscribedFile[]> {
  const transcribedFiles: TranscribedFile[] = [];
  const totalFiles = loadedFiles.length;

  for (let i = 0; i < loadedFiles.length; i++) {
    const file = loadedFiles[i];
    let result: TranscriptionResult;

    if (file.inputType === "audio" && file.buffer && file.format) {
      // Transcribe audio
      result = await transcribeAudioBuffer(file.buffer, file.format, { apiKey }, async (progress) => {
        const fileProgress = (i + progress) / totalFiles;
        await onProgress(fileProgress);
      });
    } else if (file.inputType === "text" && file.text) {
      // Text input - no transcription needed
      result = await processTextInput(file.text);
    } else {
      throw new TranscriptionError("INVALID FILE DATA");
    }

    transcribedFiles.push({
      id: file.id,
      filename: file.filename,
      transcript: result.transcript,
      durationSeconds: result.durationSeconds,
    });

    await onProgress((i + 1) / totalFiles);
  }

  return transcribedFiles;
}

/**
 * Generates results in-memory (no storage).
 */
async function generateResultsInMemory(
  supabase: SupabaseClient,
  smelt: {
    mode: "separate" | "combine";
    defaultPromptNames: DefaultPromptName[];
    userPromptId: string | null;
  },
  transcribedFiles: TranscribedFile[],
  apiKey?: string
): Promise<SmeltResultDTO[]> {
  // Load prompts (userPromptId is always null for anonymous users)
  const prompts = await loadPrompts(supabase, smelt.defaultPromptNames, smelt.userPromptId);

  const results: SmeltResultDTO[] = [];

  if (smelt.mode === "combine") {
    // Combine all transcripts and process as one
    const combinedTranscript = combineTranscripts(
      transcribedFiles.map((f) => ({ filename: f.filename, transcript: f.transcript }))
    );

    if (prompts.length > 0) {
      const { combined } = await synthesizeWithMultiplePrompts(combinedTranscript, prompts, { apiKey });

      results.push({
        file_id: "combined",
        filename: "Combined Output",
        content: combined,
      });
    } else {
      // No prompts - return combined transcript
      const output = createBasicOutput(combinedTranscript, "Combined Transcript");

      results.push({
        file_id: "combined",
        filename: "Combined Output",
        content: output,
      });
    }
  } else {
    // Process each file separately
    for (const file of transcribedFiles) {
      let content: string;

      if (prompts.length > 0) {
        const { combined } = await synthesizeWithMultiplePrompts(file.transcript, prompts, { apiKey });
        content = combined;
      } else {
        content = createBasicOutput(file.transcript, file.filename);
      }

      results.push({
        file_id: file.id,
        filename: file.filename,
        content,
      });
    }
  }

  return results;
}

/**
 * Loads smelt details from the database.
 */
async function loadSmeltDetails(
  supabase: SupabaseClient,
  smeltId: string
): Promise<{
  userId: string | null;
  mode: "separate" | "combine";
  defaultPromptNames: DefaultPromptName[];
  userPromptId: string | null;
}> {
  const { data, error } = await supabase
    .from("smelts")
    .select("user_id, mode, default_prompt_names, user_prompt_id")
    .eq("id", smeltId)
    .single();

  if (error || !data) {
    throw new Error("Failed to load smelt details");
  }

  return {
    userId: data.user_id,
    mode: data.mode as "separate" | "combine",
    defaultPromptNames: data.default_prompt_names as DefaultPromptName[],
    userPromptId: data.user_prompt_id,
  };
}

/**
 * Gets the user's decrypted API key if available.
 */
async function getUserApiKey(supabase: SupabaseClient, userId: string | null): Promise<string | undefined> {
  if (!userId) return undefined;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("api_key_status")
    .eq("user_id", userId)
    .single();

  if (profile?.api_key_status !== "valid") return undefined;

  const { data: keyData } = await supabase.from("user_api_keys").select("encrypted_key").eq("user_id", userId).single();

  if (!keyData?.encrypted_key) return undefined;

  try {
    return decrypt(keyData.encrypted_key);
  } catch {
    console.error("[processSmelt] Failed to decrypt API key");
    return undefined;
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
 * Validates and loads files from storage.
 */
async function validateAndLoadFiles(supabase: SupabaseClient, smeltId: string): Promise<LoadedFile[]> {
  await markFilesStatus(supabase, smeltId, "processing");

  const { data: fileRecords, error } = await supabase
    .from("smelt_files")
    .select("id, filename, input_type, size_bytes")
    .eq("smelt_id", smeltId)
    .order("position");

  if (error || !fileRecords) {
    throw new Error("Failed to load file records");
  }

  const loadedFiles: LoadedFile[] = [];

  for (const record of fileRecords) {
    if (record.input_type === "audio") {
      const downloaded = await downloadFile(supabase, smeltId, record.id);
      if (!downloaded) {
        throw new CorruptedFileError("COULD NOT LOAD AUDIO FILE");
      }

      // Validate the audio file
      const { format, mimeType } = validateAudioBuffer(
        downloaded.buffer,
        downloaded.mimeType,
        record.filename ?? undefined
      );

      loadedFiles.push({
        id: record.id,
        filename: record.filename ?? "audio.mp3",
        inputType: "audio",
        buffer: downloaded.buffer,
        mimeType,
        format,
      });
    } else {
      // Text input
      const text = await downloadTextContent(supabase, smeltId, record.id);
      if (!text) {
        throw new CorruptedFileError("COULD NOT LOAD TEXT CONTENT");
      }

      loadedFiles.push({
        id: record.id,
        filename: record.filename ?? "text-input.txt",
        inputType: "text",
        text,
      });
    }
  }

  await markFilesStatus(supabase, smeltId, "completed");
  return loadedFiles;
}

/**
 * Marks all files in a smelt with a status.
 */
async function markFilesStatus(supabase: SupabaseClient, smeltId: string, status: SmeltFileStatus): Promise<void> {
  await supabase.from("smelt_files").update({ status }).eq("smelt_id", smeltId);
}

/**
 * Transcribes all files.
 */
async function transcribeFiles(
  supabase: SupabaseClient,
  smeltId: string,
  loadedFiles: LoadedFile[],
  apiKey: string | undefined,
  onProgress: (progress: number) => Promise<void>
): Promise<TranscribedFile[]> {
  await markFilesStatus(supabase, smeltId, "processing");

  const transcribedFiles: TranscribedFile[] = [];
  const totalFiles = loadedFiles.length;

  for (let i = 0; i < loadedFiles.length; i++) {
    const file = loadedFiles[i];
    let result: TranscriptionResult;

    if (file.inputType === "audio" && file.buffer && file.format) {
      // Transcribe audio
      result = await transcribeAudioBuffer(file.buffer, file.format, { apiKey }, async (progress) => {
        const fileProgress = (i + progress) / totalFiles;
        await onProgress(fileProgress);
      });

      // Update file duration in database
      await supabase
        .from("smelt_files")
        .update({ duration_seconds: Math.round(result.durationSeconds) })
        .eq("id", file.id);
    } else if (file.inputType === "text" && file.text) {
      // Text input - no transcription needed
      result = await processTextInput(file.text);
    } else {
      throw new TranscriptionError("INVALID FILE DATA");
    }

    transcribedFiles.push({
      id: file.id,
      filename: file.filename,
      transcript: result.transcript,
      durationSeconds: result.durationSeconds,
    });

    await onProgress((i + 1) / totalFiles);
  }

  await markFilesStatus(supabase, smeltId, "completed");
  return transcribedFiles;
}

/**
 * Generates final results by applying prompts to transcribed content.
 */
async function generateResults(
  supabase: SupabaseClient,
  smeltId: string,
  smelt: {
    mode: "separate" | "combine";
    defaultPromptNames: DefaultPromptName[];
    userPromptId: string | null;
  },
  transcribedFiles: TranscribedFile[],
  apiKey: string | undefined
): Promise<SmeltResultDTO[]> {
  // Load prompts
  const prompts = await loadPrompts(supabase, smelt.defaultPromptNames, smelt.userPromptId);

  const results: SmeltResultDTO[] = [];

  if (smelt.mode === "combine") {
    // Combine all transcripts and process as one
    const combinedTranscript = combineTranscripts(
      transcribedFiles.map((f) => ({ filename: f.filename, transcript: f.transcript }))
    );

    if (prompts.length > 0) {
      const { combined } = await synthesizeWithMultiplePrompts(combinedTranscript, prompts, { apiKey });

      // Store as a single combined result
      await storeResults(supabase, smeltId, "combined", combined);

      results.push({
        file_id: "combined",
        filename: "Combined Output",
        content: combined,
      });
    } else {
      // No prompts - return combined transcript
      const output = createBasicOutput(combinedTranscript, "Combined Transcript");
      await storeResults(supabase, smeltId, "combined", output);

      results.push({
        file_id: "combined",
        filename: "Combined Output",
        content: output,
      });
    }
  } else {
    // Process each file separately
    for (const file of transcribedFiles) {
      let content: string;

      if (prompts.length > 0) {
        const { combined } = await synthesizeWithMultiplePrompts(file.transcript, prompts, { apiKey });
        content = combined;
      } else {
        content = createBasicOutput(file.transcript, file.filename);
      }

      // Store result
      await storeResults(supabase, smeltId, file.id, content);

      results.push({
        file_id: file.id,
        filename: file.filename,
        content,
      });
    }
  }

  return results;
}

/**
 * Cleans up source files from storage after processing.
 */
async function cleanupSourceFiles(
  _supabase: SupabaseClient,
  smeltId: string,
  loadedFiles: LoadedFile[]
): Promise<void> {
  // We don't delete the results, only the source files
  // For now, just log - in production you might want to keep files for a while
  console.log(`[processSmelt] Would cleanup ${loadedFiles.length} source files for smelt ${smeltId}`);
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
  if (error instanceof FileTooLargeError) return "file_too_large";
  if (error instanceof InvalidFormatError) return "invalid_format";
  if (error instanceof DurationExceededError) return "duration_exceeded";
  if (error instanceof CorruptedFileError) return "corrupted_file";
  if (error instanceof TranscriptionError) return "transcription_failed";
  if (error instanceof SynthesisError) return "synthesis_failed";
  if (error instanceof LLMRateLimitError) return "api_rate_limited";
  if (error instanceof LLMAPIError) {
    const message = error.message.toLowerCase();
    if (message.includes("key") || message.includes("auth")) return "api_key_invalid";
    if (message.includes("quota")) return "api_quota_exhausted";
    return "internal_error";
  }

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
