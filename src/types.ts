/**
 * DTO and Command Model Types
 *
 * All types in this file derive from or reference database entity types
 * defined in src/db/database.types.ts to ensure type safety and consistency
 * with the underlying data model.
 */

import type { Tables, Enums } from "./db/database.types";

// =============================================================================
// Database Entity Row Type Aliases
// =============================================================================

/** User profile database row type */
type UserProfileRow = Tables<"user_profiles">;

/** Prompt section database row type */
type PromptSectionRow = Tables<"prompt_sections">;

/** Prompt database row type */
type PromptRow = Tables<"prompts">;

/** Smelt database row type */
type SmeltRow = Tables<"smelts">;

/** Smelt file database row type */
type SmeltFileRow = Tables<"smelt_files">;

/** Anonymous usage database row type */
type AnonymousUsageRow = Tables<"anonymous_usage">;

// =============================================================================
// Enum Type Aliases (exported for use throughout the application)
// =============================================================================

/** API key validation status */
export type ApiKeyStatus = Enums<"api_key_status">;

/** Default prompt names available in the system */
export type DefaultPromptName = Enums<"default_prompt_name">;

/** Input type for smelt files (audio or text) */
export type InputType = Enums<"input_type">;

/** Error codes for smelt processing failures */
export type SmeltErrorCode = Enums<"smelt_error_code">;

/** Error codes for individual smelt file failures */
export type SmeltFileErrorCode = Enums<"smelt_file_error_code">;

/** Status of individual smelt files during processing */
export type SmeltFileStatus = Enums<"smelt_file_status">;

/** Processing mode for smelts */
export type SmeltMode = Enums<"smelt_mode">;

/** Overall status of a smelt operation */
export type SmeltStatus = Enums<"smelt_status">;

// =============================================================================
// Authentication DTOs
// =============================================================================

/**
 * Command for user registration and login requests
 * POST /api/auth/register, POST /api/auth/login
 */
export interface AuthCredentialsCommand {
  email: string;
  password: string;
}

/**
 * Basic user information returned in auth responses
 * Represents the authenticated user's identity
 */
export interface AuthUserDTO {
  id: string;
  email: string;
}

/**
 * Session token information returned after authentication
 */
export interface AuthSessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Combined response for successful authentication
 * POST /api/auth/register, POST /api/auth/login response
 */
export interface AuthResponseDTO {
  user: AuthUserDTO;
  session: AuthSessionDTO;
}

/**
 * Logout response
 * POST /api/auth/logout response
 */
export interface LogoutResponseDTO {
  message: string;
}

/**
 * Profile information included in authenticated session response
 * Derived from user_profiles table, excluding internal fields
 */
export interface SessionProfileDTO {
  credits_remaining: UserProfileRow["credits_remaining"];
  weekly_credits_max: UserProfileRow["weekly_credits_max"];
  credits_reset_at: UserProfileRow["credits_reset_at"];
  api_key_status: UserProfileRow["api_key_status"];
  api_key_validated_at: UserProfileRow["api_key_validated_at"];
}

/**
 * Anonymous usage information for session response
 * Derived from anonymous_usage table with additional computed fields
 */
export interface SessionAnonymousUsageDTO {
  smelts_used_today: AnonymousUsageRow["smelts_used"];
  daily_limit: number;
  resets_at: string;
}

/**
 * Authenticated user session response
 * GET /api/auth/session response when authenticated
 */
export interface SessionAuthenticatedDTO {
  authenticated: true;
  user: AuthUserDTO;
  profile: SessionProfileDTO;
}

/**
 * Anonymous user session response
 * GET /api/auth/session response when not authenticated
 */
export interface SessionAnonymousDTO {
  authenticated: false;
  anonymous_usage: SessionAnonymousUsageDTO;
}

/**
 * Union type for session endpoint response
 * GET /api/auth/session response
 */
export type SessionDTO = SessionAuthenticatedDTO | SessionAnonymousDTO;

// =============================================================================
// User Profile DTOs
// =============================================================================

/**
 * Full user profile response
 * GET /api/profile response
 * Derived from user_profiles table row
 */
export interface UserProfileDTO {
  user_id: UserProfileRow["user_id"];
  credits_remaining: UserProfileRow["credits_remaining"];
  weekly_credits_max: UserProfileRow["weekly_credits_max"];
  credits_reset_at: UserProfileRow["credits_reset_at"];
  api_key_status: UserProfileRow["api_key_status"];
  api_key_validated_at: UserProfileRow["api_key_validated_at"];
  created_at: UserProfileRow["created_at"];
  updated_at: UserProfileRow["updated_at"];
}

// =============================================================================
// API Key DTOs
// =============================================================================

/**
 * Command for storing a new API key
 * POST /api/api-keys request body
 */
export interface ApiKeyCreateCommand {
  api_key: string;
}

/**
 * Response after successful API key validation
 * POST /api/api-keys response
 */
export interface ApiKeyValidationDTO {
  status: ApiKeyStatus;
  validated_at: string;
  message: string;
}

/**
 * API key status check response
 * GET /api/api-keys/status response
 */
export interface ApiKeyStatusDTO {
  has_key: boolean;
  status: ApiKeyStatus;
  validated_at: string | null;
}

/**
 * API key deletion response
 * DELETE /api/api-keys response
 */
export interface ApiKeyDeleteResponseDTO {
  message: string;
  credits_remaining: UserProfileRow["credits_remaining"];
  credits_reset_at: UserProfileRow["credits_reset_at"];
}

// =============================================================================
// Prompt Sections DTOs
// =============================================================================

/**
 * Prompt section without prompt count
 * Used in create/update responses
 * Derived from prompt_sections table, excluding user_id
 */
export interface PromptSectionDTO {
  id: PromptSectionRow["id"];
  title: PromptSectionRow["title"];
  position: PromptSectionRow["position"];
  created_at: PromptSectionRow["created_at"];
  updated_at: PromptSectionRow["updated_at"];
}

/**
 * Prompt section with prompt count for list view
 * GET /api/prompt-sections response item
 */
export interface PromptSectionWithCountDTO extends PromptSectionDTO {
  prompt_count: number;
}

/**
 * Command for creating a new prompt section
 * POST /api/prompt-sections request body
 */
export interface PromptSectionCreateCommand {
  title: PromptSectionRow["title"];
  position?: PromptSectionRow["position"];
}

/**
 * Command for updating a prompt section
 * PATCH /api/prompt-sections/:id request body
 */
export interface PromptSectionUpdateCommand {
  title?: PromptSectionRow["title"];
  position?: PromptSectionRow["position"];
}

/**
 * Prompt sections list response
 * GET /api/prompt-sections response
 */
export interface PromptSectionsListDTO {
  sections: PromptSectionWithCountDTO[];
}

/**
 * Prompt section deletion response
 * DELETE /api/prompt-sections/:id response
 */
export interface PromptSectionDeleteResponseDTO {
  message: string;
  prompts_moved: number;
}

// =============================================================================
// Shared Reorder Types
// =============================================================================

/**
 * Single item in a reorder request
 * Used for both sections and prompts reordering
 */
export interface ReorderItemCommand {
  id: string;
  position: number;
}

/**
 * Command for reordering sections
 * PATCH /api/prompt-sections/reorder request body
 */
export interface SectionsReorderCommand {
  order: ReorderItemCommand[];
}

/**
 * Generic reorder operation response
 * Used for both sections and prompts reordering
 */
export interface ReorderResponseDTO {
  message: string;
  updated_count: number;
}

// =============================================================================
// Prompts DTOs
// =============================================================================

/**
 * Full prompt data for responses
 * Derived from prompts table, excluding user_id
 */
export interface PromptDTO {
  id: PromptRow["id"];
  title: PromptRow["title"];
  body: PromptRow["body"];
  section_id: PromptRow["section_id"];
  position: PromptRow["position"];
  created_at: PromptRow["created_at"];
  updated_at: PromptRow["updated_at"];
}

/**
 * Command for creating a new prompt
 * POST /api/prompts request body
 */
export interface PromptCreateCommand {
  title: PromptRow["title"];
  body: PromptRow["body"];
  section_id?: PromptRow["section_id"];
  position?: PromptRow["position"];
}

/**
 * Command for updating an existing prompt
 * PATCH /api/prompts/:id request body
 */
export interface PromptUpdateCommand {
  title?: PromptRow["title"];
  body?: PromptRow["body"];
  section_id?: PromptRow["section_id"];
  position?: PromptRow["position"];
}

/**
 * Reusable pagination information
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Prompts list response with pagination
 * GET /api/prompts response
 */
export interface PromptsListDTO {
  prompts: PromptDTO[];
  pagination: PaginationDTO;
}

/**
 * Prompt deletion response
 * DELETE /api/prompts/:id response
 */
export interface PromptDeleteResponseDTO {
  message: string;
}

/**
 * Command for reordering prompts within a section
 * PATCH /api/prompts/reorder request body
 */
export interface PromptsReorderCommand {
  section_id: PromptRow["section_id"];
  order: ReorderItemCommand[];
}

// =============================================================================
// Smelts DTOs
// =============================================================================

/**
 * Smelt file information in responses
 * Derived from smelt_files table, excluding smelt_id
 */
export interface SmeltFileDTO {
  id: SmeltFileRow["id"];
  filename: SmeltFileRow["filename"];
  size_bytes: SmeltFileRow["size_bytes"];
  duration_seconds: SmeltFileRow["duration_seconds"];
  input_type: SmeltFileRow["input_type"];
  status: SmeltFileRow["status"];
  position: SmeltFileRow["position"];
  error_code?: SmeltFileRow["error_code"];
}

/**
 * Processing progress information
 */
export interface SmeltProgressDTO {
  percentage: number;
  stage: SmeltStatus;
  message: string;
}

/**
 * Single file result after processing
 */
export interface SmeltResultDTO {
  file_id: string;
  filename: string;
  content: string;
}

/**
 * Base smelt information shared across all states
 */
interface SmeltBaseDTO {
  id: SmeltRow["id"];
  status: SmeltRow["status"];
  mode: SmeltRow["mode"];
  files: SmeltFileDTO[];
  default_prompt_names: SmeltRow["default_prompt_names"];
  user_prompt_id: SmeltRow["user_prompt_id"];
  created_at: SmeltRow["created_at"];
  completed_at: SmeltRow["completed_at"];
}

/**
 * Smelt in processing state
 */
export interface SmeltProcessingDTO extends SmeltBaseDTO {
  status: "pending" | "validating" | "decoding" | "transcribing" | "synthesizing";
  progress: SmeltProgressDTO;
}

/**
 * Smelt in completed state
 */
export interface SmeltCompletedDTO extends SmeltBaseDTO {
  status: "completed";
  results: SmeltResultDTO[];
}

/**
 * Smelt in failed state
 */
export interface SmeltFailedDTO extends SmeltBaseDTO {
  status: "failed";
  error_code: SmeltRow["error_code"];
  error_message: SmeltRow["error_message"];
}

/**
 * Full smelt response (union of all states)
 * GET /api/smelts/:id response
 */
export type SmeltDTO = SmeltProcessingDTO | SmeltCompletedDTO | SmeltFailedDTO;

/**
 * Abbreviated smelt for list view
 * GET /api/smelts response item
 */
export interface SmeltListItemDTO {
  id: SmeltRow["id"];
  status: SmeltRow["status"];
  mode: SmeltRow["mode"];
  file_count: number;
  default_prompt_names: SmeltRow["default_prompt_names"];
  created_at: SmeltRow["created_at"];
  completed_at: SmeltRow["completed_at"];
}

/**
 * Smelts list response with pagination
 * GET /api/smelts response
 */
export interface SmeltsListDTO {
  smelts: SmeltListItemDTO[];
  pagination: PaginationDTO;
}

/**
 * Command for creating a new smelt (mapped from multipart form data)
 * POST /api/smelts request body (after multipart parsing)
 */
export interface SmeltCreateCommand {
  text?: string;
  mode: SmeltMode;
  default_prompt_names?: DefaultPromptName[];
  user_prompt_id?: string | null;
}

/**
 * Smelt creation response
 * POST /api/smelts response
 */
export interface SmeltCreateResponseDTO {
  id: SmeltRow["id"];
  status: SmeltRow["status"];
  mode: SmeltRow["mode"];
  files: SmeltFileDTO[];
  default_prompt_names: SmeltRow["default_prompt_names"];
  user_prompt_id: SmeltRow["user_prompt_id"];
  created_at: SmeltRow["created_at"];
  subscription_channel: string;
}

// =============================================================================
// Usage DTOs
// =============================================================================

/**
 * Anonymous user usage status
 * GET /api/usage response when not authenticated
 */
export interface UsageAnonymousDTO {
  type: "anonymous";
  smelts_used_today: number;
  daily_limit: number;
  can_process: boolean;
  resets_at: string;
}

/**
 * Authenticated user usage status (free tier)
 * GET /api/usage response when authenticated without API key
 */
export interface UsageAuthenticatedDTO {
  type: "authenticated";
  credits_remaining: UserProfileRow["credits_remaining"];
  weekly_credits_max: UserProfileRow["weekly_credits_max"];
  can_process: boolean;
  resets_at: string;
  days_until_reset: number;
  message?: string;
}

/**
 * Unlimited user usage status (with valid API key)
 * GET /api/usage response when authenticated with API key
 */
export interface UsageUnlimitedDTO {
  type: "unlimited";
  api_key_status: ApiKeyStatus;
  can_process: boolean;
}

/**
 * Union type for usage endpoint response
 * GET /api/usage response
 */
export type UsageDTO = UsageAnonymousDTO | UsageAuthenticatedDTO | UsageUnlimitedDTO;

// =============================================================================
// Real-Time Progress DTOs (Supabase Realtime Events)
// =============================================================================

/**
 * File progress in real-time events
 */
export interface SmeltFileProgressDTO {
  id: SmeltFileRow["id"];
  status: SmeltFileRow["status"];
  progress: number;
}

/**
 * Progress event payload
 * Sent during processing via Supabase Realtime
 */
export interface SmeltProgressEventPayloadDTO {
  smelt_id: string;
  status: SmeltStatus;
  progress: SmeltProgressDTO;
  files: SmeltFileProgressDTO[];
}

/**
 * Completion event payload
 * Sent when processing completes successfully
 */
export interface SmeltCompletedEventPayloadDTO {
  smelt_id: string;
  status: "completed";
  results: SmeltResultDTO[];
}

/**
 * Error event payload
 * Sent when processing fails
 */
export interface SmeltFailedEventPayloadDTO {
  smelt_id: string;
  status: "failed";
  error_code: SmeltErrorCode;
  error_message: string;
}

/**
 * Progress real-time event
 */
export interface SmeltProgressEventDTO {
  event: "progress";
  payload: SmeltProgressEventPayloadDTO;
}

/**
 * Completion real-time event
 */
export interface SmeltCompletedEventDTO {
  event: "completed";
  payload: SmeltCompletedEventPayloadDTO;
}

/**
 * Error real-time event
 */
export interface SmeltFailedEventDTO {
  event: "failed";
  payload: SmeltFailedEventPayloadDTO;
}

/**
 * Union type for all real-time events
 * Events received on subscription channel "smelt:{smelt_id}"
 */
export type SmeltRealtimeEventDTO = SmeltProgressEventDTO | SmeltCompletedEventDTO | SmeltFailedEventDTO;
