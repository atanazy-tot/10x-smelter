# View Implementation Plan: Settings (API Key Management)

## 1. Overview

The Settings view provides authenticated users with a dedicated page to manage their OpenRouter API keys for unlimited processing access. Users can add a new API key, view its validation status, and remove an existing key to revert to the free tier.

The view follows the neobrutalist design aesthetic with:
- Masked API key input with show/hide toggle
- Real-time validation feedback with color-coded status (mint for valid, coral for invalid)
- Spinning `@` animation during validation
- Direct, uppercase error messaging

## 2. View Routing

| Attribute | Value |
|-----------|-------|
| **Path** | `/settings` |
| **File** | `src/pages/settings.astro` |
| **Auth Required** | Yes (redirect to `/auth` if not authenticated) |
| **Prerender** | `false` (dynamic page) |

## 3. Component Structure

```
settings.astro (Astro page)
└── SettingsIsland (React island - client:load)
    ├── SettingsHeader
    │   ├── BackLink (← SMELT logo/link)
    │   └── PageTitle ("SETTINGS")
    ├── ApiKeySection
    │   ├── SectionHeader ("API KEY")
    │   ├── ApiKeyStatusBadge (current status indicator)
    │   ├── ApiKeyForm (when no key or adding new key)
    │   │   ├── ApiKeyInput (with show/hide toggle)
    │   │   └── ValidateButton
    │   ├── ValidationStatus (feedback display)
    │   └── RemoveKeyButton (when key exists)
    └── SettingsFooter (minimal footer)
```

## 4. Component Details

### 4.1 SettingsIsland

- **Description**: Root React island component that handles authentication check on mount and renders the settings page layout. Redirects to `/auth` if user is not authenticated.

- **Main elements**:
  - Loading state placeholder
  - Full page layout with header, main content, and footer
  - `ApiKeySection` component

- **Handled interactions**:
  - On mount: Check authentication status via `/api/auth/session`
  - On authentication failure: Redirect to `/auth`

- **Validation conditions**:
  - User must be authenticated to view page

- **Types**:
  - `SessionDTO` (from API response)

- **Props**: None (root component)

---

### 4.2 SettingsHeader

- **Description**: Page header with back navigation and title. Provides consistent branding and navigation back to main page.

- **Main elements**:
  - `<header>` element with border-bottom
  - `<a>` link to "/" with SMELT logo text
  - Back arrow icon (lucide-react `ArrowLeft`)

- **Handled interactions**:
  - Click on logo/back: Navigate to main page (`/`)

- **Validation conditions**: None

- **Types**: None

- **Props**:
  ```typescript
  interface SettingsHeaderProps {
    className?: string;
  }
  ```

---

### 4.3 ApiKeySection

- **Description**: Main content section containing all API key management functionality. Displays current key status, input form for adding keys, and remove button.

- **Main elements**:
  - `<section>` container with Card styling
  - Section title "API KEY"
  - Description text explaining the feature
  - `ApiKeyStatusBadge` component
  - `ApiKeyForm` component (conditional)
  - `ValidationStatus` component
  - `RemoveKeyButton` component (conditional)

- **Handled interactions**:
  - Delegates to child components

- **Validation conditions**: None (delegated)

- **Types**:
  - `ApiKeyStatusDTO`
  - `ApiKeySectionState` (ViewModel)

- **Props**:
  ```typescript
  interface ApiKeySectionProps {
    status: ApiKeyStatusDTO | null;
    isLoading: boolean;
    onValidate: (apiKey: string) => Promise<void>;
    onRemove: () => Promise<void>;
    validationResult: ApiKeyValidationResult | null;
    error: ApiKeyError | null;
  }
  ```

---

### 4.4 ApiKeyStatusBadge

- **Description**: Visual badge showing current API key status with color coding. Uses neobrutalist style with thick borders and accent colors.

- **Main elements**:
  - `<div>` badge container
  - Status icon (Check or X from lucide-react)
  - Status text ("NO KEY", "VALID", "INVALID")

- **Handled interactions**: None (display only)

- **Validation conditions**: None

- **Types**:
  - `ApiKeyStatus` (enum: "none" | "valid" | "invalid")

- **Props**:
  ```typescript
  interface ApiKeyStatusBadgeProps {
    status: ApiKeyStatus;
    validatedAt: string | null;
  }
  ```

---

### 4.5 ApiKeyForm

- **Description**: Form for entering and validating a new API key. Contains masked input with visibility toggle and validate button.

- **Main elements**:
  - `<form>` element with onSubmit handler
  - `ApiKeyInput` component
  - `ValidateButton` component

- **Handled interactions**:
  - Form submit: Trigger validation
  - Input change: Update input state
  - Toggle visibility: Show/hide API key text

- **Validation conditions**:
  - API key must not be empty
  - API key must match format: `^sk-[a-zA-Z0-9_-]{20,}$`
  - Form is disabled during validation

- **Types**:
  - `ApiKeyCreateCommand`

- **Props**:
  ```typescript
  interface ApiKeyFormProps {
    onSubmit: (apiKey: string) => Promise<void>;
    isValidating: boolean;
    disabled?: boolean;
  }
  ```

---

### 4.6 ApiKeyInput

- **Description**: Masked password-style input field for API key entry with a toggle button to show/hide the value. Uses neobrutalist styling with thick borders.

- **Main elements**:
  - `<div>` wrapper with flex layout
  - `<input>` field (type toggles between "password" and "text")
  - `<button>` toggle for visibility (Eye/EyeOff icons)

- **Handled interactions**:
  - Input change: Update value via callback
  - Toggle click: Switch between masked/unmasked
  - Focus: Apply focus ring styles

- **Validation conditions**:
  - Displays error state when validation fails (coral border)

- **Types**: None (primitive props)

- **Props**:
  ```typescript
  interface ApiKeyInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    hasError?: boolean;
    placeholder?: string;
  }
  ```

---

### 4.7 ValidateButton

- **Description**: Submit button that triggers API key validation. Shows spinning `@` symbol during validation state.

- **Main elements**:
  - `<button>` with type="submit"
  - Text: "VALIDATE" or spinning animation
  - Uses Button component with `variant="default"`

- **Handled interactions**:
  - Click: Submit form (handled by parent form)

- **Validation conditions**:
  - Disabled when input is empty
  - Disabled during validation (isValidating)

- **Types**: None

- **Props**:
  ```typescript
  interface ValidateButtonProps {
    isValidating: boolean;
    disabled?: boolean;
  }
  ```

---

### 4.8 ValidationStatus

- **Description**: Displays the result of API key validation with color-coded feedback. Shows success (mint), error (coral), or nothing when idle.

- **Main elements**:
  - `<div>` container (conditional render)
  - Icon (CheckCircle or XCircle)
  - Message text

- **Handled interactions**: None (display only)

- **Validation conditions**: None

- **Types**:
  - `ApiKeyValidationResult`
  - `ApiKeyError`

- **Props**:
  ```typescript
  interface ValidationStatusProps {
    result: ApiKeyValidationResult | null;
    error: ApiKeyError | null;
  }
  ```

---

### 4.9 RemoveKeyButton

- **Description**: Destructive action button to remove the stored API key. Uses coral/destructive styling to indicate danger.

- **Main elements**:
  - `<button>` with destructive variant
  - Trash icon (Trash2 from lucide-react)
  - Text: "REMOVE API KEY"

- **Handled interactions**:
  - Click: Trigger key removal

- **Validation conditions**:
  - Disabled during removal operation
  - Only visible when a key exists

- **Types**: None

- **Props**:
  ```typescript
  interface RemoveKeyButtonProps {
    onRemove: () => void;
    isRemoving: boolean;
    disabled?: boolean;
  }
  ```

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// API Key Status enum
export type ApiKeyStatus = "none" | "valid" | "invalid";

// Command for creating/validating API key
export interface ApiKeyCreateCommand {
  api_key: string;
}

// Response after successful validation
export interface ApiKeyValidationDTO {
  status: ApiKeyStatus;
  validated_at: string;
  message: string;
}

// Current API key status response
export interface ApiKeyStatusDTO {
  has_key: boolean;
  status: ApiKeyStatus;
  validated_at: string | null;
}

// Response after key deletion
export interface ApiKeyDeleteResponseDTO {
  message: string;
  credits_remaining: number;
  credits_reset_at: string;
}
```

### 5.2 New ViewModel Types (for `src/components/settings/types.ts`)

```typescript
/**
 * Validation result from API key validation attempt
 */
export interface ApiKeyValidationResult {
  success: boolean;
  status: ApiKeyStatus;
  message: string;
  validatedAt: string | null;
}

/**
 * Error state for API key operations
 */
export interface ApiKeyError {
  code: string;
  message: string;
}

/**
 * Form state for the API key input
 */
export interface ApiKeyFormState {
  value: string;
  showKey: boolean;
  isValidating: boolean;
}

/**
 * Complete state for the API key management section
 */
export interface ApiKeyManagementState {
  // Data state
  keyStatus: ApiKeyStatusDTO | null;

  // Form state
  inputValue: string;
  showKey: boolean;

  // Operation states
  isLoading: boolean;
  isValidating: boolean;
  isRemoving: boolean;

  // Result states
  validationResult: ApiKeyValidationResult | null;
  error: ApiKeyError | null;
}
```

## 6. State Management

### 6.1 Custom Hook: `useApiKeyManagement`

Create a custom hook at `src/components/hooks/useApiKeyManagement.ts` to manage all API key operations.

```typescript
interface UseApiKeyManagementReturn {
  // State
  keyStatus: ApiKeyStatusDTO | null;
  inputValue: string;
  showKey: boolean;
  isLoading: boolean;
  isValidating: boolean;
  isRemoving: boolean;
  validationResult: ApiKeyValidationResult | null;
  error: ApiKeyError | null;

  // Actions
  setInputValue: (value: string) => void;
  toggleShowKey: () => void;
  validateKey: () => Promise<void>;
  removeKey: () => Promise<void>;
  clearError: () => void;
  clearValidationResult: () => void;
}
```

**State flow:**

1. **On mount**: Fetch current key status via `GET /api/api-keys/status`
2. **On validate**:
   - Set `isValidating: true`
   - POST to `/api/api-keys` with key
   - On success: Update `keyStatus`, set `validationResult`, clear input
   - On error: Set `error` state
   - Set `isValidating: false`
3. **On remove**:
   - Set `isRemoving: true`
   - DELETE to `/api/api-keys`
   - On success: Update `keyStatus` to `{ has_key: false, status: "none" }`
   - On error: Set `error` state
   - Set `isRemoving: false`

### 6.2 Integration with Auth Store

After successful API key validation or removal, call `useAuthStore.refreshUsage()` to update the credit display in the header (will show "UNLIMITED" when key is valid).

## 7. API Integration

### 7.1 GET /api/api-keys/status

**Purpose**: Fetch current API key status on page load

**Request**:
```typescript
const response = await apiFetch("/api/api-keys/status");
```

**Response Type**: `ApiKeyStatusDTO`

```typescript
// Has key
{ has_key: true, status: "valid", validated_at: "2026-01-17T14:30:00Z" }

// No key
{ has_key: false, status: "none", validated_at: null }
```

**Error Handling**:
- 401: Redirect to `/auth`

---

### 7.2 POST /api/api-keys

**Purpose**: Validate and store a new API key

**Request**:
```typescript
const response = await apiFetch("/api/api-keys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ api_key: inputValue }),
});
```

**Request Type**: `ApiKeyCreateCommand`

**Response Type**: `ApiKeyValidationDTO`

```typescript
{ status: "valid", validated_at: "2026-01-17T14:30:00Z", message: "KEY VALID" }
```

**Error Handling**:
| Status | Code | Message | UI Action |
|--------|------|---------|-----------|
| 400 | `invalid_key_format` | INVALID API KEY FORMAT | Show in ValidationStatus (coral) |
| 401 | `unauthorized` | LOGIN REQUIRED | Redirect to `/auth` |
| 422 | `key_invalid` | KEY INVALID - CHECK YOUR KEY | Show in ValidationStatus (coral) |
| 422 | `key_quota_exhausted` | KEY QUOTA EXHAUSTED | Show in ValidationStatus (coral) |
| 500 | `validation_failed` | COULDN'T VALIDATE KEY. TRY AGAIN | Show in ValidationStatus (coral) |

---

### 7.3 DELETE /api/api-keys

**Purpose**: Remove stored API key

**Request**:
```typescript
const response = await apiFetch("/api/api-keys", {
  method: "DELETE",
});
```

**Response Type**: `ApiKeyDeleteResponseDTO`

```typescript
{ message: "API KEY REMOVED", credits_remaining: 3, credits_reset_at: "2026-01-20T00:00:00Z" }
```

**Error Handling**:
| Status | Code | Message | UI Action |
|--------|------|---------|-----------|
| 401 | `unauthorized` | LOGIN REQUIRED | Redirect to `/auth` |
| 404 | `no_key` | NO API KEY CONFIGURED | Show error (should not happen in normal flow) |

## 8. User Interactions

### 8.1 Page Load
1. Show loading state ("LOADING...")
2. Check authentication status via `/api/auth/session`
3. If not authenticated, redirect to `/auth`
4. Fetch API key status via `GET /api/api-keys/status`
5. Display current status and appropriate form/buttons

### 8.2 Enter API Key
1. User types in masked input field
2. Input updates local state
3. Validate button enables when input is non-empty

### 8.3 Toggle Key Visibility
1. User clicks eye icon button
2. Input type toggles between "password" and "text"
3. Icon changes (Eye ↔ EyeOff)

### 8.4 Validate API Key
1. User clicks "VALIDATE" button or presses Enter
2. Button shows spinning `@` animation
3. Form inputs become disabled
4. Request sent to `POST /api/api-keys`
5. On success:
   - Show "KEY VALID" in mint color
   - Update status badge to "VALID"
   - Clear input field
   - Refresh usage to show "UNLIMITED"
6. On error:
   - Show error message in coral color
   - Keep input value for correction
   - Re-enable form

### 8.5 Remove API Key
1. User clicks "REMOVE API KEY" button
2. Button shows loading state
3. Request sent to `DELETE /api/api-keys`
4. On success:
   - Show confirmation message
   - Update status badge to "NO KEY"
   - Show API key form again
   - Refresh usage to show credit count
5. On error:
   - Show error message
   - Keep current state

### 8.6 Navigate Back
1. User clicks SMELT logo or back arrow
2. Navigate to main page (`/`)

## 9. Conditions and Validation

### 9.1 Client-Side Validation

| Condition | Component | Effect |
|-----------|-----------|--------|
| Empty input | ApiKeyInput, ValidateButton | Validate button disabled |
| Invalid format (regex) | ApiKeyForm | Show format error before submission |
| Validating in progress | ApiKeyForm | All inputs disabled, button shows spinner |
| Removing in progress | RemoveKeyButton | Button disabled, shows loading |

### 9.2 Server-Side Validation (displayed in UI)

| Condition | API Error Code | UI Effect |
|-----------|----------------|-----------|
| Malformed key format | `invalid_key_format` | Coral ValidationStatus with message |
| Key rejected by OpenRouter | `key_invalid` | Coral ValidationStatus with message |
| Key has no quota | `key_quota_exhausted` | Coral ValidationStatus with message |
| Validation network error | `validation_failed` | Coral ValidationStatus with retry message |
| Not authenticated | `unauthorized` | Redirect to `/auth` |

### 9.3 State-Dependent UI

| State | UI Elements Shown |
|-------|-------------------|
| Loading | Centered "LOADING..." text |
| No key configured | Status badge "NO KEY", API key form |
| Key valid | Status badge "VALID" (mint), Remove button, validated date |
| Key invalid | Status badge "INVALID" (coral), API key form, Remove button |
| Validating | Form disabled, spinning button |
| Removing | Remove button disabled with loading |

## 10. Error Handling

### 10.1 Network Errors

```typescript
catch (error) {
  setError({
    code: "network_error",
    message: "NETWORK ERROR. CHECK YOUR CONNECTION AND TRY AGAIN",
  });
}
```

Display in ValidationStatus component with coral styling.

### 10.2 Authentication Errors

On 401 response from any endpoint:
```typescript
if (response.status === 401) {
  window.location.href = "/auth";
  return;
}
```

### 10.3 API Errors

Parse error response and display:
```typescript
const data = await response.json();
const error = data.error || {
  code: "unknown_error",
  message: "SOMETHING WENT WRONG. TRY AGAIN",
};
setError(error);
```

### 10.4 Error Recovery

- Errors are cleared when user starts typing a new value
- Errors are cleared when user clicks "clear" or navigates away
- User can retry validation after error without page refresh

## 11. Implementation Steps

### Step 1: Create Types File
Create `src/components/settings/types.ts` with ViewModel types.

### Step 2: Create Custom Hook
Create `src/components/hooks/useApiKeyManagement.ts` with:
- State management for all API key operations
- API calls using `apiFetch`
- Error handling logic
- Integration with auth store for usage refresh

### Step 3: Create UI Components
Create components in `src/components/settings/`:

1. `ApiKeyStatusBadge.tsx` - Status indicator
2. `ApiKeyInput.tsx` - Masked input with toggle
3. `ValidateButton.tsx` - Submit button with spinner
4. `ValidationStatus.tsx` - Result feedback display
5. `RemoveKeyButton.tsx` - Delete key button
6. `ApiKeyForm.tsx` - Form wrapper combining input and button
7. `ApiKeySection.tsx` - Main section with all components
8. `SettingsHeader.tsx` - Header with back navigation
9. `SettingsIsland.tsx` - Root React island component
10. `index.ts` - Component exports

### Step 4: Create Astro Page
Create `src/pages/settings.astro`:
```astro
---
import Layout from "../layouts/Layout.astro";
import { SettingsIsland } from "../components/settings";
export const prerender = false;
---

<Layout title="SMELT - Settings">
  <SettingsIsland client:load />
</Layout>
```

### Step 5: Add Spinning Animation
Add CSS animation for the spinning `@` symbol in global.css or component:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
```

### Step 6: Testing Checklist

1. **Authentication Flow**
   - [ ] Unauthenticated users redirected to `/auth`
   - [ ] Authenticated users see settings page

2. **No Key State**
   - [ ] Shows "NO KEY" badge
   - [ ] API key form is visible
   - [ ] Remove button is hidden

3. **Add Key Flow**
   - [ ] Empty input disables validate button
   - [ ] Invalid format shows error
   - [ ] Validation shows spinner
   - [ ] Success shows "KEY VALID" in mint
   - [ ] Status updates to "VALID"
   - [ ] Header shows "UNLIMITED"

4. **Remove Key Flow**
   - [ ] Button shows loading state
   - [ ] Success shows confirmation
   - [ ] Status updates to "NO KEY"
   - [ ] Header shows credit count

5. **Error Handling**
   - [ ] Network errors display correctly
   - [ ] Invalid key errors display correctly
   - [ ] Errors clear on new input

6. **Accessibility**
   - [ ] Keyboard navigation works
   - [ ] Focus states visible
   - [ ] Screen reader announces status changes

### Step 7: Integration Testing
- Test with real OpenRouter API keys (valid and invalid)
- Test key removal and re-addition
- Verify credit display updates in header
- Test on mobile viewport

## 12. Neobrutalism Component Library

This section details which components from [neobrutalism.dev](https://www.neobrutalism.dev/docs) should be used and how to install/integrate them.

### 12.1 Required Components

| Component | Purpose in Settings View | Already Installed? |
|-----------|-------------------------|-------------------|
| **Card** | Main container for API key section | Yes |
| **Input** | API key text input field | Yes |
| **Button** | Validate and Remove buttons | Yes |
| **Badge** | Status indicator (NO KEY, VALID, INVALID) | **No - Install** |
| **Label** | Form field labels | **No - Install** |
| **Alert** | Validation feedback display | **No - Install** |
| **Sonner** | Toast notifications for success/error | **No - Install** |
| **Tooltip** | Help text for API key input | **No - Install** |

### 12.2 Installation Commands

Run these commands to install the missing components:

```bash
# Install Badge component
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/badge.json

# Install Label component
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/label.json

# Install Alert component
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/alert.json

# Install Sonner (Toast) component
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/sonner.json

# Install Tooltip component
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/tooltip.json
```

Or install all at once:
```bash
pnpm dlx shadcn@latest add https://neobrutalism.dev/r/badge.json https://neobrutalism.dev/r/label.json https://neobrutalism.dev/r/alert.json https://neobrutalism.dev/r/sonner.json https://neobrutalism.dev/r/tooltip.json
```

### 12.3 Component Usage Examples

#### 12.3.1 Card - API Key Section Container

Use the Card component to wrap the entire API key management section:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ApiKeySection() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>API KEY</CardTitle>
        <CardDescription>
          ADD YOUR OPENROUTER API KEY FOR UNLIMITED PROCESSING
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Form and status components */}
      </CardContent>
    </Card>
  );
}
```

#### 12.3.2 Badge - Status Indicator

Use the Badge component for the API key status display:

```tsx
import { Badge } from "@/components/ui/badge";
import { CheckIcon, XIcon, KeyIcon } from "lucide-react";

interface ApiKeyStatusBadgeProps {
  status: "none" | "valid" | "invalid";
}

export function ApiKeyStatusBadge({ status }: ApiKeyStatusBadgeProps) {
  if (status === "none") {
    return (
      <Badge variant="neutral">
        <KeyIcon className="w-3 h-3" />
        NO KEY
      </Badge>
    );
  }

  if (status === "valid") {
    return (
      <Badge className="bg-neo-mint text-foreground border-border">
        <CheckIcon className="w-3 h-3" />
        VALID
      </Badge>
    );
  }

  return (
    <Badge className="bg-neo-coral text-background border-border">
      <XIcon className="w-3 h-3" />
      INVALID
    </Badge>
  );
}
```

#### 12.3.3 Input with Label - API Key Form

Use Input and Label together for the API key entry:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function ApiKeyInput({ value, onChange, disabled, hasError }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="grid gap-2">
      <Label htmlFor="api-key">OPENROUTER API KEY</Label>
      <div className="flex gap-2">
        <Input
          id="api-key"
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-or-v1-..."
          disabled={disabled}
          className={hasError ? "border-neo-coral" : ""}
        />
        <Button
          type="button"
          variant="neutral"
          size="icon"
          onClick={() => setShowKey(!showKey)}
          disabled={disabled}
          aria-label={showKey ? "Hide API key" : "Show API key"}
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
```

#### 12.3.4 Alert - Validation Feedback

Use the Alert component for displaying validation results:

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, AlertCircleIcon } from "lucide-react";

interface ValidationStatusProps {
  result: { success: boolean; message: string } | null;
  error: { message: string } | null;
}

export function ValidationStatus({ result, error }: ValidationStatusProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon className="w-4 h-4" />
        <AlertTitle>ERROR</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (result?.success) {
    return (
      <Alert className="bg-neo-mint border-border">
        <CheckCircle2Icon className="w-4 h-4" />
        <AlertTitle>SUCCESS</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  }

  return null;
}
```

#### 12.3.5 Button Variants

Use different button variants for different actions:

```tsx
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

// Validate button (default variant with loading state)
<Button type="submit" disabled={isValidating || !inputValue}>
  {isValidating ? (
    <>
      <span className="animate-spin">@</span>
      TESTING...
    </>
  ) : (
    "VALIDATE"
  )}
</Button>

// Remove button (destructive action)
<Button
  variant="destructive"
  onClick={onRemove}
  disabled={isRemoving}
>
  {isRemoving ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <Trash2 className="w-4 h-4" />
  )}
  REMOVE API KEY
</Button>

// Neutral variant for secondary actions
<Button variant="neutral" asChild>
  <a href="/">BACK TO HOME</a>
</Button>
```

#### 12.3.6 Sonner - Toast Notifications

Set up the Toaster provider and use toast for notifications:

**1. Add Toaster to Layout (in `src/layouts/Layout.astro` or root component):**

```tsx
import { Toaster } from "@/components/ui/sonner";

// In your layout/root component
<Toaster />
```

**2. Use toast in the hook for success/error feedback:**

```tsx
import { toast } from "sonner";

// In useApiKeyManagement hook
const validateKey = async () => {
  setIsValidating(true);
  try {
    const response = await apiFetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: inputValue }),
    });

    if (response.ok) {
      const data = await response.json();
      setKeyStatus({ has_key: true, status: "valid", validated_at: data.validated_at });
      setInputValue("");
      toast.success("KEY VALID", {
        description: "YOUR API KEY HAS BEEN SAVED. YOU NOW HAVE UNLIMITED PROCESSING.",
      });
    } else {
      const error = await response.json();
      toast.error(error.error?.message || "VALIDATION FAILED");
      setError(error.error);
    }
  } catch {
    toast.error("NETWORK ERROR. TRY AGAIN.");
  } finally {
    setIsValidating(false);
  }
};

const removeKey = async () => {
  setIsRemoving(true);
  try {
    const response = await apiFetch("/api/api-keys", { method: "DELETE" });
    if (response.ok) {
      setKeyStatus({ has_key: false, status: "none", validated_at: null });
      toast.success("API KEY REMOVED", {
        description: "YOU ARE NOW ON THE FREE TIER.",
      });
    }
  } catch {
    toast.error("COULDN'T REMOVE KEY. TRY AGAIN.");
  } finally {
    setIsRemoving(false);
  }
};
```

#### 12.3.7 Tooltip - Help Text

Use Tooltip to provide help information about the API key:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="p-1">
        <HelpCircle className="w-4 h-4 text-foreground/60" />
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>GET YOUR API KEY FROM OPENROUTER.AI</p>
      <p className="text-xs text-foreground/60">KEYS START WITH sk-or-v1-</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 12.4 Complete ApiKeySection Example

Here's how all components come together:

```tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff, Trash2, CheckCircle2, AlertCircle, HelpCircle, Key } from "lucide-react";
import { useApiKeyManagement } from "@/components/hooks/useApiKeyManagement";

export function ApiKeySection() {
  const {
    keyStatus,
    inputValue,
    showKey,
    isValidating,
    isRemoving,
    error,
    setInputValue,
    toggleShowKey,
    validateKey,
    removeKey,
  } = useApiKeyManagement();

  const [showInput, setShowInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateKey();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>API KEY</CardTitle>
          {keyStatus && (
            <Badge
              variant={keyStatus.status === "none" ? "neutral" : undefined}
              className={
                keyStatus.status === "valid"
                  ? "bg-neo-mint text-foreground"
                  : keyStatus.status === "invalid"
                  ? "bg-neo-coral text-background"
                  : ""
              }
            >
              {keyStatus.status === "none" && <Key className="w-3 h-3 mr-1" />}
              {keyStatus.status === "valid" && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {keyStatus.status === "invalid" && <AlertCircle className="w-3 h-3 mr-1" />}
              {keyStatus.status.toUpperCase()}
            </Badge>
          )}
        </div>
        <CardDescription>
          ADD YOUR OPENROUTER API KEY FOR UNLIMITED PROCESSING
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Show form when no key or user wants to add new key */}
        {(!keyStatus?.has_key || showInput) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="api-key">OPENROUTER API KEY</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="p-1">
                        <HelpCircle className="w-4 h-4 text-foreground/60" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>GET YOUR KEY FROM OPENROUTER.AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="sk-or-v1-..."
                  disabled={isValidating}
                  className={error ? "border-neo-coral" : ""}
                />
                <Button
                  type="button"
                  variant="neutral"
                  size="icon"
                  onClick={toggleShowKey}
                  disabled={isValidating}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isValidating || !inputValue}>
              {isValidating ? (
                <>
                  <span className="animate-spin inline-block">@</span>
                  TESTING...
                </>
              ) : (
                "VALIDATE"
              )}
            </Button>
          </form>
        )}

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>ERROR</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Success state with remove option */}
        {keyStatus?.has_key && keyStatus.status === "valid" && !showInput && (
          <div className="space-y-4">
            <Alert className="bg-neo-mint border-border">
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>UNLIMITED ACCESS</AlertTitle>
              <AlertDescription>
                YOUR API KEY IS ACTIVE. VALIDATED{" "}
                {keyStatus.validated_at
                  ? new Date(keyStatus.validated_at).toLocaleDateString()
                  : "RECENTLY"}
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              className="w-full"
              onClick={removeKey}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <span className="animate-spin inline-block">@</span>
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              REMOVE API KEY
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 12.5 Styling Notes

The neobrutalism components use these CSS variables from your `global.css`:

| Variable | Usage |
|----------|-------|
| `--neo-mint` | Success states (valid key) |
| `--neo-coral` | Error states, destructive actions |
| `--border` | Thick 2px borders |
| `--shadow` | Box shadows for depth |
| `--background` | Card and input backgrounds |
| `--foreground` | Text color |

For custom styling overrides on neobrutalism components, use Tailwind classes:

```tsx
// Mint success badge
<Badge className="bg-neo-mint text-foreground border-border">

// Coral error state
<Input className="border-neo-coral" />

// Custom alert background
<Alert className="bg-neo-mint border-border">
```
