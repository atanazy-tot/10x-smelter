# REST API Plan

## 1. Resources

| Resource        | Database Table    | Description                                         |
| --------------- | ----------------- | --------------------------------------------------- |
| User Profile    | `user_profiles`   | User account data including credits and settings    |
| API Keys        | `user_api_keys`   | Encrypted OpenAI API key storage                    |
| Prompt Sections | `prompt_sections` | Organizational folders for custom prompts           |
| Prompts         | `prompts`         | User-created custom prompts                         |
| Smelts          | `smelts`          | Main processing operations                          |
| Smelt Files     | `smelt_files`     | Individual input files for processing               |
| Anonymous Usage | `anonymous_usage` | Daily usage tracking for anonymous users (internal) |

---

## 2. Endpoints

### 2.1 Authentication

Authentication is handled primarily through Supabase Auth. The following endpoints provide session management and integration with the application.

#### POST /api/auth/register

Creates a new user account and initializes the user profile.

**Request Payload:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**

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

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_email` | INVALID EMAIL FORMAT |
| 400 | `weak_password` | PASSWORD TOO WEAK. MIN 8 CHARS |
| 409 | `email_exists` | EMAIL ALREADY REGISTERED |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

---

#### POST /api/auth/login

Authenticates an existing user.

**Request Payload:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**

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

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `invalid_credentials` | WRONG EMAIL OR PASSWORD |
| 429 | `rate_limited` | TOO MANY ATTEMPTS. TRY AGAIN LATER |
| 500 | `internal_error` | SOMETHING WENT WRONG. TRY AGAIN |

---

#### POST /api/auth/logout

Terminates the current user session.

**Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "message": "LOGGED OUT"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | NOT LOGGED IN |

---

#### GET /api/auth/session

Retrieves the current session and user information.

**Headers:**

- `Authorization: Bearer <access_token>` (optional for anonymous check)

**Response (200 OK) - Authenticated:**

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

**Response (200 OK) - Anonymous:**

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

### 2.2 User Profile

#### GET /api/profile

Retrieves the current authenticated user's profile.

**Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

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

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

---

### 2.3 API Key Management

#### POST /api/api-keys

Validates and stores an OpenAI API key for unlimited processing.

**Headers:**

- `Authorization: Bearer <access_token>`

**Request Payload:**

```json
{
  "api_key": "sk-..."
}
```

**Response (200 OK):**

```json
{
  "status": "valid",
  "validated_at": "2026-01-17T14:30:00Z",
  "message": "KEY VALID ✓"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_key_format` | INVALID API KEY FORMAT |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 422 | `key_invalid` | KEY INVALID ✗ - CHECK YOUR KEY |
| 422 | `key_quota_exhausted` | KEY QUOTA EXHAUSTED |
| 500 | `validation_failed` | COULDN'T VALIDATE KEY. TRY AGAIN |

---

#### GET /api/api-keys/status

Returns the current API key status (never returns the actual key).

**Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "has_key": true,
  "status": "valid",
  "validated_at": "2026-01-17T14:30:00Z"
}
```

**Response (200 OK) - No key configured:**

```json
{
  "has_key": false,
  "status": "none",
  "validated_at": null
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

---

#### DELETE /api/api-keys

Removes the stored API key and reverts user to free tier.

**Headers:**

- `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "message": "API KEY REMOVED",
  "credits_remaining": 3,
  "credits_reset_at": "2026-01-20T00:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `no_key` | NO API KEY CONFIGURED |

---

### 2.4 Prompt Sections

#### GET /api/prompt-sections

Lists all prompt sections for the authenticated user.

**Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | string | `position` | Sort field: `position`, `title`, `created_at` |
| `order` | string | `asc` | Sort order: `asc`, `desc` |

**Response (200 OK):**

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

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

---

#### POST /api/prompt-sections

Creates a new prompt section.

**Headers:**

- `Authorization: Bearer <access_token>`

**Request Payload:**

```json
{
  "title": "Meetings",
  "position": 2
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "title": "Meetings",
  "position": 2,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `missing_title` | SECTION TITLE REQUIRED |
| 401 | `unauthorized` | LOGIN REQUIRED |

---

#### PATCH /api/prompt-sections/:id

Updates an existing prompt section.

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` - Section UUID

**Request Payload:**

```json
{
  "title": "Work Meetings",
  "position": 0
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "title": "Work Meetings",
  "position": 0,
  "created_at": "2026-01-10T08:00:00Z",
  "updated_at": "2026-01-17T14:30:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_data` | INVALID UPDATE DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | SECTION NOT FOUND |

---

#### DELETE /api/prompt-sections/:id

Deletes a prompt section. Prompts in the section are moved to unsectioned.

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` - Section UUID

**Response (200 OK):**

```json
{
  "message": "SECTION DELETED",
  "prompts_moved": 3
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | SECTION NOT FOUND |

---

#### PATCH /api/prompt-sections/reorder

Reorders multiple sections at once.

**Headers:**

- `Authorization: Bearer <access_token>`

**Request Payload:**

```json
{
  "order": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 },
    { "id": "uuid-3", "position": 2 }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "SECTIONS REORDERED",
  "updated_count": 3
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_order` | INVALID ORDER DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `section_not_found` | ONE OR MORE SECTIONS NOT FOUND |

---

### 2.5 Prompts

#### GET /api/prompts

Lists all custom prompts for the authenticated user.

**Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `section_id` | uuid | null | Filter by section (null = unsectioned) |
| `sort` | string | `position` | Sort field: `position`, `title`, `created_at`, `updated_at` |
| `order` | string | `asc` | Sort order: `asc`, `desc` |
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |

**Response (200 OK):**

```json
{
  "prompts": [
    {
      "id": "uuid",
      "title": "Meeting Summary",
      "body": "Summarize this meeting transcript...",
      "section_id": "uuid",
      "position": 0,
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "total_pages": 1
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

---

#### POST /api/prompts

Creates a new custom prompt. Prompts can optionally belong to a section (similar to tab groups in MS Edge). If no section is given, the prompt is "unsectioned" and displayed freely.

**Headers:**

- `Authorization: Bearer <access_token>`

**Request Payload:**

```json
{
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": null,
  "position": 0
}
```

- `section_id` (optional): Set to a section UUID to assign this prompt to a section, or omit/null to leave it ungrouped.

**Response (201 Created):**

```json
{
  "id": "uuid",
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": null,
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `missing_title` | PROMPT TITLE REQUIRED |
| 400 | `missing_body` | PROMPT CONTENT REQUIRED |
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `section_not_found` | SECTION NOT FOUND (if a non-null invalid section_id is provided) |

---

#### GET /api/prompts/:id

Retrieves a single prompt by ID.

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` - Prompt UUID

**Response (200 OK):**

```json
{
  "id": "uuid",
  "title": "Interview Notes",
  "body": "Extract key insights from this interview transcript...",
  "section_id": "uuid",
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

---

#### PATCH /api/prompts/:id

Updates an existing prompt.

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` - Prompt UUID

**Request Payload:**

```json
{
  "title": "Updated Interview Notes",
  "body": "Updated prompt content...",
  "section_id": "uuid",
  "position": 1
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "title": "Updated Interview Notes",
  "body": "Updated prompt content...",
  "section_id": "uuid",
  "position": 1,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T15:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

---

#### DELETE /api/prompts/:id

Deletes a custom prompt.

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameters:**

- `id` - Prompt UUID

**Response (200 OK):**

```json
{
  "message": "PROMPT DELETED"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | PROMPT NOT FOUND |

---

#### POST /api/prompts/upload

Creates a prompt from an uploaded .MD file.

**Headers:**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request Payload (multipart/form-data):**

- `file` - The .MD file (max 10KB)
- `title` - Optional title (defaults to filename)
- `section_id` - Optional section UUID

**Response (201 Created):**

```json
{
  "id": "uuid",
  "title": "My Prompt",
  "body": "Content from uploaded file...",
  "section_id": null,
  "position": 0,
  "created_at": "2026-01-17T14:00:00Z",
  "updated_at": "2026-01-17T14:00:00Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_format` | ONLY .MD FILES ALLOWED |
| 400 | `file_too_large` | FILE TOO BIG. MAX 10KB |
| 400 | `body_too_long` | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| 401 | `unauthorized` | LOGIN REQUIRED |

---

#### PATCH /api/prompts/reorder

Reorders prompts within a section.

**Headers:**

- `Authorization: Bearer <access_token>`

**Request Payload:**

```json
{
  "section_id": "uuid",
  "order": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 }
  ]
}
```

**Response (200 OK):**

```json
{
  "message": "PROMPTS REORDERED",
  "updated_count": 2
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `invalid_order` | INVALID ORDER DATA |
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `prompt_not_found` | ONE OR MORE PROMPTS NOT FOUND |

---

### 2.6 Smelts (Processing Operations)

#### POST /api/smelts

Creates a new smelt operation and initiates processing.

**Headers:**

- `Authorization: Bearer <access_token>` (optional for anonymous)
- `Content-Type: multipart/form-data`

**Request Payload (multipart/form-data):**

- `files[]` - Audio files (MP3, WAV, M4A) - max 5 files, 25MB each
- `text` - Text input (alternative to files)
- `mode` - Processing mode: `separate` or `combine` (default: `separate`)
- `default_prompt_names[]` - (optional) Array of default prompt names to use
- `user_prompt_id` - (optional) UUID of custom prompt to use (logged-in users only)

If no prompt is specified (`default_prompt_names` is empty and `user_prompt_id` is null), the system applies a basic "clean & transcribe" operation that returns a cleaned-up transcript without additional formatting or synthesis.

**Response (201 Created):**

```json
{
  "id": "uuid",
  "status": "pending",
  "mode": "separate",
  "files": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "size_bytes": 5242880,
      "duration_seconds": 300,
      "input_type": "audio",
      "status": "pending",
      "position": 0
    }
  ],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "created_at": "2026-01-17T14:00:00Z",
  "subscription_channel": "smelt:uuid"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 400 | `no_input` | NOTHING TO PROCESS. UPLOAD A FILE OR ENTER TEXT |
| 400 | `mixed_input` | CHOOSE EITHER FILES OR TEXT, NOT BOTH |
| 400 | `too_many_files` | MAX 5 FILES ALLOWED |
| 400 | `file_too_large` | FILE TOO CHUNKY. MAX 25MB. YOUR FILE: {size}MB |
| 400 | `invalid_format` | CAN'T READ THAT. TRY .MP3 .WAV .M4A |
| 400 | `duration_exceeded` | AUDIO TOO LONG. MAX 30 MINUTES |
| 400 | `combine_requires_auth` | COMBINE MODE REQUIRES LOGIN |
| 400 | `combine_requires_multiple` | COMBINE MODE NEEDS 2+ FILES |
| 403 | `daily_limit` | DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED |
| 403 | `weekly_limit` | {used}/{max} SMELTS USED THIS WEEK. RESETS IN {days} DAYS. OR ADD YOUR API KEY FOR UNLIMITED |
| 401 | `unauthorized` | LOGIN REQUIRED FOR THIS FEATURE |
| 404 | `prompt_not_found` | PROMPT NOT FOUND |

---

#### GET /api/smelts/:id

Retrieves the current status of a smelt operation.

**Headers:**

- `Authorization: Bearer <access_token>` (required for authenticated smelts)

**Path Parameters:**

- `id` - Smelt UUID

**Response (200 OK) - Processing:**

```json
{
  "id": "uuid",
  "status": "transcribing",
  "mode": "separate",
  "files": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "input_type": "audio",
      "status": "processing",
      "position": 0
    }
  ],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "progress": {
    "percentage": 45,
    "stage": "transcribing",
    "message": "Transcribing audio..."
  },
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": null
}
```

**Response (200 OK) - Completed:**

```json
{
  "id": "uuid",
  "status": "completed",
  "mode": "separate",
  "files": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "input_type": "audio",
      "status": "completed",
      "position": 0
    }
  ],
  "default_prompt_names": ["summarize"],
  "user_prompt_id": null,
  "results": [
    {
      "file_id": "uuid",
      "filename": "meeting.mp3",
      "content": "# Meeting Summary\n\n## Key Points\n..."
    }
  ],
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": "2026-01-17T14:02:30Z"
}
```

**Response (200 OK) - Failed:**

```json
{
  "id": "uuid",
  "status": "failed",
  "mode": "separate",
  "files": [
    {
      "id": "uuid",
      "filename": "meeting.mp3",
      "input_type": "audio",
      "status": "failed",
      "error_code": "corrupted_file",
      "position": 0
    }
  ],
  "error_code": "corrupted_file",
  "error_message": "CORRUPTED FILE. TRY A DIFFERENT ONE",
  "created_at": "2026-01-17T14:00:00Z",
  "completed_at": "2026-01-17T14:00:15Z"
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |
| 404 | `not_found` | SMELT NOT FOUND |

---

#### GET /api/smelts

Lists the authenticated user's smelt history.

**Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | null | Filter by status: `pending`, `completed`, `failed` |
| `sort` | string | `created_at` | Sort field: `created_at`, `completed_at` |
| `order` | string | `desc` | Sort order: `asc`, `desc` |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 50) |

**Response (200 OK):**

```json
{
  "smelts": [
    {
      "id": "uuid",
      "status": "completed",
      "mode": "separate",
      "file_count": 1,
      "default_prompt_names": ["summarize"],
      "created_at": "2026-01-17T14:00:00Z",
      "completed_at": "2026-01-17T14:02:30Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 401 | `unauthorized` | LOGIN REQUIRED |

---

### 2.7 Usage and Credits

#### GET /api/usage

Returns current usage status for both anonymous and authenticated users.

**Headers:**

- `Authorization: Bearer <access_token>` (optional)

**Response (200 OK) - Anonymous:**

```json
{
  "type": "anonymous",
  "smelts_used_today": 0,
  "daily_limit": 1,
  "can_process": true,
  "resets_at": "2026-01-18T00:00:00Z"
}
```

**Response (200 OK) - Authenticated (Free Tier):**

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

**Response (200 OK) - Authenticated (With API Key):**

```json
{
  "type": "unlimited",
  "api_key_status": "valid",
  "can_process": true
}
```

**Response (200 OK) - Limit Reached:**

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

---

### 2.8 Real-Time Progress (WebSocket via Supabase Realtime)

Progress updates are delivered via Supabase Realtime subscriptions, not REST endpoints.

**Subscription Channel:** `smelt:{smelt_id}`

**Progress Event Payload:**

```json
{
  "event": "progress",
  "payload": {
    "smelt_id": "uuid",
    "status": "transcribing",
    "progress": {
      "percentage": 45,
      "stage": "transcribing",
      "message": "Transcribing audio..."
    },
    "files": [
      {
        "id": "uuid",
        "status": "processing",
        "progress": 45
      }
    ]
  }
}
```

**Completion Event Payload:**

```json
{
  "event": "completed",
  "payload": {
    "smelt_id": "uuid",
    "status": "completed",
    "results": [
      {
        "file_id": "uuid",
        "filename": "meeting.mp3",
        "content": "# Meeting Summary\n\n## Key Points\n..."
      }
    ]
  }
}
```

**Error Event Payload:**

```json
{
  "event": "failed",
  "payload": {
    "smelt_id": "uuid",
    "status": "failed",
    "error_code": "transcription_failed",
    "error_message": "TRANSCRIPTION FAILED. TRY AGAIN"
  }
}
```

**Processing Stages:**
| Stage | Percentage Range | Description |
|-------|-----------------|-------------|
| `validating` | 0-10% | Validating file format and constraints |
| `decoding` | 10-20% | Decoding audio format (if M4A conversion needed) |
| `transcribing` | 20-70% | Transcribing audio via LLM API |
| `synthesizing` | 70-100% | Applying prompt and generating output |
| `completed` | 100% | Processing complete |

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses Supabase Auth for authentication with JWT tokens.

**Token Types:**

- **Access Token**: Short-lived JWT for API requests (expires in 1 hour)
- **Refresh Token**: Long-lived token for obtaining new access tokens

**Authentication Flow:**

1. User authenticates via `/api/auth/login` or `/api/auth/register`
2. Server returns access token and refresh token
3. Client includes access token in `Authorization: Bearer <token>` header
4. Expired tokens return 401, client uses refresh token to obtain new access token

### 3.2 Authorization Levels

| Level         | Description                | Capabilities                                             |
| ------------- | -------------------------- | -------------------------------------------------------- |
| Anonymous     | No authentication          | 1 smelt/day, predefined prompts only, separate mode only |
| Authenticated | Logged-in user             | 5 smelts/week, custom prompts, combine mode              |
| Unlimited     | Authenticated + API key    | Unlimited smelts, all features                           |
| Service Role  | Internal server operations | Full database access, processing updates                 |

### 3.3 Row-Level Security

All database access is protected by Supabase RLS policies:

- Users can only access their own profiles, prompts, sections, and smelts
- Anonymous users can create smelts but cannot read them back
- Service role handles all processing updates and anonymous usage tracking
- API keys are encrypted at rest and never returned to the client

### 3.4 Rate Limiting

| User Type     | Limit         | Reset               |
| ------------- | ------------- | ------------------- |
| Anonymous     | 1 smelt/day   | Midnight UTC        |
| Authenticated | 5 smelts/week | Monday midnight UTC |
| With API Key  | Unlimited     | N/A                 |
| API Requests  | 100/minute    | Rolling window      |

---

## 4. Validation and Business Logic

### 4.1 Input Validation

#### File Validation

| Constraint | Rule               | Error Code          | Error Message                                  |
| ---------- | ------------------ | ------------------- | ---------------------------------------------- |
| Format     | MP3, WAV, M4A only | `invalid_format`    | CAN'T READ THAT. TRY .MP3 .WAV .M4A            |
| Size       | Max 25MB per file  | `file_too_large`    | FILE TOO CHUNKY. MAX 25MB. YOUR FILE: {size}MB |
| Duration   | Max 30 minutes     | `duration_exceeded` | AUDIO TOO LONG. MAX 30 MINUTES                 |
| Count      | Max 5 files        | `too_many_files`    | MAX 5 FILES ALLOWED                            |
| Integrity  | Not corrupted      | `corrupted_file`    | CORRUPTED FILE. TRY A DIFFERENT ONE            |

#### Prompt Validation

| Constraint  | Rule                   | Error Code       | Error Message                              |
| ----------- | ---------------------- | ---------------- | ------------------------------------------ |
| Title       | Required, non-empty    | `missing_title`  | PROMPT TITLE REQUIRED                      |
| Body        | Required, non-empty    | `missing_body`   | PROMPT CONTENT REQUIRED                    |
| Body Length | Max 4,000 characters   | `body_too_long`  | PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS |
| Upload Size | Max 10KB for .MD files | `file_too_large` | FILE TOO BIG. MAX 10KB                     |

#### API Key Validation

| Constraint | Rule                    | Error Code            | Error Message                  |
| ---------- | ----------------------- | --------------------- | ------------------------------ |
| Format     | Valid OpenAI key format | `invalid_key_format`  | INVALID API KEY FORMAT         |
| Validity   | Key works with OpenAI   | `key_invalid`         | KEY INVALID ✗ - CHECK YOUR KEY |
| Quota      | Key has available quota | `key_quota_exhausted` | KEY QUOTA EXHAUSTED            |

### 4.2 Business Logic Implementation

#### Credit System

```
On smelt creation:
1. Check user authentication status
2. If anonymous:
   - Query anonymous_usage by IP hash + current UTC date
   - If smelts_used >= 1, reject with daily_limit error
3. If authenticated without API key:
   - Check credits_reset_at, reset credits if past
   - If credits_remaining <= 0, reject with weekly_limit error
4. If authenticated with valid API key:
   - Skip credit checks (unlimited)
5. On successful completion:
   - If anonymous: increment anonymous_usage.smelts_used
   - If authenticated without API key: decrement credits_remaining
6. On failure: do not modify credits
```

#### Credit Reset Logic

```
Weekly reset (cron job every Monday 00:00 UTC):
1. Query user_profiles where credits_reset_at <= now()
2. Update credits_remaining = weekly_credits_max
3. Update credits_reset_at = date_trunc('week', now()) + interval '1 week'
```

#### Combine Mode Logic

```
On combine mode processing:
1. Validate user is authenticated
2. Validate 2-5 files uploaded
3. Transcribe all files in parallel
4. If any file fails:
   - Mark entire smelt as failed
   - Do not consume credits
   - Return specific file failure info
5. If all transcriptions succeed:
   - Concatenate transcripts with file headers
   - Apply selected prompt once to combined content
   - Return single combined result
```

#### Processing Mode Availability

| Mode                      | Anonymous | Authenticated | With API Key |
| ------------------------- | --------- | ------------- | ------------ |
| Separate (single file)    | ✓         | ✓             | ✓            |
| Separate (multiple files) | ✗         | ✓             | ✓            |
| Combine                   | ✗         | ✓             | ✓            |

### 4.3 Error Code Reference

#### Smelt Error Codes (smelt_error_code enum)

| Code                   | HTTP Status | User Message                                 |
| ---------------------- | ----------- | -------------------------------------------- |
| `file_too_large`       | 400         | FILE TOO CHUNKY. MAX 25MB                    |
| `invalid_format`       | 400         | CAN'T READ THAT. TRY .MP3 .WAV .M4A          |
| `duration_exceeded`    | 400         | AUDIO TOO LONG. MAX 30 MINUTES               |
| `corrupted_file`       | 422         | CORRUPTED FILE. TRY A DIFFERENT ONE          |
| `transcription_failed` | 500         | TRANSCRIPTION FAILED. TRY AGAIN              |
| `synthesis_failed`     | 500         | PROCESSING FAILED. TRY AGAIN                 |
| `api_rate_limited`     | 429         | RATE LIMITED. TRY AGAIN IN {seconds} SECONDS |
| `api_quota_exhausted`  | 402         | API QUOTA EXHAUSTED                          |
| `api_key_invalid`      | 401         | API KEY INVALID                              |
| `connection_lost`      | 503         | CONNECTION LOST. TRY AGAIN                   |
| `internal_error`       | 500         | SOMETHING WENT WRONG. TRY AGAIN              |

#### File Error Codes (smelt_file_error_code enum)

| Code                   | User Message                        |
| ---------------------- | ----------------------------------- |
| `file_too_large`       | FILE TOO CHUNKY. MAX 25MB           |
| `invalid_format`       | CAN'T READ THAT. TRY .MP3 .WAV .M4A |
| `duration_exceeded`    | AUDIO TOO LONG. MAX 30 MINUTES      |
| `corrupted_file`       | CORRUPTED FILE. TRY A DIFFERENT ONE |
| `transcription_failed` | TRANSCRIPTION FAILED FOR THIS FILE  |
| `decoding_failed`      | COULDN'T DECODE THIS FILE           |

### 4.4 Security Measures

1. **API Key Encryption**: User API keys are encrypted before storage using server-side encryption
2. **IP Hashing**: Anonymous user IPs are SHA-256 hashed before storage
3. **CORS**: Strict CORS policy allowing only the application domain
4. **Rate Limiting**: 100 requests/minute per IP to prevent abuse
5. **File Validation**: Server-side validation of all file constraints regardless of client-side checks
6. **RLS Policies**: Row-level security ensures users can only access their own data
7. **Token Expiry**: Short-lived access tokens (1 hour) minimize exposure from token theft
8. **No File Storage**: Audio files processed in memory, temporary storage only for format conversion with immediate cleanup
