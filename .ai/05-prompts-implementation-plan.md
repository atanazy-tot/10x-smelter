# API Endpoint Implementation Plan: Prompts

## 1. Endpoint Overview

Prompts endpoints manage user-created custom prompts for audio/text processing. Prompts can optionally belong to sections and can be uploaded from markdown files.

| Endpoint               | Method | Description                      |
| ---------------------- | ------ | -------------------------------- |
| `/api/prompts`         | GET    | List all prompts with pagination |
| `/api/prompts`         | POST   | Create new prompt                |
| `/api/prompts/:id`     | GET    | Get single prompt                |
| `/api/prompts/:id`     | PATCH  | Update prompt                    |
| `/api/prompts/:id`     | DELETE | Delete prompt                    |
| `/api/prompts/upload`  | POST   | Create prompt from .MD file      |
| `/api/prompts/reorder` | PATCH  | Reorder prompts within section   |

---

## 2. Request Details

### GET /api/prompts

- **HTTP Method**: GET
- **URL Structure**: `/api/prompts`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `section_id` | uuid | null | Filter by section (null = unsectioned) |
  | `sort` | string | `position` | Sort field: `position`, `title`, `created_at`, `updated_at` |
  | `order` | string | `asc` | Sort order: `asc`, `desc` |
  | `page` | integer | 1 | Page number |
  | `limit` | integer | 50 | Items per page (max 100) |

### POST /api/prompts

- **HTTP Method**: POST
- **URL Structure**: `/api/prompts`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": null,
  "position": 0
}
```

### GET /api/prompts/:id

- **HTTP Method**: GET
- **URL Structure**: `/api/prompts/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Path Parameters**:
  - `id` - Prompt UUID

### PATCH /api/prompts/:id

- **HTTP Method**: PATCH
- **URL Structure**: `/api/prompts/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Path Parameters**:
  - `id` - Prompt UUID
- **Request Body**:

```json
{
  "title": "Updated Interview Notes",
  "body": "Updated prompt content...",
  "section_id": "uuid",
  "position": 1
}
```

### DELETE /api/prompts/:id

- **HTTP Method**: DELETE
- **URL Structure**: `/api/prompts/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Path Parameters**:
  - `id` - Prompt UUID

### POST /api/prompts/upload

- **HTTP Method**: POST
- **URL Structure**: `/api/prompts/upload`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: multipart/form-data`
- **Request Body (multipart)**:
  - `file` - The .MD file (max 10KB)
  - `title` - Optional title (defaults to filename)
  - `section_id` - Optional section UUID

### PATCH /api/prompts/reorder

- **HTTP Method**: PATCH
- **URL Structure**: `/api/prompts/reorder`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "section_id": "uuid",
  "order": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 }
  ]
}
```

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Database row type
type PromptRow = Tables<"prompts">;

// Prompt DTO for responses
interface PromptDTO {
  id: string;
  title: string;
  body: string;
  section_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// Create command
interface PromptCreateCommand {
  title: string;
  body: string;
  section_id?: string | null;
  position?: number;
}

// Update command
interface PromptUpdateCommand {
  title?: string;
  body?: string;
  section_id?: string | null;
  position?: number;
}

// Pagination
interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// List response
interface PromptsListDTO {
  prompts: PromptDTO[];
  pagination: PaginationDTO;
}

// Delete response
interface PromptDeleteResponseDTO {
  message: string;
}

// Reorder command
interface PromptsReorderCommand {
  section_id: string | null;
  order: ReorderItemCommand[];
}

// Reorder response
interface ReorderResponseDTO {
  message: string;
  updated_count: number;
}
```

---

## 4. Zod Validation Schemas

### Create file: `src/lib/schemas/prompts.schema.ts`

```typescript
import { z } from "zod";

// Query params for list endpoint
export const listPromptsQuerySchema = z.object({
  section_id: z.string().uuid().nullable().optional(),
  sort: z.enum(["position", "title", "created_at", "updated_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Create prompt
export const promptCreateSchema = z.object({
  title: z.string().min(1, "PROMPT TITLE REQUIRED").max(200, "PROMPT TITLE TOO LONG"),
  body: z.string().min(1, "PROMPT CONTENT REQUIRED").max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS"),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

// Update prompt
export const promptUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS").optional(),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

// UUID param
export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID PROMPT ID"),
});

// File upload
export const promptUploadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  section_id: z.string().uuid().nullable().optional(),
});

// Reorder
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

export const promptsReorderSchema = z.object({
  section_id: z.string().uuid().nullable(),
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

// Type exports
export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;
export type PromptCreateInput = z.infer<typeof promptCreateSchema>;
export type PromptUpdateInput = z.infer<typeof promptUpdateSchema>;
export type PromptUploadInput = z.infer<typeof promptUploadSchema>;
export type PromptsReorderInput = z.infer<typeof promptsReorderSchema>;
```

---

## 5. Response Details

### GET /api/prompts

**Success (200 OK)**:

```json
{
  "prompts": [
    {
      "id": "uuid",
      "title": "Meeting Summary",
      "body": "Summarize this meeting transcript...",
      "section_id": "uuid",
      "position": 0,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "total_pages": 1
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

### POST /api/prompts

**Success (201 Created)**:

```json
{
  "id": "uuid",
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": null,
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `missing_title` | PROMPT TITLE REQUIRED |
| 400 | `missing_body` | PROMPT CONTENT REQUIRED |
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `section_not_found` | SECTION NOT FOUND |

### GET /api/prompts/:id

**Success (200 OK)**:

```json
{
  "id": "uuid",
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": "uuid",
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

### PATCH /api/prompts/:id

**Success (200 OK)**:

```json
{
  "id": "uuid",
  "title": "Updated Interview Notes",
  "body": "Updated prompt content...",
  "section_id": "uuid",
  "position": 1,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T15:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

### DELETE /api/prompts/:id

**Success (200 OK)**:

```json
{
  "message": "PROMPT DELETED"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

### POST /api/prompts/upload

**Success (201 Created)**:

```json
{
  "id": "uuid",
  "title": "My Prompt",
  "body": "Content from uploaded file...",
  "section_id": null,
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_format` | ONLY .MD FILES ALLOWED |
| 400 | `file_too_large` | FILE TOO BIG. MAX 10KB |
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |

### PATCH /api/prompts/reorder

**Success (200 OK)**:

```json
{
  "message": "PROMPTS REORDERED",
  "updated_count": 2
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_order` | INVALID ORDER DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `prompt_not_found` | ONE OR MORE PROMPTS NOT FOUND |

---

## 6. Data Flow

### List Prompts Flow

```
Client Request
    ↓
GET /api/prompts?section_id=uuid&page=1&limit=50
    ↓
Validate auth → 401 if unauthorized
    ↓
Parse and validate query params
    ↓
Query prompts with pagination:
    SELECT * FROM prompts
    WHERE user_id = auth.uid()
    AND (section_id = :section_id OR :section_id IS NULL)
    ORDER BY {sort} {order}
    LIMIT :limit OFFSET (:page - 1) * :limit
    ↓
Get total count for pagination
    ↓
Return PromptsListDTO (200)
```

### Create Prompt Flow

```
Client Request
    ↓
POST /api/prompts
    ↓
Validate auth → 401 if unauthorized
    ↓
Validate request body (Zod)
    ↓
If section_id provided:
    Verify section exists and belongs to user → 404 if not
    ↓
If position not provided:
    Get max(position) + 1 for section
    ↓
INSERT INTO prompts (user_id, title, body, section_id, position)
    ↓
Return PromptDTO (201)
```

### Upload Prompt Flow

```
Client Request
    ↓
POST /api/prompts/upload (multipart/form-data)
    ↓
Validate auth → 401 if unauthorized
    ↓
Parse multipart form data
    ↓
Validate file:
    - Extension is .md → 400 if not
    - Size <= 10KB → 400 if larger
    ↓
Read file content (UTF-8)
    ↓
Validate content length <= 4000 chars → 400 if longer
    ↓
Extract title:
    - Use provided title, OR
    - Use filename without extension
    ↓
Create prompt with body = file content
    ↓
Return PromptDTO (201)
```

---

## 7. Security Considerations

1. **Row-Level Security**:
   - RLS policies ensure users only access their own prompts
   - Policy: `auth.uid() = user_id`

2. **Section Ownership Verification**:
   - When assigning section_id, verify section belongs to user
   - Prevents cross-user section assignment

3. **Content Length Limits**:
   - Body max 4000 characters (enforced in DB and Zod)
   - File upload max 10KB

4. **File Type Validation**:
   - Only .md files accepted for upload
   - Validate both extension and content type

5. **XSS Prevention**:
   - Prompt body stored as-is (markdown)
   - Frontend must sanitize when rendering

---

## 8. Error Handling

### Custom Errors

```typescript
export class PromptNotFoundError extends Error {
  constructor() {
    super("Prompt not found");
    this.name = "PromptNotFoundError";
  }
}

export class SectionNotFoundError extends Error {
  constructor() {
    super("Section not found");
    this.name = "SectionNotFoundError";
  }
}

export class InvalidFileFormatError extends Error {
  constructor() {
    super("Only .md files allowed");
    this.name = "InvalidFileFormatError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("File too large");
    this.name = "FileTooLargeError";
  }
}
```

---

## 9. Performance Considerations

1. **Pagination**:
   - Default limit of 50, max 100
   - Use OFFSET pagination (sufficient for expected data size)
   - Consider cursor pagination for very large datasets

2. **Indexes**:
   - `idx_prompts_user_section_position` for filtered queries
   - Primary key index on `id` for single prompt lookups

3. **Count Query Optimization**:
   - Use `count: 'exact'` option in Supabase for total count
   - Consider caching count for performance

4. **File Processing**:
   - Read file into memory (max 10KB is safe)
   - Immediate validation before DB operations

---

## 10. Implementation Steps

### Step 1: Create Prompts Schema

**File**: `src/lib/schemas/prompts.schema.ts`

```typescript
import { z } from "zod";

export const listPromptsQuerySchema = z.object({
  section_id: z.string().uuid().nullable().optional(),
  sort: z.enum(["position", "title", "created_at", "updated_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const promptCreateSchema = z.object({
  title: z.string().min(1, "PROMPT TITLE REQUIRED").max(200),
  body: z.string().min(1, "PROMPT CONTENT REQUIRED").max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS"),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const promptUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000, "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS").optional(),
  section_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID PROMPT ID"),
});

export const promptUploadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  section_id: z.string().uuid().nullable().optional(),
});

export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

export const promptsReorderSchema = z.object({
  section_id: z.string().uuid().nullable(),
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;
export type PromptCreateInput = z.infer<typeof promptCreateSchema>;
export type PromptUpdateInput = z.infer<typeof promptUpdateSchema>;
export type PromptUploadInput = z.infer<typeof promptUploadSchema>;
export type PromptsReorderInput = z.infer<typeof promptsReorderSchema>;
```

### Step 2: Create Prompts Service

**File**: `src/lib/services/prompts.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { PromptDTO, PromptsListDTO, PromptDeleteResponseDTO, ReorderResponseDTO } from "@/types";
import type {
  ListPromptsQuery,
  PromptCreateInput,
  PromptUpdateInput,
  PromptsReorderInput,
} from "@/lib/schemas/prompts.schema";

const MAX_FILE_SIZE = 10 * 1024; // 10KB
const MAX_BODY_LENGTH = 4000;

export class PromptsService {
  constructor(private supabase: SupabaseClient) {}

  async listPrompts(userId: string, query: ListPromptsQuery): Promise<PromptsListDTO> {
    const { section_id, sort, order, page, limit } = query;
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = this.supabase.from("prompts").select("*", { count: "exact" }).eq("user_id", userId);

    // Filter by section
    if (section_id !== undefined) {
      if (section_id === null) {
        queryBuilder = queryBuilder.is("section_id", null);
      } else {
        queryBuilder = queryBuilder.eq("section_id", section_id);
      }
    }

    // Apply sorting and pagination
    const { data, error, count } = await queryBuilder
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const prompts: PromptDTO[] = data.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      section_id: prompt.section_id,
      position: prompt.position,
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
    }));

    const total = count ?? 0;
    const total_pages = Math.ceil(total / limit);

    return {
      prompts,
      pagination: { page, limit, total, total_pages },
    };
  }

  async getPrompt(userId: string, promptId: string): Promise<PromptDTO> {
    const { data, error } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new PromptNotFoundError();
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      section_id: data.section_id,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async createPrompt(userId: string, input: PromptCreateInput): Promise<PromptDTO> {
    // Verify section ownership if provided
    if (input.section_id) {
      await this.verifySectionOwnership(userId, input.section_id);
    }

    // Auto-assign position if not provided
    let position = input.position;
    if (position === undefined) {
      position = await this.getNextPosition(userId, input.section_id ?? null);
    }

    const { data, error } = await this.supabase
      .from("prompts")
      .insert({
        user_id: userId,
        title: input.title,
        body: input.body,
        section_id: input.section_id ?? null,
        position,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      section_id: data.section_id,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async updatePrompt(userId: string, promptId: string, input: PromptUpdateInput): Promise<PromptDTO> {
    // Verify prompt ownership
    const { data: existing } = await this.supabase
      .from("prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      throw new PromptNotFoundError();
    }

    // Verify new section ownership if changing
    if (input.section_id !== undefined && input.section_id !== null) {
      await this.verifySectionOwnership(userId, input.section_id);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.section_id !== undefined) updateData.section_id = input.section_id;
    if (input.position !== undefined) updateData.position = input.position;

    const { data, error } = await this.supabase.from("prompts").update(updateData).eq("id", promptId).select().single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      body: data.body,
      section_id: data.section_id,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async deletePrompt(userId: string, promptId: string): Promise<PromptDeleteResponseDTO> {
    const { data: existing } = await this.supabase
      .from("prompts")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      throw new PromptNotFoundError();
    }

    const { error } = await this.supabase.from("prompts").delete().eq("id", promptId);

    if (error) throw error;

    return { message: "PROMPT DELETED" };
  }

  async createFromFile(
    userId: string,
    file: File,
    options: { title?: string; section_id?: string | null }
  ): Promise<PromptDTO> {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith(".md")) {
      throw new InvalidFileFormatError();
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new FileTooLargeError();
    }

    // Read file content
    const content = await file.text();

    // Validate content length
    if (content.length > MAX_BODY_LENGTH) {
      throw new ContentTooLongError();
    }

    // Determine title
    const title = options.title ?? file.name.replace(/\.md$/i, "");

    // Create prompt
    return this.createPrompt(userId, {
      title,
      body: content,
      section_id: options.section_id,
    });
  }

  async reorderPrompts(userId: string, input: PromptsReorderInput): Promise<ReorderResponseDTO> {
    const { section_id, order } = input;
    const promptIds = order.map((item) => item.id);

    // Verify all prompts exist, belong to user, and are in the specified section
    let queryBuilder = this.supabase.from("prompts").select("id").eq("user_id", userId).in("id", promptIds);

    if (section_id === null) {
      queryBuilder = queryBuilder.is("section_id", null);
    } else {
      queryBuilder = queryBuilder.eq("section_id", section_id);
    }

    const { data: existingPrompts, error } = await queryBuilder;

    if (error) throw error;

    if (existingPrompts.length !== promptIds.length) {
      throw new PromptNotFoundError("ONE OR MORE PROMPTS NOT FOUND");
    }

    // Update positions
    let updatedCount = 0;
    for (const item of order) {
      const { error: updateError } = await this.supabase
        .from("prompts")
        .update({ position: item.position })
        .eq("id", item.id);

      if (!updateError) updatedCount++;
    }

    return {
      message: "PROMPTS REORDERED",
      updated_count: updatedCount,
    };
  }

  private async verifySectionOwnership(userId: string, sectionId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("prompt_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new SectionNotFoundError();
    }
  }

  private async getNextPosition(userId: string, sectionId: string | null): Promise<number> {
    let queryBuilder = this.supabase.from("prompts").select("position").eq("user_id", userId);

    if (sectionId === null) {
      queryBuilder = queryBuilder.is("section_id", null);
    } else {
      queryBuilder = queryBuilder.eq("section_id", sectionId);
    }

    const { data } = await queryBuilder.order("position", { ascending: false }).limit(1).single();

    return (data?.position ?? -1) + 1;
  }
}

// Custom errors
export class PromptNotFoundError extends Error {
  constructor(message = "Prompt not found") {
    super(message);
    this.name = "PromptNotFoundError";
  }
}

export class SectionNotFoundError extends Error {
  constructor() {
    super("Section not found");
    this.name = "SectionNotFoundError";
  }
}

export class InvalidFileFormatError extends Error {
  constructor() {
    super("Only .md files allowed");
    this.name = "InvalidFileFormatError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("File too large");
    this.name = "FileTooLargeError";
  }
}

export class ContentTooLongError extends Error {
  constructor() {
    super("Content too long");
    this.name = "ContentTooLongError";
  }
}
```

### Step 3: Create API Endpoints

**File**: `src/pages/api/prompts/index.ts`

```typescript
import type { APIContext } from "astro";
import { PromptsService, SectionNotFoundError } from "@/lib/services/prompts.service";
import { listPromptsQuerySchema, promptCreateSchema } from "@/lib/schemas/prompts.schema";

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

    const url = new URL(context.request.url);
    const queryParams = {
      section_id: url.searchParams.get("section_id"),
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validation = listPromptsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      // Use defaults for invalid params
    }
    const query = validation.success
      ? validation.data
      : {
          sort: "position" as const,
          order: "asc" as const,
          page: 1,
          limit: 50,
        };

    const service = new PromptsService(context.locals.supabase);
    const result = await service.listPrompts(user.id, query);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List prompts error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(context: APIContext) {
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

    const body = await context.request.json();
    const validation = promptCreateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const code =
        firstError.path[0] === "title"
          ? "missing_title"
          : firstError.path[0] === "body"
            ? firstError.message.includes("4,000")
              ? "body_too_long"
              : "missing_body"
            : "invalid_data";
      return new Response(JSON.stringify({ error: { code, message: firstError.message } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.createPrompt(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SectionNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "section_not_found", message: "SECTION NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Create prompt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/prompts/[id].ts`

```typescript
import type { APIContext } from "astro";
import { PromptsService, PromptNotFoundError } from "@/lib/services/prompts.service";
import { uuidParamSchema, promptUpdateSchema } from "@/lib/schemas/prompts.schema";

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
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.getPrompt(user.id, paramValidation.data.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PromptNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Get prompt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PATCH(context: APIContext) {
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
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await context.request.json();
    const validation = promptUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const code = firstError.message.includes("4,000") ? "body_too_long" : "invalid_data";
      return new Response(JSON.stringify({ error: { code, message: firstError.message } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.updatePrompt(user.id, paramValidation.data.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PromptNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Update prompt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(context: APIContext) {
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
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.deletePrompt(user.id, paramValidation.data.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PromptNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "PROMPT NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Delete prompt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/prompts/upload.ts`

```typescript
import type { APIContext } from "astro";
import {
  PromptsService,
  InvalidFileFormatError,
  FileTooLargeError,
  ContentTooLongError,
} from "@/lib/services/prompts.service";

export const prerender = false;

export async function POST(context: APIContext) {
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

    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const sectionId = formData.get("section_id") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: { code: "invalid_format", message: "FILE REQUIRED" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.createFromFile(user.id, file, {
      title: title ?? undefined,
      section_id: sectionId,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof InvalidFileFormatError) {
      return new Response(JSON.stringify({ error: { code: "invalid_format", message: "ONLY .MD FILES ALLOWED" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof FileTooLargeError) {
      return new Response(JSON.stringify({ error: { code: "file_too_large", message: "FILE TOO BIG. MAX 10KB" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof ContentTooLongError) {
      return new Response(
        JSON.stringify({ error: { code: "body_too_long", message: "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS" } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Upload prompt error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/prompts/reorder.ts`

```typescript
import type { APIContext } from "astro";
import { PromptsService, PromptNotFoundError } from "@/lib/services/prompts.service";
import { promptsReorderSchema } from "@/lib/schemas/prompts.schema";

export const prerender = false;

export async function PATCH(context: APIContext) {
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

    const body = await context.request.json();
    const validation = promptsReorderSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: { code: "invalid_order", message: "INVALID ORDER DATA" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptsService(context.locals.supabase);
    const result = await service.reorderPrompts(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof PromptNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "prompt_not_found", message: error.message } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Reorder prompts error:", error);
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
│   │   └── prompts.schema.ts
│   └── services/
│       └── prompts.service.ts
└── pages/
    └── api/
        └── prompts/
            ├── index.ts     (GET, POST)
            ├── [id].ts      (GET, PATCH, DELETE)
            ├── upload.ts    (POST)
            └── reorder.ts   (PATCH)
```

---

## 12. Testing Checklist

- [ ] GET /api/prompts returns paginated list
- [ ] GET /api/prompts with section_id filters correctly
- [ ] GET /api/prompts with null section_id returns unsectioned
- [ ] GET /api/prompts pagination works correctly
- [ ] POST /api/prompts creates prompt successfully
- [ ] POST /api/prompts with invalid section_id returns 404
- [ ] POST /api/prompts without title returns 400
- [ ] POST /api/prompts without body returns 400
- [ ] POST /api/prompts with long body returns 400
- [ ] GET /api/prompts/:id returns single prompt
- [ ] GET /api/prompts/:id with invalid ID returns 404
- [ ] PATCH /api/prompts/:id updates fields correctly
- [ ] PATCH /api/prompts/:id with long body returns 400
- [ ] DELETE /api/prompts/:id removes prompt
- [ ] DELETE /api/prompts/:id with invalid ID returns 404
- [ ] POST /api/prompts/upload creates from .md file
- [ ] POST /api/prompts/upload rejects non-.md files
- [ ] POST /api/prompts/upload rejects files > 10KB
- [ ] POST /api/prompts/upload rejects content > 4000 chars
- [ ] PATCH /api/prompts/reorder updates positions
- [ ] PATCH /api/prompts/reorder with invalid prompt returns 404
- [ ] All endpoints return 401 without authentication
- [ ] RLS prevents access to other users' prompts
