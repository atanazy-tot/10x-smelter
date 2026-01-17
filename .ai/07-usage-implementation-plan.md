# API Endpoint Implementation Plan: Usage and Credits

## 1. Endpoint Overview

The Usage endpoint provides current usage status for both anonymous and authenticated users. It returns different response shapes based on the user's authentication status and whether they have an API key configured.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/usage` | GET | Get current usage status |

---

## 2. Request Details

### GET /api/usage

- **HTTP Method**: GET
- **URL Structure**: `/api/usage`
- **Headers**:
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters**: None
- **Request Body**: None

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Anonymous user usage
interface UsageAnonymousDTO {
  type: "anonymous";
  smelts_used_today: number;
  daily_limit: number;
  can_process: boolean;
  resets_at: string;
}

// Authenticated user without API key
interface UsageAuthenticatedDTO {
  type: "authenticated";
  credits_remaining: number;
  weekly_credits_max: number;
  can_process: boolean;
  resets_at: string;
  days_until_reset: number;
  message?: string;
}

// Authenticated user with valid API key
interface UsageUnlimitedDTO {
  type: "unlimited";
  api_key_status: ApiKeyStatus;
  can_process: boolean;
}

// Union type
type UsageDTO = UsageAnonymousDTO | UsageAuthenticatedDTO | UsageUnlimitedDTO;
```

---

## 4. Zod Validation Schemas

No request validation needed for this endpoint. Optional response schema for documentation:

### Create file: `src/lib/schemas/usage.schema.ts`

```typescript
import { z } from "zod";

// Response schemas for documentation/testing
export const usageAnonymousSchema = z.object({
  type: z.literal("anonymous"),
  smelts_used_today: z.number().int().min(0),
  daily_limit: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
});

export const usageAuthenticatedSchema = z.object({
  type: z.literal("authenticated"),
  credits_remaining: z.number().int().min(0),
  weekly_credits_max: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
  days_until_reset: z.number().int().min(0),
  message: z.string().optional(),
});

export const usageUnlimitedSchema = z.object({
  type: z.literal("unlimited"),
  api_key_status: z.enum(["none", "pending", "valid", "invalid"]),
  can_process: z.boolean(),
});

export const usageResponseSchema = z.discriminatedUnion("type", [
  usageAnonymousSchema,
  usageAuthenticatedSchema,
  usageUnlimitedSchema,
]);

export type UsageResponse = z.infer<typeof usageResponseSchema>;
```

---

## 5. Response Details

### GET /api/usage

**Success - Anonymous (200 OK)**:
```json
{
  "type": "anonymous",
  "smelts_used_today": 0,
  "daily_limit": 1,
  "can_process": true,
  "resets_at": "2026-01-18T00:00:00Z"
}
```

**Success - Authenticated Free Tier (200 OK)**:
```json
{
  "type": "authenticated",
  "credits_remaining": 3,
  "weekly_credits_max": 5,
  "can_process": true,
  "resets_at": "2026-01-20T00:00:00Z",
  "days_until_reset": 3
}
```

**Success - Authenticated Limit Reached (200 OK)**:
```json
{
  "type": "authenticated",
  "credits_remaining": 0,
  "weekly_credits_max": 5,
  "can_process": false,
  "resets_at": "2026-01-20T00:00:00Z",
  "days_until_reset": 3,
  "message": "5/5 SMELTS USED THIS WEEK. RESETS IN 3 DAYS. OR ADD YOUR API KEY FOR UNLIMITED"
}
```

**Success - Unlimited (200 OK)**:
```json
{
  "type": "unlimited",
  "api_key_status": "valid",
  "can_process": true
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

---

## 6. Data Flow

```
Client Request
    ↓
GET /api/usage
    ↓
Check Authorization header
    ↓
├── No token (Anonymous):
│     ↓
│     Get client IP from headers
│     ↓
│     Hash IP with SHA-256
│     ↓
│     Query anonymous_usage for today
│     ↓
│     Calculate resets_at (tomorrow midnight UTC)
│     ↓
│     Return UsageAnonymousDTO
│
└── Valid token (Authenticated):
      ↓
      Query user_profiles
      ↓
      Check api_key_status
      ↓
      ├── api_key_status = "valid":
      │     Return UsageUnlimitedDTO
      │
      └── api_key_status != "valid":
            ↓
            Check if credits need reset
            ↓
            If credits_reset_at < now():
                Reset credits to weekly_credits_max
                Update credits_reset_at to next Monday
            ↓
            Calculate days_until_reset
            ↓
            Build message if can_process = false
            ↓
            Return UsageAuthenticatedDTO
```

---

## 7. Security Considerations

1. **No Sensitive Data Exposure**:
   - Only returns usage statistics
   - Never exposes API key or user secrets

2. **IP Hashing**:
   - Anonymous users identified by hashed IP
   - Original IP never stored

3. **Rate Information Only**:
   - Endpoint is informational only
   - Cannot modify credits or usage

4. **Optional Authentication**:
   - Works for both anonymous and authenticated users
   - Returns appropriate response type

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

| Scenario | Status | Code | Message |
|----------|--------|------|---------|
| Database error | 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |
| Profile not found | 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

Note: This endpoint should never return 401 as it's designed to work for anonymous users.

---

## 9. Performance Considerations

1. **Single Query**:
   - Anonymous: One query to anonymous_usage
   - Authenticated: One query to user_profiles

2. **Indexed Access**:
   - `anonymous_usage(ip_hash, date_utc)` composite primary key
   - `user_profiles.user_id` primary key

3. **Caching Opportunity**:
   - Response can be cached client-side for 30-60 seconds
   - Add `Cache-Control` header if desired

4. **Lazy Credit Reset**:
   - Credits are reset on-demand during usage check
   - No separate cron job required (though one can be added)

---

## 10. Implementation Steps

### Step 1: Create Usage Schema

**File**: `src/lib/schemas/usage.schema.ts`

```typescript
import { z } from "zod";

export const usageAnonymousSchema = z.object({
  type: z.literal("anonymous"),
  smelts_used_today: z.number().int().min(0),
  daily_limit: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
});

export const usageAuthenticatedSchema = z.object({
  type: z.literal("authenticated"),
  credits_remaining: z.number().int().min(0),
  weekly_credits_max: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
  days_until_reset: z.number().int().min(0),
  message: z.string().optional(),
});

export const usageUnlimitedSchema = z.object({
  type: z.literal("unlimited"),
  api_key_status: z.enum(["none", "pending", "valid", "invalid"]),
  can_process: z.boolean(),
});

export const usageResponseSchema = z.discriminatedUnion("type", [
  usageAnonymousSchema,
  usageAuthenticatedSchema,
  usageUnlimitedSchema,
]);

export type UsageResponse = z.infer<typeof usageResponseSchema>;
```

### Step 2: Create Usage Service

**File**: `src/lib/services/usage.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  UsageDTO,
  UsageAnonymousDTO,
  UsageAuthenticatedDTO,
  UsageUnlimitedDTO,
} from "@/types";
import { createHash } from "crypto";

const ANONYMOUS_DAILY_LIMIT = 1;

export class UsageService {
  constructor(private supabase: SupabaseClient) {}

  async getUsage(userId: string | null, clientIp: string): Promise<UsageDTO> {
    if (!userId) {
      return this.getAnonymousUsage(clientIp);
    }

    return this.getAuthenticatedUsage(userId);
  }

  private async getAnonymousUsage(clientIp: string): Promise<UsageAnonymousDTO> {
    const ipHash = this.hashIp(clientIp);
    const todayUtc = new Date().toISOString().split("T")[0];

    // Query today's usage
    const { data: usage } = await this.supabase
      .from("anonymous_usage")
      .select("smelts_used")
      .eq("ip_hash", ipHash)
      .eq("date_utc", todayUtc)
      .single();

    const smeltsUsedToday = usage?.smelts_used ?? 0;
    const canProcess = smeltsUsedToday < ANONYMOUS_DAILY_LIMIT;

    // Calculate reset time (tomorrow midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      type: "anonymous",
      smelts_used_today: smeltsUsedToday,
      daily_limit: ANONYMOUS_DAILY_LIMIT,
      can_process: canProcess,
      resets_at: tomorrow.toISOString(),
    };
  }

  private async getAuthenticatedUsage(userId: string): Promise<UsageAuthenticatedDTO | UsageUnlimitedDTO> {
    // Get profile with API key status
    const { data: profile, error } = await this.supabase
      .from("user_profiles")
      .select("credits_remaining, weekly_credits_max, credits_reset_at, api_key_status")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      throw new Error("Profile not found");
    }

    // Check if user has valid API key (unlimited)
    if (profile.api_key_status === "valid") {
      return {
        type: "unlimited",
        api_key_status: profile.api_key_status,
        can_process: true,
      };
    }

    // Check if credits need reset
    const now = new Date();
    let creditsRemaining = profile.credits_remaining;
    let creditsResetAt = new Date(profile.credits_reset_at);

    if (creditsResetAt <= now) {
      // Reset credits
      creditsRemaining = profile.weekly_credits_max;
      creditsResetAt = this.getNextMondayMidnightUtc();

      // Update in database
      await this.supabase
        .from("user_profiles")
        .update({
          credits_remaining: creditsRemaining,
          credits_reset_at: creditsResetAt.toISOString(),
        })
        .eq("user_id", userId);
    }

    // Calculate days until reset
    const daysUntilReset = Math.ceil(
      (creditsResetAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const canProcess = creditsRemaining > 0;
    const creditsUsed = profile.weekly_credits_max - creditsRemaining;

    // Build response
    const response: UsageAuthenticatedDTO = {
      type: "authenticated",
      credits_remaining: creditsRemaining,
      weekly_credits_max: profile.weekly_credits_max,
      can_process: canProcess,
      resets_at: creditsResetAt.toISOString(),
      days_until_reset: daysUntilReset,
    };

    // Add message if limit reached
    if (!canProcess) {
      response.message = `${creditsUsed}/${profile.weekly_credits_max} SMELTS USED THIS WEEK. RESETS IN ${daysUntilReset} DAYS. OR ADD YOUR API KEY FOR UNLIMITED`;
    }

    return response;
  }

  private hashIp(ip: string): string {
    return createHash("sha256").update(ip).digest("hex");
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
```

### Step 3: Create API Endpoint

**File**: `src/pages/api/usage.ts`

```typescript
import type { APIContext } from "astro";
import { UsageService } from "@/lib/services/usage.service";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    // Get user (may be null for anonymous)
    const { data: { user } } = await context.locals.supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Get client IP for anonymous users
    const clientIp = context.request.headers.get("x-forwarded-for")?.split(",")[0]
      ?? context.request.headers.get("x-real-ip")
      ?? "unknown";

    const usageService = new UsageService(context.locals.supabase);
    const usage = await usageService.getUsage(userId, clientIp);

    return new Response(JSON.stringify(usage), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Optional: Allow short-term caching
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("Usage fetch error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" },
      }),
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
│   │   └── usage.schema.ts
│   └── services/
│       └── usage.service.ts
└── pages/
    └── api/
        └── usage.ts
```

---

## 12. Testing Checklist

- [ ] Anonymous user gets type: "anonymous" response
- [ ] Anonymous user smelts_used_today is accurate
- [ ] Anonymous user can_process is true when under limit
- [ ] Anonymous user can_process is false when at limit
- [ ] Anonymous user resets_at is tomorrow midnight UTC
- [ ] Authenticated user without API key gets type: "authenticated"
- [ ] Authenticated user credits_remaining is accurate
- [ ] Authenticated user can_process is true when credits > 0
- [ ] Authenticated user can_process is false when credits = 0
- [ ] Authenticated user gets message when can_process is false
- [ ] Authenticated user days_until_reset is calculated correctly
- [ ] Credits are reset when credits_reset_at has passed
- [ ] User with valid API key gets type: "unlimited"
- [ ] User with valid API key always has can_process: true
- [ ] IP is hashed correctly for anonymous tracking
- [ ] Response includes correct cache headers
- [ ] Endpoint works without authentication (returns anonymous data)
