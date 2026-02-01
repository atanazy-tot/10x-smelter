/**
 * Tests for error classes in src/lib/utils/errors.ts
 * Tests base AppError and all derived error classes.
 */
import { describe, expect, it } from "vitest";

import {
  AppError,
  AudioConversionError,
  CorruptedFileError,
  DurationExceededError,
  FileTooLargeError,
  InternalError,
  InvalidFormatError,
  jsonResponse,
  LLMAPIError,
  LLMRateLimitError,
  LLMTimeoutError,
  NotFoundError,
  SynthesisError,
  toAppError,
  TranscriptionError,
  UnauthorizedError,
} from "@/lib/utils/errors";

describe("AppError base class", () => {
  it("should be abstract and not instantiable directly", () => {
    // TypeScript prevents direct instantiation, but we can test via subclass
    class TestError extends AppError {
      readonly status = 999;
      readonly code = "test_error";
    }

    const error = new TestError("test message");
    expect(error.message).toBe("test message");
    expect(error.status).toBe(999);
    expect(error.code).toBe("test_error");
    expect(error.name).toBe("TestError");
  });

  it("toResponse() should return a valid JSON Response", async () => {
    class TestError extends AppError {
      readonly status = 400;
      readonly code = "test_code";
    }

    const error = new TestError("Test error message");
    const response = error.toResponse();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "test_code",
        message: "Test error message",
      },
    });
  });
});

describe("InternalError", () => {
  it("should have correct properties", () => {
    const error = new InternalError();

    expect(error.status).toBe(500);
    expect(error.code).toBe("internal_error");
    expect(error.message).toBe("SOMETHING WENT WRONG. TRY AGAIN");
  });

  it("should generate correct response", async () => {
    const error = new InternalError();
    const response = error.toResponse();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
  });
});

describe("UnauthorizedError", () => {
  it("should have correct default message", () => {
    const error = new UnauthorizedError();

    expect(error.status).toBe(401);
    expect(error.code).toBe("unauthorized");
    expect(error.message).toBe("LOGIN REQUIRED");
  });

  it("should accept custom message", () => {
    const error = new UnauthorizedError("Custom auth error");

    expect(error.message).toBe("Custom auth error");
    expect(error.status).toBe(401);
  });
});

describe("NotFoundError", () => {
  it("should accept custom code and message", () => {
    const error = new NotFoundError("user_not_found", "USER NOT FOUND");

    expect(error.status).toBe(404);
    expect(error.code).toBe("user_not_found");
    expect(error.message).toBe("USER NOT FOUND");
  });
});

describe("LLM Errors", () => {
  describe("LLMTimeoutError", () => {
    it("should have correct properties", () => {
      const error = new LLMTimeoutError();

      expect(error.status).toBe(504);
      expect(error.code).toBe("llm_timeout");
      expect(error.message).toBe("LLM REQUEST TIMED OUT");
    });

    it("should accept custom message", () => {
      const error = new LLMTimeoutError("Custom timeout");
      expect(error.message).toBe("Custom timeout");
    });
  });

  describe("LLMRateLimitError", () => {
    it("should have correct properties without retryAfter", () => {
      const error = new LLMRateLimitError();

      expect(error.status).toBe(429);
      expect(error.code).toBe("llm_rate_limit");
      expect(error.message).toBe("RATE LIMIT EXCEEDED. TRY AGAIN LATER");
      expect(error.retryAfter).toBeUndefined();
    });

    it("should store retryAfter value", () => {
      const error = new LLMRateLimitError(60);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("LLMAPIError", () => {
    it("should have correct properties", () => {
      const error = new LLMAPIError();

      expect(error.status).toBe(502);
      expect(error.code).toBe("llm_api_error");
      expect(error.message).toBe("LLM SERVICE UNAVAILABLE");
    });

    it("should accept custom message", () => {
      const error = new LLMAPIError("API returned 500");
      expect(error.message).toBe("API returned 500");
    });
  });
});

describe("Transcription and Synthesis Errors", () => {
  describe("TranscriptionError", () => {
    it("should have correct properties", () => {
      const error = new TranscriptionError();

      expect(error.status).toBe(500);
      expect(error.code).toBe("transcription_failed");
      expect(error.message).toBe("TRANSCRIPTION FAILED");
    });
  });

  describe("SynthesisError", () => {
    it("should have correct properties", () => {
      const error = new SynthesisError();

      expect(error.status).toBe(500);
      expect(error.code).toBe("synthesis_failed");
      expect(error.message).toBe("SYNTHESIS FAILED");
    });
  });
});

describe("Audio Processing Errors", () => {
  describe("FileTooLargeError", () => {
    it("should have correct properties", () => {
      const error = new FileTooLargeError();

      expect(error.status).toBe(413);
      expect(error.code).toBe("file_too_large");
      expect(error.message).toBe("FILE TOO LARGE. MAX 25MB ALLOWED");
    });

    it("should accept custom message", () => {
      const error = new FileTooLargeError("FILE SIZE 30.5MB EXCEEDS 25MB LIMIT");
      expect(error.message).toBe("FILE SIZE 30.5MB EXCEEDS 25MB LIMIT");
    });
  });

  describe("InvalidFormatError", () => {
    it("should have correct properties", () => {
      const error = new InvalidFormatError();

      expect(error.status).toBe(415);
      expect(error.code).toBe("invalid_format");
      expect(error.message).toBe("INVALID FILE FORMAT");
    });
  });

  describe("DurationExceededError", () => {
    it("should have correct properties", () => {
      const error = new DurationExceededError();

      expect(error.status).toBe(413);
      expect(error.code).toBe("duration_exceeded");
      expect(error.message).toBe("AUDIO TOO LONG. MAX 30 MINUTES ALLOWED");
    });
  });

  describe("CorruptedFileError", () => {
    it("should have correct properties", () => {
      const error = new CorruptedFileError();

      expect(error.status).toBe(422);
      expect(error.code).toBe("corrupted_file");
      expect(error.message).toBe("FILE APPEARS CORRUPTED");
    });
  });

  describe("AudioConversionError", () => {
    it("should have correct properties", () => {
      const error = new AudioConversionError();

      expect(error.status).toBe(500);
      expect(error.code).toBe("decoding_failed");
      expect(error.message).toBe("AUDIO CONVERSION FAILED");
    });
  });
});

describe("toAppError", () => {
  it("should return AppError instances as-is", () => {
    const original = new InternalError();
    const result = toAppError(original);

    expect(result).toBe(original);
  });

  it("should convert unknown errors to InternalError", () => {
    const result = toAppError(new Error("random error"));

    expect(result).toBeInstanceOf(InternalError);
    expect(result.status).toBe(500);
    expect(result.code).toBe("internal_error");
  });

  it("should handle non-Error objects", () => {
    const result = toAppError("string error");

    expect(result).toBeInstanceOf(InternalError);
  });

  it("should handle null/undefined", () => {
    expect(toAppError(null)).toBeInstanceOf(InternalError);
    expect(toAppError(undefined)).toBeInstanceOf(InternalError);
  });
});

describe("jsonResponse", () => {
  it("should create JSON response with default status 200", async () => {
    const response = jsonResponse({ success: true, data: "test" });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body).toEqual({ success: true, data: "test" });
  });

  it("should accept custom status code", async () => {
    const response = jsonResponse({ created: true }, 201);

    expect(response.status).toBe(201);
  });

  it("should handle complex objects", async () => {
    const data = {
      items: [1, 2, 3],
      nested: { a: { b: "c" } },
      null: null,
    };

    const response = jsonResponse(data);
    const body = await response.json();

    expect(body).toEqual(data);
  });
});
