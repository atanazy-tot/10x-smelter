/**
 * Smelt-specific error classes for the Smelts API.
 * All errors extend AppError for consistent error handling.
 */

import { AppError } from "./errors";

// =============================================================================
// Validation Errors (400)
// =============================================================================

/**
 * Generic validation error for smelt operations.
 * Use for input validation failures.
 */
export class SmeltValidationError extends AppError {
  readonly status = 400;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * File too large error.
 * Thrown when an uploaded file exceeds the 25MB limit.
 */
export class SmeltFileTooLargeError extends AppError {
  readonly status = 400;
  readonly code = "file_too_large";

  constructor(sizeMB: string) {
    super(`FILE TOO CHUNKY. MAX 25MB. YOUR FILE: ${sizeMB}MB`);
  }
}

/**
 * Invalid file format error.
 * Thrown when an uploaded file is not a supported audio format.
 */
export class SmeltInvalidFormatError extends AppError {
  readonly status = 400;
  readonly code = "invalid_format";

  constructor() {
    super("CAN'T READ THAT. TRY .MP3 .WAV .M4A");
  }
}

// =============================================================================
// Limit Errors (403)
// =============================================================================

/**
 * Daily limit error for anonymous users.
 * Thrown when an anonymous user hits their 1/day limit.
 */
export class SmeltDailyLimitError extends AppError {
  readonly status = 403;
  readonly code = "daily_limit";

  constructor() {
    super("DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED");
  }
}

/**
 * Weekly limit error for authenticated users.
 * Thrown when a user exhausts their weekly credits.
 */
export class SmeltWeeklyLimitError extends AppError {
  readonly status = 403;
  readonly code = "weekly_limit";

  constructor(used: number, max: number, days: number) {
    super(`${used}/${max} SMELTS USED THIS WEEK. RESETS IN ${days} DAYS. OR ADD YOUR API KEY FOR UNLIMITED`);
  }
}

// =============================================================================
// Not Found Errors (404)
// =============================================================================

/**
 * Smelt not found error.
 * Thrown when a requested smelt doesn't exist or doesn't belong to user.
 */
export class SmeltNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "smelt_not_found";

  constructor() {
    super("SMELT NOT FOUND");
  }
}

/**
 * Prompt not found error for smelt operations.
 * Thrown when a user_prompt_id doesn't exist or doesn't belong to user.
 */
export class SmeltPromptNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "prompt_not_found";

  constructor() {
    super("PROMPT NOT FOUND");
  }
}

// =============================================================================
// Re-export base utilities
// =============================================================================

export { AppError, InternalError, UnauthorizedError, toAppError, jsonResponse } from "./errors";
