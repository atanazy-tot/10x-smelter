/**
 * Audio transcription service.
 * Converts audio to text using multimodal LLM (Gemini via OpenRouter).
 */

import { transcribeAudio as llmTranscribe, type CompletionOptions } from "@/lib/services/llm";
import { convertToBase64Mp3, needsConversion, getAudioDuration } from "./conversion";
import { validateDuration } from "./validation";
import { TranscriptionError } from "@/lib/utils/errors";

/**
 * Transcription result with metadata.
 */
export interface TranscriptionResult {
  transcript: string;
  durationSeconds: number;
  model: string;
}

/**
 * Progress callback for transcription stages.
 */
export type TranscriptionProgressCallback = (progress: number, message: string) => Promise<void>;

/**
 * Transcribes audio from a buffer.
 * Handles format conversion if needed before sending to LLM.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  format: string,
  options: CompletionOptions = {},
  onProgress?: TranscriptionProgressCallback
): Promise<TranscriptionResult> {
  try {
    await onProgress?.(0.1, "Preparing audio...");

    let audioBase64: string;
    let mimeType: string;
    let durationSeconds: number;

    // Convert if needed, or just encode to base64
    if (needsConversion(format)) {
      await onProgress?.(0.2, "Converting audio format...");
      const converted = await convertToBase64Mp3(buffer, format);
      audioBase64 = converted.base64;
      mimeType = converted.mimeType;
      durationSeconds = converted.durationSeconds;
    } else {
      // MP3 can be used directly
      await onProgress?.(0.2, "Validating audio...");
      durationSeconds = await getAudioDuration(buffer, format);
      validateDuration(durationSeconds);
      audioBase64 = buffer.toString("base64");
      mimeType = "audio/mpeg";
    }

    await onProgress?.(0.3, "Sending to transcription service...");

    // Call LLM for transcription
    const result = await llmTranscribe(audioBase64, mimeType, options);

    await onProgress?.(1.0, "Transcription complete");

    return {
      transcript: result.content.trim(),
      durationSeconds,
      model: result.model,
    };
  } catch (error) {
    if (error instanceof TranscriptionError) {
      throw error;
    }
    console.error("[Transcription] Error:", error);
    throw new TranscriptionError(
      error instanceof Error ? `TRANSCRIPTION FAILED: ${error.message}` : "TRANSCRIPTION FAILED"
    );
  }
}

/**
 * Transcribes audio from a File object.
 * Convenience wrapper for browser File API.
 */
export async function transcribeAudioFile(
  file: File,
  format: string,
  options: CompletionOptions = {},
  onProgress?: TranscriptionProgressCallback
): Promise<TranscriptionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return transcribeAudioBuffer(buffer, format, options, onProgress);
}

/**
 * Transcribes text content directly (no audio processing needed).
 * This is a pass-through for text input mode.
 */
export async function processTextInput(text: string): Promise<TranscriptionResult> {
  // Text input doesn't need transcription, just return it directly
  return {
    transcript: text.trim(),
    durationSeconds: 0,
    model: "text-input",
  };
}
