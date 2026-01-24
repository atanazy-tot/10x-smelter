/**
 * Base error infrastructure for the application.
 * All domain-specific errors should extend AppError.
 */

/**
 * Abstract base class for all application errors.
 * Provides automatic JSON response generation with consistent format.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse(): Response {
    return new Response(JSON.stringify({ error: { code: this.code, message: this.message } }), {
      status: this.status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Generic internal server error.
 * Use when an unexpected error occurs.
 */
export class InternalError extends AppError {
  readonly status = 500;
  readonly code = "internal_error";

  constructor() {
    super("SOMETHING WENT WRONG. TRY AGAIN");
  }
}

/**
 * Unauthorized access error.
 * Use when authentication is required but not provided.
 */
export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "unauthorized";

  constructor(message = "LOGIN REQUIRED") {
    super(message);
  }
}

/**
 * Not found error.
 * Use when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  readonly status = 404;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Converts any error to an AppError.
 * If the error is already an AppError, returns it as-is.
 * Otherwise, logs the error and returns an InternalError.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  console.error("Unexpected error:", error);
  return new InternalError();
}

// =============================================================================
// LLM Service Errors
// =============================================================================

/**
 * LLM request timed out.
 */
export class LLMTimeoutError extends AppError {
  readonly status = 504;
  readonly code = "llm_timeout";

  constructor(message = "LLM REQUEST TIMED OUT") {
    super(message);
  }
}

/**
 * LLM rate limit exceeded.
 * Contains optional retryAfter for exponential backoff.
 */
export class LLMRateLimitError extends AppError {
  readonly status = 429;
  readonly code = "llm_rate_limit";
  readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super("RATE LIMIT EXCEEDED. TRY AGAIN LATER");
    this.retryAfter = retryAfter;
  }
}

/**
 * Generic LLM API error.
 */
export class LLMAPIError extends AppError {
  readonly status = 502;
  readonly code = "llm_api_error";

  constructor(message = "LLM SERVICE UNAVAILABLE") {
    super(message);
  }
}

/**
 * Transcription failed error.
 */
export class TranscriptionError extends AppError {
  readonly status = 500;
  readonly code = "transcription_failed";

  constructor(message = "TRANSCRIPTION FAILED") {
    super(message);
  }
}

/**
 * Synthesis/prompt application failed.
 */
export class SynthesisError extends AppError {
  readonly status = 500;
  readonly code = "synthesis_failed";

  constructor(message = "SYNTHESIS FAILED") {
    super(message);
  }
}

// =============================================================================
// Audio Processing Errors
// =============================================================================

/**
 * Audio file too large.
 */
export class FileTooLargeError extends AppError {
  readonly status = 413;
  readonly code = "file_too_large";

  constructor(message = "FILE TOO LARGE. MAX 25MB ALLOWED") {
    super(message);
  }
}

/**
 * Invalid audio format.
 */
export class InvalidFormatError extends AppError {
  readonly status = 415;
  readonly code = "invalid_format";

  constructor(message = "INVALID FILE FORMAT") {
    super(message);
  }
}

/**
 * Audio duration exceeded limit.
 */
export class DurationExceededError extends AppError {
  readonly status = 413;
  readonly code = "duration_exceeded";

  constructor(message = "AUDIO TOO LONG. MAX 30 MINUTES ALLOWED") {
    super(message);
  }
}

/**
 * Audio file is corrupted.
 */
export class CorruptedFileError extends AppError {
  readonly status = 422;
  readonly code = "corrupted_file";

  constructor(message = "FILE APPEARS CORRUPTED") {
    super(message);
  }
}

/**
 * Audio conversion/decoding failed.
 */
export class AudioConversionError extends AppError {
  readonly status = 500;
  readonly code = "decoding_failed";

  constructor(message = "AUDIO CONVERSION FAILED") {
    super(message);
  }
}

/**
 * Creates a JSON success response with proper headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
