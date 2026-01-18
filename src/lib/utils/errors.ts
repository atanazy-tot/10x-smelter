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

/**
 * Creates a JSON success response with proper headers.
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
