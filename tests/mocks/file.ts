/**
 * File mock factory for testing file upload and validation.
 */

/**
 * Creates a mock File object with specified properties.
 */
export function createMockFile(options: {
  name: string;
  type: string;
  size: number;
  content?: string | ArrayBuffer;
}): File {
  const content = options.content ?? new ArrayBuffer(options.size);
  const blob = new Blob([content], { type: options.type });

  // Create a File-like object since File constructor may not be available in Node
  return Object.assign(blob, {
    name: options.name,
    lastModified: Date.now(),
    webkitRelativePath: "",
  }) as File;
}

/**
 * Creates a valid audio file mock for testing.
 */
export function createMockAudioFile(options?: {
  name?: string;
  type?: string;
  size?: number;
  format?: "mp3" | "wav" | "m4a" | "ogg" | "flac";
}): File {
  const formatMimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/m4a",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };

  const format = options?.format ?? "mp3";
  const type = options?.type ?? formatMimeTypes[format];
  const name = options?.name ?? `test-audio.${format}`;
  const size = options?.size ?? 1024 * 1024; // 1MB default

  return createMockFile({ name, type, size });
}

/**
 * Creates an oversized file for testing size validation.
 * Default is 30MB which exceeds the 25MB limit.
 */
export function createOversizedFile(options?: { name?: string; type?: string; sizeMB?: number }): File {
  const sizeMB = options?.sizeMB ?? 30;
  const size = sizeMB * 1024 * 1024;

  return createMockFile({
    name: options?.name ?? "large-file.mp3",
    type: options?.type ?? "audio/mpeg",
    size,
  });
}

/**
 * Creates an empty file for testing empty file validation.
 */
export function createEmptyFile(options?: { name?: string; type?: string }): File {
  return createMockFile({
    name: options?.name ?? "empty.mp3",
    type: options?.type ?? "audio/mpeg",
    size: 0,
    content: "",
  });
}

/**
 * Creates a file with unsupported format.
 */
export function createUnsupportedFile(options?: { name?: string; type?: string }): File {
  return createMockFile({
    name: options?.name ?? "document.pdf",
    type: options?.type ?? "application/pdf",
    size: 1024,
  });
}

/**
 * Creates a file with generic/unknown MIME type (application/octet-stream).
 */
export function createGenericMimeFile(options: { name: string; size?: number }): File {
  return createMockFile({
    name: options.name,
    type: "application/octet-stream",
    size: options.size ?? 1024 * 1024,
  });
}

/**
 * Creates a text paste file mock for testing.
 */
export function createMockTextFile(options?: { content?: string; name?: string }): File {
  const content = options?.content ?? "This is test text content for processing.";

  return createMockFile({
    name: options?.name ?? "paste.txt",
    type: "text/plain",
    size: content.length,
    content,
  });
}

/**
 * Creates a markdown file mock for prompt upload testing.
 */
export function createMockMarkdownFile(options?: { content?: string; name?: string }): File {
  const content =
    options?.content ??
    `# Test Prompt

Please summarize the following content:

{{content}}

Provide a clear and concise summary.`;

  return createMockFile({
    name: options?.name ?? "prompt.md",
    type: "text/markdown",
    size: content.length,
    content,
  });
}

/**
 * Creates multiple audio files for batch upload testing.
 */
export function createMockAudioFiles(count: number, options?: { format?: "mp3" | "wav" | "m4a" }): File[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAudioFile({
      name: `audio-${i + 1}.${options?.format ?? "mp3"}`,
      format: options?.format,
    })
  );
}
