/**
 * Domain-specific errors for prompt operations.
 * All errors extend AppError for consistent response generation.
 */

import { AppError } from "./errors";

// Re-export base utilities for convenient imports
export { AppError, InternalError, UnauthorizedError, jsonResponse, toAppError } from "./errors";

/**
 * Error when a requested prompt does not exist or doesn't belong to the user.
 */
export class PromptNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "not_found";

  constructor(message = "PROMPT NOT FOUND") {
    super(message);
  }
}

/**
 * Error when the referenced section does not exist or doesn't belong to the user.
 */
export class SectionNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "section_not_found";

  constructor(message = "SECTION NOT FOUND") {
    super(message);
  }
}

/**
 * Error when one or more prompts in reorder request don't exist.
 */
export class PromptsNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "prompt_not_found";

  constructor(message = "ONE OR MORE PROMPTS NOT FOUND") {
    super(message);
  }
}

/**
 * Validation error for prompt create/update requests.
 */
export class PromptValidationError extends AppError {
  readonly status = 400;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Error when reorder request contains invalid order data.
 */
export class InvalidOrderDataError extends AppError {
  readonly status = 400;
  readonly code = "invalid_order";

  constructor(message = "INVALID ORDER DATA") {
    super(message);
  }
}

/**
 * Error when uploaded file is not a .md file.
 */
export class InvalidFileFormatError extends AppError {
  readonly status = 400;
  readonly code = "invalid_format";

  constructor(message = "ONLY .MD FILES ALLOWED") {
    super(message);
  }
}

/**
 * Error when uploaded file exceeds size limit.
 */
export class FileTooLargeError extends AppError {
  readonly status = 400;
  readonly code = "file_too_large";

  constructor(message = "FILE TOO BIG. MAX 10KB") {
    super(message);
  }
}

/**
 * Error when file content exceeds the prompt body limit.
 */
export class ContentTooLongError extends AppError {
  readonly status = 400;
  readonly code = "body_too_long";

  constructor(message = "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS") {
    super(message);
  }
}

/**
 * Error when no file is provided in upload request.
 */
export class FileRequiredError extends AppError {
  readonly status = 400;
  readonly code = "invalid_format";

  constructor(message = "FILE REQUIRED") {
    super(message);
  }
}
