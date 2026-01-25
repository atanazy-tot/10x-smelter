# View Implementation Plan: Authentication View

## 1. Overview

The Authentication View provides a unified interface for user registration and login in the SMELT application. It follows the neobrutalist design aesthetic with a toggle-based mode switch between LOGIN and REGISTER modes. The view handles form input, validation, error display, and redirects users to the main page upon successful authentication. Anonymous users who have hit their daily limit or want access to custom prompts are directed here.

## 2. View Routing

- **Path**: `/auth`
- **File**: `src/pages/auth.astro`
- **Auth Required**: No (redirect to `/` if already authenticated)
- **Prerender**: `false` (dynamic page)

## 3. Component Structure

```
auth.astro (Astro page)
└── AuthIsland (React island with client:load)
    ├── Header (existing component, minimal version)
    ├── AuthContainer
    │   ├── AuthModeToggle
    │   │   ├── LoginButton
    │   │   └── RegisterButton
    │   ├── AuthForm
    │   │   ├── EmailInput (uses ui/input.tsx)
    │   │   ├── PasswordInput (uses ui/input.tsx)
    │   │   ├── ErrorMessage (conditional)
    │   │   └── SubmitButton (uses ui/button.tsx)
    │   └── OAuthDivider (placeholder for future OAuth)
    └── Footer (minimal)
```

## 4. Component Details

### 4.1 AuthIsland

- **Description**: Main React island that orchestrates the authentication page. Handles session checking on mount and redirects if user is already authenticated.
- **Main elements**: Container div with Header, AuthContainer, and Footer
- **Handled interactions**:
  - Check session on mount
  - Redirect to `/` if authenticated
- **Handled validation**: None directly (delegates to child components)
- **Types**: `SessionDTO`
- **Props**: None

### 4.2 AuthContainer

- **Description**: Container component that holds the auth form and mode toggle. Manages local form state and API calls.
- **Main elements**: Centered card-style container with title, AuthModeToggle, AuthForm, and OAuthDivider
- **Handled interactions**:
  - Mode switching (login/register)
  - Form submission
  - Error clearing on mode switch
- **Handled validation**: Orchestrates validation but delegates to AuthForm
- **Types**: `AuthMode`, `AuthFormState`, `AuthFormError`, `AuthCredentialsCommand`, `AuthResponseDTO`
- **Props**: None (uses internal hook)

### 4.3 AuthModeToggle

- **Description**: Toggle component to switch between LOGIN and REGISTER modes. Follows the same pattern as CombineModeToggle for visual consistency.
- **Main elements**:
  - Container div with two buttons
  - LOGIN button
  - REGISTER button
- **Handled interactions**:
  - Click on LOGIN button sets mode to 'login'
  - Click on REGISTER button sets mode to 'register'
- **Handled validation**: None
- **Types**: `AuthMode`
- **Props**:
  - `mode: AuthMode` - current auth mode
  - `onModeChange: (mode: AuthMode) => void` - callback when mode changes
  - `disabled?: boolean` - disable during form submission
  - `className?: string`

### 4.4 AuthForm

- **Description**: Form component with email and password inputs, error display, and submit button. Handles client-side validation before submission.
- **Main elements**:
  - Form element with `onSubmit` handler
  - Email label and Input component
  - Password label and Input component
  - ErrorMessage component (conditional)
  - Submit Button component
- **Handled interactions**:
  - Email input change
  - Password input change
  - Form submission
  - Enter key submits form
- **Handled validation**:
  - Email required (non-empty)
  - Email format validation (basic regex)
  - Password required (non-empty)
  - Password minimum 8 characters (for register mode)
  - Password maximum 72 characters
- **Types**: `AuthMode`, `AuthFormError`
- **Props**:
  - `mode: AuthMode` - current auth mode
  - `email: string` - email value
  - `password: string` - password value
  - `error: AuthFormError | null` - current error
  - `isLoading: boolean` - submission state
  - `onEmailChange: (email: string) => void`
  - `onPasswordChange: (password: string) => void`
  - `onSubmit: () => void`
  - `className?: string`

### 4.5 ErrorMessage

- **Description**: Inline error display component with neobrutalist styling. Shows coral background with ALL CAPS error message.
- **Main elements**:
  - Container div with coral background
  - Error icon (AlertTriangle)
  - Error message text (uppercase)
- **Handled interactions**: None (display only)
- **Handled validation**: None
- **Types**: `AuthFormError`
- **Props**:
  - `error: AuthFormError` - error to display
  - `className?: string`

### 4.6 OAuthDivider

- **Description**: Placeholder component for future OAuth integration. Shows an "OR" divider line.
- **Main elements**:
  - Horizontal line with "OR" text centered
- **Handled interactions**: None (placeholder for future)
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `className?: string`

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Command for user registration and login requests
interface AuthCredentialsCommand {
  email: string;
  password: string;
}

// Basic user information returned in auth responses
interface AuthUserDTO {
  id: string;
  email: string;
}

// Session token information returned after authentication
interface AuthSessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Combined response for successful authentication
interface AuthResponseDTO {
  user: AuthUserDTO;
  session: AuthSessionDTO;
}

// Session response types
interface SessionAuthenticatedDTO {
  authenticated: true;
  user: AuthUserDTO;
  profile: SessionProfileDTO;
}

interface SessionAnonymousDTO {
  authenticated: false;
  anonymous_usage: SessionAnonymousUsageDTO;
}

type SessionDTO = SessionAuthenticatedDTO | SessionAnonymousDTO;
```

### 5.2 New ViewModel Types (to add to `src/store/types.ts`)

```typescript
// Auth mode for toggle
type AuthMode = "login" | "register";

// Form error with code for error handling
interface AuthFormError {
  code: string;
  message: string;
}

// Complete auth form state
interface AuthFormState {
  mode: AuthMode;
  email: string;
  password: string;
  isLoading: boolean;
  error: AuthFormError | null;
}

// Auth form actions
interface AuthFormActions {
  setMode: (mode: AuthMode) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  submit: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// Combined state and actions for the hook
type UseAuthFormReturn = AuthFormState & AuthFormActions;
```

### 5.3 API Error Response Type

```typescript
// API error response structure
interface ApiErrorResponse {
  code: string;
  message: string;
}
```

## 6. State Management

### 6.1 Custom Hook: `useAuthForm`

Create a new custom hook in `src/components/hooks/useAuthForm.ts` that manages all auth form state locally (not in Zustand, as form state is ephemeral).

```typescript
function useAuthForm(): UseAuthFormReturn {
  // State
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthFormError | null>(null);

  // Clear error when mode changes
  useEffect(() => {
    setError(null);
  }, [mode]);

  // Submit function with validation and API call
  const submit = async () => {
    // Client-side validation
    // API call based on mode
    // Handle success (update auth store, redirect)
    // Handle errors (set error state)
  };

  // Reset function
  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
  };

  return {
    mode,
    email,
    password,
    isLoading,
    error,
    setMode,
    setEmail: (v) => {
      setEmail(v);
      setError(null);
    },
    setPassword: (v) => {
      setPassword(v);
      setError(null);
    },
    submit,
    clearError: () => setError(null),
    reset,
  };
}
```

### 6.2 Integration with Auth Store

After successful authentication, the hook should:

1. Call `useAuthStore.getState().setUser(response.user)`
2. Call `useAuthStore.getState().refreshUsage()`
3. Redirect to `/` using `window.location.href = "/"`

## 7. API Integration

### 7.1 Registration Endpoint

**Endpoint**: `POST /api/auth/register`

**Request**:

```typescript
// Type: AuthCredentialsCommand
{
  email: string;
  password: string;
}
```

**Success Response** (201 Created):

```typescript
// Type: AuthResponseDTO
{
  user: {
    id: string;
    email: string;
  }
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
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

### 7.2 Login Endpoint

**Endpoint**: `POST /api/auth/login`

**Request**:

```typescript
// Type: AuthCredentialsCommand
{
  email: string;
  password: string;
}
```

**Success Response** (200 OK):

```typescript
// Type: AuthResponseDTO
{
  user: {
    id: string;
    email: string;
  }
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 401 | `invalid_credentials` | WRONG EMAIL OR PASSWORD |
| 429 | `rate_limited` | TOO MANY ATTEMPTS. TRY AGAIN LATER |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

### 7.3 Session Check Endpoint

**Endpoint**: `GET /api/auth/session`

**Success Response** (200 OK):

```typescript
// Type: SessionDTO (union)
// If authenticated:
{
  authenticated: true;
  user: { id: string; email: string; };
  profile: { ... };
}
// If not authenticated:
{
  authenticated: false;
  anonymous_usage: { ... };
}
```

### 7.4 API Call Implementation

```typescript
async function submitAuth(mode: AuthMode, email: string, password: string): Promise<AuthResponseDTO> {
  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw error;
  }

  return response.json();
}
```

## 8. User Interactions

### 8.1 Mode Toggle

| Action                | Result                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Click LOGIN button    | Mode switches to 'login', error cleared, password validation relaxed   |
| Click REGISTER button | Mode switches to 'register', error cleared, password requires 8+ chars |
| Toggle while loading  | Disabled, no action                                                    |

### 8.2 Form Input

| Action                 | Result                                          |
| ---------------------- | ----------------------------------------------- |
| Type in email field    | Update email state, clear any existing error    |
| Type in password field | Update password state, clear any existing error |
| Tab between fields     | Standard tab navigation                         |
| Clear field            | Update state to empty string                    |

### 8.3 Form Submission

| Action                                | Result                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| Click submit button                   | Validate inputs, submit if valid, show error if invalid |
| Press Enter in any input              | Submit form (same as button click)                      |
| Submit with empty email               | Show "EMAIL REQUIRED" error                             |
| Submit with invalid email             | Show "INVALID EMAIL FORMAT" error                       |
| Submit with empty password            | Show "PASSWORD REQUIRED" error                          |
| Submit with short password (register) | Show "PASSWORD TOO WEAK. MIN 8 CHARS" error             |
| Successful login                      | Redirect to `/`, update auth store                      |
| Successful register                   | Redirect to `/`, update auth store                      |
| Failed auth                           | Show error message inline                               |

### 8.4 Error Handling

| Action            | Result                              |
| ----------------- | ----------------------------------- |
| Error displayed   | Coral background, uppercase message |
| Type in any field | Clear error                         |
| Switch mode       | Clear error                         |

## 9. Conditions and Validation

### 9.1 Client-Side Validation (Before API Call)

| Field    | Condition            | Error Code          | Error Message                   | Applied In    |
| -------- | -------------------- | ------------------- | ------------------------------- | ------------- |
| Email    | Required (non-empty) | `missing_email`     | EMAIL REQUIRED                  | Both modes    |
| Email    | Valid format (regex) | `invalid_email`     | INVALID EMAIL FORMAT            | Both modes    |
| Password | Required (non-empty) | `missing_password`  | PASSWORD REQUIRED               | Both modes    |
| Password | Min 8 characters     | `weak_password`     | PASSWORD TOO WEAK. MIN 8 CHARS  | Register only |
| Password | Max 72 characters    | `password_too_long` | PASSWORD TOO LONG. MAX 72 CHARS | Both modes    |

### 9.2 Server-Side Validation (API Errors)

| Condition                | Error Code            | Error Message                      | Mode     |
| ------------------------ | --------------------- | ---------------------------------- | -------- |
| Invalid email format     | `invalid_email`       | INVALID EMAIL FORMAT               | Both     |
| Password too weak        | `weak_password`       | PASSWORD TOO WEAK. MIN 8 CHARS     | Register |
| Email already registered | `email_exists`        | EMAIL ALREADY REGISTERED           | Register |
| Wrong credentials        | `invalid_credentials` | WRONG EMAIL OR PASSWORD            | Login    |
| Too many attempts        | `rate_limited`        | TOO MANY ATTEMPTS. TRY AGAIN LATER | Both     |
| Server error             | `internal_error`      | SOMETHING WENT WRONG. TRY AGAIN    | Both     |

### 9.3 Form State Validation

| State          | Submit Button                 |
| -------------- | ----------------------------- |
| Email empty    | Disabled                      |
| Password empty | Disabled                      |
| isLoading true | Disabled, shows loading state |
| All valid      | Enabled                       |

### 9.4 Session Check

| Condition                          | Action          |
| ---------------------------------- | --------------- |
| Already authenticated on page load | Redirect to `/` |
| Not authenticated                  | Show auth form  |

## 10. Error Handling

### 10.1 Network Errors

```typescript
try {
  await submitAuth(mode, email, password);
} catch (error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    setError({
      code: "network_error",
      message: "CONNECTION FAILED. CHECK YOUR INTERNET",
    });
  }
}
```

### 10.2 API Errors

Parse error response and display message:

```typescript
if (!response.ok) {
  const errorData: ApiErrorResponse = await response.json();
  setError({
    code: errorData.code,
    message: errorData.message,
  });
}
```

### 10.3 Validation Errors

Implement client-side validation before API call:

```typescript
function validateForm(mode: AuthMode, email: string, password: string): AuthFormError | null {
  if (!email.trim()) {
    return { code: "missing_email", message: "EMAIL REQUIRED" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { code: "invalid_email", message: "INVALID EMAIL FORMAT" };
  }

  if (!password) {
    return { code: "missing_password", message: "PASSWORD REQUIRED" };
  }

  if (mode === "register" && password.length < 8) {
    return { code: "weak_password", message: "PASSWORD TOO WEAK. MIN 8 CHARS" };
  }

  if (password.length > 72) {
    return { code: "password_too_long", message: "PASSWORD TOO LONG. MAX 72 CHARS" };
  }

  return null;
}
```

### 10.4 Edge Cases

| Scenario                  | Handling                              |
| ------------------------- | ------------------------------------- |
| Double form submission    | Disable button while loading          |
| Session check fails       | Allow form display, proceed with auth |
| Redirect after auth fails | Show error, stay on page              |
| Token storage fails       | Handled by Supabase client internally |

## 11. Implementation Steps

### Step 1: Create ViewModel Types

1. Add `AuthMode` and `AuthFormError` types to `src/store/types.ts`
2. Export the new types

### Step 2: Create Custom Hook

1. Create `src/components/hooks/useAuthForm.ts`
2. Implement state management for form
3. Implement client-side validation function
4. Implement submit function with API call
5. Implement error handling
6. Implement mode switching with error clearing

### Step 3: Create ErrorMessage Component

1. Create `src/components/auth/ErrorMessage.tsx`
2. Style with coral background and neobrutalist design
3. Display error icon and uppercase message

### Step 4: Create AuthModeToggle Component

1. Create `src/components/auth/AuthModeToggle.tsx`
2. Follow CombineModeToggle pattern for visual consistency
3. Implement mode switching buttons
4. Add disabled state for loading

### Step 5: Create OAuthDivider Component

1. Create `src/components/auth/OAuthDivider.tsx`
2. Implement horizontal line with "OR" text
3. Style as placeholder for future OAuth

### Step 6: Create AuthForm Component

1. Create `src/components/auth/AuthForm.tsx`
2. Add email input with label
3. Add password input with label (type="password")
4. Integrate ErrorMessage component
5. Add submit button with loading state
6. Implement form submission handler
7. Add keyboard support (Enter to submit)

### Step 7: Create AuthContainer Component

1. Create `src/components/auth/AuthContainer.tsx`
2. Use `useAuthForm` hook
3. Compose AuthModeToggle, AuthForm, OAuthDivider
4. Add page title and styling

### Step 8: Create AuthIsland Component

1. Create `src/components/auth/AuthIsland.tsx`
2. Add session check on mount
3. Implement redirect if authenticated
4. Add loading state during session check
5. Compose Header, AuthContainer, Footer

### Step 9: Create Astro Page

1. Create `src/pages/auth.astro`
2. Set `export const prerender = false`
3. Import and render AuthIsland with `client:load`
4. Set page title

### Step 10: Integration Testing

1. Test login flow with valid credentials
2. Test register flow with valid credentials
3. Test all validation error scenarios
4. Test API error handling
5. Test redirect when already authenticated
6. Test mode switching clears errors
7. Test keyboard navigation
8. Test mobile responsiveness

### Step 11: Accessibility Review

1. Verify all form fields have proper labels
2. Add `aria-describedby` linking errors to inputs
3. Test tab order is logical
4. Ensure focus indicators are visible
5. Test with screen reader

### File Structure After Implementation

```
src/
├── components/
│   └── auth/
│       ├── AuthIsland.tsx
│       ├── AuthContainer.tsx
│       ├── AuthModeToggle.tsx
│       ├── AuthForm.tsx
│       ├── ErrorMessage.tsx
│       └── OAuthDivider.tsx
│   └── hooks/
│       └── useAuthForm.ts
├── pages/
│   └── auth.astro
└── store/
    └── types.ts (updated with AuthMode, AuthFormError)
```
