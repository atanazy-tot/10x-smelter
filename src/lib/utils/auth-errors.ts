/**
 * Authentication-specific error classes.
 * These are thrown by auth services and converted to responses in endpoints.
 */

import { AppError } from "./errors";

/**
 * Email already registered error.
 * Thrown when attempting to register with an existing email.
 */
export class EmailExistsError extends AppError {
  readonly status = 409;
  readonly code = "email_exists";

  constructor() {
    super("EMAIL ALREADY REGISTERED");
  }
}

/**
 * Invalid credentials error.
 * Thrown when login fails due to wrong email or password.
 */
export class InvalidCredentialsError extends AppError {
  readonly status = 401;
  readonly code = "invalid_credentials";

  constructor() {
    super("WRONG EMAIL OR PASSWORD");
  }
}

/**
 * Rate limited error.
 * Thrown when too many requests have been made.
 */
export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = "rate_limited";

  constructor() {
    super("TOO MANY ATTEMPTS. TRY AGAIN LATER");
  }
}

/**
 * Validation error for request input.
 * Thrown when request body fails schema validation.
 */
export class ValidationError extends AppError {
  readonly status = 400;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

// Re-export base utilities for convenient imports
export { AppError, InternalError, NotFoundError, UnauthorizedError, jsonResponse, toAppError } from "./errors";
