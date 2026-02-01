/**
 * Tests for audio validation service.
 * Tests format, size, and duration validation functions.
 */
import { describe, expect, it } from "vitest";

import {
  getExtensionForFormat,
  getMaxDuration,
  getMaxFileSize,
  getMimeTypeForFormat,
  isSupportedAudioFormat,
  validateAudioBuffer,
  validateAudioFile,
  validateDuration,
  validateFormat,
  validateSize,
} from "@/lib/services/audio/validation";
import { CorruptedFileError, DurationExceededError, FileTooLargeError, InvalidFormatError } from "@/lib/utils/errors";

import { createEmptyFile, createMockAudioFile, createOversizedFile, createUnsupportedFile, createGenericMimeFile } from "../../../mocks/file";

describe("validateFormat", () => {
  describe("valid MIME types", () => {
    it.each([
      ["audio/mpeg", "mp3"],
      ["audio/mp3", "mp3"],
      ["audio/wav", "wav"],
      ["audio/wave", "wav"],
      ["audio/x-wav", "wav"],
      ["audio/m4a", "m4a"],
      ["audio/x-m4a", "m4a"],
      ["audio/mp4", "m4a"],
      ["audio/ogg", "ogg"],
      ["application/ogg", "ogg"],
      ["audio/flac", "flac"],
      ["audio/x-flac", "flac"],
      ["audio/aac", "aac"],
      ["audio/x-aac", "aac"],
      ["audio/webm", "webm"],
    ])("should validate %s as %s format", (mimeType, expectedFormat) => {
      const result = validateFormat(mimeType);
      expect(result.format).toBe(expectedFormat);
    });
  });

  describe("case insensitivity", () => {
    it("should normalize MIME types to lowercase", () => {
      const result = validateFormat("AUDIO/MPEG");
      expect(result.format).toBe("mp3");
      expect(result.mimeType).toBe("audio/mpeg");
    });
  });

  describe("extension fallback", () => {
    it.each([
      ["test.mp3", "mp3"],
      ["test.wav", "wav"],
      ["test.m4a", "m4a"],
      ["test.ogg", "ogg"],
      ["test.flac", "flac"],
      ["test.aac", "aac"],
      ["test.webm", "webm"],
    ])("should detect format from filename %s when MIME is generic", (filename, expectedFormat) => {
      const result = validateFormat("application/octet-stream", filename);
      expect(result.format).toBe(expectedFormat);
    });

    it("should fall back to extension for audio/basic MIME type", () => {
      const result = validateFormat("audio/basic", "recording.mp3");
      expect(result.format).toBe("mp3");
    });
  });

  describe("unsupported formats", () => {
    it("should throw InvalidFormatError for unsupported MIME type", () => {
      expect(() => validateFormat("video/mp4")).toThrow(InvalidFormatError);
    });

    it("should throw InvalidFormatError for generic MIME without valid extension", () => {
      expect(() => validateFormat("application/octet-stream", "file.exe")).toThrow(InvalidFormatError);
    });

    it("should throw with descriptive message", () => {
      try {
        validateFormat("application/pdf");
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidFormatError);
        expect((error as InvalidFormatError).message).toContain("UNSUPPORTED FORMAT");
        expect((error as InvalidFormatError).message).toContain("application/pdf");
      }
    });
  });
});

describe("validateSize", () => {
  it("should pass for files under 25MB", () => {
    expect(() => validateSize(1024 * 1024)).not.toThrow(); // 1MB
    expect(() => validateSize(24 * 1024 * 1024)).not.toThrow(); // 24MB
    expect(() => validateSize(25 * 1024 * 1024)).not.toThrow(); // exactly 25MB
  });

  it("should throw FileTooLargeError for files over 25MB", () => {
    expect(() => validateSize(25 * 1024 * 1024 + 1)).toThrow(FileTooLargeError);
    expect(() => validateSize(30 * 1024 * 1024)).toThrow(FileTooLargeError);
  });

  it("should include file size in error message", () => {
    try {
      validateSize(30 * 1024 * 1024);
    } catch (error) {
      expect((error as FileTooLargeError).message).toContain("30.0MB");
    }
  });

  it("should throw CorruptedFileError for empty files", () => {
    expect(() => validateSize(0)).toThrow(CorruptedFileError);
  });

  it("should have correct error message for empty files", () => {
    try {
      validateSize(0);
    } catch (error) {
      expect((error as CorruptedFileError).message).toBe("FILE IS EMPTY");
    }
  });
});

describe("validateDuration", () => {
  it("should pass for duration under 30 minutes", () => {
    expect(() => validateDuration(60)).not.toThrow(); // 1 minute
    expect(() => validateDuration(29 * 60)).not.toThrow(); // 29 minutes
    expect(() => validateDuration(30 * 60)).not.toThrow(); // exactly 30 minutes
  });

  it("should throw DurationExceededError for duration over 30 minutes", () => {
    expect(() => validateDuration(30 * 60 + 1)).toThrow(DurationExceededError);
    expect(() => validateDuration(45 * 60)).toThrow(DurationExceededError);
  });

  it("should include duration in error message", () => {
    try {
      validateDuration(45 * 60); // 45 minutes
    } catch (error) {
      expect((error as DurationExceededError).message).toContain("45 MINUTES");
    }
  });

  it("should ceil duration to whole minutes in error", () => {
    try {
      validateDuration(31 * 60 + 30); // 31.5 minutes
    } catch (error) {
      expect((error as DurationExceededError).message).toContain("32 MINUTES");
    }
  });
});

describe("validateAudioFile", () => {
  it("should return validation result for valid file", () => {
    const file = createMockAudioFile({ format: "mp3", size: 1024 * 1024 });
    const result = validateAudioFile(file);

    expect(result.valid).toBe(true);
    expect(result.format).toBe("mp3");
    expect(result.mimeType).toBe("audio/mpeg");
    expect(result.sizeBytes).toBe(1024 * 1024);
  });

  it("should validate different audio formats", () => {
    const wavFile = createMockAudioFile({ format: "wav" });
    expect(validateAudioFile(wavFile).format).toBe("wav");

    const m4aFile = createMockAudioFile({ format: "m4a" });
    expect(validateAudioFile(m4aFile).format).toBe("m4a");
  });

  it("should throw FileTooLargeError for oversized file", () => {
    const file = createOversizedFile();
    expect(() => validateAudioFile(file)).toThrow(FileTooLargeError);
  });

  it("should throw CorruptedFileError for empty file", () => {
    const file = createEmptyFile();
    expect(() => validateAudioFile(file)).toThrow(CorruptedFileError);
  });

  it("should throw InvalidFormatError for unsupported file", () => {
    const file = createUnsupportedFile();
    expect(() => validateAudioFile(file)).toThrow(InvalidFormatError);
  });

  it("should use extension fallback for generic MIME type", () => {
    const file = createGenericMimeFile({ name: "audio.mp3" });
    const result = validateAudioFile(file);
    expect(result.format).toBe("mp3");
  });
});

describe("validateAudioBuffer", () => {
  it("should validate buffer with valid MIME type", () => {
    const buffer = new ArrayBuffer(1024 * 1024);
    const result = validateAudioBuffer(buffer, "audio/mpeg");

    expect(result.format).toBe("mp3");
    expect(result.mimeType).toBe("audio/mpeg");
  });

  it("should use filename for extension fallback", () => {
    const buffer = new ArrayBuffer(1024 * 1024);
    const result = validateAudioBuffer(buffer, "application/octet-stream", "audio.wav");

    expect(result.format).toBe("wav");
  });

  it("should throw FileTooLargeError for oversized buffer", () => {
    const buffer = new ArrayBuffer(30 * 1024 * 1024);
    expect(() => validateAudioBuffer(buffer, "audio/mpeg")).toThrow(FileTooLargeError);
  });

  it("should throw CorruptedFileError for empty buffer", () => {
    const buffer = new ArrayBuffer(0);
    expect(() => validateAudioBuffer(buffer, "audio/mpeg")).toThrow(CorruptedFileError);
  });
});

describe("isSupportedAudioFormat", () => {
  it.each([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/m4a",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/webm",
  ])("should return true for %s", (mimeType) => {
    expect(isSupportedAudioFormat(mimeType)).toBe(true);
  });

  it.each(["video/mp4", "application/pdf", "image/png", "text/plain"])("should return false for %s", (mimeType) => {
    expect(isSupportedAudioFormat(mimeType)).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isSupportedAudioFormat("AUDIO/MPEG")).toBe(true);
    expect(isSupportedAudioFormat("Audio/Wav")).toBe(true);
  });
});

describe("getExtensionForFormat", () => {
  it.each([
    ["mp3", ".mp3"],
    ["wav", ".wav"],
    ["m4a", ".m4a"],
    ["ogg", ".ogg"],
    ["flac", ".flac"],
    ["aac", ".aac"],
    ["webm", ".webm"],
  ])("should return %s extension for %s format", (format, expectedExt) => {
    expect(getExtensionForFormat(format)).toBe(expectedExt);
  });
});

describe("getMimeTypeForFormat", () => {
  it.each([
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
    ["m4a", "audio/m4a"],
    ["ogg", "audio/ogg"],
    ["flac", "audio/flac"],
    ["aac", "audio/aac"],
    ["webm", "audio/webm"],
  ])("should return primary MIME type for %s format", (format, expectedMime) => {
    expect(getMimeTypeForFormat(format)).toBe(expectedMime);
  });

  it("should return undefined for unknown format", () => {
    expect(getMimeTypeForFormat("unknown")).toBeUndefined();
  });
});

describe("getMaxFileSize", () => {
  it("should return 25MB in bytes", () => {
    expect(getMaxFileSize()).toBe(25 * 1024 * 1024);
  });
});

describe("getMaxDuration", () => {
  it("should return 30 minutes in seconds", () => {
    expect(getMaxDuration()).toBe(30 * 60);
  });
});
