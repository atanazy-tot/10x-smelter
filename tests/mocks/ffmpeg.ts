/**
 * FFmpeg mock factory for testing audio conversion services.
 */
import { vi } from "vitest";

interface FfprobeData {
  format: {
    duration?: number;
    size?: number;
    format_name?: string;
  };
  streams: Array<{
    codec_type: string;
    codec_name?: string;
  }>;
}

/**
 * Creates a mock FFmpeg command builder with chainable methods.
 */
export function createMockFfmpegCommand(options?: {
  shouldFail?: boolean;
  errorMessage?: string;
  outputData?: Buffer;
}) {
  const command = {
    setFfmpegPath: vi.fn().mockReturnThis(),
    input: vi.fn().mockReturnThis(),
    inputFormat: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    audioChannels: vi.fn().mockReturnThis(),
    audioFrequency: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    pipe: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (
      this: typeof command,
      event: string,
      callback: (arg?: unknown) => void
    ) {
      if (event === "end" && !options?.shouldFail) {
        setTimeout(() => callback(), 0);
      }
      if (event === "error" && options?.shouldFail) {
        setTimeout(() => callback(new Error(options.errorMessage ?? "FFmpeg error")), 0);
      }
      return this;
    }),
  };

  return command;
}

/**
 * Creates mock FFmpeg module with ffprobe support.
 */
export function createMockFfmpeg(options?: {
  ffprobeData?: FfprobeData;
  ffprobeError?: Error;
  commandOptions?: Parameters<typeof createMockFfmpegCommand>[0];
}) {
  const defaultFfprobeData: FfprobeData = {
    format: {
      duration: 120,
      size: 1024000,
      format_name: "mp3",
    },
    streams: [{ codec_type: "audio", codec_name: "mp3" }],
  };

  const ffmpeg = vi.fn(() => createMockFfmpegCommand(options?.commandOptions));

  (ffmpeg as Record<string, unknown>).ffprobe = vi.fn(
    (input: string, callback: (err: Error | null, data?: FfprobeData) => void) => {
      void input;
      if (options?.ffprobeError) {
        callback(options.ffprobeError);
      } else {
        callback(null, options?.ffprobeData ?? defaultFfprobeData);
      }
    }
  );

  (ffmpeg as Record<string, unknown>).setFfmpegPath = vi.fn();

  return ffmpeg;
}

/**
 * Default mock FFmpeg for vitest.setup.ts
 */
export const defaultMockFfmpeg = createMockFfmpeg();
