/**
 * Audio conversion service using FFmpeg.
 * Converts audio files to MP3 format for consistent transcription processing.
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { AudioConversionError, DurationExceededError } from "@/lib/utils/errors";
import { validateDuration } from "./validation";

// Set FFmpeg path from the installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Output format for transcription
const OUTPUT_FORMAT = "mp3";
const OUTPUT_CODEC = "libmp3lame";
const OUTPUT_BITRATE = "128k";

/**
 * Audio conversion result with file path and metadata.
 */
export interface ConversionResult {
  outputPath: string;
  durationSeconds: number;
  mimeType: string;
}

/**
 * Probe audio file to get duration and metadata.
 */
export function probeAudio(inputPath: string): Promise<{ durationSeconds: number; format: string }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error("[Audio] Probe error:", err);
        reject(new AudioConversionError("COULD NOT READ AUDIO FILE"));
        return;
      }

      const durationSeconds = metadata.format.duration ?? 0;
      const format = metadata.format.format_name ?? "unknown";

      resolve({ durationSeconds, format });
    });
  });
}

/**
 * Converts audio buffer to MP3 format.
 * Returns the path to the converted file and duration.
 */
export async function convertToMp3(inputBuffer: Buffer, inputFormat: string): Promise<ConversionResult> {
  const tempId = randomUUID();
  const inputPath = join(tmpdir(), `smelt-input-${tempId}.${inputFormat}`);
  const outputPath = join(tmpdir(), `smelt-output-${tempId}.${OUTPUT_FORMAT}`);

  try {
    // Write input buffer to temp file
    await fs.writeFile(inputPath, inputBuffer);

    // Probe for duration before conversion
    const { durationSeconds } = await probeAudio(inputPath);
    validateDuration(durationSeconds);

    // Convert to MP3
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec(OUTPUT_CODEC)
        .audioBitrate(OUTPUT_BITRATE)
        .audioChannels(1) // Mono for transcription
        .audioFrequency(16000) // 16kHz for speech
        .format(OUTPUT_FORMAT)
        .on("start", (cmd) => {
          console.log("[Audio] FFmpeg command:", cmd);
        })
        .on("error", (err) => {
          console.error("[Audio] Conversion error:", err);
          reject(new AudioConversionError("AUDIO CONVERSION FAILED"));
        })
        .on("end", () => {
          console.log("[Audio] Conversion complete");
          resolve();
        })
        .save(outputPath);
    });

    // Clean up input file
    await fs.unlink(inputPath).catch(() => undefined);

    return {
      outputPath,
      durationSeconds,
      mimeType: "audio/mpeg",
    };
  } catch (error) {
    // Clean up temp files on error
    await fs.unlink(inputPath).catch(() => undefined);
    await fs.unlink(outputPath).catch(() => undefined);

    if (error instanceof AudioConversionError || error instanceof DurationExceededError) {
      throw error;
    }

    console.error("[Audio] Unexpected conversion error:", error);
    throw new AudioConversionError("AUDIO CONVERSION FAILED");
  }
}

/**
 * Reads a converted audio file and returns it as a base64 string.
 * Cleans up the file after reading.
 */
export async function readAndCleanup(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.toString("base64");
  } finally {
    await fs.unlink(filePath).catch((err) => {
      console.error("[Audio] Failed to clean up temp file:", err);
    });
  }
}

/**
 * Converts audio buffer to base64 MP3.
 * Handles the full conversion pipeline: buffer → file → convert → base64.
 */
export async function convertToBase64Mp3(
  inputBuffer: Buffer,
  inputFormat: string
): Promise<{ base64: string; durationSeconds: number; mimeType: string }> {
  const result = await convertToMp3(inputBuffer, inputFormat);
  const base64 = await readAndCleanup(result.outputPath);

  return {
    base64,
    durationSeconds: result.durationSeconds,
    mimeType: result.mimeType,
  };
}

/**
 * Checks if a format needs conversion to MP3.
 * MP3 files can be used directly.
 */
export function needsConversion(format: string): boolean {
  return format.toLowerCase() !== "mp3";
}

/**
 * Gets the duration of an audio buffer without full conversion.
 */
export async function getAudioDuration(inputBuffer: Buffer, inputFormat: string): Promise<number> {
  const tempId = randomUUID();
  const inputPath = join(tmpdir(), `smelt-probe-${tempId}.${inputFormat}`);

  try {
    await fs.writeFile(inputPath, inputBuffer);
    const { durationSeconds } = await probeAudio(inputPath);
    return durationSeconds;
  } finally {
    await fs.unlink(inputPath).catch(() => undefined);
  }
}
