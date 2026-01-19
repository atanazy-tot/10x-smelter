/**
 * Domain-specific errors for prompt section operations.
 * All errors extend AppError for consistent response generation.
 */

import { AppError } from "./errors";

// Re-export base utilities for convenient imports
export { AppError, InternalError, UnauthorizedError, jsonResponse, toAppError } from "./errors";

// Re-export shared errors from prompt-errors.ts to avoid duplication
export { SectionNotFoundError, InvalidOrderDataError } from "./prompt-errors";

/**
 * Error when update request contains no valid fields.
 */
export class InvalidUpdateDataError extends AppError {
  readonly status = 400;
  readonly code = "invalid_data";

  constructor(message = "INVALID UPDATE DATA") {
    super(message);
  }
}

/**
 * Error when one or more sections in reorder request don't exist.
 */
export class SectionsNotFoundError extends AppError {
  readonly status = 404;
  readonly code = "section_not_found";

  constructor(message = "ONE OR MORE SECTIONS NOT FOUND") {
    super(message);
  }
}

/**
 * Validation error for section create/update requests.
 */
export class SectionValidationError extends AppError {
  readonly status = 400;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}
