# Authentication System Specification

## Executive Summary

This specification defines a complete authentication architecture for SMELT using Supabase Auth with server-side rendering (SSR) best practices. The design addresses critical gaps in the current implementation including email verification, password recovery, secure token management, and proper SSR integration with Astro.

---

## 1. Critical Review of Current Implementation

### 1.1 Security Vulnerabilities

| Issue              | Current State                        | Risk Level | Impact                                                      |
| ------------------ | ------------------------------------ | ---------- | ----------------------------------------------------------- |
| Token Storage      | localStorage                         | HIGH       | Vulnerable to XSS attacks; tokens accessible via JavaScript |
| Session Validation | `getUser()` without JWT verification | MEDIUM     | Trusts token without signature validation                   |
| Token Refresh      | Disabled (`autoRefreshToken: false`) | MEDIUM     | Sessions expire without graceful refresh                    |
| SSR Package        | Missing `@supabase/ssr`              | HIGH       | No cookie-based session management for SSR                  |

### 1.2 Missing Functionality

| Feature            | PRD Requirement          | Current State    |
| ------------------ | ------------------------ | ---------------- |
| Email Verification | Implied (US-002, US-003) | Not implemented  |
| Password Reset     | US-002 account recovery  | Not implemented  |
| Auth Callback      | Required for email flows | Missing endpoint |
| Magic Link Support | Alternative login method | Not available    |

### 1.3 Architecture Issues

1. **Client-Side Token Management**: Tokens are managed entirely in browser localStorage, bypassing SSR security benefits
2. **No Cookie Integration**: Astro middleware cannot access session state for protected route rendering
3. **Implicit Flow Only**: Current implementation uses implicit flow instead of the more secure PKCE flow recommended for SSR
4. **Missing Token Refresh**: No mechanism to refresh expired tokens automatically

---

## 2. Proposed Architecture Overview

### 2.1 Core Principles

1. **Cookie-Based Sessions**: Store tokens in HTTP-only cookies for SSR compatibility and XSS protection
2. **PKCE Flow**: Use Proof Key for Code Exchange for all authentication flows
3. **Server-Side Validation**: Validate JWT signatures using `getClaims()` on every protected request
4. **Email Verification**: Require email confirmation before full account access
5. **Graceful Token Refresh**: Automatic token refresh with proper cookie management

### 2.2 Package Requirements

```
@supabase/supabase-js  (existing)
@supabase/ssr          (new - required for cookie management)
```

### 2.3 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REGISTRATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User submits         POST /api/auth/register        Supabase sends     │
│  email + password  ──────────────────────────────►  verification email  │
│                                                                          │
│  User clicks          GET /api/auth/callback         Exchanges code     │
│  email link       ───────────────────────────────►  for session tokens  │
│                                                                          │
│  Tokens stored        Redirect to app                User authenticated │
│  in HTTP cookies  ◄──────────────────────────────   with verified email │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           PASSWORD RESET FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User requests        POST /api/auth/reset-password   Supabase sends    │
│  password reset   ──────────────────────────────────►  reset email      │
│                                                                          │
│  User clicks          GET /api/auth/callback          Validates token   │
│  reset link       ───────────────────────────────────►  sets session    │
│                                                                          │
│  User submits         POST /api/auth/update-password  Updates password  │
│  new password     ───────────────────────────────────►  in Supabase     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. User Interface Architecture

### 3.1 Page Structure

#### New Pages

| Route                   | Purpose                          | Access                  |
| ----------------------- | -------------------------------- | ----------------------- |
| `/auth`                 | Combined login/register form     | Public                  |
| `/auth/verify-email`    | Email verification pending state | Public                  |
| `/auth/reset-password`  | Request password reset           | Public                  |
| `/auth/update-password` | Set new password after reset     | Protected (reset token) |
| `/auth/callback`        | OAuth/email link handler         | Public                  |

#### Modified Pages

| Route      | Changes                                                     |
| ---------- | ----------------------------------------------------------- |
| `/` (Home) | Add auth state awareness, show user menu when authenticated |
| All pages  | Middleware injects session state for conditional rendering  |

### 3.2 Component Hierarchy

```
src/components/auth/
├── AuthIsland.tsx              # Entry point, Astro island wrapper
├── AuthContainer.tsx           # Main auth UI container
├── forms/
│   ├── LoginForm.tsx           # Email + password login
│   ├── RegisterForm.tsx        # Email + password registration
│   ├── ResetPasswordForm.tsx   # Request password reset
│   └── UpdatePasswordForm.tsx  # Set new password
├── AuthModeToggle.tsx          # Switch between login/register
├── EmailVerificationBanner.tsx # Show when email not verified
├── ErrorMessage.tsx            # Auth error display
└── index.ts                    # Barrel export
```

### 3.3 Form Specifications

#### LoginForm

| Field    | Type     | Validation                   | Error Message                          |
| -------- | -------- | ---------------------------- | -------------------------------------- |
| email    | email    | Required, valid email format | EMAIL REQUIRED / INVALID EMAIL FORMAT  |
| password | password | Required, 8-72 characters    | PASSWORD REQUIRED / PASSWORD TOO SHORT |

**Submit Actions:**

- Call `POST /api/auth/login`
- On success: tokens set via cookies, redirect to `/`
- On error: display error message, clear password field

#### RegisterForm

| Field           | Type     | Validation                   | Error Message                         |
| --------------- | -------- | ---------------------------- | ------------------------------------- |
| email           | email    | Required, valid email format | EMAIL REQUIRED / INVALID EMAIL FORMAT |
| password        | password | Required, 8-72 characters    | PASSWORD TOO WEAK. MIN 8 CHARS        |
| confirmPassword | password | Must match password          | PASSWORDS DON'T MATCH                 |

**Submit Actions:**

- Call `POST /api/auth/register`
- On success: redirect to `/auth/verify-email`
- On error: display error message

#### ResetPasswordForm

| Field | Type  | Validation                   | Error Message                         |
| ----- | ----- | ---------------------------- | ------------------------------------- |
| email | email | Required, valid email format | EMAIL REQUIRED / INVALID EMAIL FORMAT |

**Submit Actions:**

- Call `POST /api/auth/reset-password`
- Always show success message (security: don't reveal if email exists)
- Display: CHECK YOUR EMAIL FOR RESET LINK

#### UpdatePasswordForm

| Field           | Type     | Validation                | Error Message                  |
| --------------- | -------- | ------------------------- | ------------------------------ |
| password        | password | Required, 8-72 characters | PASSWORD TOO WEAK. MIN 8 CHARS |
| confirmPassword | password | Must match password       | PASSWORDS DON'T MATCH          |

**Submit Actions:**

- Call `POST /api/auth/update-password`
- On success: redirect to `/` with success message
- On error: display error message

### 3.4 React Hooks

#### useAuthForm (refactored)

```typescript
interface UseAuthFormOptions {
  mode: "login" | "register" | "reset" | "update";
  onSuccess?: () => void;
  onError?: (error: AuthFormError) => void;
}

interface UseAuthFormReturn {
  formState: FormState;
  errors: ValidationErrors;
  isSubmitting: boolean;
  handleChange: (field: string, value: string) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  clearErrors: () => void;
}
```

#### useAuth (new)

```typescript
interface UseAuthReturn {
  user: AuthUserDTO | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### 3.5 Validation Cases and Error Messages

#### Client-Side Validation

| Scenario              | Validation Rule      | Error Display                   |
| --------------------- | -------------------- | ------------------------------- |
| Empty email           | Required field       | EMAIL REQUIRED                  |
| Invalid email format  | RFC 5322 regex       | INVALID EMAIL FORMAT            |
| Empty password        | Required field       | PASSWORD REQUIRED               |
| Password < 8 chars    | Min length 8         | PASSWORD TOO WEAK. MIN 8 CHARS  |
| Password > 72 chars   | Max length 72        | PASSWORD TOO LONG. MAX 72 CHARS |
| Passwords don't match | Confirm === password | PASSWORDS DON'T MATCH           |

#### Server-Side Validation

| Scenario                 | HTTP Status | Error Code            | Error Message                         |
| ------------------------ | ----------- | --------------------- | ------------------------------------- |
| Email already registered | 409         | `email_exists`        | EMAIL ALREADY REGISTERED              |
| Invalid credentials      | 401         | `invalid_credentials` | WRONG EMAIL OR PASSWORD               |
| Email not verified       | 403         | `email_not_verified`  | VERIFY YOUR EMAIL FIRST               |
| Rate limited             | 429         | `rate_limited`        | TOO MANY ATTEMPTS. TRY AGAIN LATER    |
| Invalid reset token      | 401         | `invalid_token`       | RESET LINK EXPIRED. REQUEST A NEW ONE |
| Session expired          | 401         | `session_expired`     | SESSION EXPIRED. LOG IN AGAIN         |

### 3.6 UI State Handling

#### Loading States

- Form submission: Disable inputs, show spinner in submit button
- Session check: Show skeleton loader for auth-dependent content
- Token refresh: Silent background refresh, no UI indication

#### Success States

- Registration: Redirect to verification page with email display
- Login: Redirect to home with session established
- Password reset request: Show success message regardless of email existence
- Password update: Redirect to home with success toast

#### Error States

- Form validation: Inline field errors with neobrutalist styling
- Server errors: Banner message above form
- Network errors: Generic CONNECTION ERROR. TRY AGAIN message

---

## 4. Backend Logic

### 4.1 API Endpoint Structure

#### New Endpoints

| Method | Endpoint                        | Purpose                                   |
| ------ | ------------------------------- | ----------------------------------------- |
| POST   | `/api/auth/register`            | Create account, send verification email   |
| POST   | `/api/auth/login`               | Authenticate user, set session cookies    |
| POST   | `/api/auth/logout`              | Clear session cookies                     |
| GET    | `/api/auth/session`             | Get current session state                 |
| POST   | `/api/auth/reset-password`      | Request password reset email              |
| POST   | `/api/auth/update-password`     | Update password (authenticated)           |
| GET    | `/api/auth/callback`            | Handle email verification and reset links |
| POST   | `/api/auth/refresh`             | Refresh expired access token              |
| POST   | `/api/auth/resend-verification` | Resend verification email                 |

### 4.2 Endpoint Specifications

#### POST /api/auth/register

**Request:**

```typescript
interface RegisterRequest {
  email: string;
  password: string;
}
```

**Response (201):**

```typescript
interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
  message: string; // "CHECK YOUR EMAIL TO VERIFY YOUR ACCOUNT"
}
```

**Implementation Notes:**

- Call `supabase.auth.signUp()` with `emailRedirectTo` pointing to `/api/auth/callback`
- Do NOT set session cookies immediately (user must verify email first)
- Return success response directing user to check email

**Error Responses:**

| Status | Code               | Message                            |
| ------ | ------------------ | ---------------------------------- |
| 400    | `validation_error` | Zod validation errors              |
| 409    | `email_exists`     | EMAIL ALREADY REGISTERED           |
| 429    | `rate_limited`     | TOO MANY ATTEMPTS. TRY AGAIN LATER |

---

#### POST /api/auth/login

**Request:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200):**

```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
}
```

**Implementation Notes:**

- Call `supabase.auth.signInWithPassword()`
- Check `user.email_confirmed_at` is not null
- If email not verified, return 403 with `email_not_verified`
- Set session cookies using `@supabase/ssr` helpers

**Error Responses:**

| Status | Code                  | Message                                   |
| ------ | --------------------- | ----------------------------------------- |
| 401    | `invalid_credentials` | WRONG EMAIL OR PASSWORD                   |
| 403    | `email_not_verified`  | VERIFY YOUR EMAIL FIRST. CHECK YOUR INBOX |
| 429    | `rate_limited`        | TOO MANY ATTEMPTS. TRY AGAIN LATER        |

---

#### GET /api/auth/callback

**Query Parameters:**

```typescript
interface CallbackParams {
  code?: string; // Authorization code from email link
  token_hash?: string; // Token hash for email verification
  type?: "signup" | "recovery" | "invite" | "magiclink";
  next?: string; // Redirect destination after auth
}
```

**Implementation Notes:**

- Handle both PKCE code exchange and token hash verification
- For `type=signup`: Exchange code, set cookies, redirect to `/`
- For `type=recovery`: Exchange code, set cookies, redirect to `/auth/update-password`
- For errors: Redirect to `/auth?error=<error_code>`

**Redirect Flows:**

| Type     | Success Redirect        | Error Redirect                            |
| -------- | ----------------------- | ----------------------------------------- |
| signup   | `/`                     | `/auth?error=verification_failed`         |
| recovery | `/auth/update-password` | `/auth/reset-password?error=link_expired` |

---

#### POST /api/auth/reset-password

**Request:**

```typescript
interface ResetPasswordRequest {
  email: string;
}
```

**Response (200):**

```typescript
interface ResetPasswordResponse {
  message: string; // "IF THAT EMAIL EXISTS, WE SENT A RESET LINK"
}
```

**Implementation Notes:**

- Call `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing to callback
- Always return success (security: don't reveal if email exists)
- Rate limit by IP to prevent enumeration

---

#### POST /api/auth/update-password

**Request:**

```typescript
interface UpdatePasswordRequest {
  password: string;
}
```

**Response (200):**

```typescript
interface UpdatePasswordResponse {
  message: string; // "PASSWORD UPDATED"
}
```

**Implementation Notes:**

- Requires valid session (established via callback)
- Call `supabase.auth.updateUser({ password })`
- Clear any password reset state

**Error Responses:**

| Status | Code            | Message                        |
| ------ | --------------- | ------------------------------ |
| 401    | `unauthorized`  | SESSION REQUIRED               |
| 400    | `weak_password` | PASSWORD TOO WEAK. MIN 8 CHARS |

---

#### POST /api/auth/resend-verification

**Request:**

```typescript
interface ResendVerificationRequest {
  email: string;
}
```

**Response (200):**

```typescript
interface ResendVerificationResponse {
  message: string; // "VERIFICATION EMAIL SENT"
}
```

**Implementation Notes:**

- Call `supabase.auth.resend({ type: 'signup', email })`
- Rate limit: 1 request per minute per email

---

### 4.3 Data Models

#### Session Cookie Structure

```typescript
// Cookies set by @supabase/ssr
interface SessionCookies {
  "sb-access-token": string; // JWT access token
  "sb-refresh-token": string; // Refresh token
}
```

Cookie settings:

- `httpOnly: true` - Not accessible via JavaScript
- `secure: true` - HTTPS only in production
- `sameSite: 'lax'` - CSRF protection
- `path: '/'` - Available site-wide
- `maxAge: 604800` - 7 days (refresh token lifetime)

#### Auth DTOs

```typescript
// Updated types for src/types.ts

export interface AuthUserDTO {
  id: string;
  email: string;
  email_verified: boolean; // NEW: email verification status
}

export interface AuthSessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Removed: AuthResponseDTO no longer returns tokens to client
// Tokens are now managed via HTTP-only cookies

export interface SessionDTO {
  authenticated: boolean;
  user?: AuthUserDTO;
  profile?: ProfileDTO;
  anonymous_usage?: AnonymousUsageDTO;
}
```

### 4.4 Service Layer

#### auth.service.ts (refactored)

```typescript
// New service structure

export async function register(
  supabase: SupabaseClient,
  email: string,
  password: string,
  redirectUrl: string
): Promise<{ user: AuthUserDTO }> {
  // Uses signUp with email verification enabled
}

export async function login(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ user: AuthUserDTO; session: Session }> {
  // Returns session for cookie setting
  // Throws if email not verified
}

export async function exchangeCodeForSession(supabase: SupabaseClient, code: string): Promise<{ session: Session }> {
  // PKCE code exchange
}

export async function resetPassword(supabase: SupabaseClient, email: string, redirectUrl: string): Promise<void> {
  // Sends password reset email
}

export async function updatePassword(supabase: SupabaseClient, password: string): Promise<void> {
  // Updates password for authenticated user
}

export async function refreshSession(supabase: SupabaseClient, refreshToken: string): Promise<{ session: Session }> {
  // Refreshes expired access token
}

export async function getSessionFromCookies(supabase: SupabaseClient): Promise<SessionDTO> {
  // Validates session from cookies
  // Uses getClaims() for JWT verification
}
```

### 4.5 Validation Schemas

```typescript
// src/lib/schemas/auth.schema.ts

export const registerSchema = z.object({
  email: z.string().min(1, "EMAIL REQUIRED").email("INVALID EMAIL FORMAT"),
  password: z.string().min(8, "PASSWORD TOO WEAK. MIN 8 CHARS").max(72, "PASSWORD TOO LONG. MAX 72 CHARS"),
});

export const loginSchema = z.object({
  email: z.string().min(1, "EMAIL REQUIRED").email("INVALID EMAIL FORMAT"),
  password: z.string().min(1, "PASSWORD REQUIRED"),
});

export const resetPasswordSchema = z.object({
  email: z.string().min(1, "EMAIL REQUIRED").email("INVALID EMAIL FORMAT"),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, "PASSWORD TOO WEAK. MIN 8 CHARS").max(72, "PASSWORD TOO LONG. MAX 72 CHARS"),
});
```

### 4.6 Error Handling

```typescript
// src/lib/utils/auth-errors.ts (extended)

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(403, "email_not_verified", "VERIFY YOUR EMAIL FIRST. CHECK YOUR INBOX");
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super(401, "invalid_token", "RESET LINK EXPIRED. REQUEST A NEW ONE");
  }
}

export class SessionExpiredError extends AppError {
  constructor() {
    super(401, "session_expired", "SESSION EXPIRED. LOG IN AGAIN");
  }
}
```

---

## 5. Authentication System Integration

### 5.1 Middleware Configuration

```typescript
// src/middleware/index.ts (refactored)

import { defineMiddleware } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { Database } from "@/db/database.types";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get("Cookie") ?? "");
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validate session using getClaims() - verifies JWT signature
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  context.locals.supabase = supabase;
  context.locals.user = user;
  context.locals.isAuthenticated = !!user && !error;

  return next();
});
```

### 5.2 Supabase Client Configuration

#### Server Client (API routes, middleware)

```typescript
// src/db/supabase.server.ts (new)

import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
```

#### Browser Client (React components)

```typescript
// src/db/supabase.browser.ts (new)

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_KEY
    );
  }
  return browserClient;
}
```

### 5.3 Environment Variables

```env
# .env additions

# Public (exposed to browser)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...  # anon key only

# Private (server-side only)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...         # anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # for admin operations
```

### 5.4 Supabase Dashboard Configuration

#### Authentication Settings

1. **Email Auth Settings** (Authentication > Providers > Email):
   - Enable email provider: Yes
   - Confirm email: Yes (required)
   - Secure email change: Yes
   - Double confirm email change: No (MVP simplicity)

2. **URL Configuration** (Authentication > URL Configuration):
   - Site URL: `https://smelt.app` (production domain)
   - Redirect URLs:
     - `https://smelt.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback` (development)

3. **Email Templates** (Authentication > Email Templates):

   **Confirm signup:**

   ```
   Subject: VERIFY YOUR SMELT ACCOUNT

   CLICK THE LINK TO VERIFY YOUR EMAIL:
   {{ .ConfirmationURL }}

   LINK EXPIRES IN 24 HOURS.
   ```

   **Reset password:**

   ```
   Subject: RESET YOUR SMELT PASSWORD

   CLICK THE LINK TO RESET YOUR PASSWORD:
   {{ .ConfirmationURL }}

   LINK EXPIRES IN 24 HOURS.
   DIDN'T REQUEST THIS? IGNORE THIS EMAIL.
   ```

4. **SMTP Configuration** (for production):
   - Configure custom SMTP provider (SendGrid, Postmark, etc.)
   - Remove rate limits of default 2 emails/hour

### 5.5 Protected Route Pattern

```typescript
// Example: src/pages/settings.astro

---
import Layout from "../layouts/Layout.astro";
import { SettingsIsland } from "../components/settings";

// Check auth state from middleware
const { user, isAuthenticated } = Astro.locals;

// Redirect unauthenticated users
if (!isAuthenticated) {
  return Astro.redirect('/auth?next=/settings');
}

// Check email verification
if (!user?.email_confirmed_at) {
  return Astro.redirect('/auth/verify-email');
}
---

<Layout title="SMELT - Settings">
  <SettingsIsland client:load user={user} />
</Layout>
```

### 5.6 Token Refresh Strategy

```typescript
// Automatic refresh in middleware

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context.cookies, context.request);

  // This automatically refreshes expired tokens
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    // Clear invalid session cookies
    context.cookies.delete("sb-access-token");
    context.cookies.delete("sb-refresh-token");
  }

  // ... rest of middleware
});
```

---

## 6. Migration Strategy

### 6.1 Breaking Changes

| Change                         | Impact                                   | Migration Path                       |
| ------------------------------ | ---------------------------------------- | ------------------------------------ |
| Token storage moved to cookies | Existing sessions invalidated            | Users must re-authenticate           |
| Email verification required    | New registrations blocked until verified | Existing users grandfathered         |
| API response format changed    | Frontend must update token handling      | Remove localStorage token management |

### 6.2 Implementation Phases

#### Phase 1: Infrastructure (Non-breaking)

1. Install `@supabase/ssr` package
2. Create new server/browser client factories
3. Add new environment variables
4. Configure Supabase dashboard settings

#### Phase 2: Backend (Parallel endpoints)

1. Create new auth endpoints (`/api/auth/v2/*`)
2. Implement cookie-based session management
3. Add email verification flow
4. Add password reset flow
5. Update middleware for cookie-based auth

#### Phase 3: Frontend Migration

1. Create new auth form components
2. Remove localStorage token management
3. Update `useAuth` hook for cookie-based auth
4. Add verification and reset UI pages

#### Phase 4: Cutover

1. Redirect old endpoints to new
2. Remove legacy token-storage utilities
3. Clear old localStorage tokens via cleanup script
4. Update documentation

### 6.3 Backward Compatibility

During transition:

- Keep `/api/auth/login` working with both flows
- Accept both Authorization header and cookies
- Return tokens in response body for legacy clients
- Set cookies for new clients

---

## 7. Security Considerations

### 7.1 Cookie Security

| Setting  | Value       | Rationale                                 |
| -------- | ----------- | ----------------------------------------- |
| httpOnly | true        | Prevents XSS access to tokens             |
| secure   | true (prod) | HTTPS only transmission                   |
| sameSite | lax         | CSRF protection while allowing navigation |
| path     | /           | Available for all routes                  |
| maxAge   | 604800      | 7 days (matches refresh token)            |

### 7.2 JWT Validation

All server-side session checks MUST use `supabase.auth.getUser()` which:

- Validates JWT signature against Supabase public keys
- Checks token expiration
- Verifies token was issued by the correct project

Never use `supabase.auth.getSession()` alone on the server as it does not validate the JWT.

### 7.3 Rate Limiting

| Endpoint                      | Limit      | Window             |
| ----------------------------- | ---------- | ------------------ |
| /api/auth/register            | 3 requests | 1 hour per IP      |
| /api/auth/login               | 5 requests | 15 minutes per IP  |
| /api/auth/reset-password      | 3 requests | 1 hour per email   |
| /api/auth/resend-verification | 1 request  | 1 minute per email |

### 7.4 Email Security

- Never reveal whether an email exists (password reset, resend verification)
- Use constant-time comparison for tokens
- Tokens expire after 24 hours
- One-time use tokens (invalidated after use)

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Component          | Test Cases                                     |
| ------------------ | ---------------------------------------------- |
| Validation schemas | Valid inputs, invalid emails, weak passwords   |
| Auth service       | Successful auth, error handling, token refresh |
| Error classes      | Correct status codes, messages                 |

### 8.2 Integration Tests

| Flow           | Test Cases                                               |
| -------------- | -------------------------------------------------------- |
| Registration   | Success with email verification, duplicate email         |
| Login          | Valid credentials, invalid credentials, unverified email |
| Password reset | Request, invalid token, successful update                |
| Session        | Cookie persistence, token refresh, logout                |

### 8.3 E2E Tests

| Scenario          | Steps                                                      |
| ----------------- | ---------------------------------------------------------- |
| Full registration | Register → Verify email → Login → Access protected route   |
| Password reset    | Request reset → Click email link → Update password → Login |
| Session expiry    | Login → Wait for token expiry → Automatic refresh          |

---

## 9. Compatibility with Existing Requirements

### 9.1 PRD Alignment

| User Story              | Specification Support                               |
| ----------------------- | --------------------------------------------------- |
| US-001 Anonymous Access | Maintained - cookie check returns anonymous session |
| US-002 Registration     | Enhanced with email verification                    |
| US-003 Login            | Enhanced with verified email check                  |
| US-004 Logout           | Enhanced with cookie clearing                       |

### 9.2 Existing Feature Preservation

| Feature                  | Impact                                       |
| ------------------------ | -------------------------------------------- |
| Anonymous usage tracking | No change - IP-based                         |
| Profile/credits system   | No change - works with authenticated session |
| Custom prompts           | No change - RLS continues to work            |
| API key management       | No change - authenticated routes             |
| Real-time processing     | No change - WebSocket auth unchanged         |

### 9.3 API Compatibility

All existing API endpoints continue to work:

- Session extracted from cookies instead of Authorization header
- RLS policies unchanged (auth.uid() populated from cookie session)
- Service layer interfaces unchanged

---

## 10. Component and Module Summary

### 10.1 New Files

```
src/
├── db/
│   ├── supabase.server.ts       # Server-side client factory
│   └── supabase.browser.ts      # Browser client singleton
├── pages/
│   ├── auth/
│   │   ├── verify-email.astro   # Verification pending page
│   │   ├── reset-password.astro # Password reset request page
│   │   └── update-password.astro # Set new password page
│   └── api/auth/
│       ├── callback.ts          # Email link handler
│       ├── reset-password.ts    # Request reset endpoint
│       ├── update-password.ts   # Update password endpoint
│       ├── refresh.ts           # Token refresh endpoint
│       └── resend-verification.ts # Resend verification email
├── components/auth/
│   └── forms/
│       ├── RegisterForm.tsx     # Enhanced with verification flow
│       ├── ResetPasswordForm.tsx # New
│       └── UpdatePasswordForm.tsx # New
└── lib/
    ├── utils/
    │   └── auth-errors.ts       # Extended with new error types
    └── schemas/
        └── auth.schema.ts       # Extended with new validation schemas
```

### 10.2 Modified Files

```
src/
├── middleware/index.ts           # Cookie-based auth
├── lib/services/auth.service.ts  # New methods, refactored existing
├── lib/utils/token-storage.ts    # Deprecated (remove in phase 4)
├── pages/api/auth/
│   ├── register.ts              # Updated for verification flow
│   ├── login.ts                 # Updated for cookie auth
│   ├── logout.ts                # Updated for cookie clearing
│   └── session.ts               # Updated for cookie-based session
├── components/auth/
│   ├── AuthIsland.tsx           # Updated auth flow
│   ├── AuthContainer.tsx        # Updated for new forms
│   └── AuthForm.tsx             # Refactored
├── components/hooks/
│   └── useAuthForm.ts           # Refactored for cookie auth
├── store/auth.ts                # Updated for cookie-based state
└── types.ts                     # Updated DTOs
```

### 10.3 Contracts

#### Service Contracts

```typescript
// auth.service.ts
register(supabase, email, password, redirectUrl): Promise<{ user: AuthUserDTO }>
login(supabase, email, password): Promise<{ user: AuthUserDTO; session: Session }>
logout(supabase): Promise<void>
exchangeCodeForSession(supabase, code): Promise<{ session: Session }>
resetPassword(supabase, email, redirectUrl): Promise<void>
updatePassword(supabase, password): Promise<void>
refreshSession(supabase, refreshToken): Promise<{ session: Session }>
getSessionFromCookies(supabase): Promise<SessionDTO>
resendVerification(supabase, email): Promise<void>
```

#### API Contracts

```typescript
// Request/Response types for all endpoints defined in section 4.2
POST /api/auth/register     -> RegisterRequest -> RegisterResponse
POST /api/auth/login        -> LoginRequest -> LoginResponse
POST /api/auth/logout       -> void -> { message: string }
GET  /api/auth/session      -> void -> SessionDTO
POST /api/auth/reset-password -> ResetPasswordRequest -> ResetPasswordResponse
POST /api/auth/update-password -> UpdatePasswordRequest -> UpdatePasswordResponse
GET  /api/auth/callback     -> CallbackParams -> Redirect
POST /api/auth/refresh      -> void -> { message: string }
POST /api/auth/resend-verification -> ResendVerificationRequest -> ResendVerificationResponse
```

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Password-Based Authentication](https://supabase.com/docs/guides/auth/passwords)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Astro + Supabase Guide](https://docs.astro.build/en/guides/backend/supabase/)
