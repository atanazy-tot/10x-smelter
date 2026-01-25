# API Endpoint Implementation Plan: User Profile

## 1. Endpoint Overview

The User Profile endpoint retrieves the authenticated user's complete profile information, including credit balance, API key status, and account metadata.

| Endpoint       | Method | Description                     |
| -------------- | ------ | ------------------------------- |
| `/api/profile` | GET    | Get current user's full profile |

---

## 2. Request Details

### GET /api/profile

- **HTTP Method**: GET
- **URL Structure**: `/api/profile`
- **Headers**:
  - `Authorization: Bearer <access_token>` (required)
- **Query Parameters**: None
- **Request Body**: None

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Database row type alias
type UserProfileRow = Tables<"user_profiles">;

// Full profile response DTO
interface UserProfileDTO {
  user_id: string;
  credits_remaining: number;
  weekly_credits_max: number;
  credits_reset_at: string;
  api_key_status: ApiKeyStatus; // "none" | "pending" | "valid" | "invalid"
  api_key_validated_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 4. Zod Validation Schemas

No request body validation needed for this endpoint. However, we create a schema for response consistency:

### Create file: `src/lib/schemas/profile.schema.ts`

```typescript
import { z } from "zod";

// Response schema (for documentation/testing purposes)
export const userProfileResponseSchema = z.object({
  user_id: z.string().uuid(),
  credits_remaining: z.number().int().min(0),
  weekly_credits_max: z.number().int().positive(),
  credits_reset_at: z.string().datetime(),
  api_key_status: z.enum(["none", "pending", "valid", "invalid"]),
  api_key_validated_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
```

---

## 5. Response Details

### GET /api/profile

**Success (200 OK)**:

```json
{
  "user_id": "uuid",
  "credits_remaining": 3,
  "weekly_credits_max": 5,
  "credits_reset_at": "2026-01-20T00:00:00Z",
  "api_key_status": "valid",
  "api_key_validated_at": "2026-01-15T10:30:00Z",
  "created_at": "2026-01-10T08:00:00Z",
  "updated_at": "2026-01-17T12:00:00Z"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `profile_not_found` | PROFILE NOT FOUND |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

---

## 6. Data Flow

```
Client Request
    ↓
GET /api/profile
    ↓
Extract Authorization header
    ↓
Validate JWT token (via Supabase)
    ↓
If no valid token → 401 Unauthorized
    ↓
Query user_profiles table by user_id
    ↓
If no profile found → 404 Not Found
    ↓
Check if credits need reset (credits_reset_at < now)
    ↓
If reset needed → Update credits_remaining to weekly_credits_max
    ↓
Return UserProfileDTO (200)
```

### Credit Reset Logic

When fetching the profile, check if credits need to be reset:

```typescript
if (profile.credits_reset_at < new Date()) {
  // Reset credits and update reset timestamp
  const nextReset = getNextMondayMidnightUtc();
  await updateCredits(userId, profile.weekly_credits_max, nextReset);
}
```

---

## 7. Security Considerations

1. **Authentication Required**:
   - Endpoint requires valid JWT token
   - Token is validated via Supabase Auth

2. **Row-Level Security**:
   - RLS policy ensures users can only access their own profile
   - Policy: `auth.uid() = user_id`

3. **No Sensitive Data Exposure**:
   - API key is never returned (only status)
   - Password hash never exposed

4. **Idempotent Credit Reset**:
   - Credit reset is idempotent (safe to call multiple times)
   - Uses database transaction for atomic update

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

### Error Scenarios

| Scenario                | Status | Code                | Message                         |
| ----------------------- | ------ | ------------------- | ------------------------------- |
| No Authorization header | 401    | `unauthorized`      | LOGIN REQUIRED                  |
| Invalid/expired token   | 401    | `unauthorized`      | LOGIN REQUIRED                  |
| Profile not in database | 404    | `profile_not_found` | PROFILE NOT FOUND               |
| Database error          | 500    | `internal_error`    | SOMETHING WENT WRONG. TRY AGAIN |

---

## 9. Performance Considerations

1. **Single Query Optimization**:
   - Fetch profile with single SELECT query
   - No joins needed (profile has all required data)

2. **Indexed Access**:
   - `user_profiles.user_id` is primary key (O(1) lookup)

3. **Lazy Credit Reset**:
   - Credits reset on-demand during profile fetch
   - Alternative: Use scheduled cron job for batch resets

4. **Caching Considerations**:
   - Client can cache profile for short period (5-10 seconds)
   - Invalidate cache on credit-consuming operations

---

## 10. Implementation Steps

### Step 1: Create Profile Service

**File**: `src/lib/services/profile.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { UserProfileDTO } from "@/types";

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<UserProfileDTO> {
    // First, check if credits need reset
    await this.resetCreditsIfNeeded(userId);

    // Fetch the profile
    const { data: profile, error } = await this.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new ProfileNotFoundError();
      }
      throw error;
    }

    return {
      user_id: profile.user_id,
      credits_remaining: profile.credits_remaining,
      weekly_credits_max: profile.weekly_credits_max,
      credits_reset_at: profile.credits_reset_at,
      api_key_status: profile.api_key_status,
      api_key_validated_at: profile.api_key_validated_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  private async resetCreditsIfNeeded(userId: string): Promise<void> {
    const now = new Date();

    // Use a single UPDATE with WHERE condition to atomically check and reset
    const nextReset = this.getNextMondayMidnightUtc();

    const { error } = await this.supabase
      .from("user_profiles")
      .update({
        credits_remaining: this.supabase.rpc("get_weekly_credits_max", { p_user_id: userId }),
        credits_reset_at: nextReset.toISOString(),
      })
      .eq("user_id", userId)
      .lt("credits_reset_at", now.toISOString());

    // Ignore "no rows updated" - means credits don't need reset
    if (error && error.code !== "PGRST116") {
      console.error("Error resetting credits:", error);
    }
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

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Profile not found");
    this.name = "ProfileNotFoundError";
  }
}
```

### Step 2: Alternative Credit Reset (Simpler Approach)

If using weekly credits max directly:

```typescript
private async resetCreditsIfNeeded(userId: string): Promise<void> {
  const now = new Date();
  const nextReset = this.getNextMondayMidnightUtc();

  // Get current profile to check reset status
  const { data: profile } = await this.supabase
    .from("user_profiles")
    .select("credits_reset_at, weekly_credits_max")
    .eq("user_id", userId)
    .single();

  if (!profile) return;

  const resetAt = new Date(profile.credits_reset_at);
  if (resetAt <= now) {
    // Credits need reset
    await this.supabase
      .from("user_profiles")
      .update({
        credits_remaining: profile.weekly_credits_max,
        credits_reset_at: nextReset.toISOString(),
      })
      .eq("user_id", userId);
  }
}
```

### Step 3: Create API Endpoint

**File**: `src/pages/api/profile.ts`

```typescript
import type { APIContext } from "astro";
import { ProfileService, ProfileNotFoundError } from "@/lib/services/profile.service";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: { code: "unauthorized", message: "LOGIN REQUIRED" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get profile
    const profileService = new ProfileService(context.locals.supabase);
    const profile = await profileService.getProfile(user.id);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return new Response(
        JSON.stringify({
          error: { code: "profile_not_found", message: "PROFILE NOT FOUND" },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Profile fetch error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Step 4: Create Auth Guard Utility (Optional)

**File**: `src/lib/utils/auth-guard.ts`

```typescript
import type { APIContext } from "astro";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function requireAuth(context: APIContext): Promise<AuthenticatedUser | Response> {
  const {
    data: { user },
    error,
  } = await context.locals.supabase.auth.getUser();

  if (error || !user) {
    return new Response(
      JSON.stringify({
        error: { code: "unauthorized", message: "LOGIN REQUIRED" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return {
    id: user.id,
    email: user.email!,
  };
}

export function isAuthError(result: AuthenticatedUser | Response): result is Response {
  return result instanceof Response;
}
```

**Usage in endpoint**:

```typescript
import { requireAuth, isAuthError } from "@/lib/utils/auth-guard";

export async function GET(context: APIContext) {
  const authResult = await requireAuth(context);
  if (isAuthError(authResult)) {
    return authResult;
  }

  const user = authResult;
  // ... continue with authenticated user
}
```

---

## 11. File Structure

```
src/
├── lib/
│   ├── schemas/
│   │   └── profile.schema.ts
│   ├── services/
│   │   └── profile.service.ts
│   └── utils/
│       └── auth-guard.ts
└── pages/
    └── api/
        └── profile.ts
```

---

## 12. Testing Checklist

- [ ] GET /api/profile with valid token returns full profile
- [ ] GET /api/profile without token returns 401
- [ ] GET /api/profile with invalid token returns 401
- [ ] GET /api/profile with expired token returns 401
- [ ] Credits are reset when credits_reset_at has passed
- [ ] credits_reset_at is updated to next Monday after reset
- [ ] API key status is correctly reflected
- [ ] All timestamps are in ISO 8601 format
- [ ] RLS prevents access to other users' profiles
