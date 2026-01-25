# API Endpoint Implementation Plan: API Key Management

## 1. Endpoint Overview

API Key Management endpoints allow authenticated users to store, validate, check status, and remove their OpenAI API keys. Users with valid API keys get unlimited smelt processing.

| Endpoint               | Method | Description                      |
| ---------------------- | ------ | -------------------------------- |
| `/api/api-keys`        | POST   | Validate and store a new API key |
| `/api/api-keys/status` | GET    | Check current API key status     |
| `/api/api-keys`        | DELETE | Remove stored API key            |

---

## 2. Request Details

### POST /api/api-keys

- **HTTP Method**: POST
- **URL Structure**: `/api/api-keys`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
  - `Content-Type: application/json`
- **Request Body**:

```json
{
  "api_key": "sk-..."
}
```

### GET /api/api-keys/status

- **HTTP Method**: GET
- **URL Structure**: `/api/api-keys/status`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Request Body**: None

### DELETE /api/api-keys

- **HTTP Method**: DELETE
- **URL Structure**: `/api/api-keys`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Request Body**: None

---

## 3. Used Types

### From `src/types.ts`

```typescript
// API key status enum
type ApiKeyStatus = "none" | "pending" | "valid" | "invalid";

// Command for storing API key
interface ApiKeyCreateCommand {
  api_key: string;
}

// Validation response
interface ApiKeyValidationDTO {
  status: ApiKeyStatus;
  validated_at: string;
  message: string;
}

// Status check response
interface ApiKeyStatusDTO {
  has_key: boolean;
  status: ApiKeyStatus;
  validated_at: string | null;
}

// Deletion response
interface ApiKeyDeleteResponseDTO {
  message: string;
  credits_remaining: number;
  credits_reset_at: string;
}
```

---

## 4. Zod Validation Schemas

### Create file: `src/lib/schemas/api-keys.schema.ts`

```typescript
import { z } from "zod";

// OpenAI API key format: sk-... or sk-proj-...
const OPENAI_KEY_REGEX = /^sk-(?:proj-)?[a-zA-Z0-9]{32,}$/;

export const apiKeyCreateSchema = z.object({
  api_key: z.string().min(1, "API KEY REQUIRED").regex(OPENAI_KEY_REGEX, "INVALID API KEY FORMAT"),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
```

---

## 5. Response Details

### POST /api/api-keys

**Success (200 OK)**:

```json
{
  "status": "valid",
  "validated_at": "2026-01-17T14:30:00Z",
  "message": "KEY VALID ✓"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_key_format` | INVALID API KEY FORMAT |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 422 | `key_invalid` | KEY INVALID ✗ - CHECK YOUR KEY |
| 422 | `key_quota_exhausted` | KEY QUOTA EXHAUSTED |
| 500 | `validation_failed` | COULDN'T VALIDATE KEY. TRY AGAIN |

### GET /api/api-keys/status

**Success - Has Key (200 OK)**:

```json
{
  "has_key": true,
  "status": "valid",
  "validated_at": "2026-01-17T14:30:00Z"
}
```

**Success - No Key (200 OK)**:

```json
{
  "has_key": false,
  "status": "none",
  "validated_at": null
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

### DELETE /api/api-keys

**Success (200 OK)**:

```json
{
  "message": "API KEY REMOVED",
  "credits_remaining": 3,
  "credits_reset_at": "2026-01-20T00:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `no_key` | NO API KEY CONFIGURED |

---

## 6. Data Flow

### Store API Key Flow

```
Client Request
    ↓
POST /api/api-keys
    ↓
Validate Authorization header → 401 if missing
    ↓
Validate request body (Zod format check)
    ↓
Validate key with OpenRouter/OpenAI API
    ↓
If invalid → 422 with specific error
    ↓
Encrypt API key with server-side encryption
    ↓
Upsert into user_api_keys table
    ↓
Update user_profiles.api_key_status = 'valid'
    ↓
Update user_profiles.api_key_validated_at = now()
    ↓
Return ApiKeyValidationDTO (200)
```

### Check Status Flow

```
Client Request
    ↓
GET /api/api-keys/status
    ↓
Validate Authorization header → 401 if missing
    ↓
Query user_api_keys for user_id
    ↓
Query user_profiles for api_key_status
    ↓
Return ApiKeyStatusDTO (200)
```

### Delete Key Flow

```
Client Request
    ↓
DELETE /api/api-keys
    ↓
Validate Authorization header → 401 if missing
    ↓
Check if key exists → 404 if not
    ↓
Delete from user_api_keys
    ↓
Update user_profiles.api_key_status = 'none'
    ↓
Update user_profiles.api_key_validated_at = null
    ↓
Fetch current credits_remaining and credits_reset_at
    ↓
Return ApiKeyDeleteResponseDTO (200)
```

---

## 7. Security Considerations

1. **API Key Encryption**:
   - Encrypt keys using AES-256-GCM before storage
   - Store encryption key in environment variable
   - Never log unencrypted keys

2. **Key Validation**:
   - Validate with minimal API call (e.g., list models)
   - Don't expose validation details in error messages
   - Rate limit validation attempts

3. **Key Never Returned**:
   - API key is never returned to the client
   - Only status and validation timestamp are exposed

4. **Row-Level Security**:
   - RLS ensures users can only access their own keys
   - Service role used for encryption operations

5. **Secure Transmission**:
   - HTTPS only (enforced at infrastructure level)
   - Key sent in request body, not URL

---

## 8. Error Handling

### OpenRouter API Error Mapping

```typescript
interface OpenRouterError {
  error?: {
    code?: string;
    message?: string;
  };
}

function mapOpenRouterError(response: OpenRouterError): {
  status: number;
  code: string;
  message: string;
} {
  const errorCode = response.error?.code;
  const errorMessage = response.error?.message?.toLowerCase() ?? "";

  if (errorCode === "invalid_api_key" || errorMessage.includes("invalid")) {
    return { status: 422, code: "key_invalid", message: "KEY INVALID ✗ - CHECK YOUR KEY" };
  }

  if (errorCode === "insufficient_quota" || errorMessage.includes("quota")) {
    return { status: 422, code: "key_quota_exhausted", message: "KEY QUOTA EXHAUSTED" };
  }

  return { status: 500, code: "validation_failed", message: "COULDN'T VALIDATE KEY. TRY AGAIN" };
}
```

---

## 9. Performance Considerations

1. **Key Validation Timeout**:
   - Set 10-second timeout for API validation call
   - Return error if validation takes too long

2. **Upsert Pattern**:
   - Use UPSERT (ON CONFLICT) for key storage
   - Avoids separate check-then-insert queries

3. **Batch Profile Update**:
   - Update api_key_status in same transaction as key storage
   - Reduces number of database round-trips

4. **Encryption Performance**:
   - AES-256-GCM is hardware-accelerated on modern CPUs
   - Encryption/decryption is negligible overhead

---

## 10. Implementation Steps

### Step 1: Set Up Encryption Utilities

**File**: `src/lib/utils/encryption.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = import.meta.env.API_KEY_ENCRYPTION_SECRET;
  if (!key || key.length !== 64) {
    throw new Error("API_KEY_ENCRYPTION_SECRET must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### Step 2: Create API Keys Schema

**File**: `src/lib/schemas/api-keys.schema.ts`

```typescript
import { z } from "zod";

// OpenAI API key format: sk-... or sk-proj-...
const OPENAI_KEY_REGEX = /^sk-(?:proj-)?[a-zA-Z0-9]{20,}$/;

export const apiKeyCreateSchema = z.object({
  api_key: z.string().min(1, "API KEY REQUIRED").regex(OPENAI_KEY_REGEX, "INVALID API KEY FORMAT"),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;
```

### Step 3: Create API Keys Service

**File**: `src/lib/services/api-keys.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { ApiKeyValidationDTO, ApiKeyStatusDTO, ApiKeyDeleteResponseDTO } from "@/types";
import { encrypt } from "@/lib/utils/encryption";

export class ApiKeysService {
  constructor(private supabase: SupabaseClient) {}

  async validateAndStore(userId: string, apiKey: string): Promise<ApiKeyValidationDTO> {
    // Validate with OpenRouter
    const isValid = await this.validateWithOpenRouter(apiKey);

    if (!isValid.success) {
      throw new ApiKeyValidationError(isValid.code, isValid.message);
    }

    // Encrypt the key
    const encryptedKey = encrypt(apiKey);
    const validatedAt = new Date().toISOString();

    // Upsert encrypted key
    const { error: keyError } = await this.supabase.from("user_api_keys").upsert({
      user_id: userId,
      encrypted_key: encryptedKey,
      updated_at: validatedAt,
    });

    if (keyError) throw keyError;

    // Update profile status
    const { error: profileError } = await this.supabase
      .from("user_profiles")
      .update({
        api_key_status: "valid",
        api_key_validated_at: validatedAt,
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    return {
      status: "valid",
      validated_at: validatedAt,
      message: "KEY VALID ✓",
    };
  }

  async getStatus(userId: string): Promise<ApiKeyStatusDTO> {
    // Check if key exists
    const { data: keyData } = await this.supabase
      .from("user_api_keys")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    // Get profile status
    const { data: profile, error } = await this.supabase
      .from("user_profiles")
      .select("api_key_status, api_key_validated_at")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return {
      has_key: !!keyData,
      status: profile.api_key_status,
      validated_at: profile.api_key_validated_at,
    };
  }

  async deleteKey(userId: string): Promise<ApiKeyDeleteResponseDTO> {
    // Check if key exists
    const { data: keyData, error: checkError } = await this.supabase
      .from("user_api_keys")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (checkError || !keyData) {
      throw new NoApiKeyError();
    }

    // Delete the key
    const { error: deleteError } = await this.supabase.from("user_api_keys").delete().eq("user_id", userId);

    if (deleteError) throw deleteError;

    // Update profile status
    const { error: profileError } = await this.supabase
      .from("user_profiles")
      .update({
        api_key_status: "none",
        api_key_validated_at: null,
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    // Get current credits info
    const { data: profile, error: fetchError } = await this.supabase
      .from("user_profiles")
      .select("credits_remaining, credits_reset_at")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    return {
      message: "API KEY REMOVED",
      credits_remaining: profile.credits_remaining,
      credits_reset_at: profile.credits_reset_at,
    };
  }

  private async validateWithOpenRouter(
    apiKey: string
  ): Promise<{ success: true } | { success: false; code: string; message: string }> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return {
          success: false,
          code: "key_invalid",
          message: "KEY INVALID ✗ - CHECK YOUR KEY",
        };
      }

      if (response.status === 402 || response.status === 429) {
        return {
          success: false,
          code: "key_quota_exhausted",
          message: "KEY QUOTA EXHAUSTED",
        };
      }

      return {
        success: false,
        code: "validation_failed",
        message: "COULDN'T VALIDATE KEY. TRY AGAIN",
      };
    } catch (error) {
      console.error("API key validation error:", error);
      return {
        success: false,
        code: "validation_failed",
        message: "COULDN'T VALIDATE KEY. TRY AGAIN",
      };
    }
  }
}

export class ApiKeyValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiKeyValidationError";
  }
}

export class NoApiKeyError extends Error {
  constructor() {
    super("No API key configured");
    this.name = "NoApiKeyError";
  }
}
```

### Step 4: Create API Endpoints

**File**: `src/pages/api/api-keys/index.ts`

```typescript
import type { APIContext } from "astro";
import { ApiKeysService, ApiKeyValidationError, NoApiKeyError } from "@/lib/services/api-keys.service";
import { apiKeyCreateSchema } from "@/lib/schemas/api-keys.schema";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // Verify authentication
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

    // Validate request body
    const body = await context.request.json();
    const validation = apiKeyCreateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: { code: "invalid_key_format", message: "INVALID API KEY FORMAT" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate and store
    const apiKeysService = new ApiKeysService(context.locals.supabase);
    const result = await apiKeysService.validateAndStore(user.id, validation.data.api_key);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ApiKeyValidationError) {
      return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("API key storage error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "validation_failed", message: "COULDN'T VALIDATE KEY. TRY AGAIN" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(context: APIContext) {
  try {
    // Verify authentication
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

    // Delete key
    const apiKeysService = new ApiKeysService(context.locals.supabase);
    const result = await apiKeysService.deleteKey(user.id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof NoApiKeyError) {
      return new Response(JSON.stringify({ error: { code: "no_key", message: "NO API KEY CONFIGURED" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("API key deletion error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/api-keys/status.ts`

```typescript
import type { APIContext } from "astro";
import { ApiKeysService } from "@/lib/services/api-keys.service";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    // Verify authentication
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

    // Get status
    const apiKeysService = new ApiKeysService(context.locals.supabase);
    const status = await apiKeysService.getStatus(user.id);

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API key status error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Step 5: Add Environment Variable

**Update**: `.env` / `.env.example`

```env
# 32 bytes = 64 hex characters
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY_ENCRYPTION_SECRET=your_64_char_hex_string_here
```

**Update**: `src/env.d.ts`

```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly API_KEY_ENCRYPTION_SECRET: string;
}
```

---

## 11. File Structure

```
src/
├── lib/
│   ├── schemas/
│   │   └── api-keys.schema.ts
│   ├── services/
│   │   └── api-keys.service.ts
│   └── utils/
│       └── encryption.ts
└── pages/
    └── api/
        └── api-keys/
            ├── index.ts       (POST, DELETE)
            └── status.ts      (GET)
```

---

## 12. Testing Checklist

- [ ] POST with valid API key returns status: valid
- [ ] POST with invalid format returns 400
- [ ] POST with invalid key (rejected by OpenRouter) returns 422
- [ ] POST without auth returns 401
- [ ] GET /status with key shows has_key: true
- [ ] GET /status without key shows has_key: false
- [ ] GET /status without auth returns 401
- [ ] DELETE removes key and returns credits info
- [ ] DELETE without existing key returns 404
- [ ] DELETE without auth returns 401
- [ ] Encrypted key cannot be decrypted without correct secret
- [ ] user_profiles.api_key_status is updated correctly
- [ ] RLS prevents access to other users' keys
