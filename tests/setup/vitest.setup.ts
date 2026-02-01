/**
 * Vitest global setup file.
 * Sets up environment variables, global mocks, and test hooks.
 */
import { afterEach, beforeEach, vi } from "vitest";

// Stub environment variables
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_KEY", "test-anon-key");
vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test-key-12345678901234567890");
vi.stubEnv("API_KEY_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

// Mock fluent-ffmpeg globally
vi.mock("fluent-ffmpeg", () => {
  const mockCommand = {
    setFfmpegPath: vi.fn().mockReturnThis(),
    input: vi.fn().mockReturnThis(),
    inputFormat: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    audioChannels: vi.fn().mockReturnThis(),
    audioFrequency: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (
      this: typeof mockCommand,
      event: string,
      callback: (arg?: unknown) => void
    ) {
      if (event === "end") {
        setTimeout(() => callback(), 0);
      }
      return this;
    }),
    run: vi.fn().mockReturnThis(),
    pipe: vi.fn().mockReturnThis(),
  };

  const ffmpeg = vi.fn(() => mockCommand);
  (ffmpeg as Record<string, unknown>).ffprobe = vi.fn(
    (_input: string, callback: (err: Error | null, data?: unknown) => void) => {
      callback(null, {
        format: {
          duration: 120,
          size: 1024000,
          format_name: "mp3",
        },
        streams: [{ codec_type: "audio", codec_name: "mp3" }],
      });
    }
  );

  return { default: ffmpeg };
});

// Mock @ffmpeg-installer/ffmpeg
vi.mock("@ffmpeg-installer/ffmpeg", () => ({
  path: "/usr/bin/ffmpeg",
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
