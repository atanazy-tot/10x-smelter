# API Endpoint Implementation Plan: Prompt Sections

## 1. Endpoint Overview

Prompt Sections provide organizational grouping for user-created custom prompts (similar to tab groups in browsers). Users can create, update, delete, and reorder sections.

| Endpoint                       | Method | Description        |
| ------------------------------ | ------ | ------------------ |
| `/api/prompt-sections`         | GET    | List all sections  |
| `/api/prompt-sections`         | POST   | Create new section |
| `/api/prompt-sections/:id`     | PATCH  | Update section     |
| `/api/prompt-sections/:id`     | DELETE | Delete section     |
| `/api/prompt-sections/reorder` | PATCH  | Reorder sections   |

---

## 2. Request Details

### GET /api/prompt-sections

- **HTTP Method**: GET
- **URL Structure**: `/api/prompt-sections`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `sort` | string | `position` | Sort field: `position`, `title`, `created_at` |
  | `order` | string | `asc` | Sort order: `asc`, `desc` |

### POST /api/prompt-sections

- **HTTP Method**: POST
- **URL Structure**: `/api/prompt-sections`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "title": "Meetings",
  "position": 2
}
```

### PATCH /api/prompt-sections/:id

- **HTTP Method**: PATCH
- **URL Structure**: `/api/prompt-sections/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Path Parameters**:
  - `id` - Section UUID
- **Request Body**:

```json
{
  "title": "Work Meetings",
  "position": 0
}
```

### DELETE /api/prompt-sections/:id

- **HTTP Method**: DELETE
- **URL Structure**: `/api/prompt-sections/:id`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Path Parameters**:
  - `id` - Section UUID

### PATCH /api/prompt-sections/reorder

- **HTTP Method**: PATCH
- **URL Structure**: `/api/prompt-sections/reorder`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "order": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 },
    { "id": "uuid-3", "position": 2 }
  ]
}
```

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Database row type
type PromptSectionRow = Tables<"prompt_sections">;

// Section without prompt count (create/update responses)
interface PromptSectionDTO {
  id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// Section with prompt count (list response)
interface PromptSectionWithCountDTO extends PromptSectionDTO {
  prompt_count: number;
}

// Create command
interface PromptSectionCreateCommand {
  title: string;
  position?: number;
}

// Update command
interface PromptSectionUpdateCommand {
  title?: string;
  position?: number;
}

// List response
interface PromptSectionsListDTO {
  sections: PromptSectionWithCountDTO[];
}

// Reorder item
interface ReorderItemCommand {
  id: string;
  position: number;
}

// Reorder command
interface SectionsReorderCommand {
  order: ReorderItemCommand[];
}

// Reorder response
interface ReorderResponseDTO {
  message: string;
  updated_count: number;
}

// Delete response
interface PromptSectionDeleteResponseDTO {
  message: string;
  prompts_moved: number;
}
```

---

## 4. Zod Validation Schemas

### Create file: `src/lib/schemas/prompt-sections.schema.ts`

```typescript
import { z } from "zod";

// Query params for list endpoint
export const listSectionsQuerySchema = z.object({
  sort: z.enum(["position", "title", "created_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// Create section
export const sectionCreateSchema = z.object({
  title: z.string().min(1, "SECTION TITLE REQUIRED").max(100, "SECTION TITLE TOO LONG"),
  position: z.number().int().min(0).optional(),
});

// Update section
export const sectionUpdateSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => data.title !== undefined || data.position !== undefined, { message: "INVALID UPDATE DATA" });

// UUID param
export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID SECTION ID"),
});

// Reorder command
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

export const sectionsReorderSchema = z.object({
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

// Type exports
export type ListSectionsQuery = z.infer<typeof listSectionsQuerySchema>;
export type SectionCreateInput = z.infer<typeof sectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>;
export type SectionsReorderInput = z.infer<typeof sectionsReorderSchema>;
```

---

## 5. Response Details

### GET /api/prompt-sections

**Success (200 OK)**:

```json
{
  "sections": [
    {
      "id": "uuid",
      "title": "Work",
      "position": 0,
      "prompt_count": 3,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "title": "Personal",
      "position": 1,
      "prompt_count": 2,
      "created_at": "2026-01-12T09:00:00Z",
      "updated_at": "2026-01-12T09:00:00Z"
    }
  ]
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

### POST /api/prompt-sections

**Success (201 Created)**:

```json
{
  "id": "uuid",
  "title": "Meetings",
  "position": 2,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `missing_title` | SECTION TITLE REQUIRED |
| 401 | `unauthorized` | LOGIN REQUIRED |

### PATCH /api/prompt-sections/:id

**Success (200 OK)**:

```json
{
  "id": "uuid",
  "title": "Work Meetings",
  "position": 0,
  "created_at": "2026-01-10T08:00:00Z",
  "updated_at": "2026-01-17T14:30:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_data` | INVALID UPDATE DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | SECTION NOT FOUND |

### DELETE /api/prompt-sections/:id

**Success (200 OK)**:

```json
{
  "message": "SECTION DELETED",
  "prompts_moved": 3
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | SECTION NOT FOUND |

### PATCH /api/prompt-sections/reorder

**Success (200 OK)**:

```json
{
  "message": "SECTIONS REORDERED",
  "updated_count": 3
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_order` | INVALID ORDER DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `section_not_found` | ONE OR MORE SECTIONS NOT FOUND |

---

## 6. Data Flow

### List Sections Flow

```
Client Request
    ↓
GET /api/prompt-sections?sort=position&order=asc
    ↓
Validate auth → 401 if unauthorized
    ↓
Parse and validate query params
    ↓
Query sections with prompt count:
    SELECT s.*, COUNT(p.id) as prompt_count
    FROM prompt_sections s
    LEFT JOIN prompts p ON p.section_id = s.id
    WHERE s.user_id = auth.uid()
    GROUP BY s.id
    ORDER BY s.{sort} {order}
    ↓
Return PromptSectionsListDTO (200)
```

### Create Section Flow

```
Client Request
    ↓
POST /api/prompt-sections
    ↓
Validate auth → 401 if unauthorized
    ↓
Validate request body (Zod)
    ↓
If position not provided:
    Get max(position) + 1 for user's sections
    ↓
INSERT INTO prompt_sections (user_id, title, position)
    ↓
Return PromptSectionDTO (201)
```

### Delete Section Flow

```
Client Request
    ↓
DELETE /api/prompt-sections/:id
    ↓
Validate auth → 401 if unauthorized
    ↓
Check section exists and belongs to user → 404 if not
    ↓
Count prompts in section
    ↓
Update prompts: SET section_id = NULL WHERE section_id = :id
    ↓
DELETE FROM prompt_sections WHERE id = :id
    ↓
Return PromptSectionDeleteResponseDTO (200)
```

---

## 7. Security Considerations

1. **Row-Level Security**:
   - RLS policies ensure users only access their own sections
   - Policy: `auth.uid() = user_id`

2. **Cascade Behavior**:
   - Deleting section sets prompts' `section_id` to NULL
   - Prompts become "unsectioned" rather than deleted

3. **Ownership Verification**:
   - All operations verify section belongs to authenticated user
   - Even with RLS, explicit checks provide clear error messages

4. **Input Sanitization**:
   - Title length limited to 100 characters
   - Position must be non-negative integer

---

## 8. Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

### Custom Errors

```typescript
export class SectionNotFoundError extends Error {
  constructor() {
    super("Section not found");
    this.name = "SectionNotFoundError";
  }
}

export class InvalidOrderDataError extends Error {
  constructor() {
    super("Invalid order data");
    this.name = "InvalidOrderDataError";
  }
}
```

---

## 9. Performance Considerations

1. **Prompt Count Aggregation**:
   - Use LEFT JOIN with COUNT for efficient prompt counting
   - Indexed on `prompts.section_id` for fast aggregation

2. **Batch Reorder**:
   - Use single UPDATE with CASE statement for bulk position updates
   - Reduces database round-trips

3. **Position Auto-Assignment**:
   - Query MAX(position) once when creating without position
   - Consider using sequence/serial for automatic positioning

4. **Indexes**:
   - `idx_prompt_sections_user_position` for user + position queries
   - Primary key index on `id` for single section lookups

---

## 10. Implementation Steps

### Step 1: Create Prompt Sections Schema

**File**: `src/lib/schemas/prompt-sections.schema.ts`

```typescript
import { z } from "zod";

export const listSectionsQuerySchema = z.object({
  sort: z.enum(["position", "title", "created_at"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const sectionCreateSchema = z.object({
  title: z.string().min(1, "SECTION TITLE REQUIRED").max(100, "SECTION TITLE TOO LONG"),
  position: z.number().int().min(0).optional(),
});

export const sectionUpdateSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => data.title !== undefined || data.position !== undefined, {
    message: "INVALID UPDATE DATA",
  });

export const uuidParamSchema = z.object({
  id: z.string().uuid("INVALID SECTION ID"),
});

export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
});

export const sectionsReorderSchema = z.object({
  order: z.array(reorderItemSchema).min(1, "INVALID ORDER DATA"),
});

export type ListSectionsQuery = z.infer<typeof listSectionsQuerySchema>;
export type SectionCreateInput = z.infer<typeof sectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>;
export type SectionsReorderInput = z.infer<typeof sectionsReorderSchema>;
```

### Step 2: Create Prompt Sections Service

**File**: `src/lib/services/prompt-sections.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  PromptSectionDTO,
  PromptSectionWithCountDTO,
  PromptSectionsListDTO,
  PromptSectionDeleteResponseDTO,
  ReorderResponseDTO,
} from "@/types";
import type {
  ListSectionsQuery,
  SectionCreateInput,
  SectionUpdateInput,
  SectionsReorderInput,
} from "@/lib/schemas/prompt-sections.schema";

export class PromptSectionsService {
  constructor(private supabase: SupabaseClient) {}

  async listSections(userId: string, query: ListSectionsQuery): Promise<PromptSectionsListDTO> {
    const { sort, order } = query;

    // Query sections with prompt count
    const { data, error } = await this.supabase
      .from("prompt_sections")
      .select(
        `
        id,
        title,
        position,
        created_at,
        updated_at,
        prompts(count)
      `
      )
      .eq("user_id", userId)
      .order(sort, { ascending: order === "asc" });

    if (error) throw error;

    const sections: PromptSectionWithCountDTO[] = data.map((section) => ({
      id: section.id,
      title: section.title,
      position: section.position,
      created_at: section.created_at,
      updated_at: section.updated_at,
      prompt_count: section.prompts?.[0]?.count ?? 0,
    }));

    return { sections };
  }

  async createSection(userId: string, input: SectionCreateInput): Promise<PromptSectionDTO> {
    let position = input.position;

    // Auto-assign position if not provided
    if (position === undefined) {
      const { data: maxPos } = await this.supabase
        .from("prompt_sections")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      position = (maxPos?.position ?? -1) + 1;
    }

    const { data, error } = await this.supabase
      .from("prompt_sections")
      .insert({
        user_id: userId,
        title: input.title,
        position,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async updateSection(userId: string, sectionId: string, input: SectionUpdateInput): Promise<PromptSectionDTO> {
    // Verify ownership
    const { data: existing, error: fetchError } = await this.supabase
      .from("prompt_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existing) {
      throw new SectionNotFoundError();
    }

    // Update section
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.position !== undefined) updateData.position = input.position;

    const { data, error } = await this.supabase
      .from("prompt_sections")
      .update(updateData)
      .eq("id", sectionId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      position: data.position,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async deleteSection(userId: string, sectionId: string): Promise<PromptSectionDeleteResponseDTO> {
    // Verify ownership and get section
    const { data: existing, error: fetchError } = await this.supabase
      .from("prompt_sections")
      .select("id")
      .eq("id", sectionId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existing) {
      throw new SectionNotFoundError();
    }

    // Count prompts that will be moved
    const { count: promptsCount } = await this.supabase
      .from("prompts")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId);

    // Move prompts to unsectioned (set section_id to null)
    await this.supabase.from("prompts").update({ section_id: null }).eq("section_id", sectionId);

    // Delete section
    const { error } = await this.supabase.from("prompt_sections").delete().eq("id", sectionId);

    if (error) throw error;

    return {
      message: "SECTION DELETED",
      prompts_moved: promptsCount ?? 0,
    };
  }

  async reorderSections(userId: string, input: SectionsReorderInput): Promise<ReorderResponseDTO> {
    const { order } = input;

    // Verify all sections exist and belong to user
    const sectionIds = order.map((item) => item.id);
    const { data: existingSections, error: fetchError } = await this.supabase
      .from("prompt_sections")
      .select("id")
      .eq("user_id", userId)
      .in("id", sectionIds);

    if (fetchError) throw fetchError;

    if (existingSections.length !== sectionIds.length) {
      throw new SectionNotFoundError("ONE OR MORE SECTIONS NOT FOUND");
    }

    // Update positions
    let updatedCount = 0;
    for (const item of order) {
      const { error } = await this.supabase
        .from("prompt_sections")
        .update({ position: item.position })
        .eq("id", item.id)
        .eq("user_id", userId);

      if (!error) updatedCount++;
    }

    return {
      message: "SECTIONS REORDERED",
      updated_count: updatedCount,
    };
  }
}

export class SectionNotFoundError extends Error {
  constructor(message = "Section not found") {
    super(message);
    this.name = "SectionNotFoundError";
  }
}
```

### Step 3: Create API Endpoints

**File**: `src/pages/api/prompt-sections/index.ts`

```typescript
import type { APIContext } from "astro";
import { PromptSectionsService, SectionNotFoundError } from "@/lib/services/prompt-sections.service";
import { listSectionsQuerySchema, sectionCreateSchema } from "@/lib/schemas/prompt-sections.schema";

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
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
    };

    const validation = listSectionsQuerySchema.safeParse(queryParams);
    const query = validation.success ? validation.data : { sort: "position" as const, order: "asc" as const };

    const service = new PromptSectionsService(context.locals.supabase);
    const result = await service.listSections(user.id, query);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List sections error:", error);
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
    const validation = sectionCreateSchema.safeParse(body);

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message ?? "SECTION TITLE REQUIRED";
      return new Response(JSON.stringify({ error: { code: "missing_title", message: errorMessage } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptSectionsService(context.locals.supabase);
    const result = await service.createSection(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create section error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/prompt-sections/[id].ts`

```typescript
import type { APIContext } from "astro";
import { PromptSectionsService, SectionNotFoundError } from "@/lib/services/prompt-sections.service";
import { sectionUpdateSchema, uuidParamSchema } from "@/lib/schemas/prompt-sections.schema";

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

    const paramValidation = uuidParamSchema.safeParse({ id: context.params.id });
    if (!paramValidation.success) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SECTION NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await context.request.json();
    const validation = sectionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: { code: "invalid_data", message: "INVALID UPDATE DATA" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptSectionsService(context.locals.supabase);
    const result = await service.updateSection(user.id, paramValidation.data.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SectionNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SECTION NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Update section error:", error);
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
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SECTION NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptSectionsService(context.locals.supabase);
    const result = await service.deleteSection(user.id, paramValidation.data.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SectionNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "SECTION NOT FOUND" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Delete section error:", error);
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/prompt-sections/reorder.ts`

```typescript
import type { APIContext } from "astro";
import { PromptSectionsService, SectionNotFoundError } from "@/lib/services/prompt-sections.service";
import { sectionsReorderSchema } from "@/lib/schemas/prompt-sections.schema";

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
    const validation = sectionsReorderSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: { code: "invalid_order", message: "INVALID ORDER DATA" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = new PromptSectionsService(context.locals.supabase);
    const result = await service.reorderSections(user.id, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof SectionNotFoundError) {
      return new Response(JSON.stringify({ error: { code: "section_not_found", message: error.message } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Reorder sections error:", error);
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
│   │   └── prompt-sections.schema.ts
│   └── services/
│       └── prompt-sections.service.ts
└── pages/
    └── api/
        └── prompt-sections/
            ├── index.ts     (GET, POST)
            ├── [id].ts      (PATCH, DELETE)
            └── reorder.ts   (PATCH)
```

---

## 12. Testing Checklist

- [ ] GET returns all user sections with prompt counts
- [ ] GET with sort=title orders alphabetically
- [ ] GET with order=desc reverses sort order
- [ ] POST creates section with auto-assigned position
- [ ] POST creates section with specified position
- [ ] POST without title returns 400
- [ ] PATCH updates section title
- [ ] PATCH updates section position
- [ ] PATCH with empty body returns 400
- [ ] PATCH on non-existent section returns 404
- [ ] DELETE removes section and moves prompts to unsectioned
- [ ] DELETE on non-existent section returns 404
- [ ] DELETE returns correct prompts_moved count
- [ ] Reorder updates all section positions
- [ ] Reorder with invalid section ID returns 404
- [ ] All endpoints return 401 without authentication
- [ ] RLS prevents access to other users' sections
