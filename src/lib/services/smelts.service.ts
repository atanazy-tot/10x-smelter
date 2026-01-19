/**
 * Smelt service functions for processing audio/text operations.
 * Uses pure functions with explicit dependencies (FP pattern).
 */

import type { SupabaseClient } from "@/db/supabase.client";
import type { SmeltCreateResponseDTO, SmeltDTO, SmeltsListDTO, SmeltFileDTO, SmeltStatus } from "@/types";
import type { SmeltCreateInput, ListSmeltsQuery } from "@/lib/schemas/smelts.schema";
import {
  AppError,
  InternalError,
  UnauthorizedError,
  SmeltValidationError,
  SmeltNotFoundError,
  SmeltPromptNotFoundError,
} from "@/lib/utils/smelt-errors";
import { MAX_FILES } from "@/lib/schemas/smelts.schema";
import { processSmelt } from "@/lib/realtime/processing.service";
import { checkUsageLimits } from "@/lib/services/usage.service";
import { hashIp } from "@/lib/utils/hash";

// =============================================================================
// CREATE SMELT
// =============================================================================

/**
 * Creates a new smelt for processing audio files or text.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID or null for anonymous users
 * @param files - Array of audio files to process
 * @param input - Validated smelt creation input
 * @param clientIp - Client IP address for anonymous rate limiting
 * @returns Created smelt with subscription channel
 */
export async function createSmelt(
  supabase: SupabaseClient,
  userId: string | null,
  files: File[],
  input: SmeltCreateInput,
  clientIp: string
): Promise<SmeltCreateResponseDTO> {
  try {
    const hasFiles = files.length > 0;
    const hasText = !!input.text?.trim();

    // Validate input combination
    if (!hasFiles && !hasText) {
      throw new SmeltValidationError("no_input", "NOTHING TO PROCESS. UPLOAD A FILE OR ENTER TEXT");
    }
    if (hasFiles && files.length > MAX_FILES) {
      throw new SmeltValidationError("too_many_files", "MAX 5 FILES ALLOWED");
    }

    // Mode restrictions
    if (input.mode === "combine") {
      if (!userId) {
        throw new SmeltValidationError("combine_requires_auth", "COMBINE MODE REQUIRES LOGIN");
      }
      if (files.length < 2) {
        throw new SmeltValidationError("combine_requires_multiple", "COMBINE MODE NEEDS 2+ FILES");
      }
    }

    // Anonymous restrictions
    if (!userId) {
      if (files.length > 1) {
        throw new UnauthorizedError("LOGIN REQUIRED FOR THIS FEATURE");
      }
      if (input.user_prompt_id) {
        throw new UnauthorizedError("LOGIN REQUIRED FOR THIS FEATURE");
      }
    }

    // Check usage limits
    await checkUsageLimits(supabase, userId, clientIp);

    // Anonymous users: use SECURITY DEFINER RPC to bypass RLS
    if (!userId) {
      return await createAnonymousSmelt(supabase, files, input, clientIp);
    }

    // Authenticated users: direct insert with RLS
    // Verify custom prompt ownership
    if (input.user_prompt_id) {
      await verifyPromptOwnership(supabase, userId, input.user_prompt_id);
    }

    // Create smelt record
    const { data: smelt, error: smeltError } = await supabase
      .from("smelts")
      .insert({
        user_id: userId,
        status: "pending",
        mode: input.mode,
        default_prompt_names: input.default_prompt_names ?? [],
        user_prompt_id: input.user_prompt_id ?? null,
      })
      .select()
      .single();

    if (smeltError) throw smeltError;

    // Create file records
    const smeltFiles = await createSmeltFiles(supabase, smelt.id, files, input.text);

    // Deduct credit (for users without valid API key)
    await deductCredit(supabase, userId);

    // Fire-and-forget: start processing in background
    processSmelt(supabase, smelt.id).catch((error) => {
      console.error("Background processing error for smelt:", smelt.id, error);
    });

    return {
      id: smelt.id,
      status: smelt.status,
      mode: smelt.mode,
      files: smeltFiles,
      default_prompt_names: smelt.default_prompt_names,
      user_prompt_id: smelt.user_prompt_id,
      created_at: smelt.created_at,
      subscription_channel: `smelt:${smelt.id}`,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Create smelt error:", error);
    throw new InternalError();
  }
}

// =============================================================================
// GET SMELT
// =============================================================================

/**
 * Gets a single smelt by ID with all its files.
 * Returns different shapes based on smelt status (processing/completed/failed).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID (required for ownership check)
 * @param smeltId - Smelt UUID to retrieve
 * @returns Smelt data with status-appropriate fields
 */
export async function getSmelt(supabase: SupabaseClient, userId: string, smeltId: string): Promise<SmeltDTO> {
  try {
    const { data: smelt, error } = await supabase
      .from("smelts")
      .select(`*, smelt_files(*)`)
      .eq("id", smeltId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!smelt) throw new SmeltNotFoundError();

    const files: SmeltFileDTO[] = (smelt.smelt_files ?? [])
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map(toSmeltFileDTO);

    return buildSmeltDTO(smelt, files);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Get smelt error:", error);
    throw new InternalError();
  }
}

// =============================================================================
// LIST SMELTS
// =============================================================================

/**
 * Lists smelts for a user with pagination and optional filtering.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param query - Query parameters for filtering, sorting, and pagination
 * @returns Paginated list of smelts
 */
export async function listSmelts(
  supabase: SupabaseClient,
  userId: string,
  query: ListSmeltsQuery
): Promise<SmeltsListDTO> {
  try {
    const { status, sort, order, page, limit } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase
      .from("smelts")
      .select(
        `
        id, status, mode, default_prompt_names, created_at, completed_at,
        smelt_files(id)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId);

    if (status) {
      queryBuilder = queryBuilder.eq("status", status);
    }

    const { data, error, count } = await queryBuilder
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    // Handle "range not satisfiable" error (page beyond available results)
    if (error) {
      if (error.code === "PGRST103") {
        // Return empty result with correct pagination info
        const total = count ?? 0;
        const total_pages = Math.ceil(total / limit);
        return {
          smelts: [],
          pagination: { page, limit, total, total_pages },
        };
      }
      throw error;
    }

    const smelts = (data ?? []).map((s) => ({
      id: s.id,
      status: s.status,
      mode: s.mode,
      file_count: s.smelt_files?.length ?? 0,
      default_prompt_names: s.default_prompt_names,
      created_at: s.created_at,
      completed_at: s.completed_at,
    }));

    const total = count ?? 0;
    const total_pages = Math.ceil(total / limit);

    return {
      smelts,
      pagination: { page, limit, total, total_pages },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("List smelts error:", error);
    throw new InternalError();
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a smelt for anonymous users using SECURITY DEFINER RPC.
 * This bypasses RLS since anonymous users can't SELECT from smelts.
 */
async function createAnonymousSmelt(
  supabase: SupabaseClient,
  files: File[],
  input: SmeltCreateInput,
  clientIp: string
): Promise<SmeltCreateResponseDTO> {
  // Build file metadata array for the RPC (both audio files AND text are allowed)
  const fileMetadata: { filename: string; size_bytes: number; input_type: string }[] = [];

  // Add audio files first
  for (const file of files) {
    fileMetadata.push({
      filename: file.name,
      size_bytes: file.size,
      input_type: "audio",
    });
  }

  // Add text input after audio files (if provided)
  if (input.text) {
    fileMetadata.push({
      filename: "text-input.txt",
      size_bytes: new TextEncoder().encode(input.text).length,
      input_type: "text",
    });
  }

  // Call the RPC function
  const { data, error } = await supabase.rpc("create_anonymous_smelt", {
    p_mode: input.mode,
    p_default_prompt_names: input.default_prompt_names ?? [],
    p_files: fileMetadata,
  });

  if (error) {
    console.error("Create anonymous smelt RPC error:", error);
    throw new InternalError();
  }

  // Record anonymous usage
  await recordAnonymousUsage(supabase, clientIp);

  // Parse the JSON response from the RPC
  const result = data as {
    id: string;
    status: string;
    mode: string;
    files: SmeltFileDTO[];
    default_prompt_names: string[];
    user_prompt_id: string | null;
    created_at: string;
    subscription_channel: string;
  };

  // Fire-and-forget: start processing in background
  processSmelt(supabase, result.id).catch((error) => {
    console.error("Background processing error for anonymous smelt:", result.id, error);
  });

  return {
    id: result.id,
    status: result.status as SmeltCreateResponseDTO["status"],
    mode: result.mode as SmeltCreateResponseDTO["mode"],
    files: result.files,
    default_prompt_names: result.default_prompt_names as SmeltCreateResponseDTO["default_prompt_names"],
    user_prompt_id: result.user_prompt_id,
    created_at: result.created_at,
    subscription_channel: result.subscription_channel,
  };
}

/**
 * Deducts one credit from user's balance via RPC.
 * Only applies if user doesn't have a valid API key.
 */
async function deductCredit(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.rpc("deduct_smelt_credit", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Credit deduction error:", error);
    // Don't fail the smelt if credit deduction fails - log and continue
  }
}

/**
 * Records anonymous usage by incrementing the daily counter.
 * Uses RPC with SECURITY DEFINER to bypass RLS.
 */
async function recordAnonymousUsage(supabase: SupabaseClient, clientIp: string): Promise<void> {
  const ipHash = hashIp(clientIp);

  const { error } = await supabase.rpc("increment_anonymous_usage", {
    p_ip_hash: ipHash,
  });

  if (error) {
    console.error("Anonymous usage recording error:", error);
    // Don't fail the smelt if usage recording fails - log and continue
  }
}

/**
 * Verifies that a prompt exists and belongs to the user.
 */
async function verifyPromptOwnership(supabase: SupabaseClient, userId: string, promptId: string): Promise<void> {
  const { data } = await supabase.from("prompts").select("id").eq("id", promptId).eq("user_id", userId).maybeSingle();

  if (!data) {
    throw new SmeltPromptNotFoundError();
  }
}

/**
 * Creates smelt_files records for audio files and/or text input.
 * Audio files get positions 0, 1, 2..., text input gets position after all audio files.
 */
async function createSmeltFiles(
  supabase: SupabaseClient,
  smeltId: string,
  files: File[],
  text?: string
): Promise<SmeltFileDTO[]> {
  const smeltFiles: SmeltFileDTO[] = [];
  let position = 0;

  // Add audio files first
  for (const file of files) {
    const { data, error } = await supabase
      .from("smelt_files")
      .insert({
        smelt_id: smeltId,
        input_type: "audio",
        filename: file.name,
        size_bytes: file.size,
        status: "pending",
        position,
      })
      .select()
      .single();

    if (error) throw error;
    smeltFiles.push(toSmeltFileDTO(data));
    position++;
  }

  // Add text input after audio files (if provided)
  if (text) {
    const { data, error } = await supabase
      .from("smelt_files")
      .insert({
        smelt_id: smeltId,
        input_type: "text",
        filename: "text-input.txt",
        size_bytes: new TextEncoder().encode(text).length,
        status: "pending",
        position,
      })
      .select()
      .single();

    if (error) throw error;
    smeltFiles.push(toSmeltFileDTO(data));
  }

  return smeltFiles;
}

/**
 * Maps a database smelt_files row to SmeltFileDTO.
 */
function toSmeltFileDTO(row: {
  id: string;
  filename: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  input_type: string;
  status: string;
  position: number;
  error_code?: string | null;
}): SmeltFileDTO {
  return {
    id: row.id,
    filename: row.filename,
    size_bytes: row.size_bytes,
    duration_seconds: row.duration_seconds,
    input_type: row.input_type as SmeltFileDTO["input_type"],
    status: row.status as SmeltFileDTO["status"],
    position: row.position,
    ...(row.error_code && { error_code: row.error_code as SmeltFileDTO["error_code"] }),
  };
}

/**
 * Builds the appropriate SmeltDTO based on status.
 */
function buildSmeltDTO(
  smelt: {
    id: string;
    status: string;
    mode: string;
    default_prompt_names: string[];
    user_prompt_id: string | null;
    created_at: string;
    completed_at: string | null;
    error_code?: string | null;
    error_message?: string | null;
  },
  files: SmeltFileDTO[]
): SmeltDTO {
  const base = {
    id: smelt.id,
    mode: smelt.mode as SmeltDTO["mode"],
    files,
    default_prompt_names: smelt.default_prompt_names,
    user_prompt_id: smelt.user_prompt_id,
    created_at: smelt.created_at,
    completed_at: smelt.completed_at,
  };

  if (smelt.status === "completed") {
    return {
      ...base,
      status: "completed",
      results: [], // TODO: Fetch from results storage
    };
  }

  if (smelt.status === "failed") {
    return {
      ...base,
      status: "failed",
      error_code: smelt.error_code as SmeltDTO["error_code"],
      error_message: smelt.error_message,
    };
  }

  return {
    ...base,
    status: smelt.status as SmeltStatus,
    progress: calculateProgress(smelt.status),
  };
}

/**
 * Calculates progress information for processing states.
 */
function calculateProgress(status: string): { percentage: number; stage: SmeltStatus; message: string } {
  const stages: Record<string, { percentage: number; message: string }> = {
    pending: { percentage: 0, message: "Waiting to process..." },
    validating: { percentage: 10, message: "Validating files..." },
    decoding: { percentage: 20, message: "Decoding audio..." },
    transcribing: { percentage: 50, message: "Transcribing audio..." },
    synthesizing: { percentage: 85, message: "Generating output..." },
  };

  const stage = stages[status] ?? { percentage: 0, message: "Processing..." };
  return { percentage: stage.percentage, stage: status as SmeltStatus, message: stage.message };
}
