/**
 * File storage service using Supabase Storage.
 * Handles upload and download of smelt files (audio and text).
 *
 * Storage structure:
 *   smelt-files/
 *   ├── {smelt_id}/
 *   │   ├── {file_id}.mp3        # Audio file
 *   │   ├── {file_id}.txt        # Text input
 *   │   └── results/
 *   │       └── {file_id}.md     # Processing results
 */

import type { SupabaseClient } from "@/db/supabase.client";
import { InternalError } from "@/lib/utils/errors";

const BUCKET_NAME = "smelt-files";

/**
 * Storage upload result.
 */
export interface StorageUploadResult {
  path: string;
  size: number;
}

/**
 * Downloaded file data.
 */
export interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

/**
 * Gets the storage path for a smelt file.
 */
function getFilePath(smeltId: string, fileId: string, extension: string): string {
  return `${smeltId}/${fileId}.${extension}`;
}

/**
 * Gets the storage path for results.
 */
function getResultsPath(smeltId: string, fileId: string): string {
  return `${smeltId}/results/${fileId}.md`;
}

/**
 * Uploads an audio file to Supabase Storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID (used as folder)
 * @param fileId - Unique file ID from smelt_files table
 * @param file - File object to upload
 * @returns Upload result with path and size
 */
export async function uploadAudioFile(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string,
  file: File
): Promise<StorageUploadResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  const path = getFilePath(smeltId, fileId, extension);

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    contentType: file.type || "audio/mpeg",
    upsert: false,
  });

  if (error) {
    console.error("[Storage] Upload audio error:", error.message);
    throw new InternalError();
  }

  return { path, size: file.size };
}

/**
 * Uploads text content to Supabase Storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID (used as folder)
 * @param fileId - Unique file ID from smelt_files table
 * @param text - Text content to upload
 * @returns Upload result with path and size
 */
export async function uploadTextContent(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string,
  text: string
): Promise<StorageUploadResult> {
  const path = getFilePath(smeltId, fileId, "txt");
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const blob = new Blob([encoded], { type: "text/plain; charset=utf-8" });

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, blob, {
    contentType: "text/plain; charset=utf-8",
    upsert: false,
  });

  if (error) {
    console.error("[Storage] Upload text error:", error.message);
    throw new InternalError();
  }

  return { path, size: encoded.length };
}

/**
 * Downloads a file from Supabase Storage as a Buffer.
 * Searches for the file by fileId prefix since extension may vary.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @param fileId - File ID to download
 * @returns Downloaded file data or null if not found
 */
export async function downloadFile(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string
): Promise<DownloadedFile | null> {
  // List files in the smelt folder to find the one with matching fileId
  const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(smeltId, {
    search: fileId,
  });

  if (listError) {
    console.error("[Storage] List error:", listError.message);
    return null;
  }

  // Find file that starts with the fileId (handles different extensions)
  const file = files?.find((f) => f.name.startsWith(fileId) && !f.name.includes("/"));
  if (!file) {
    console.error("[Storage] File not found:", fileId);
    return null;
  }

  const path = `${smeltId}/${file.name}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);

  if (error || !data) {
    console.error("[Storage] Download error:", error?.message);
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = getMimeTypeFromExtension(file.name);

  return {
    buffer,
    mimeType,
    filename: file.name,
    size: buffer.length,
  };
}

/**
 * Downloads text content from Supabase Storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @param fileId - File ID to download
 * @returns Text content or null if not found
 */
export async function downloadTextContent(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string
): Promise<string | null> {
  const path = getFilePath(smeltId, fileId, "txt");

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);

  if (error) {
    // Don't log "not found" as error - it's expected in some cases
    if (!error.message?.includes("not found")) {
      console.error("[Storage] Download text error:", error.message);
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return await data.text();
}

/**
 * Stores processing results to Supabase Storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @param fileId - File ID (or "combined" for combined mode)
 * @param content - Markdown content to store
 * @returns Path to stored results
 */
export async function storeResults(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string,
  content: string
): Promise<string> {
  const path = getResultsPath(smeltId, fileId);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(content);
  const blob = new Blob([encoded], { type: "text/markdown; charset=utf-8" });

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, blob, {
    contentType: "text/markdown; charset=utf-8",
    upsert: true, // Allow overwriting results
  });

  if (error) {
    console.error("[Storage] Store results error:", error.message);
    throw new InternalError();
  }

  return path;
}

/**
 * Downloads processing results from Supabase Storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @param fileId - File ID (or "combined" for combined mode)
 * @returns Markdown content or null if not found
 */
export async function downloadResults(
  supabase: SupabaseClient,
  smeltId: string,
  fileId: string
): Promise<string | null> {
  const path = getResultsPath(smeltId, fileId);

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);

  if (error || !data) {
    return null;
  }

  return await data.text();
}

/**
 * Downloads all results for a smelt.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @returns Array of results with file IDs and content
 */
export async function downloadAllResults(
  supabase: SupabaseClient,
  smeltId: string
): Promise<{ fileId: string; content: string }[]> {
  const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(`${smeltId}/results`);

  if (listError || !files) {
    return [];
  }

  const results: { fileId: string; content: string }[] = [];

  for (const file of files) {
    if (file.name.endsWith(".md")) {
      const content = await downloadResults(supabase, smeltId, file.name.replace(".md", ""));
      if (content) {
        results.push({
          fileId: file.name.replace(".md", ""),
          content,
        });
      }
    }
  }

  return results;
}

/**
 * Deletes all files for a smelt (source files and results).
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 */
export async function deleteSmeltFiles(supabase: SupabaseClient, smeltId: string): Promise<void> {
  // List all files in the smelt folder
  const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(smeltId);

  if (listError) {
    console.error("[Storage] List error during deletion:", listError.message);
    return;
  }

  const filePaths: string[] = [];

  // Add root-level files
  if (files) {
    for (const file of files) {
      if (file.name !== "results") {
        filePaths.push(`${smeltId}/${file.name}`);
      }
    }
  }

  // List and add results
  const { data: resultFiles } = await supabase.storage.from(BUCKET_NAME).list(`${smeltId}/results`);

  if (resultFiles) {
    for (const file of resultFiles) {
      filePaths.push(`${smeltId}/results/${file.name}`);
    }
  }

  // Delete all files
  if (filePaths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

    if (error) {
      console.error("[Storage] Delete error:", error.message);
    }
  }
}

/**
 * Deletes only source files (keeps results).
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 */
export async function deleteSourceFiles(supabase: SupabaseClient, smeltId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(smeltId);

  if (listError) {
    console.error("[Storage] List error during source deletion:", listError.message);
    return;
  }

  const filePaths: string[] = [];

  if (files) {
    for (const file of files) {
      // Skip the results folder
      if (file.name !== "results") {
        filePaths.push(`${smeltId}/${file.name}`);
      }
    }
  }

  if (filePaths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

    if (error) {
      console.error("[Storage] Delete source files error:", error.message);
    }
  }
}

/**
 * Checks if a smelt has files in storage.
 *
 * @param supabase - Supabase client instance
 * @param smeltId - Parent smelt ID
 * @returns True if files exist
 */
export async function hasFiles(supabase: SupabaseClient, smeltId: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(smeltId, { limit: 1 });

  if (error) {
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Gets MIME type from file extension.
 */
function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    webm: "audio/webm",
    txt: "text/plain",
    md: "text/markdown",
  };
  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Gets the bucket name (for testing/debugging).
 */
export function getBucketName(): string {
  return BUCKET_NAME;
}
