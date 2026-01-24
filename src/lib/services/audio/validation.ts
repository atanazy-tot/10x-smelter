/**
 * Audio file validation service.
 * Validates format, size, and duration limits per PRD requirements.
 */

import { FileTooLargeError, InvalidFormatError, DurationExceededError, CorruptedFileError } from "@/lib/utils/errors";

// PRD-defined limits
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_DURATION_SECONDS = 30 * 60; // 30 minutes

// Supported audio formats with their MIME types
const SUPPORTED_FORMATS: Record<string, string[]> = {
  mp3: ["audio/mpeg", "audio/mp3"],
  wav: ["audio/wav", "audio/wave", "audio/x-wav"],
  m4a: ["audio/m4a", "audio/x-m4a", "audio/mp4", "audio/x-m4a-protected"],
  ogg: ["audio/ogg", "application/ogg"],
  flac: ["audio/flac", "audio/x-flac"],
  aac: ["audio/aac", "audio/x-aac"],
  webm: ["audio/webm"],
};

// File extensions that map to audio formats
const EXTENSION_MAP: Record<string, string> = {
  ".mp3": "mp3",
  ".wav": "wav",
  ".m4a": "m4a",
  ".ogg": "ogg",
  ".flac": "flac",
  ".aac": "aac",
  ".webm": "webm",
};

/**
 * Audio file validation result.
 */
export interface AudioValidationResult {
  valid: true;
  format: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Validates an audio file's format based on MIME type and filename.
 */
export function validateFormat(mimeType: string, filename?: string): { format: string; mimeType: string } {
  const normalizedMime = mimeType.toLowerCase();

  // Check MIME type against supported formats
  for (const [format, mimeTypes] of Object.entries(SUPPORTED_FORMATS)) {
    if (mimeTypes.includes(normalizedMime)) {
      return { format, mimeType: normalizedMime };
    }
  }

  // Fall back to extension-based detection if MIME type is generic
  if (filename && (normalizedMime === "application/octet-stream" || normalizedMime === "audio/basic")) {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    const format = EXTENSION_MAP[ext];
    if (format) {
      // Return the first known MIME type for this format
      return { format, mimeType: SUPPORTED_FORMATS[format][0] };
    }
  }

  throw new InvalidFormatError(`UNSUPPORTED FORMAT: ${mimeType}. USE MP3, WAV, M4A, OGG, FLAC, OR AAC`);
}

/**
 * Validates file size against PRD limit (25MB).
 */
export function validateSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new FileTooLargeError(`FILE SIZE ${sizeMB}MB EXCEEDS 25MB LIMIT`);
  }

  if (sizeBytes === 0) {
    throw new CorruptedFileError("FILE IS EMPTY");
  }
}

/**
 * Validates audio duration against PRD limit (30 minutes).
 */
export function validateDuration(durationSeconds: number): void {
  if (durationSeconds > MAX_DURATION_SECONDS) {
    const durationMin = Math.ceil(durationSeconds / 60);
    throw new DurationExceededError(`DURATION ${durationMin} MINUTES EXCEEDS 30 MINUTE LIMIT`);
  }
}

/**
 * Validates all aspects of an audio file.
 * Returns validation result with detected format info.
 */
export function validateAudioFile(file: File): AudioValidationResult {
  // Validate size first (cheapest check)
  validateSize(file.size);

  // Validate format
  const { format, mimeType } = validateFormat(file.type, file.name);

  return {
    valid: true,
    format,
    mimeType,
    sizeBytes: file.size,
  };
}

/**
 * Validates audio data buffer (for files already loaded into memory).
 */
export function validateAudioBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
  filename?: string
): { format: string; mimeType: string } {
  validateSize(buffer.byteLength);
  return validateFormat(mimeType, filename);
}

/**
 * Checks if a MIME type is a supported audio format.
 */
export function isSupportedAudioFormat(mimeType: string): boolean {
  const normalizedMime = mimeType.toLowerCase();
  for (const mimeTypes of Object.values(SUPPORTED_FORMATS)) {
    if (mimeTypes.includes(normalizedMime)) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the file extension for a given audio format.
 */
export function getExtensionForFormat(format: string): string {
  return `.${format}`;
}

/**
 * Gets the primary MIME type for a given audio format.
 */
export function getMimeTypeForFormat(format: string): string | undefined {
  return SUPPORTED_FORMATS[format]?.[0];
}

/**
 * Returns the maximum file size in bytes.
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE_BYTES;
}

/**
 * Returns the maximum duration in seconds.
 */
export function getMaxDuration(): number {
  return MAX_DURATION_SECONDS;
}
