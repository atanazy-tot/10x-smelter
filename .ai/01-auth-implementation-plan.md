# API Endpoint Implementation Plan: Authentication

## 1. Endpoint Overview

Authentication endpoints handle user registration, login, logout, and session management. These endpoints integrate with Supabase Auth for JWT-based authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new user account |
| `/api/auth/login` | POST | Authenticate existing user |
| `/api/auth/logout` | POST | Terminate user session |
| `/api/auth/session` | GET | Get current session status |

---

## 2. Request Details

### POST /api/auth/register

- **HTTP Method**: POST
- **URL Structure**: `/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/login

- **HTTP Method**: POST
- **URL Structure**: `/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /api/auth/logout

- **HTTP Method**: POST
- **URL Structure**: `/api/auth/logout`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**: None

### GET /api/auth/session

- **HTTP Method**: GET
- **URL Structure**: `/api/auth/session`
- **Headers**: `Authorization: Bearer <access_token>` (optional)
- **Request Body**: None

---

## 3. Used Types

### From `src/types.ts`

```typescript
// Command for registration and login
interface AuthCredentialsCommand {
  email: string;
  password: string;
}

// User identity in responses
interface AuthUserDTO {
  id: string;
  email: string;
}

// Session tokens
interface AuthSessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Combined auth response
interface AuthResponseDTO {
  user: AuthUserDTO;
  session: AuthSessionDTO;
}

// Logout response
interface LogoutResponseDTO {
  message: string;
}

// Profile data in session
interface SessionProfileDTO {
  credits_remaining: number;
  weekly_credits_max: number;
  credits_reset_at: string;
  api_key_status: ApiKeyStatus;
  api_key_validated_at: string | null;
}

// Anonymous usage in session
interface SessionAnonymousUsageDTO {
  smelts_used_today: number;
  daily_limit: number;
  resets_at: string;
}

// Authenticated session response
interface SessionAuthenticatedDTO {
  authenticated: true;
  user: AuthUserDTO;
  profile: SessionProfileDTO;
}

// Anonymous session response
interface SessionAnonymousDTO {
  authenticated: false;
  anonymous_usage: SessionAnonymousUsageDTO;
}

// Union type for session endpoint
type SessionDTO = SessionAuthenticatedDTO | SessionAnonymousDTO;
```

---

## 4. Zod Validation Schemas

### Create file: `src/lib/schemas/auth.schema.ts`

```typescript
import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z
    .string()
    .min(1, "EMAIL REQUIRED")
    .email("INVALID EMAIL FORMAT"),
  password: z
    .string()
    .min(8, "PASSWORD TOO WEAK. MIN 8 CHARS")
    .max(72, "PASSWORD TOO LONG. MAX 72 CHARS"),
});

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
```

---

## 5. Response Details

### POST /api/auth/register

**Success (201 Created)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1700000000
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_email` | INVALID EMAIL FORMAT |
| 400 | `weak_password` | PASSWORD TOO WEAK. MIN 8 CHARS |
| 409 | `email_exists` | EMAIL ALREADY REGISTERED |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

### POST /api/auth/login

**Success (200 OK)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1700000000
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `invalid_credentials` | WRONG EMAIL OR PASSWORD |
| 429 | `rate_limited` | TOO MANY ATTEMPTS. TRY AGAIN LATER |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

### POST /api/auth/logout

**Success (200 OK)**:
```json
{
  "message": "LOGGED OUT"
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | NOT LOGGED IN |

### GET /api/auth/session

**Success - Authenticated (200 OK)**:
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "profile": {
    "credits_remaining": 3,
    "weekly_credits_max": 5,
    "credits_reset_at": "2026-01-20T00:00:00Z",
    "api_key_status": "none",
    "api_key_validated_at": null
  }
}
```

**Success - Anonymous (200 OK)**:
```json
{
  "authenticated": false,
  "anonymous_usage": {
    "smelts_used_today": 0,
    "daily_limit": 1,
    "resets_at": "2026-01-18T00:00:00Z"
  }
}
```

---

## 6. Data Flow

### Registration Flow

```
Client Request
    ↓
POST /api/auth/register
    ↓
Validate request body (Zod)
    ↓
supabase.auth.signUp({ email, password })
    ↓
[Supabase trigger creates user_profile automatically]
    ↓
Return AuthResponseDTO (201)
```

### Login Flow

```
Client Request
    ↓
POST /api/auth/login
    ↓
Validate request body (Zod)
    ↓
supabase.auth.signInWithPassword({ email, password })
    ↓
Return AuthResponseDTO (200)
```

### Session Flow

```
Client Request
    ↓
GET /api/auth/session
    ↓
Check Authorization header
    ↓
If token present:
    supabase.auth.getUser(token)
        ↓
    Fetch user_profile from database
        ↓
    Return SessionAuthenticatedDTO
    ↓
If no token:
    Get IP hash from request
        ↓
    Query anonymous_usage for today
        ↓
    Return SessionAnonymousDTO
```

---

## 7. Security Considerations

1. **Password Requirements**:
   - Minimum 8 characters (enforced by Zod)
   - Maximum 72 characters (bcrypt limitation)
   - Supabase handles hashing with bcrypt

2. **Rate Limiting**:
   - Supabase Auth has built-in rate limiting
   - Monitor for `rate_limited` errors from Supabase

3. **Token Security**:
   - Access tokens expire in 1 hour
   - Refresh tokens for obtaining new access tokens
   - Never log tokens

4. **IP Hashing for Anonymous**:
   - Hash IP with SHA-256 before storing
   - Use `x-forwarded-for` header when behind proxy

5. **CORS**:
   - Restrict to application domain only
   - Set in Astro config or middleware

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

### Supabase Auth Error Mapping

```typescript
function mapSupabaseAuthError(error: AuthError): { status: number; code: string; message: string } {
  switch (error.message) {
    case "Invalid login credentials":
      return { status: 401, code: "invalid_credentials", message: "WRONG EMAIL OR PASSWORD" };
    case "User already registered":
      return { status: 409, code: "email_exists", message: "EMAIL ALREADY REGISTERED" };
    case "Email rate limit exceeded":
      return { status: 429, code: "rate_limited", message: "TOO MANY ATTEMPTS. TRY AGAIN LATER" };
    default:
      return { status: 500, code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" };
  }
}
```

---

## 9. Performance Considerations

1. **Session Endpoint Optimization**:
   - For authenticated users, batch profile fetch with session validation
   - For anonymous users, use upsert pattern for usage tracking

2. **Token Caching**:
   - Client should cache tokens and only refresh when expired
   - Don't call session endpoint on every request

3. **Database Indexes**:
   - `user_profiles.user_id` is primary key (indexed)
   - `anonymous_usage(ip_hash, date_utc)` is composite primary key (indexed)

---

## 10. Implementation Steps

### Step 1: Create Auth Schema

**File**: `src/lib/schemas/auth.schema.ts`

```typescript
import { z } from "zod";

export const authCredentialsSchema = z.object({
  email: z
    .string()
    .min(1, "EMAIL REQUIRED")
    .email("INVALID EMAIL FORMAT"),
  password: z
    .string()
    .min(8, "PASSWORD TOO WEAK. MIN 8 CHARS")
    .max(72, "PASSWORD TOO LONG. MAX 72 CHARS"),
});

export type AuthCredentialsInput = z.infer<typeof authCredentialsSchema>;
```

### Step 2: Create Auth Service

**File**: `src/lib/services/auth.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  AuthResponseDTO,
  SessionAuthenticatedDTO,
  SessionAnonymousDTO,
  SessionDTO,
} from "@/types";
import { createHash } from "crypto";

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  async register(email: string, password: string): Promise<AuthResponseDTO> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error("Registration failed");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResponseDTO> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at!,
      },
    };
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession(clientIp: string): Promise<SessionDTO> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (user) {
      return this.getAuthenticatedSession(user.id, user.email!);
    }

    return this.getAnonymousSession(clientIp);
  }

  private async getAuthenticatedSession(
    userId: string,
    email: string
  ): Promise<SessionAuthenticatedDTO> {
    const { data: profile, error } = await this.supabase
      .from("user_profiles")
      .select("credits_remaining, weekly_credits_max, credits_reset_at, api_key_status, api_key_validated_at")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return {
      authenticated: true,
      user: { id: userId, email },
      profile: {
        credits_remaining: profile.credits_remaining,
        weekly_credits_max: profile.weekly_credits_max,
        credits_reset_at: profile.credits_reset_at,
        api_key_status: profile.api_key_status,
        api_key_validated_at: profile.api_key_validated_at,
      },
    };
  }

  private async getAnonymousSession(clientIp: string): Promise<SessionAnonymousDTO> {
    const ipHash = this.hashIp(clientIp);
    const todayUtc = new Date().toISOString().split("T")[0];

    const { data: usage } = await this.supabase
      .from("anonymous_usage")
      .select("smelts_used")
      .eq("ip_hash", ipHash)
      .eq("date_utc", todayUtc)
      .single();

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      authenticated: false,
      anonymous_usage: {
        smelts_used_today: usage?.smelts_used ?? 0,
        daily_limit: 1,
        resets_at: tomorrow.toISOString(),
      },
    };
  }

  private hashIp(ip: string): string {
    return createHash("sha256").update(ip).digest("hex");
  }
}
```

### Step 3: Create API Endpoints

**File**: `src/pages/api/auth/register.ts`

```typescript
import type { APIContext } from "astro";
import { AuthService } from "@/lib/services/auth.service";
import { authCredentialsSchema } from "@/lib/schemas/auth.schema";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = authCredentialsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            code: firstError.path[0] === "email" ? "invalid_email" : "weak_password",
            message: firstError.message,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const authService = new AuthService(context.locals.supabase);
    const result = await authService.register(validation.data.email, validation.data.password);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Map Supabase auth errors to API responses
    const mapped = mapAuthError(error);
    return new Response(
      JSON.stringify({ error: { code: mapped.code, message: mapped.message } }),
      { status: mapped.status, headers: { "Content-Type": "application/json" } }
    );
  }
}

function mapAuthError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof Error) {
    if (error.message.includes("already registered")) {
      return { status: 409, code: "email_exists", message: "EMAIL ALREADY REGISTERED" };
    }
    if (error.message.includes("rate limit")) {
      return { status: 429, code: "rate_limited", message: "TOO MANY ATTEMPTS. TRY AGAIN LATER" };
    }
  }
  return { status: 500, code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" };
}
```

**File**: `src/pages/api/auth/login.ts`

```typescript
import type { APIContext } from "astro";
import { AuthService } from "@/lib/services/auth.service";
import { authCredentialsSchema } from "@/lib/schemas/auth.schema";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const validation = authCredentialsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            code: firstError.path[0] === "email" ? "invalid_email" : "weak_password",
            message: firstError.message,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const authService = new AuthService(context.locals.supabase);
    const result = await authService.login(validation.data.email, validation.data.password);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid login")) {
      return new Response(
        JSON.stringify({ error: { code: "invalid_credentials", message: "WRONG EMAIL OR PASSWORD" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/auth/logout.ts`

```typescript
import type { APIContext } from "astro";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { data: { user } } = await context.locals.supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "NOT LOGGED IN" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const authService = new AuthService(context.locals.supabase);
    await authService.logout();

    return new Response(
      JSON.stringify({ message: "LOGGED OUT" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**File**: `src/pages/api/auth/session.ts`

```typescript
import type { APIContext } from "astro";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const clientIp = context.request.headers.get("x-forwarded-for")?.split(",")[0]
      ?? context.request.headers.get("x-real-ip")
      ?? "unknown";

    const authService = new AuthService(context.locals.supabase);
    const session = await authService.getSession(clientIp);

    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Step 4: Update Middleware for Auth Token Handling

**Update**: `src/middleware/index.ts`

```typescript
import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Extract token from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Set the session for this request
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: "", // Not needed for single request
    });
  }

  context.locals.supabase = supabase;

  return next();
});
```

---

## 11. File Structure

```
src/
├── lib/
│   ├── schemas/
│   │   └── auth.schema.ts
│   └── services/
│       └── auth.service.ts
├── pages/
│   └── api/
│       └── auth/
│           ├── register.ts
│           ├── login.ts
│           ├── logout.ts
│           └── session.ts
└── middleware/
    └── index.ts (update)
```

---

## 12. Testing Checklist

- [ ] Register new user successfully
- [ ] Register with duplicate email returns 409
- [ ] Register with invalid email returns 400
- [ ] Register with weak password returns 400
- [ ] Login with valid credentials returns tokens
- [ ] Login with invalid credentials returns 401
- [ ] Logout with valid token succeeds
- [ ] Logout without token returns 401
- [ ] Session endpoint returns authenticated data with token
- [ ] Session endpoint returns anonymous data without token
- [ ] User profile is created automatically on registration
