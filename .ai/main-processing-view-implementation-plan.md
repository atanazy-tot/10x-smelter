# View Implementation Plan: Main Processing Page

## 1. Overview

The Main Processing Page is the core single-page application view for SMELT. It allows users to upload audio files (MP3, WAV, M4A) or paste text, select processing prompts, and receive clean Markdown output. The view supports both anonymous users (1 smelt/day) and authenticated users (5 smelts/week or unlimited with API key).

Key features:

- Drag-and-drop file upload with real-time validation
- Text input as an alternative to audio files
- Predefined prompt selection (5 options)
- Custom prompt selection for logged-in users via sidebar
- Combine mode for multiple files (logged-in only)
- Real-time progress tracking via Supabase Realtime
- Results display with copy and download functionality
- Neobrutalist design aesthetic with bold colors and hard shadows

---

## 2. View Routing

| Attribute         | Value                                   |
| ----------------- | --------------------------------------- |
| **Path**          | `/`                                     |
| **File**          | `src/pages/index.astro`                 |
| **Rendering**     | Hybrid (Astro shell with React islands) |
| **Auth Required** | No (anonymous access with limits)       |

---

## 3. Component Structure

```
src/pages/index.astro
├── Layout (Astro)
│   ├── Header (React island)
│   │   ├── Logo
│   │   ├── CreditDisplay
│   │   ├── AuthButton
│   │   └── PromptsToggle (logged-in only)
│   │
│   ├── MainProcessingView (React island - client:load)
│   │   ├── InputSection
│   │   │   ├── DropZone
│   │   │   │   └── FileList
│   │   │   │       └── FileItem (×n)
│   │   │   ├── InputDivider
│   │   │   └── TextZone
│   │   │
│   │   ├── ControlSection
│   │   │   ├── CombineModeToggle
│   │   │   ├── PredefinedPromptSelector
│   │   │   │   └── PromptButton (×5)
│   │   │   └── ProcessButton
│   │   │
│   │   ├── ProgressSection
│   │   │   └── ProgressBar
│   │   │       └── ProgressBlock (×10)
│   │   │
│   │   └── ResultsSection
│   │       ├── ResultsView
│   │       │   └── ResultItem (×n)
│   │       └── ErrorDisplay
│   │
│   └── PromptSidebar (React island - logged-in only)
│       ├── SectionAccordion (×n)
│       │   └── PromptItem (×n)
│       └── CreatePromptButton
│
└── Footer (Astro)
```

---

## 4. Component Details

### 4.1 Header

**Description:** Application header displaying the SMELT logo, credit status, authentication state, and navigation controls. Shows different content based on authentication status.

**Main Elements:**

- `<header>` container with neobrutalist border styling
- Logo text/image linking to `/`
- `CreditDisplay` component showing usage status
- `AuthButton` for login/logout
- `PromptsToggle` button (logged-in only) to open sidebar

**Handled Interactions:**

- Click on logo → Navigate to `/`
- Click on auth button → Navigate to `/auth` or trigger logout
- Click on prompts toggle → Toggle sidebar visibility

**Handled Validation:** None

**Types:**

- `UsageDTO` (for credit display)
- `SessionDTO` (for auth state)

**Props:**

```typescript
interface HeaderProps {
  user: AuthUserDTO | null;
  usage: UsageDTO | null;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}
```

---

### 4.2 CreditDisplay

**Description:** Shows the current usage status with color-coded indication. Displays different formats for anonymous, authenticated, and unlimited users.

**Main Elements:**

- `<div>` container with badge styling
- Text showing credit status (e.g., "1/1 DAILY SMELT", "3/5 LEFT THIS WEEK", "UNLIMITED")
- Color coding: lime for available, coral for exhausted

**Handled Interactions:** None (display only)

**Handled Validation:** None

**Types:**

- `UsageDTO` (union of `UsageAnonymousDTO | UsageAuthenticatedDTO | UsageUnlimitedDTO`)

**Props:**

```typescript
interface CreditDisplayProps {
  usage: UsageDTO | null;
  isLoading?: boolean;
}
```

---

### 4.3 DropZone

**Description:** Drag-and-drop area for uploading audio files. Accepts MP3, WAV, and M4A files up to 25MB each. Shows file list with validation errors.

**Main Elements:**

- `<div>` with drag-and-drop handlers and dashed border
- Hidden `<input type="file">` for click-to-browse
- Icon and instructional text
- `FileList` component for selected files

**Handled Interactions:**

- Drag files over → Visual feedback (border color change)
- Drop files → Validate and add to state
- Click zone → Open file picker
- Remove file button → Remove from state

**Handled Validation:**

- File format: Only `.mp3`, `.wav`, `.m4a` extensions or valid audio MIME types
- File size: Maximum 25MB per file
- File count: Maximum 5 files total
- Display inline error messages for validation failures

**Types:**

- `SelectedFile` (custom ViewModel)
- `FileValidationError` (custom ViewModel)

**Props:**

```typescript
interface DropZoneProps {
  files: SelectedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  disabled?: boolean;
  maxFiles?: number;
}
```

---

### 4.4 FileList

**Description:** Displays the list of selected files with their names, sizes, and validation status. Allows individual file removal.

**Main Elements:**

- `<ul>` container with list items
- `FileItem` component for each file

**Handled Interactions:**

- Click remove button on FileItem → Call `onFileRemove`

**Handled Validation:** None (delegated to DropZone)

**Types:**

- `SelectedFile` (custom ViewModel)

**Props:**

```typescript
interface FileListProps {
  files: SelectedFile[];
  onFileRemove: (fileId: string) => void;
}
```

---

### 4.5 FileItem

**Description:** Individual file display showing filename, size, and error status. Has a remove button.

**Main Elements:**

- `<li>` container with border
- File icon
- Filename and size text
- Error message (if validation failed)
- Remove button (X icon)

**Handled Interactions:**

- Click remove button → Call `onRemove`

**Handled Validation:** None (displays passed error)

**Types:**

- `SelectedFile` (custom ViewModel)

**Props:**

```typescript
interface FileItemProps {
  file: SelectedFile;
  onRemove: () => void;
}
```

---

### 4.6 InputDivider

**Description:** Visual divider between DropZone and TextZone. Shows "OR" when inputs are mutually exclusive, "AND" when both have content (mixed mode for logged-in users).

**Main Elements:**

- `<div>` with horizontal lines and centered text badge
- Text: "OR" or "AND"

**Handled Interactions:** None (display only)

**Handled Validation:** None

**Types:** None

**Props:**

```typescript
interface InputDividerProps {
  mode: "or" | "and";
}
```

---

### 4.7 TextZone

**Description:** Text input area for pasting or typing content directly. Alternative to audio file upload.

**Main Elements:**

- `<textarea>` with neobrutalist styling
- Placeholder text
- Optional character counter

**Handled Interactions:**

- Type/paste text → Update state, clear files (if not logged in)
- Focus → Visual feedback

**Handled Validation:**

- Maximum 50,000 characters (as per schema)

**Types:** None

**Props:**

```typescript
interface TextZoneProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
}
```

---

### 4.8 CombineModeToggle

**Description:** Toggle between SEPARATE and COMBINE processing modes. Only visible when 2+ files are uploaded and user is logged in.

**Main Elements:**

- `<div>` container with two toggle buttons
- [SEPARATE] button - processes each file individually
- [COMBINE] button - combines all files into single output

**Handled Interactions:**

- Click SEPARATE → Set mode to 'separate'
- Click COMBINE → Set mode to 'combine'

**Handled Validation:**

- Only enabled when user is authenticated
- Only visible when 2+ files are selected

**Types:**

- `SmeltMode` ('separate' | 'combine')

**Props:**

```typescript
interface CombineModeToggleProps {
  mode: SmeltMode;
  onModeChange: (mode: SmeltMode) => void;
  disabled?: boolean;
  visible?: boolean;
}
```

---

### 4.9 PredefinedPromptSelector

**Description:** Horizontal row of 5 predefined prompt buttons. Available to all users.

**Main Elements:**

- `<div>` flex container
- 5 `PromptButton` components for each predefined prompt

**Handled Interactions:**

- Click prompt button → Select that prompt

**Handled Validation:** None

**Types:**

- `DefaultPromptName` enum

**Props:**

```typescript
interface PredefinedPromptSelectorProps {
  selectedPrompt: DefaultPromptName | null;
  onSelect: (prompt: DefaultPromptName) => void;
  disabled?: boolean;
}
```

---

### 4.10 PromptButton

**Description:** Individual predefined prompt button with label and selection state.

**Main Elements:**

- `<button>` with neobrutalist styling
- Prompt name text (uppercase)
- Visual selection indicator (background color change)

**Handled Interactions:**

- Click → Call `onSelect`

**Handled Validation:** None

**Types:**

- `DefaultPromptName` enum

**Props:**

```typescript
interface PromptButtonProps {
  prompt: DefaultPromptName;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}
```

---

### 4.11 ProcessButton

**Description:** Main call-to-action button "SMELT IT" to initiate processing. Disabled when inputs are invalid or user cannot process.

**Main Elements:**

- `<button>` with prominent neobrutalist styling
- Text: "SMELT IT"
- Loading state with spinning @ character

**Handled Interactions:**

- Click → Initiate processing (if valid)

**Handled Validation:**

- At least one input required (files or text)
- Prompt must be selected
- User must have processing capability (`can_process` from usage)
- Not already processing

**Types:** None

**Props:**

```typescript
interface ProcessButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}
```

---

### 4.12 ProgressBar

**Description:** 10-block visual progress bar showing processing stages with percentage and status message.

**Main Elements:**

- `<div>` container with 10 `ProgressBlock` children
- Stage label text (validating, decoding, transcribing, synthesizing)
- Percentage text
- Status message

**Handled Interactions:** None (display only, updates via real-time subscription)

**Handled Validation:** None

**Types:**

- `SmeltProgressDTO`
- `SmeltStatus`

**Props:**

```typescript
interface ProgressBarProps {
  progress: SmeltProgressDTO | null;
  isVisible: boolean;
}
```

---

### 4.13 ProgressBlock

**Description:** Individual block in the progress bar. Changes color based on fill state and current stage.

**Main Elements:**

- `<div>` with border and conditional fill

**Handled Interactions:** None

**Handled Validation:** None

**Types:** None

**Props:**

```typescript
interface ProgressBlockProps {
  filled: boolean;
  stage: SmeltStatus;
}
```

---

### 4.14 ResultsView

**Description:** Display area for processed results. Black background with lime text (neobrutalist style). Shows markdown content with copy and download actions.

**Main Elements:**

- `<div>` container with black background
- Scrollable content area with lime text
- Copy to clipboard button
- Download as .md button
- Multiple `ResultItem` components for separate mode

**Handled Interactions:**

- Click copy button → Copy content to clipboard, show confirmation
- Click download button → Download as .md file

**Handled Validation:** None

**Types:**

- `SmeltResultDTO[]`

**Props:**

```typescript
interface ResultsViewProps {
  results: SmeltResultDTO[];
  isVisible: boolean;
  onCopy: (content: string) => void;
  onDownload: (result: SmeltResultDTO) => void;
}
```

---

### 4.15 ResultItem

**Description:** Individual result display for one processed file. Shows filename header and markdown content.

**Main Elements:**

- Filename header
- Markdown content area
- Individual copy/download buttons

**Handled Interactions:**

- Click copy → Copy this result's content
- Click download → Download this result as .md

**Handled Validation:** None

**Types:**

- `SmeltResultDTO`

**Props:**

```typescript
interface ResultItemProps {
  result: SmeltResultDTO;
  onCopy: () => void;
  onDownload: () => void;
}
```

---

### 4.16 ErrorDisplay

**Description:** Error message display with coral background. Shows contextual error messages with CTAs (sign up, add API key, retry).

**Main Elements:**

- `<div>` container with coral background
- Error message text (uppercase, bold)
- CTA button(s) based on error type

**Handled Interactions:**

- Click CTA button → Navigate to auth/settings or retry processing

**Handled Validation:** None

**Types:**

- `SmeltErrorState` (custom ViewModel)

**Props:**

```typescript
interface ErrorDisplayProps {
  error: SmeltErrorState | null;
  onRetry?: () => void;
  onNavigate?: (path: string) => void;
}
```

---

### 4.17 PromptSidebar

**Description:** Collapsible sidebar for custom prompt management. Only visible for logged-in users. Contains sections with accordions and prompt items.

**Main Elements:**

- `<aside>` container with slide-in animation
- Close button
- "NEW PROMPT" button
- List of `SectionAccordion` components
- Unsectioned prompts list

**Handled Interactions:**

- Click close → Hide sidebar
- Click "NEW PROMPT" → Open prompt editor
- Click prompt item → Select that prompt

**Handled Validation:** None

**Types:**

- `PromptDTO[]`
- `PromptSectionWithCountDTO[]`

**Props:**

```typescript
interface PromptSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptDTO[];
  sections: PromptSectionWithCountDTO[];
  selectedPromptId: string | null;
  onSelectPrompt: (promptId: string) => void;
  onCreatePrompt: () => void;
}
```

---

### 4.18 SectionAccordion

**Description:** Collapsible section in the prompt sidebar. Shows section name and expands to reveal prompts.

**Main Elements:**

- `<div>` with accordion trigger button
- Section title with expand/collapse icon
- Collapsible content with `PromptItem` list

**Handled Interactions:**

- Click header → Toggle expand/collapse

**Handled Validation:** None

**Types:**

- `PromptSectionWithCountDTO`
- `PromptDTO[]`

**Props:**

```typescript
interface SectionAccordionProps {
  section: PromptSectionWithCountDTO;
  prompts: PromptDTO[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedPromptId: string | null;
  onSelectPrompt: (promptId: string) => void;
}
```

---

### 4.19 PromptItem

**Description:** Individual prompt in the sidebar. Shows prompt title with selection indicator.

**Main Elements:**

- `<button>` with prompt title
- Selection indicator (background highlight)

**Handled Interactions:**

- Click → Select this prompt

**Handled Validation:** None

**Types:**

- `PromptDTO`

**Props:**

```typescript
interface PromptItemProps {
  prompt: PromptDTO;
  isSelected: boolean;
  onSelect: () => void;
}
```

---

### 4.20 MainProcessingView

**Description:** Main React island component containing all processing logic and UI. Orchestrates state management and API interactions.

**Main Elements:**

- Container `<main>` with all child components
- `InputSection`, `ControlSection`, `ProgressSection`, `ResultsSection`

**Handled Interactions:**

- All child component interactions delegated through callbacks

**Handled Validation:**

- Orchestrates all validation state
- Determines if processing can proceed

**Types:**

- All DTOs and ViewModels

**Props:**

```typescript
interface MainProcessingViewProps {
  initialUser: AuthUserDTO | null;
  initialUsage: UsageDTO | null;
}
```

---

## 5. Types

### 5.1 Existing Types (from `src/types.ts`)

```typescript
// Auth
type AuthUserDTO = { id: string; email: string };

// Usage
type UsageAnonymousDTO = {
  type: "anonymous";
  smelts_used_today: number;
  daily_limit: number;
  can_process: boolean;
  resets_at: string;
};

type UsageAuthenticatedDTO = {
  type: "authenticated";
  credits_remaining: number;
  weekly_credits_max: number;
  can_process: boolean;
  resets_at: string;
  days_until_reset: number;
  message?: string;
};

type UsageUnlimitedDTO = {
  type: "unlimited";
  api_key_status: ApiKeyStatus;
  can_process: boolean;
};

type UsageDTO = UsageAnonymousDTO | UsageAuthenticatedDTO | UsageUnlimitedDTO;

// Smelt Creation
type SmeltCreateCommand = {
  text?: string;
  mode: SmeltMode;
  default_prompt_names?: DefaultPromptName[];
  user_prompt_id?: string | null;
};

type SmeltCreateResponseDTO = {
  id: string;
  status: SmeltStatus;
  mode: SmeltMode;
  files: SmeltFileDTO[];
  default_prompt_names: DefaultPromptName[];
  user_prompt_id: string | null;
  created_at: string;
  subscription_channel: string;
};

// Smelt Progress
type SmeltProgressDTO = {
  percentage: number;
  stage: SmeltStatus;
  message: string;
};

type SmeltFileProgressDTO = {
  id: string;
  status: SmeltFileStatus;
  progress: number;
};

// Smelt Results
type SmeltResultDTO = {
  file_id: string;
  filename: string;
  content: string;
};

// Real-time Events
type SmeltProgressEventPayloadDTO = {
  smelt_id: string;
  status: SmeltStatus;
  progress: SmeltProgressDTO;
  files: SmeltFileProgressDTO[];
};

type SmeltCompletedEventPayloadDTO = {
  smelt_id: string;
  status: "completed";
  results: SmeltResultDTO[];
};

type SmeltFailedEventPayloadDTO = {
  smelt_id: string;
  status: "failed";
  error_code: SmeltErrorCode;
  error_message: string;
};

// Enums
type SmeltMode = "separate" | "combine";
type SmeltStatus = "pending" | "validating" | "decoding" | "transcribing" | "synthesizing" | "completed" | "failed";
type DefaultPromptName = "summarize" | "action_items" | "detailed_notes" | "qa_format" | "table_of_contents";
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

// Prompts
type PromptDTO = {
  id: string;
  title: string;
  body: string;
  section_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type PromptSectionWithCountDTO = {
  id: string;
  title: string;
  position: number;
  prompt_count: number;
  created_at: string;
  updated_at: string;
};
```

### 5.2 New ViewModel Types (to create in `src/components/main/types.ts`)

```typescript
/**
 * Represents a file selected for upload with validation state.
 */
interface SelectedFile {
  /** Unique identifier for this file selection */
  id: string;
  /** The actual File object */
  file: File;
  /** File name for display */
  name: string;
  /** File size in bytes */
  size: number;
  /** Validation error if file is invalid */
  error?: FileValidationError;
}

/**
 * File validation error with code and message.
 */
interface FileValidationError {
  /** Error code matching API error codes */
  code: "file_too_large" | "invalid_format";
  /** Human-readable error message */
  message: string;
}

/**
 * Error state for smelt operations.
 */
interface SmeltErrorState {
  /** Error code from API */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Type of CTA to show */
  ctaType?: "signup" | "apikey" | "retry";
}

/**
 * Prompt selection state.
 */
interface PromptSelection {
  /** Type of prompt selected */
  type: "predefined" | "custom";
  /** For predefined: the prompt name, for custom: the prompt ID */
  value: DefaultPromptName | string;
}

/**
 * Processing state for the main view.
 */
interface ProcessingState {
  /** Current smelt ID if processing */
  smeltId: string | null;
  /** Current processing status */
  status: SmeltStatus | null;
  /** Progress information */
  progress: SmeltProgressDTO | null;
  /** Individual file progress */
  fileProgress: SmeltFileProgressDTO[];
  /** Processing results */
  results: SmeltResultDTO[];
  /** Error state if failed */
  error: SmeltErrorState | null;
  /** Whether currently processing */
  isProcessing: boolean;
}
```

### 5.3 Constants

```typescript
// File validation constants (from schema)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES = 5;
const MAX_TEXT_LENGTH = 50000;
const VALID_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a"];
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

// Predefined prompt display names
const PREDEFINED_PROMPTS: Record<DefaultPromptName, string> = {
  summarize: "SUMMARIZE",
  action_items: "ACTION ITEMS",
  detailed_notes: "DETAILED NOTES",
  qa_format: "Q&A FORMAT",
  table_of_contents: "TOC",
};
```

---

## 6. State Management

### 6.1 Zustand Store Structure

Create a Zustand store in `src/store/processing-store.ts`:

```typescript
import { create } from "zustand";

interface ProcessingStore {
  // Input state
  files: SelectedFile[];
  text: string;
  mode: SmeltMode;

  // Prompt selection
  selectedPrompt: PromptSelection | null;

  // Processing state
  smeltId: string | null;
  status: SmeltStatus | null;
  progress: SmeltProgressDTO | null;
  fileProgress: SmeltFileProgressDTO[];
  results: SmeltResultDTO[];
  error: SmeltErrorState | null;
  isProcessing: boolean;

  // UI state
  sidebarOpen: boolean;

  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  setText: (text: string) => void;
  setMode: (mode: SmeltMode) => void;
  selectPredefinedPrompt: (name: DefaultPromptName) => void;
  selectCustomPrompt: (id: string) => void;
  clearPromptSelection: () => void;

  // Processing actions
  startProcessing: (smeltId: string) => void;
  updateProgress: (payload: SmeltProgressEventPayloadDTO) => void;
  setCompleted: (payload: SmeltCompletedEventPayloadDTO) => void;
  setFailed: (payload: SmeltFailedEventPayloadDTO) => void;

  // UI actions
  toggleSidebar: () => void;
  reset: () => void;
}
```

### 6.2 Custom Hooks

#### `useFileValidation` Hook

Location: `src/components/hooks/useFileValidation.ts`

```typescript
/**
 * Validates files client-side before upload.
 * Returns validation results for each file.
 */
function useFileValidation() {
  const validateFile = (file: File): FileValidationError | null => {
    // Check file format
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeValid = VALID_AUDIO_TYPES.includes(file.type.toLowerCase());
    const extValid = VALID_AUDIO_EXTENSIONS.includes(ext);

    if (!mimeValid && !extValid) {
      return {
        code: "invalid_format",
        message: "CAN'T READ THAT. TRY .MP3 .WAV .M4A",
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        code: "file_too_large",
        message: `FILE TOO CHUNKY. MAX 25MB. YOUR FILE: ${sizeMB}MB`,
      };
    }

    return null;
  };

  return { validateFile };
}
```

#### `useSmeltProcessing` Hook

Location: `src/components/hooks/useSmeltProcessing.ts`

```typescript
/**
 * Handles smelt creation and real-time progress subscription.
 * Manages the full processing lifecycle.
 */
function useSmeltProcessing(supabase: SupabaseClient) {
  const store = useProcessingStore();
  const subscriptionRef = useRef<SmeltSubscriptionHandle | null>(null);

  const createSmelt = async (formData: FormData): Promise<SmeltCreateResponseDTO> => {
    const response = await fetch("/api/smelts", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  const subscribeToProgress = (smeltId: string) => {
    subscriptionRef.current = subscribeWithRetry(supabase, smeltId, {
      onProgress: store.updateProgress,
      onCompleted: store.setCompleted,
      onFailed: store.setFailed,
      onError: (error) => {
        store.setFailed({
          smelt_id: smeltId,
          status: "failed",
          error_code: "connection_lost",
          error_message: "CONNECTION LOST. TRY AGAIN",
        });
      },
    });
  };

  const startProcessing = async () => {
    // Build FormData
    const formData = new FormData();

    // Add files
    store.files.forEach((f) => {
      if (!f.error) {
        formData.append("files[]", f.file);
      }
    });

    // Add text
    if (store.text.trim()) {
      formData.append("text", store.text);
    }

    // Add mode
    formData.append("mode", store.mode);

    // Add prompt selection
    if (store.selectedPrompt) {
      if (store.selectedPrompt.type === "predefined") {
        formData.append("default_prompt_names[]", store.selectedPrompt.value);
      } else {
        formData.append("user_prompt_id", store.selectedPrompt.value);
      }
    }

    try {
      const response = await createSmelt(formData);
      store.startProcessing(response.id);
      subscribeToProgress(response.id);
    } catch (error) {
      store.setFailed({
        smelt_id: "",
        status: "failed",
        error_code: "internal_error",
        error_message: error.message,
      });
    }
  };

  const cleanup = () => {
    subscriptionRef.current?.unsubscribe();
  };

  useEffect(() => cleanup, []);

  return { startProcessing, cleanup };
}
```

#### `useUsage` Hook

Location: `src/components/hooks/useUsage.ts`

```typescript
/**
 * Fetches and manages usage/credit information.
 */
function useUsage() {
  const [usage, setUsage] = useState<UsageDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  return { usage, isLoading, refetch: fetchUsage };
}
```

---

## 7. API Integration

### 7.1 Create Smelt

**Endpoint:** `POST /api/smelts`

**Request:**

- Content-Type: `multipart/form-data`
- Body fields:
  - `files[]`: Audio files (File objects)
  - `text`: Text input (string, optional)
  - `mode`: Processing mode ('separate' | 'combine')
  - `default_prompt_names[]`: Predefined prompts (string array, optional)
  - `user_prompt_id`: Custom prompt UUID (string, optional)

**Response Type:** `SmeltCreateResponseDTO`

```typescript
const createSmelt = async (formData: FormData): Promise<SmeltCreateResponseDTO> => {
  const response = await fetch("/api/smelts", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.code, error.message);
  }

  return response.json();
};
```

### 7.2 Get Usage

**Endpoint:** `GET /api/usage`

**Response Type:** `UsageDTO`

```typescript
const getUsage = async (): Promise<UsageDTO> => {
  const response = await fetch("/api/usage");

  if (!response.ok) {
    throw new Error("Failed to fetch usage");
  }

  return response.json();
};
```

### 7.3 Get Smelt Status (Fallback)

**Endpoint:** `GET /api/smelts/:id`

**Response Type:** `SmeltDTO`

```typescript
const getSmeltStatus = async (smeltId: string): Promise<SmeltDTO> => {
  const response = await fetch(`/api/smelts/${smeltId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch smelt status");
  }

  return response.json();
};
```

### 7.4 Real-time Subscription

**Channel:** `smelt:{smeltId}`

**Events:**

- `progress`: `SmeltProgressEventPayloadDTO`
- `completed`: `SmeltCompletedEventPayloadDTO`
- `failed`: `SmeltFailedEventPayloadDTO`

Use existing `subscribeWithRetry` from `src/lib/realtime/smelt-subscription.ts`.

### 7.5 Get Prompts (Logged-in users)

**Endpoint:** `GET /api/prompts`

**Response Type:** `PromptsListDTO`

### 7.6 Get Prompt Sections (Logged-in users)

**Endpoint:** `GET /api/prompt-sections`

**Response Type:** `PromptSectionsListDTO`

---

## 8. User Interactions

### 8.1 File Upload Interactions

| Interaction              | Action                    | Outcome                         |
| ------------------------ | ------------------------- | ------------------------------- |
| Drag files over DropZone | Highlight drop zone       | Visual feedback (border color)  |
| Drop valid files         | Validate and add to state | Files appear in FileList        |
| Drop invalid files       | Validate and show error   | File appears with error message |
| Click DropZone           | Open file picker          | Native file dialog opens        |
| Select files from picker | Validate and add to state | Files appear in FileList        |
| Click remove on FileItem | Remove file from state    | File disappears from list       |

### 8.2 Text Input Interactions

| Interaction       | Action               | Outcome                           |
| ----------------- | -------------------- | --------------------------------- |
| Type in TextZone  | Update text state    | Text stored, files cleared (anon) |
| Paste in TextZone | Update text state    | Text stored, files cleared (anon) |
| Clear TextZone    | Update text to empty | Text state cleared                |

### 8.3 Mode Selection Interactions

| Interaction    | Action                 | Outcome                          |
| -------------- | ---------------------- | -------------------------------- |
| Click SEPARATE | Set mode to 'separate' | Button highlighted, mode updated |
| Click COMBINE  | Set mode to 'combine'  | Button highlighted, mode updated |

### 8.4 Prompt Selection Interactions

| Interaction                   | Action             | Outcome                              |
| ----------------------------- | ------------------ | ------------------------------------ |
| Click predefined prompt       | Select that prompt | Button highlighted, selection stored |
| Click custom prompt (sidebar) | Select that prompt | Item highlighted, selection stored   |

### 8.5 Processing Interactions

| Interaction          | Action           | Outcome                                |
| -------------------- | ---------------- | -------------------------------------- |
| Click "SMELT IT"     | Start processing | Button shows spinner, progress appears |
| Processing completes | Show results     | ResultsView displays output            |
| Processing fails     | Show error       | ErrorDisplay with message and CTA      |

### 8.6 Results Interactions

| Interaction           | Action            | Outcome                            |
| --------------------- | ----------------- | ---------------------------------- |
| Click copy button     | Copy to clipboard | Content copied, confirmation shown |
| Click download button | Download .md file | Browser downloads file             |
| Click reset/new       | Clear state       | Return to initial state            |

### 8.7 Navigation Interactions

| Interaction           | Action                | Outcome               |
| --------------------- | --------------------- | --------------------- |
| Click SIGN UP CTA     | Navigate to /auth     | Auth page opens       |
| Click ADD API KEY CTA | Navigate to /settings | Settings page opens   |
| Click PROMPTS toggle  | Toggle sidebar        | Sidebar slides in/out |

---

## 9. Conditions and Validation

### 9.1 File Validation Conditions

| Condition           | Components         | Effect                                                      |
| ------------------- | ------------------ | ----------------------------------------------------------- |
| File format invalid | DropZone, FileItem | Show error "CAN'T READ THAT. TRY .MP3 .WAV .M4A"            |
| File size > 25MB    | DropZone, FileItem | Show error "FILE TOO CHUNKY. MAX 25MB. YOUR FILE: {size}MB" |
| File count > 5      | DropZone           | Prevent adding more files, show error "MAX 5 FILES ALLOWED" |

### 9.2 Processing Conditions

| Condition                    | Components                  | Effect                            |
| ---------------------------- | --------------------------- | --------------------------------- |
| No input (no files, no text) | ProcessButton               | Button disabled                   |
| No prompt selected           | ProcessButton               | Button disabled                   |
| can_process = false          | ProcessButton, ErrorDisplay | Button disabled, show limit error |
| Already processing           | ProcessButton               | Button disabled, shows spinner    |
| Combine mode + anonymous     | CombineModeToggle           | Combine option hidden/disabled    |
| Combine mode + < 2 files     | CombineModeToggle           | Combine option disabled           |
| Custom prompt + anonymous    | PromptSidebar               | Sidebar not shown                 |

### 9.3 API Validation (Server-side mirroring)

| Validation                | Error Code                  | Message                                                                                        |
| ------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| No input provided         | `no_input`                  | "NOTHING TO PROCESS. UPLOAD A FILE OR ENTER TEXT"                                              |
| Files + text (anonymous)  | `mixed_input`               | "CHOOSE EITHER FILES OR TEXT, NOT BOTH"                                                        |
| > 5 files                 | `too_many_files`            | "MAX 5 FILES ALLOWED"                                                                          |
| File > 25MB               | `file_too_large`            | "FILE TOO CHUNKY. MAX 25MB. YOUR FILE: {size}MB"                                               |
| Invalid format            | `invalid_format`            | "CAN'T READ THAT. TRY .MP3 .WAV .M4A"                                                          |
| Daily limit (anonymous)   | `daily_limit`               | "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED"                        |
| Weekly limit (auth)       | `weekly_limit`              | "{used}/{max} SMELTS USED THIS WEEK. RESETS IN {days} DAYS. OR ADD YOUR API KEY FOR UNLIMITED" |
| Combine requires auth     | `combine_requires_auth`     | "COMBINE MODE REQUIRES LOGIN"                                                                  |
| Combine requires 2+ files | `combine_requires_multiple` | "COMBINE MODE NEEDS 2+ FILES"                                                                  |

### 9.4 State-based UI Conditions

| State                                  | UI Effect                                    |
| -------------------------------------- | -------------------------------------------- |
| `isProcessing = true`                  | Inputs disabled, ProcessButton shows spinner |
| `results.length > 0`                   | ResultsView visible, inputs hidden           |
| `error !== null`                       | ErrorDisplay visible with appropriate CTA    |
| `sidebarOpen = true`                   | PromptSidebar slides in from right           |
| `files.length >= 2 && isAuthenticated` | CombineModeToggle visible                    |

---

## 10. Error Handling

### 10.1 Client-side Validation Errors

| Error               | Display Location | Handling                                   |
| ------------------- | ---------------- | ------------------------------------------ |
| Invalid file format | FileItem inline  | Show error message, file marked as invalid |
| File too large      | FileItem inline  | Show error message with actual size        |
| Too many files      | DropZone         | Prevent add, show toast/message            |
| Text too long       | TextZone         | Prevent input beyond limit                 |

### 10.2 API Errors

| Error Code             | Display              | CTA                                     |
| ---------------------- | -------------------- | --------------------------------------- |
| `daily_limit`          | ErrorDisplay (coral) | "SIGN UP" → /auth                       |
| `weekly_limit`         | ErrorDisplay (coral) | "ADD API KEY" → /settings               |
| `no_input`             | ErrorDisplay         | None (shouldn't happen with validation) |
| `invalid_format`       | ErrorDisplay         | "TRY AGAIN"                             |
| `file_too_large`       | ErrorDisplay         | "TRY AGAIN"                             |
| `corrupted_file`       | ErrorDisplay         | "TRY AGAIN"                             |
| `transcription_failed` | ErrorDisplay         | "TRY AGAIN"                             |
| `synthesis_failed`     | ErrorDisplay         | "TRY AGAIN"                             |
| `api_rate_limited`     | ErrorDisplay         | "TRY AGAIN IN {seconds} SECONDS"        |
| `connection_lost`      | ErrorDisplay         | "TRY AGAIN"                             |
| `internal_error`       | ErrorDisplay         | "TRY AGAIN"                             |

### 10.3 Network Errors

| Scenario              | Handling                                                 |
| --------------------- | -------------------------------------------------------- |
| API request fails     | Show ErrorDisplay with "SOMETHING WENT WRONG. TRY AGAIN" |
| WebSocket disconnects | Attempt reconnect with exponential backoff (3 retries)   |
| Reconnect fails       | Show "CONNECTION LOST. TRY AGAIN" with retry button      |

### 10.4 Error Recovery

```typescript
// Reset state for retry
const handleRetry = () => {
  store.reset();
  // Keep files/text input, clear processing state
};

// Navigate for CTA
const handleNavigate = (path: string) => {
  window.location.href = path;
};
```

---

## 11. Implementation Steps

### Phase 1: Foundation (Day 1-2)

1. **Create type definitions**
   - Create `src/components/main/types.ts` with ViewModel types
   - Export constants for validation

2. **Set up Zustand store**
   - Create `src/store/processing-store.ts`
   - Implement all state and actions
   - Test store independently

3. **Create base UI components**
   - Create neobrutalist Button variant in `src/components/ui/button.tsx`
   - Create Input component with thick borders
   - Create Card component for containers

### Phase 2: Input Components (Day 2-3)

4. **Implement DropZone**
   - Create `src/components/main/DropZone.tsx`
   - Add drag-and-drop handlers
   - Add file picker trigger
   - Implement file validation

5. **Implement FileList and FileItem**
   - Create `src/components/main/FileList.tsx`
   - Create `src/components/main/FileItem.tsx`
   - Style with neobrutalist aesthetic

6. **Implement TextZone**
   - Create `src/components/main/TextZone.tsx`
   - Add character counter (optional)
   - Handle paste events

7. **Implement InputDivider**
   - Create `src/components/main/InputDivider.tsx`
   - Dynamic OR/AND based on state

### Phase 3: Control Components (Day 3-4)

8. **Implement CombineModeToggle**
   - Create `src/components/main/CombineModeToggle.tsx`
   - Add visibility logic
   - Style toggle buttons

9. **Implement PredefinedPromptSelector**
   - Create `src/components/main/PredefinedPromptSelector.tsx`
   - Create `src/components/main/PromptButton.tsx`
   - Add selection state

10. **Implement ProcessButton**
    - Create `src/components/main/ProcessButton.tsx`
    - Add loading state with spinning @
    - Add disabled state logic

### Phase 4: Progress & Results (Day 4-5)

11. **Implement ProgressBar**
    - Create `src/components/main/ProgressBar.tsx`
    - Create `src/components/main/ProgressBlock.tsx`
    - Add stage-based coloring

12. **Implement ResultsView**
    - Create `src/components/main/ResultsView.tsx`
    - Create `src/components/main/ResultItem.tsx`
    - Add copy/download functionality

13. **Implement ErrorDisplay**
    - Create `src/components/main/ErrorDisplay.tsx`
    - Add CTA buttons
    - Map error codes to messages

### Phase 5: Header & Sidebar (Day 5-6)

14. **Implement Header**
    - Create `src/components/layout/Header.tsx`
    - Add logo, credit display, auth button
    - Add prompts toggle

15. **Implement CreditDisplay**
    - Create `src/components/layout/CreditDisplay.tsx`
    - Handle all usage types
    - Add color coding

16. **Implement PromptSidebar**
    - Create `src/components/prompts/PromptSidebar.tsx`
    - Create `src/components/prompts/SectionAccordion.tsx`
    - Create `src/components/prompts/PromptItem.tsx`

### Phase 6: Integration (Day 6-7)

17. **Create custom hooks**
    - Implement `useFileValidation`
    - Implement `useSmeltProcessing`
    - Implement `useUsage`

18. **Create MainProcessingView**
    - Create `src/components/main/MainProcessingView.tsx`
    - Wire up all components
    - Connect to Zustand store

19. **Update index.astro**
    - Import MainProcessingView as React island
    - Pass initial props from server
    - Add Layout wrapper

### Phase 7: Polish & Testing (Day 7-8)

20. **Add animations**
    - Button press animation (3px translate)
    - Sidebar slide animation
    - Progress bar fill animation

21. **Responsive design**
    - Mobile layout adjustments
    - Mobile prompt overlay (if needed)
    - Touch interactions

22. **Accessibility**
    - Add ARIA labels
    - Keyboard navigation
    - Focus indicators
    - Screen reader announcements

23. **Testing**
    - Test file validation edge cases
    - Test processing flow end-to-end
    - Test error scenarios
    - Test credit limit enforcement
    - Test responsive behavior

### File Structure Summary

```
src/
├── components/
│   ├── hooks/
│   │   ├── useFileValidation.ts
│   │   ├── useSmeltProcessing.ts
│   │   └── useUsage.ts
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── CreditDisplay.tsx
│   │   └── Footer.astro
│   ├── main/
│   │   ├── types.ts
│   │   ├── MainProcessingView.tsx
│   │   ├── DropZone.tsx
│   │   ├── FileList.tsx
│   │   ├── FileItem.tsx
│   │   ├── TextZone.tsx
│   │   ├── InputDivider.tsx
│   │   ├── CombineModeToggle.tsx
│   │   ├── PredefinedPromptSelector.tsx
│   │   ├── PromptButton.tsx
│   │   ├── ProcessButton.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── ProgressBlock.tsx
│   │   ├── ResultsView.tsx
│   │   ├── ResultItem.tsx
│   │   └── ErrorDisplay.tsx
│   ├── prompts/
│   │   ├── PromptSidebar.tsx
│   │   ├── SectionAccordion.tsx
│   │   └── PromptItem.tsx
│   └── ui/
│       ├── button.tsx (update)
│       ├── input.tsx (new)
│       ├── textarea.tsx (new)
│       └── card.tsx (new)
├── store/
│   └── processing-store.ts
├── pages/
│   └── index.astro (update)
└── layouts/
    └── Layout.astro (update if needed)
```
