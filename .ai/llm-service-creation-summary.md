# LLM Service Migration Summary

## Overview

This document summarizes the migration of LLM processing services from the Python/FastAPI chaos-smelter backend to the TypeScript-based 10x-smelter monorepo.

---

## Files Created

### Phase 1: Core LLM Infrastructure

| File                                        | Purpose                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/services/llm/types.ts`             | TypeScript types for OpenRouter API requests/responses                |
| `src/lib/services/llm/openrouter.client.ts` | API client with retry logic, exponential backoff, rate limit handling |
| `src/lib/services/llm/index.ts`             | Module exports                                                        |

**Error Types Added** to `src/lib/utils/errors.ts`:

- `LLMTimeoutError` - Request timeout (504)
- `LLMRateLimitError` - Rate limit exceeded (429)
- `LLMAPIError` - Generic API error (502)
- `TranscriptionError` - Transcription failed (500)
- `SynthesisError` - Synthesis failed (500)
- `FileTooLargeError` - File exceeds 25MB limit (413)
- `InvalidFormatError` - Unsupported audio format (415)
- `DurationExceededError` - Audio exceeds 30 min (413)
- `CorruptedFileError` - File appears corrupted (422)
- `AudioConversionError` - FFmpeg conversion failed (500)

### Phase 2: Audio Processing

| File                                      | Purpose                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `src/lib/services/audio/validation.ts`    | Format, size, and duration validation per PRD limits |
| `src/lib/services/audio/conversion.ts`    | FFmpeg integration for audio-to-MP3 conversion       |
| `src/lib/services/audio/transcription.ts` | Audio-to-text using Gemini 2.5 Pro via OpenRouter    |
| `src/lib/services/audio/index.ts`         | Module exports                                       |

**Supported Formats**: MP3, WAV, M4A, OGG, FLAC, AAC, WebM

**Limits**:

- Max file size: 25 MB
- Max duration: 30 minutes

### Phase 3: Synthesis & Prompts

| File                                              | Purpose                                |
| ------------------------------------------------- | -------------------------------------- |
| `src/lib/prompts/predefined/summarize.md`         | Executive summary with key points      |
| `src/lib/prompts/predefined/action_items.md`      | Extract todos and action items         |
| `src/lib/prompts/predefined/detailed_notes.md`    | Structured notes with headers          |
| `src/lib/prompts/predefined/qa_format.md`         | Question and answer format             |
| `src/lib/prompts/predefined/table_of_contents.md` | Overview with section outline          |
| `src/lib/services/prompts/loader.ts`              | Loads predefined and custom prompts    |
| `src/lib/services/prompts/index.ts`               | Module exports                         |
| `src/lib/services/synthesis/synthesis.service.ts` | Applies prompts to transcribed content |
| `src/lib/services/synthesis/index.ts`             | Module exports                         |

### Phase 4: Storage & Integration

| File                                       | Purpose                                   |
| ------------------------------------------ | ----------------------------------------- |
| `src/lib/services/storage/file-storage.ts` | Supabase Storage for file upload/download |
| `src/lib/services/storage/index.ts`        | Module exports                            |

---

## Files Modified

| File                                     | Changes                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `src/lib/realtime/processing.service.ts` | Full pipeline implementation replacing TODOs                |
| `src/lib/services/smelts.service.ts`     | Added file upload to Supabase Storage during smelt creation |
| `src/lib/utils/errors.ts`                | Added LLM and audio processing error classes                |
| `package.json`                           | Added fluent-ffmpeg dependencies                            |

---

## Dependencies Added

```bash
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
npm install -D @types/fluent-ffmpeg
```

---

## Supabase Storage Setup

**Note:** Storage is only used for **authenticated users**. Anonymous users process files in-memory with no storage overhead.

### Migration File

A migration file has been created at:

```
supabase/migrations/20260119000000_create_smelt_files_storage.sql
```

This migration:

1. Creates the `smelt-files` storage bucket (private, 25MB limit)
2. Configures allowed MIME types for audio and text files
3. Creates a helper function `public.get_smelt_id_from_path()` for RLS
4. Sets up RLS policies:
   - Service role: full access for background processing
   - Authenticated users: access only their own smelt files (verified via `smelts` table ownership)

### Applying the Migration

#### Option 1: Via Supabase CLI (Recommended)

```bash
# Push all pending migrations
supabase db push

# Or reset and apply all migrations
supabase db reset
```

#### Option 2: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20260119000000_create_smelt_files_storage.sql`
4. Run the SQL

#### Option 3: Manual Bucket Creation (if migration fails)

If you need to create the bucket manually:

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Configure:
   - **Name**: `smelt-files`
   - **Public bucket**: Leave unchecked (private)
   - **File size limit**: 26214400 (25 MB)
4. Then run the RLS policies from the migration file in SQL Editor

### Storage Structure

Files are stored with the following path convention:

```
smelt-files/
├── {smelt_id}/
│   ├── {file_id}.mp3        # Audio file
│   ├── {file_id}.txt        # Text input
│   └── results/
│       └── {file_id}.md     # Processing results
```

---

## Processing Pipeline Flow

### Authenticated Users (with storage)

```
1. POST /api/smelts
   ├── Validate input
   ├── Create smelt record in database
   ├── Upload files to Supabase Storage
   ├── Fire-and-forget: processSmelt()
   └── Return smelt ID + subscription channel

2. processSmelt() [Background]
   ├── Stage 1: Validating (0-10%)
   │   ├── Download files from storage
   │   └── Validate format, size, duration
   │
   ├── Stage 2: Decoding (10-20%)
   │   └── Prepare audio for transcription
   │
   ├── Stage 3: Transcribing (20-70%)
   │   ├── Convert non-MP3 to MP3 (FFmpeg)
   │   ├── Encode to base64
   │   └── Send to Gemini 2.5 Pro via OpenRouter
   │
   ├── Stage 4: Synthesizing (70-100%)
   │   ├── Load prompts (predefined + custom)
   │   ├── Apply prompts to transcript
   │   └── Store results in Supabase Storage
   │
   └── Broadcast completion via Supabase Realtime
```

### Anonymous Users (in-memory, no storage)

```
1. POST /api/smelts
   ├── Validate input
   ├── Create smelt record via RPC (SECURITY DEFINER)
   ├── Convert files to in-memory buffers
   ├── Fire-and-forget: processSmeltWithFiles()
   └── Return smelt ID + subscription channel

2. processSmeltWithFiles() [Background]
   ├── Stage 1: Validating (0-10%)
   │   └── Validate in-memory files
   │
   ├── Stage 2-3: Transcribing (10-70%)
   │   ├── Convert non-MP3 to MP3 (FFmpeg temp files)
   │   └── Send to Gemini 2.5 Pro via OpenRouter
   │
   ├── Stage 4: Synthesizing (70-100%)
   │   ├── Load predefined prompts only
   │   └── Apply prompts to transcript
   │
   └── Broadcast completion via Supabase Realtime
       (results delivered via WebSocket only, not stored)
```

---

## API Key Handling

The system supports two modes:

1. **User API Key**: If user has a valid OpenRouter API key stored:
   - Key is decrypted from `user_api_keys` table
   - Used for all LLM requests (no credit deduction)

2. **System API Key**: If user has no valid key:
   - Uses `OPENROUTER_API_KEY` from environment
   - Deducts credit from user's balance

---

## Models Used

| Purpose       | Model                           | Provider   |
| ------------- | ------------------------------- | ---------- |
| Transcription | `google/gemini-2.5-pro-preview` | OpenRouter |
| Synthesis     | `anthropic/claude-3.5-sonnet`   | OpenRouter |

---

## Verification Checklist

After deployment, verify:

- [ ] Supabase Storage bucket `smelt-files` exists
- [ ] RLS policies allow authenticated access
- [ ] `OPENROUTER_API_KEY` is set in environment
- [ ] Upload MP3 file → receives transcript
- [ ] Upload M4A file → converts and transcribes
- [ ] Select predefined prompt → correct output format
- [ ] Select custom prompt → applies user prompt
- [ ] Progress updates display in real-time
- [ ] User with API key → uses their key
- [ ] User without API key → uses system key, deducts credit
- [ ] Rate limit → graceful error message
- [ ] Large file (>25MB) → rejection with error
