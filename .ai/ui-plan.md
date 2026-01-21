# UI Architecture Plan for SMELT

## Overview

The UI follows a neobrutalist design aesthetic with Astro 5 + React 19 islands architecture.

---

## 1. UI Structure Overview

SMELT uses a **hybrid Astro + React architecture**:
- **Astro pages** for static shells (auth, settings)
- **React islands** with `client:load` for interactive components (main processing area, prompt sidebar)
- **Zustand** for state management across islands (no persistence for prompt selection)
- **Supabase Realtime** for WebSocket-style progress updates

### Design System Foundation
- **Colors**: cream (#FFFEF0), lime (#E8FF8D), lavender (#C8B6FF), coral (#FF6B6B), cyan (#A8E6FF), mint (#7BF1A8), yellow (#FFDE59), black (#000000)
- **Typography**: Space Mono (monospace), uppercase headers, wide letter-spacing
- **Styling**: Hard shadows (8px offset), thick borders (4px solid black), zero border-radius
- **Interactions**: Button press animations (3px translate), spinning @ for loading states

---

## 2. View List

### 2.1 Main Processing Page

| Attribute | Value |
|-----------|-------|
| **Path** | `/` |
| **Purpose** | Core SPA for file upload, text input, prompt selection, and processing |
| **Auth Required** | No (anonymous access with limits) |

**Key Information to Display:**
- Credit status (header)
- File upload zone with validation feedback
- Text input zone
- Input count and mode (OR/AND)
- Predefined prompt selector (5 buttons)
- Processing progress (10-block bar)
- Results with copy/download actions
- Error messages with CTAs

**Key Components:**
- `Header` - Logo, credit display, auth status, settings link, prompts toggle
- `DropZone` - Drag-and-drop file upload (MP3, WAV, M4A)
- `InputDivider` - Dynamic OR/AND based on input state
- `TextZone` - Direct text paste area
- `CombineModeToggle` - [SEPARATE] / [COMBINE] toggle
- `PredefinedPromptSelector` - 5 horizontal buttons
- `ProcessButton` - "SMELT IT" main CTA
- `ProgressBar` - 10-block stage-based visualization
- `ResultsView` - Black bg, lime text, copy/download
- `ErrorDisplay` - Coral bg with contextual CTAs
- `PromptSidebar` - Collapsible custom prompt library (logged-in only)

**UX Considerations:**
- Mixed input mode: OR divider changes to AND when both zones have content
- Combine toggle visible when ≥2 inputs, disabled otherwise
- Real-time progress via Supabase channel subscription
- Results ephemeral (lost on page refresh)

**Accessibility:**
- Keyboard navigation for all interactive elements
- ARIA labels on custom components
- Screen reader announcements for status changes
- Focus indicators on all focusable elements

**Security:**
- Client-side file validation before upload
- No file content stored client-side after processing
- JWT tokens managed via Supabase client

---

### 2.2 Authentication Page

| Attribute | Value |
|-----------|-------|
| **Path** | `/auth` |
| **Purpose** | User registration and login |
| **Auth Required** | No (redirect if authenticated) |

**Key Information to Display:**
- Mode toggle (LOGIN / REGISTER)
- Email and password inputs
- Error messages inline
- OR divider for future OAuth

**Key Components:**
- `AuthModeToggle` - Toggle between login/registration modes
- `AuthForm` - Email, password inputs with neobrutalist styling
- `SubmitButton` - Primary action button
- `OAuthDivider` - "OR" divider placeholder for future OAuth
- `ErrorMessage` - Inline error display

**UX Considerations:**
- Reuse file/text mode toggle pattern for login/register switch
- Clear all state upon successful auth (fresh start)
- Redirect to main page after successful auth

**Accessibility:**
- Form fields properly labeled
- Error messages linked to inputs via aria-describedby
- Tab order logical through form

**Security:**
- Password field masked
- HTTPS-only form submission
- Rate limiting feedback displayed

---

### 2.3 Settings Page

| Attribute | Value |
|-----------|-------|
| **Path** | `/settings` |
| **Purpose** | API key management for unlimited processing |
| **Auth Required** | Yes (redirect to /auth if not logged in) |

**Key Information to Display:**
- Current API key status (none/valid/invalid)
- Masked API key input
- Validation status and feedback
- Remove key option

**Key Components:**
- `ApiKeyInput` - Masked input with SHOW toggle
- `ValidateButton` - "VALIDATE" with "TESTING..." spinner
- `ValidationStatus` - "KEY VALID ✓" (mint) or "KEY INVALID ✗" (coral)
- `RemoveButton` - Delete saved API key
- `BackLink` - Return to main page

**UX Considerations:**
- Show spinning @ during validation
- Color-coded feedback (mint = valid, coral = invalid)
- Immediate header update to "UNLIMITED" on success

**Accessibility:**
- Clear status announcements for validation results
- Keyboard accessible show/hide toggle

**Security:**
- API key never displayed after storage (only masked)
- Keys transmitted via HTTPS only
- Server-side encryption at rest

---

### 2.4 Prompt Editor (Popup Overlay)

| Attribute | Value |
|-----------|-------|
| **Path** | N/A (overlay on main page) |
| **Purpose** | Create and edit custom prompts |
| **Auth Required** | Yes (logged-in users only) |

**Key Information to Display:**
- Header: "NEW PROMPT" or existing title (editable)
- Body textarea with character counter (4,000 max)
- Section assignment dropdown
- Save/Cancel actions

**Key Components:**
- `PromptEditorOverlay` - Semi-transparent cream backdrop
- `PromptEditorCard` - Black bg, lime text (matches ResultsView)
- `TitleInput` - Inline editable title
- `BodyTextarea` - Prompt content with counter
- `SectionSelect` - Optional section assignment
- `ActionButtons` - SAVE, CANCEL, UPLOAD .MD

**UX Considerations:**
- Same visual language as ResultsView
- Character counter shows remaining (e.g., "3,847/4,000")
- Upload .MD option for file import (max 10KB)

**Accessibility:**
- Focus trap within overlay
- Escape key closes overlay
- Screen reader announcement on open/close

---

### 2.5 Mobile Prompt Overlay

| Attribute | Value |
|-----------|-------|
| **Path** | N/A (overlay on main page, mobile only) |
| **Purpose** | Full-screen prompt selection on mobile devices |
| **Auth Required** | Yes (logged-in users only) |

**Key Components:**
- `MobilePromptOverlay` - Full-screen from bottom
- `SearchFilter` - Filter prompts by name
- `SectionAccordions` - Collapsible section headers
- `PromptList` - Scrollable list within sections
- `CloseButton` - X icon to dismiss

**UX Considerations:**
- Slides up from bottom on mobile
- Tap to select and auto-close
- Search filter at top for large libraries

---

## 3. User Journey Maps

### 3.1 Anonymous User Journey

```
Landing (/)
    → See "1/1 DAILY SMELT AVAILABLE" in header
    → Upload audio file(s) OR paste text
    → Select predefined prompt (5 options)
    → Click "SMELT IT"
    → View progress bar (10 blocks, stage colors)
    → Receive results (black bg, lime text)
    → Copy to clipboard OR download as .md
    → [If daily limit reached] See coral error with "SIGN UP" CTA
    → Click "SIGN UP" → Navigate to /auth
```

### 3.2 Logged-in User Journey

```
Landing (/)
    → See "5/5 LEFT THIS WEEK" in header
    → [Optional] Open sidebar → manage custom prompts
    → Upload files AND/OR paste text (mixed input)
    → [If ≥2 inputs] Toggle combine mode
    → Select predefined OR custom prompt
    → Click "SMELT IT"
    → View progress → receive results
    → Copy/download results
    → [If weekly limit reached] See error with "ADD API KEY" CTA
    → Click settings → Navigate to /settings
```

### 3.3 Power User Journey (API Key)

```
Settings (/settings)
    → Enter OpenAI API key
    → Click "VALIDATE"
    → See "TESTING..." with spinning @
    → See "KEY VALID ✓" (mint)
    → Header updates to "UNLIMITED"
    → Return to main page
    → Process unlimited smelts
```

### 3.4 Prompt Management Journey

```
Main Page (/)
    → Click "PROMPTS" in header
    → Sidebar slides in (desktop) or overlay (mobile)
    → [Create] Click "NEW PROMPT" → Editor popup opens
    → Enter title and body (4,000 char limit)
    → [Optional] Assign to section
    → Click "SAVE"
    → [Edit] Click prompt name → Editor popup with existing content
    → [Delete] Click trash icon on prompt
    → [Organize] Create/delete sections via accordion headers
```

---

## 4. Layout and Navigation Structure

### 4.1 Global Layout

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
│ [SMELT Logo] [Credit Display] [LOGIN/Email] [⚙]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   MAIN CONTENT                      │
│              (varies by page/state)                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER (minimal)                                    │
└─────────────────────────────────────────────────────┘
```

### 4.2 Main Page Layout (Desktop)

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  OR/AND  ┌──────────────┐        │
│  │   DropZone   │    │     │   TextZone   │        │
│  │  (files)     │    │     │   (text)     │        │
│  └──────────────┘    │     └──────────────┘        │
│                                                     │
│  [ SEPARATE ] [ COMBINE ]  (toggle, if ≥2 inputs)  │
│                                                     │
│  [Prompt1] [Prompt2] [Prompt3] [Prompt4] [Prompt5] │
│                                                     │
│              [ SMELT IT ]                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ProgressBar (10 blocks)                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ResultsView / ErrorDisplay                   │   │
│  │ (appears after processing)                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER                                              │
└─────────────────────────────────────────────────────┘
```

### 4.3 Main Page Layout (Mobile)

```
┌─────────────────────┐
│ HEADER              │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │    DropZone     │ │
│ └─────────────────┘ │
│         OR          │
│ ┌─────────────────┐ │
│ │    TextZone     │ │
│ └─────────────────┘ │
│                     │
│ [SEP] [COMBINE]     │
│                     │
│ [P1][P2][P3][P4][P5]│
│                     │
│    [ SMELT IT ]     │
│                     │
│ [ProgressBar]       │
│                     │
│ [Results/Error]     │
├─────────────────────┤
│ FOOTER              │
└─────────────────────┘
```

### 4.4 Navigation Elements

| Element | Location | Action |
|---------|----------|--------|
| Logo | Header left | Navigate to `/` |
| LOGIN/Email | Header right | Navigate to `/auth` or show user menu |
| Settings (⚙) | Header right (logged-in only) | Navigate to `/settings` |
| PROMPTS | Header right (logged-in only) | Toggle sidebar |
| SIGN UP CTA | Error messages | Navigate to `/auth` |
| ADD API KEY CTA | Error messages | Navigate to `/settings` |
| Back link | Settings page | Navigate to `/` |

---

## 5. Key Components

### 5.1 Shared Components

| Component | Description | Used In |
|-----------|-------------|---------|
| `Header` | App header with logo, credits, auth status | All pages |
| `Footer` | Minimal footer | All pages |
| `Button` | Neobrutalist button with variants | All pages |
| `Input` | Thick-bordered input field | Auth, Settings |
| `ErrorBlock` | Coral background error with CTAs | Main, Auth, Settings |

### 5.2 Main Page Components

| Component | Description |
|-----------|-------------|
| `DropZone` | Drag-and-drop file upload with validation |
| `TextZone` | Text input area with optional char count |
| `InputDivider` | Dynamic OR/AND divider |
| `CombineModeToggle` | [SEPARATE]/[COMBINE] toggle buttons |
| `PredefinedPromptSelector` | Horizontal row of 5 prompt buttons |
| `ProcessButton` | "SMELT IT" main action button |
| `ProgressBar` | 10-block progress visualization |
| `ResultsView` | Black bg results with copy/download |
| `PromptSidebar` | Collapsible custom prompt library |
| `PromptEditor` | Popup for creating/editing prompts |
| `SectionAccordion` | Collapsible prompt section |

### 5.3 Auth Page Components

| Component | Description |
|-----------|-------------|
| `AuthModeToggle` | LOGIN/REGISTER mode toggle |
| `AuthForm` | Email and password form |
| `OAuthDivider` | "OR" divider for future OAuth |

### 5.4 Settings Page Components

| Component | Description |
|-----------|-------------|
| `ApiKeyInput` | Masked input with show/hide toggle |
| `ValidateButton` | Validation trigger with loading state |
| `ValidationStatus` | Color-coded validation feedback |
| `RemoveKeyButton` | Delete API key action |

---

## 6. State Management

### 6.1 Zustand Store Structure

```typescript
interface AppState {
  // Auth
  user: User | null;
  profile: UserProfile | null;

  // Input
  files: File[];
  text: string;
  mode: 'separate' | 'combine';

  // Prompts
  selectedPrompt: PredefinedPrompt | CustomPrompt | null;
  customPrompts: Prompt[];
  sections: PromptSection[];

  // Processing
  smeltId: string | null;
  status: SmeltStatus;
  progress: number;
  stage: ProcessingStage;
  results: SmeltResult[];
  error: SmeltError | null;

  // UI
  sidebarOpen: boolean;
  editorOpen: boolean;
  editingPrompt: Prompt | null;
}
```

### 6.2 State Persistence

- **Persisted**: Auth tokens (via Supabase client)
- **Not persisted**: Prompt selection, input content, results, processing state

---

## 7. API Integration Points

### 7.1 Authentication

| Action | Endpoint | Trigger |
|--------|----------|---------|
| Register | `POST /api/auth/register` | Auth form submit (register mode) |
| Login | `POST /api/auth/login` | Auth form submit (login mode) |
| Logout | `POST /api/auth/logout` | User menu logout click |
| Session check | `GET /api/auth/session` | Page load |

### 7.2 Processing

| Action | Endpoint | Trigger |
|--------|----------|---------|
| Create smelt | `POST /api/smelts` | "SMELT IT" click |
| Get status | `GET /api/smelts/:id` | Fallback polling |
| Real-time progress | Supabase Realtime `smelt:{id}` | After smelt creation |

### 7.3 Prompts (Logged-in only)

| Action | Endpoint | Trigger |
|--------|----------|---------|
| List prompts | `GET /api/prompts` | Sidebar open, page load |
| Create prompt | `POST /api/prompts` | Prompt editor save |
| Update prompt | `PATCH /api/prompts/:id` | Prompt editor save (edit mode) |
| Delete prompt | `DELETE /api/prompts/:id` | Trash icon click |
| Upload .md | `POST /api/prompts/upload` | File upload in editor |

### 7.4 Sections (Logged-in only)

| Action | Endpoint | Trigger |
|--------|----------|---------|
| List sections | `GET /api/prompt-sections` | Sidebar open |
| Create section | `POST /api/prompt-sections` | "Add Section" click |
| Update section | `PATCH /api/prompt-sections/:id` | Inline rename |
| Delete section | `DELETE /api/prompt-sections/:id` | Section delete icon |

### 7.5 API Key Management

| Action | Endpoint | Trigger |
|--------|----------|---------|
| Add/validate key | `POST /api/api-keys` | Validate button click |
| Check status | `GET /api/api-keys/status` | Settings page load |
| Remove key | `DELETE /api/api-keys` | Remove button click |

### 7.6 Usage

| Action | Endpoint | Trigger |
|--------|----------|---------|
| Get usage | `GET /api/usage` | Page load, after processing |

---

## 8. Error States and Edge Cases

### 8.1 File Validation Errors

| Error | Message | Action |
|-------|---------|--------|
| File too large | "FILE TOO CHUNKY. MAX 25MB." | Show in DropZone |
| Invalid format | "CAN'T READ THAT. TRY .MP3 .WAV .M4A" | Show in DropZone |
| Too many files | "MAX 5 FILES ALLOWED" | Prevent additional uploads |
| Audio too long | "AUDIO TOO LONG. MAX 30 MINUTES" | Show after validation |

### 8.2 Credit/Limit Errors

| Error | Message | CTA |
|-------|---------|-----|
| Daily limit (anon) | "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED." | SIGN UP button |
| Weekly limit (auth) | "X/5 SMELTS USED THIS WEEK. RESETS IN Y DAYS. OR ADD YOUR API KEY FOR UNLIMITED." | ADD API KEY link |

### 8.3 Processing Errors

| Error | Message | Action |
|-------|---------|--------|
| Corrupted file | "CORRUPTED FILE. TRY A DIFFERENT ONE." | Allow retry with different file |
| Transcription failed | "TRANSCRIPTION FAILED. TRY AGAIN." | Show retry button |
| Rate limited | "RATE LIMITED. TRY AGAIN IN X SECONDS." | Show countdown |
| Connection lost | "CONNECTION LOST. CHECK YOUR INTERNET AND TRY AGAIN." | Show retry button |

### 8.4 Auth Errors

| Error | Message |
|-------|---------|
| Invalid credentials | "WRONG EMAIL OR PASSWORD" |
| Email exists | "EMAIL ALREADY REGISTERED" |
| Weak password | "PASSWORD TOO WEAK. MIN 8 CHARS" |

---

## 9. Files to Create/Modify

### 9.1 New Components (`src/components/`)

```
src/components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── MainLayout.tsx
├── main/
│   ├── DropZone.tsx
│   ├── TextZone.tsx
│   ├── InputDivider.tsx
│   ├── CombineModeToggle.tsx
│   ├── PredefinedPromptSelector.tsx
│   ├── ProcessButton.tsx
│   ├── ProgressBar.tsx
│   ├── ResultsView.tsx
│   └── ErrorDisplay.tsx
├── prompts/
│   ├── PromptSidebar.tsx
│   ├── PromptEditor.tsx
│   ├── SectionAccordion.tsx
│   ├── PromptItem.tsx
│   └── MobilePromptOverlay.tsx
├── auth/
│   ├── AuthModeToggle.tsx
│   └── AuthForm.tsx
├── settings/
│   ├── ApiKeySection.tsx
│   └── ValidationStatus.tsx
└── ui/
    ├── button.tsx (exists)
    ├── input.tsx
    ├── textarea.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── sheet.tsx
```

### 9.2 New Pages (`src/pages/`)

```
src/pages/
├── index.astro (update with React islands)
├── auth.astro (new)
└── settings.astro (new)
```

### 9.3 State Management (`src/store/`)

```
src/store/
├── app-store.ts
├── auth-store.ts
├── prompts-store.ts
└── processing-store.ts
```

### 9.4 Styling Updates (`src/styles/`)

```
src/styles/
├── global.css (update with neobrutalist utilities)
└── components.css (component-specific styles if needed)
```

---

## 10. Verification Steps

1. **Anonymous Flow**: Visit `/`, upload file, select prompt, process, verify 1/1 limit
2. **Auth Flow**: Navigate to `/auth`, register, verify redirect and 5/5 credits
3. **Logged-in Flow**: Process files, verify credit decrement, test combine mode
4. **Prompt Management**: Create, edit, delete custom prompts and sections
5. **API Key Flow**: Navigate to `/settings`, add key, verify "UNLIMITED" status
6. **Error States**: Test file size limits, format validation, credit exhaustion
7. **Responsive**: Test mobile layout, prompt overlay, touch interactions
8. **Accessibility**: Keyboard navigation, screen reader testing
