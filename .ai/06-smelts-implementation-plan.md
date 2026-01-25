# API Endpoint Implementation Plan: Smelts (Processing Operations)

## 1. Endpoint Overview

Smelts are the core processing operations of the application. Users upload audio files or text, select prompts, and receive processed transcripts/summaries. This is the most complex API due to multipart handling, credit management, and async processing.

| Endpoint          | Method | Description                  |
| ----------------- | ------ | ---------------------------- |
| `/api/smelts`     | POST   | Create new smelt (multipart) |
| `/api/smelts/:id` | GET    | Get smelt status/results     |
| `/api/smelts`     | GET    | List user's smelt history    |

---

## 2. Request Details

### POST /api/smelts

- **HTTP Method**: POST
- **URL Structure**: `/api/smelts`
- **Headers**:
  - `Authorization: Bearer <access_token>` (optional for anonymous)
  - `Content-Type: multipart/form-data`
- **Request Body (multipart)**:
  - `files[]` - Audio files (MP3, WAV, M4A) - max 5 files, 25MB each
  - `text` - Text input (alternative to files)
  - `mode` - Processing mode: `separate` or `combine`
  - `default_prompt_names[]` - Array of predefined prompt names
  - `user_prompt_id` - UUID of custom prompt (authenticated only)

### GET /api/smelts/:id

- **HTTP Method**: GET
- **URL Structure**: `/api/smelts/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required for authenticated smelts)
- **Path Parameters**:
  - `id` - Smelt UUID

### GET /api/smelts

- **HTTP Method**: GET
- **URL Structure**: `/api/smelts`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `status` | string | null | Filter: `pending`, `completed`, `failed` |
  | `sort` | string | `created_at` | Sort field: `created_at`, `completed_at` |
  | `order` | string | `desc` | Sort order: `asc`, `desc` |
  | `page` | integer | 1 | Page number |
  | `limit` | integer | 20 | Items per page (max 50) |

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Enums
type SmeltStatus = "pending" | "validating" | "decoding" | "transcribing" | "synthesizing" | "completed" | "failed";
type SmeltMode = "separate" | "combine";
type SmeltErrorCode =
  | "file_too_large"
  | "invalid_format"
  | "duration_exceeded"
  | "corrupted_file"
  | "transcription_failed"
  | "synthesis_failed"
  | "api_rate_limited"
  | "api_quota_exhausted"
  | "api_key_invalid"
  | "connection_lost"
  | "internal_error";
type SmeltFileStatus = "pending" | "processing" | "completed" | "failed";
type SmeltFileErrorCode =
  | "file_too_large"
  | "invalid_format"
  | "duration_exceeded"
  | "corrupted_file"
  | "transcription_failed"
  | "decoding_failed";
type InputType = "audio" | "text";
type DefaultPromptName = "summarize" | "action_items" | "detailed_notes" | "qa_format" | "table_of_contents";

// File DTO
interface SmeltFileDTO {
  id: string;
  filename: string;
  size_bytes: number;
  duration_seconds: number | null;
  input_type: InputType;
  status: SmeltFileStatus;
  position: number;
  error_code?: SmeltFileErrorCode;
}

// Progress DTO
interface SmeltProgressDTO {
  percentage: number;
  stage: SmeltStatus;
  message: string;
}

// Result DTO
interface SmeltResultDTO {
  file_id: string;
  filename: string;
  content: string;
}

// Create command (parsed from multipart)
interface SmeltCreateCommand {
  text?: string;
  mode: SmeltMode;
  default_prompt_names?: DefaultPromptName[];
  user_prompt_id?: string | null;
}

// Create response
interface SmeltCreateResponseDTO {
  id: string;
  status: SmeltStatus;
  mode: SmeltMode;
  files: SmeltFileDTO[];
  default_prompt_names: DefaultPromptName[];
  user_prompt_id: string | null;
  created_at: string;
  subscription_channel: string;
}

// State-based DTOs
interface SmeltProcessingDTO {
  /* processing state */
}
interface SmeltCompletedDTO {
  /* completed with results */
}
interface SmeltFailedDTO {
  /* failed with error */
}
type SmeltDTO = SmeltProcessingDTO | SmeltCompletedDTO | SmeltFailedDTO;

// List item DTO
interface SmeltListItemDTO {
  id: string;
  status: SmeltStatus;
  mode: SmeltMode;
  file_count: number;
  default_prompt_names: DefaultPromptName[];
  created_at: string;
  completed_at: string | null;
}

// List response
interface SmeltsListDTO {
  smelts: SmeltListItemDTO[];
  pagination: PaginationDTO;
}
```

---

## 4. Zod Validation Schemas

### Create file: `src/lib/schemas/smelts.schema.ts`

```typescript
import { z } from "zod";

// Valid audio MIME types
const VALID_AUDIO_TYPES = [
  "audio/mpeg", // MP3
  "audio/mp3", // MP3 alternative
  "audio/wav", // WAV
  "audio/wave", // WAV alternative
  "audio/x-wav", // WAV alternative
  "audio/mp4", // M4A
  "audio/x-m4a", // M4A alternative
  "audio/m4a", // M4A alternative
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES = 5;
const MAX_DURATION_SECONDS = 30 * 60; // 30 minutes

// Default prompt names
export const defaultPromptNameSchema = z.enum([
  "summarize",
  "action_items",
  "detailed_notes",
  "qa_format",
  "table_of_contents",
]);

// Smelt mode
export const smeltModeSchema = z.enum(["separate", "combine"]);

// Create smelt from parsed form data
export const smeltCreateSchema = z.object({
  text: z.string().max(50000).optional(),
  mode: smeltModeSchema.default("separate"),
  default_prompt_names: z.array(defaultPromptNameSchema).optional(),
  user_prompt_id: z.string().uuid().nullable().optional(),
});

// File validation (separate function, not Zod)
export function validateAudioFile(file: File): {
  valid: boolean;
  error?: { code: string; message: string };
} {
  // Check MIME type
  if (!VALID_AUDIO_TYPES.includes(file.type.toLowerCase())) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "m4a"].includes(ext ?? "")) {
      return {
        valid: false,
        error: { code: "invalid_format", message: "CAN'T READ THAT. TRY .MP3 .WAV .M4A" },
      };
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: { code: "file_too_large", message: `FILE TOO CHUNKY. MAX 25MB. YOUR FILE: ${sizeMB}MB` },
    };
  }

  return { valid: true };
}

// Query params for list
export const listSmeltsQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed"]).optional(),
  sort: z.enum(["created_at", "completed_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// UUID param
export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID SMELT ID"),
});

// Type exports
export type SmeltCreateInput = z.infer<typeof smeltCreateSchema>;
export type ListSmeltsQuery = z.infer<typeof listSmeltsQuerySchema>;
export { MAX_FILE_SIZE, MAX_FILES, MAX_DURATION_SECONDS, VALID_AUDIO_TYPES };
```

---

## 5. Response Details

### POST /api/smelts

**Success (201 Created)**:

```json
{
  "id": "uuid",
  "status": "pending",
  "mode": "separate",
  "files": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "size_bytes": 5242880,
      "duration_seconds": 300,
      "input_type": "audio",
      "status": "pending",
      "position": 0
    }
  ],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "created_at": "2026-01-17T14:00:00Z",
  "subscription_channel": "smelt:uuid"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `no_input` | NOTHING TO PROCESS. UPLOAD A FILE OR ENTER TEXT |
| 400 | `mixed_input` | CHOOSE EITHER FILES OR TEXT, NOT BOTH |
| 400 | `too_many_files` | MAX 5 FILES ALLOWED |
| 400 | `file_too_large` | FILE TOO CHUNKY. MAX 25MB. YOUR FILE: {size}MB |
| 400 | `invalid_format` | CAN'T READ THAT. TRY .MP3 .WAV .M4A |
| 400 | `duration_exceeded` | AUDIO TOO LONG. MAX 30 MINUTES |
| 400 | `combine_requires_auth` | COMBINE MODE REQUIRES LOGIN |
| 400 | `combine_requires_multiple` | COMBINE MODE NEEDS 2+ FILES |
| 403 | `daily_limit` | DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED |
| 403 | `weekly_limit` | {used}/{max} SMELTS USED THIS WEEK. RESETS IN {days} DAYS. OR ADD YOUR API KEY FOR UNLIMITED |
| 401 | `unauthorized` | LOGIN REQUIRED FOR THIS FEATURE |
| 404 | `prompt_not_found` | PROMPT NOT FOUND |

### GET /api/smelts/:id

**Success - Processing (200 OK)**:

```json
{
  "id": "uuid",
  "status": "transcribing",
  "mode": "separate",
  "files": [...],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "progress": {
    "percentage": 45,
    "stage": "transcribing",
    "message": "Transcribing audio..."
  },
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": null
}
```

**Success - Completed (200 OK)**:

```json
{
  "id": "uuid",
  "status": "completed",
  "mode": "separate",
  "files": [...],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "results": [
    {
      "file_id": "uuid",
      "filename": "meeting.mp3",
      "content": "# Meeting Summary\n\n## Key Points\n..."
    }
  ],
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": "2026-01-17T14:02:30Z"
}
```

**Success - Failed (200 OK)**:

```json
{
  "id": "uuid",
  "status": "failed",
  "mode": "separate",
  "files": [...],
  "error_code": "transcription_failed",
  "error_message": "TRANSCRIPTION FAILED. TRY AGAIN",
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": "2026-01-17T14:00:15Z"
}
```

### GET /api/smelts

**Success (200 OK)**:

```json
{
  "smelts": [
    {
      "id": "uuid",
      "status": "completed",
      "mode": "separate",
      "file_count": 1,
      "default_prompt_names": ["summarize"],
      "created_at": "2026-01-17T14:00:00Z",
      "completed_at": "2026-01-17T14:02:30Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

## 6. Data Flow

### Create Smelt Flow

```
Client Request (multipart/form-data)
    ↓
POST /api/smelts
    ↓
Parse multipart form data
    ↓
Validate input:
    - Either files[] OR text, not both
    - Files: extension, size, count
    - Mode: separate/combine
    ↓
Check user type:
    ↓
    ├── Anonymous:
    │     - Only single file allowed
    │     - Only separate mode
    │     - Check daily limit (1/day)
    │     - Hash IP, query anonymous_usage
    │
    ├── Authenticated (no API key):
    │     - Check weekly credits
    │     - Reset credits if needed
    │     - Reject if credits_remaining = 0
    │
    └── Authenticated (with valid API key):
          - Skip credit checks (unlimited)
    ↓
If user_prompt_id provided:
    Verify prompt ownership → 404 if not found
    ↓
Create smelt record in database
    ↓
Create smelt_files records
    ↓
Trigger async processing (queue or background job)
    ↓
Return SmeltCreateResponseDTO (201)
    - Include subscription_channel for realtime updates
```

### Get Smelt Status Flow

```
Client Request
    ↓
GET /api/smelts/:id
    ↓
Validate UUID parameter
    ↓
Query smelt with files:
    SELECT s.*, sf.*
    FROM smelts s
    LEFT JOIN smelt_files sf ON sf.smelt_id = s.id
    WHERE s.id = :id
    ↓
Check authorization:
    - If smelt.user_id is NULL → anonymous smelt (no read allowed)
    - If smelt.user_id != auth.uid() → 404 (RLS would block anyway)
    ↓
Build response based on status:
    ├── Processing → include progress
    ├── Completed → include results
    └── Failed → include error details
    ↓
Return SmeltDTO (200)
```

---

## 7. Security Considerations

1. **Rate Limiting by User Type**:
   - Anonymous: 1 smelt/day (tracked by IP hash)
   - Authenticated: 5 smelts/week (tracked by credits)
   - With API key: Unlimited

2. **File Validation**:
   - Validate file type by extension AND MIME type
   - Enforce 25MB size limit per file
   - Maximum 5 files per smelt

3. **Anonymous User Restrictions**:
   - Cannot use combine mode
   - Cannot use custom prompts
   - Cannot read back smelt results via API
   - Results delivered only via realtime channel

4. **Row-Level Security**:
   - Authenticated users can only read their own smelts
   - Anonymous smelts (user_id = NULL) are insert-only

5. **API Key Usage**:
   - User's encrypted API key is decrypted server-side
   - Used for LLM calls, never exposed to client

6. **Input Sanitization**:
   - Text input limited to 50,000 characters
   - Audio duration capped at 30 minutes

---

## 8. Error Handling

### Credit Error Messages

```typescript
function buildCreditError(userType: "anonymous" | "authenticated"): {
  status: number;
  code: string;
  message: string;
} {
  if (userType === "anonymous") {
    return {
      status: 403,
      code: "daily_limit",
      message: "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED",
    };
  }

  // Authenticated user - get current usage info
  return {
    status: 403,
    code: "weekly_limit",
    message: `{used}/{max} SMELTS USED THIS WEEK. RESETS IN {days} DAYS. OR ADD YOUR API KEY FOR UNLIMITED`,
  };
}
```

### Processing Error Codes

| Error Code             | HTTP Status | User Message                                 |
| ---------------------- | ----------- | -------------------------------------------- |
| `file_too_large`       | 400         | FILE TOO CHUNKY. MAX 25MB                    |
| `invalid_format`       | 400         | CAN'T READ THAT. TRY .MP3 .WAV .M4A          |
| `duration_exceeded`    | 400         | AUDIO TOO LONG. MAX 30 MINUTES               |
| `corrupted_file`       | 422         | CORRUPTED FILE. TRY A DIFFERENT ONE          |
| `transcription_failed` | 500         | TRANSCRIPTION FAILED. TRY AGAIN              |
| `synthesis_failed`     | 500         | PROCESSING FAILED. TRY AGAIN                 |
| `api_rate_limited`     | 429         | RATE LIMITED. TRY AGAIN IN {seconds} SECONDS |
| `api_quota_exhausted`  | 402         | API QUOTA EXHAUSTED                          |
| `api_key_invalid`      | 401         | API KEY INVALID                              |

---

## 9. Performance Considerations

1. **File Upload Handling**:
   - Stream files to temporary storage
   - Process files asynchronously after response
   - Clean up temp files immediately after processing

2. **Credit Checks**:
   - Perform credit checks early (before file processing)
   - Use atomic operations for credit deduction

3. **Database Optimization**:
   - Index on `smelts(user_id, created_at)` for list queries
   - Batch insert smelt_files records

4. **Async Processing**:
   - Use background queue for audio processing
   - Return immediately after smelt creation
   - Deliver results via Supabase Realtime

---

## 10. Implementation Steps

### Step 1: Create Smelts Schema

**File**: `src/lib/schemas/smelts.schema.ts`

```typescript
import { z } from "zod";

const VALID_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_DURATION_SECONDS = 30 * 60;

export const defaultPromptNameSchema = z.enum([
  "summarize",
  "action_items",
  "detailed_notes",
  "qa_format",
  "table_of_contents",
]);

export const smeltModeSchema = z.enum(["separate", "combine"]);

export const smeltCreateSchema = z.object({
  text: z.string().max(50000).optional(),
  mode: smeltModeSchema.default("separate"),
  default_prompt_names: z.array(defaultPromptNameSchema).optional(),
  user_prompt_id: z.string().uuid().nullable().optional(),
});

export function validateAudioFile(file: File): {
  valid: boolean;
  error?: { code: string; message: string };
} {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!VALID_AUDIO_TYPES.includes(file.type.toLowerCase()) && !["mp3", "wav", "m4a"].includes(ext ?? "")) {
    return { valid: false, error: { code: "invalid_format", message: "CAN'T READ THAT. TRY .MP3 .WAV .M4A" } };
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: { code: "file_too_large", message: `FILE TOO CHUNKY. MAX 25MB. YOUR FILE: ${sizeMB}MB` },
    };
  }
  return { valid: true };
}

export const listSmeltsQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed"]).optional(),
  sort: z.enum(["created_at", "completed_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID SMELT ID"),
});

export type SmeltCreateInput = z.infer<typeof smeltCreateSchema>;
export type ListSmeltsQuery = z.infer<typeof listSmeltsQuerySchema>;
export { MAX_FILE_SIZE, MAX_FILES, MAX_DURATION_SECONDS };
```

### Step 2: Create Smelts Service

**File**: `src/lib/services/smelts.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { SmeltCreateResponseDTO, SmeltDTO, SmeltsListDTO, SmeltFileDTO, DefaultPromptName } from "@/types";
import type { SmeltCreateInput, ListSmeltsQuery } from "@/lib/schemas/smelts.schema";
import { createHash } from "crypto";

const MAX_FILES = 5;

export class SmeltsService {
  constructor(private supabase: SupabaseClient) {}

  async createSmelt(
    userId: string | null,
    files: File[],
    input: SmeltCreateInput,
    clientIp: string
  ): Promise<SmeltCreateResponseDTO> {
    // Validate input combination
    const hasFiles = files.length > 0;
    const hasText = !!input.text?.trim();

    if (!hasFiles && !hasText) {
      throw new SmeltValidationError("no_input", "NOTHING TO PROCESS. UPLOAD A FILE OR ENTER TEXT");
    }

    if (hasFiles && hasText) {
      throw new SmeltValidationError("mixed_input", "CHOOSE EITHER FILES OR TEXT, NOT BOTH");
    }

    if (hasFiles && files.length > MAX_FILES) {
      throw new SmeltValidationError("too_many_files", "MAX 5 FILES ALLOWED");
    }

    // Check mode restrictions
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
        throw new SmeltValidationError("unauthorized", "LOGIN REQUIRED FOR THIS FEATURE");
      }
      if (input.user_prompt_id) {
        throw new SmeltValidationError("unauthorized", "LOGIN REQUIRED FOR THIS FEATURE");
      }
    }

    // Check credits/limits
    await this.checkUsageLimits(userId, clientIp);

    // Verify custom prompt ownership
    if (input.user_prompt_id && userId) {
      await this.verifyPromptOwnership(userId, input.user_prompt_id);
    }

    // Create smelt record
    const { data: smelt, error: smeltError } = await this.supabase
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
    const smeltFiles: SmeltFileDTO[] = [];

    if (hasFiles) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data: fileRecord, error: fileError } = await this.supabase
          .from("smelt_files")
          .insert({
            smelt_id: smelt.id,
            input_type: "audio",
            filename: file.name,
            size_bytes: file.size,
            duration_seconds: null, // Will be updated during processing
            status: "pending",
            position: i,
          })
          .select()
          .single();

        if (fileError) throw fileError;

        smeltFiles.push({
          id: fileRecord.id,
          filename: fileRecord.filename,
          size_bytes: fileRecord.size_bytes,
          duration_seconds: fileRecord.duration_seconds,
          input_type: fileRecord.input_type,
          status: fileRecord.status,
          position: fileRecord.position,
        });
      }
    } else {
      // Text input
      const { data: fileRecord, error: fileError } = await this.supabase
        .from("smelt_files")
        .insert({
          smelt_id: smelt.id,
          input_type: "text",
          filename: "text-input.txt",
          size_bytes: Buffer.byteLength(input.text!, "utf8"),
          status: "pending",
          position: 0,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      smeltFiles.push({
        id: fileRecord.id,
        filename: fileRecord.filename,
        size_bytes: fileRecord.size_bytes,
        duration_seconds: null,
        input_type: fileRecord.input_type,
        status: fileRecord.status,
        position: fileRecord.position,
      });
    }

    // TODO: Trigger async processing here
    // await this.queueProcessing(smelt.id, files, input.text);

    return {
      id: smelt.id,
      status: smelt.status,
      mode: smelt.mode,
      files: smeltFiles,
      default_prompt_names: smelt.default_prompt_names as DefaultPromptName[],
      user_prompt_id: smelt.user_prompt_id,
      created_at: smelt.created_at,
      subscription_channel: `smelt:${smelt.id}`,
    };
  }

  async getSmelt(userId: string, smeltId: string): Promise<SmeltDTO> {
    const { data: smelt, error } = await this.supabase
      .from("smelts")
      .select(
        `
        *,
        smelt_files(*)
      `
      )
      .eq("id", smeltId)
      .eq("user_id", userId)
      .single();

    if (error || !smelt) {
      throw new SmeltNotFoundError();
    }

    const files: SmeltFileDTO[] = smelt.smelt_files.map((f: any) => ({
      id: f.id,
      filename: f.filename,
      size_bytes: f.size_bytes,
      duration_seconds: f.duration_seconds,
      input_type: f.input_type,
      status: f.status,
      position: f.position,
      error_code: f.error_code,
    }));

    const baseData = {
      id: smelt.id,
      status: smelt.status,
      mode: smelt.mode,
      files,
      default_prompt_names: smelt.default_prompt_names as DefaultPromptName[],
      user_prompt_id: smelt.user_prompt_id,
      created_at: smelt.created_at,
      completed_at: smelt.completed_at,
    };

    // Return based on status
    if (smelt.status === "completed") {
      // TODO: Fetch results from results storage
      return {
        ...baseData,
        status: "completed" as const,
        results: [], // Populate from results storage
      };
    }

    if (smelt.status === "failed") {
      return {
        ...baseData,
        status: "failed" as const,
        error_code: smelt.error_code,
        error_message: smelt.error_message,
      };
    }

    // Processing state
    return {
      ...baseData,
      status: smelt.status as "pending" | "validating" | "decoding" | "transcribing" | "synthesizing",
      progress: this.calculateProgress(smelt.status, files),
    };
  }

  async listSmelts(userId: string, query: ListSmeltsQuery): Promise<SmeltsListDTO> {
    const { status, sort, order, page, limit } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = this.supabase
      .from("smelts")
      .select(
        `
        id,
        status,
        mode,
        default_prompt_names,
        created_at,
        completed_at,
        smelt_files(count)
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

    if (error) throw error;

    const smelts = data.map((s: any) => ({
      id: s.id,
      status: s.status,
      mode: s.mode,
      file_count: s.smelt_files?.[0]?.count ?? 0,
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
  }

  private async checkUsageLimits(userId: string | null, clientIp: string): Promise<void> {
    if (!userId) {
      // Anonymous user - check daily limit
      await this.checkAnonymousLimit(clientIp);
      return;
    }

    // Authenticated user - check API key or credits
    const { data: profile } = await this.supabase
      .from("user_profiles")
      .select("api_key_status, credits_remaining, weekly_credits_max, credits_reset_at")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Unlimited if valid API key
    if (profile.api_key_status === "valid") {
      return;
    }

    // Check and reset credits if needed
    const now = new Date();
    if (new Date(profile.credits_reset_at) <= now) {
      // Reset credits
      const nextReset = this.getNextMondayMidnightUtc();
      await this.supabase
        .from("user_profiles")
        .update({
          credits_remaining: profile.weekly_credits_max,
          credits_reset_at: nextReset.toISOString(),
        })
        .eq("user_id", userId);

      profile.credits_remaining = profile.weekly_credits_max;
    }

    if (profile.credits_remaining <= 0) {
      const used = profile.weekly_credits_max - profile.credits_remaining;
      const daysUntilReset = Math.ceil(
        (new Date(profile.credits_reset_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      throw new SmeltLimitError(
        "weekly_limit",
        `${used}/${profile.weekly_credits_max} SMELTS USED THIS WEEK. RESETS IN ${daysUntilReset} DAYS. OR ADD YOUR API KEY FOR UNLIMITED`
      );
    }
  }

  private async checkAnonymousLimit(clientIp: string): Promise<void> {
    const ipHash = createHash("sha256").update(clientIp).digest("hex");
    const todayUtc = new Date().toISOString().split("T")[0];

    const { data: usage } = await this.supabase
      .from("anonymous_usage")
      .select("smelts_used")
      .eq("ip_hash", ipHash)
      .eq("date_utc", todayUtc)
      .single();

    if (usage && usage.smelts_used >= 1) {
      throw new SmeltLimitError("daily_limit", "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED");
    }
  }

  private async verifyPromptOwnership(userId: string, promptId: string): Promise<void> {
    const { data } = await this.supabase.from("prompts").select("id").eq("id", promptId).eq("user_id", userId).single();

    if (!data) {
      throw new PromptNotFoundError();
    }
  }

  private calculateProgress(
    status: string,
    files: SmeltFileDTO[]
  ): { percentage: number; stage: string; message: string } {
    const stageProgress: Record<string, { percentage: number; message: string }> = {
      pending: { percentage: 0, message: "Waiting to process..." },
      validating: { percentage: 10, message: "Validating files..." },
      decoding: { percentage: 20, message: "Decoding audio..." },
      transcribing: { percentage: 50, message: "Transcribing audio..." },
      synthesizing: { percentage: 85, message: "Generating output..." },
    };

    const stage = stageProgress[status] ?? { percentage: 0, message: "Processing..." };
    return {
      percentage: stage.percentage,
      stage: status,
      message: stage.message,
    };
  }

  private getNextMondayMidnightUtc(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday;
  }
}

// Custom errors
export class SmeltValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "SmeltValidationError";
  }
}

export class SmeltLimitError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "SmeltLimitError";
  }
}

export class SmeltNotFoundError extends Error {
  constructor() {
    super("Smelt not found");
    this.name = "SmeltNotFoundError";
  }
}

export class PromptNotFoundError extends Error {
  constructor() {
    super("Prompt not found");
    this.name = "PromptNotFoundError";
  }
}
```

### Step 3: Create API Endpoints

**File**: `src/pages/api/smelts/index.ts`

```typescript
import type { APIContext } from "astro";
import {
  SmeltsService,
  SmeltValidationError,
  SmeltLimitError,
  PromptNotFoundError,
} from "@/lib/services/smelts.service";
import { smeltCreateSchema, validateAudioFile, listSmeltsQuerySchema, MAX_FILES } from "@/lib/schemas/smelts.schema";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // Get user (may be null for anonymous)
    const {
      data: { user },
    } = await context.locals.supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Get client IP
    const clientIp =
      context.request.headers.get("x-forwarded-for")?.split(",")[0] ??
      context.request.headers.get("x-real-ip") ??
      "unknown";

    // Parse multipart form data
    const formData = await context.request.formData();

    // Extract files
    const files: File[] = [];
    const fileEntries = formData.getAll("files[]");
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    // Validate file count early
    if (files.length > MAX_FILES) {
      return new Response(JSON.stringify({ error: { code: "too_many_files", message: "MAX 5 FILES ALLOWED" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate each file
    for (const file of files) {
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Parse other form fields
    const input = {
      text: formData.get("text") as string | undefined,
      mode: (formData.get("mode") as string) ?? "separate",
      default_prompt_names: formData.getAll("default_prompt_names[]") as string[],
      user_prompt_id: formData.get("user_prompt_id") as string | null,
    };

    const validation = smeltCreateSchema.safeParse(input);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: { code: "invalid_data", message: validation.error.errors[0].message } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const service = new SmeltsService(context.locals.supabase);
    const result = await service.createSmelt(userId, files, validation.data, clientIp);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SmeltValidationError) {
      const status = error.code === "unauthorized" ? 401 : 400;
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof SmeltLimitError) {
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof PromptNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "prompt_not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Create smelt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "LOGIN REQUIRED" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(context.request.url);
    const queryParams = {
      status: url.searchParams.get("status") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validation = listSmeltsQuerySchema.safeParse(queryParams);
    const query = validation.success
      ? validation.data
      : {
          sort: "created_at" as const,
          order: "desc" as const,
          page: 1,
          limit: 20,
        };

    const service = new SmeltsService(context.locals.supabase);
    const result = await service.listSmelts(user.id, query);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List smelts error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/smelts/[id].ts`

```typescript
import type { APIContext } from "astro";
import { SmeltsService, SmeltNotFoundError } from "@/lib/services/smelts.service";
import { uuidParamSchema } from "@/lib/schemas/smelts.schema";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "LOGIN REQUIRED" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SMELT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new SmeltsService(context.locals.supabase);
    const result = await service.getSmelt(user.id, paramValidation.data.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SmeltNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SMELT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Get smelt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

---

## 11. File Structure

```
src/
├── lib/
│   ├── schemas/
│   │   └── smelts.schema.ts
│   └── services/
│       └── smelts.service.ts
└── pages/
    └── api/
        └── smelts/
            ├── index.ts     (POST, GET)
            └── [id].ts      (GET)
```

---

## 12. Testing Checklist

- [ ] POST with single audio file creates smelt
- [ ] POST with multiple audio files creates smelt with multiple file records
- [ ] POST with text input creates smelt
- [ ] POST with both files and text returns 400
- [ ] POST with no input returns 400
- [ ] POST with > 5 files returns 400
- [ ] POST with file > 25MB returns 400
- [ ] POST with invalid file format returns 400
- [ ] POST anonymous with multiple files returns 401
- [ ] POST anonymous with combine mode returns 400
- [ ] POST anonymous hitting daily limit returns 403
- [ ] POST authenticated hitting weekly limit returns 403
- [ ] POST with valid API key bypasses limits
- [ ] POST with invalid user_prompt_id returns 404
- [ ] GET /api/smelts/:id returns smelt with correct status shape
- [ ] GET /api/smelts/:id for other user returns 404
- [ ] GET /api/smelts returns paginated list
- [ ] GET /api/smelts with status filter works
- [ ] Anonymous cannot GET their smelt
- [ ] subscription_channel is correctly formatted
