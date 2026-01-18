/**
 * API key-specific error classes.
 * These are thrown by API key services and converted to responses in endpoints.
 */

import { AppError } from "./errors";

/**
 * Invalid API key format error.
 * Thrown when the API key doesn't match expected format.
 */
export class ApiKeyInvalidFormatError extends AppError {
  readonly status = 400;
  readonly code = "invalid_key_format";

  constructor() {
    super("INVALID API KEY FORMAT");
  }
}

/**
 * Invalid API key error.
 * Thrown when OpenRouter rejects the key as invalid.
 */
export class ApiKeyInvalidError extends AppError {
  readonly status = 422;
  readonly code = "key_invalid";

  constructor() {
    super("KEY INVALID - CHECK YOUR KEY");
  }
}

/**
 * API key quota exhausted error.
 * Thrown when the API key has no remaining quota.
 */
export class ApiKeyQuotaExhaustedError extends AppError {
  readonly status = 422;
  readonly code = "key_quota_exhausted";

  constructor() {
    super("KEY QUOTA EXHAUSTED");
  }
}

/**
 * API key validation failed error.
 * Thrown when validation fails due to network or server issues.
 */
export class ApiKeyValidationFailedError extends AppError {
  readonly status = 500;
  readonly code = "validation_failed";

  constructor() {
    super("COULDN'T VALIDATE KEY. TRY AGAIN");
  }
}

/**
 * No API key configured error.
 * Thrown when attempting to delete a key that doesn't exist.
 */
export class NoApiKeyError extends AppError {
  readonly status = 404;
  readonly code = "no_key";

  constructor() {
    super("NO API KEY CONFIGURED");
  }
}

// Re-export base utilities for convenient imports
export { jsonResponse, toAppError, UnauthorizedError } from "./errors";
