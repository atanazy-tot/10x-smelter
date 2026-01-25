# SMELT MVP - PRD Planning Summary

## Project Overview

**SMELT** is a neobrutalist web application that transforms messy notes (primarily audio recordings, with support for text input) into clean, structured Markdown documents. The project originated from a hackathon need: recording brainstorming sessions without interrupting flow for note-taking, then easily transforming those recordings into structured notes.

---

## Decisions Made

### 1. Target Users & Use Cases

- **Primary personas**: Students, professionals, journalists, content creators
- **Core use case**: Recording discussions/lectures/interviews and converting them to structured markdown
- **Secondary use cases**: Quick text cleanup, multi-source note synthesis

### 2. File Processing

- **Supported formats**: Audio (MP3, WAV, M4A) as primary, text input as secondary priority
- **File limits**: 25MB per file, 30 minutes of audio maximum
- **Concurrent processing**: Maximum 5 files at once
- **Privacy**: Files converted on server but never saved permanently (current implementation acceptable)

### 3. Prompt System

- **Predefined prompts**: 5 solid prompts available to all users
- **Predefined location**: Near SMELT button (below or above upload box), NOT in sidebar
- **No example prompts**: Keep UI clean, no tutorial prompts in the library
- **Custom prompts**: Unlimited for logged-in users
- **Prompt creation**: Upload .MD file OR create from scratch on page
- **Prompt validation**: 4,000 character limit, reject files >10KB with message "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS."
- **Prompt organization**: Visual divisors (user-named sections like "Work," "Personal"), purely visual
- **Prompt management**: Basic CRUD (Create, Read, Delete), inline edit for renaming
- **Storage**: Supabase database with user_id foreign key
- **Customization level**: Only prompt text exposed, no temperature/max_tokens/model selection

### 4. Usage Limits & Authentication

- **Anonymous users**: 1 daily smelt (completed processing)
- **Logged-in users**: 5 weekly smelts
- **Power users**: Unlimited with own OpenAI API key
- **Credit consumption**: One completed smelting = one credit
- **Limit messaging**: "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED."
- **Exhausted weekly limit**: "5/5 SMELTS USED THIS WEEK. RESETS IN 3 DAYS. OR ADD YOUR API KEY FOR UNLIMITED."
- **Usage counter**: Visible in header, color-coded (lime = available, coral = limit reached)
- **Authentication**: Supabase AUTH
- **No payment processing**: MVP only offers "add your API key" path, no paid tiers

### 5. Multi-File Processing

- **Anonymous users**: Process files separately (current chaos-smelter behavior)
- **Logged-in users**: Option to combine multiple files into one response
- **UI toggle**: [ SEPARATE ] / [ COMBINE ] shown when 2+ files uploaded by logged-in users
- **Default mode**: COMBINE for logged-in users
- **Processing flow for combined mode**:
  1. Transcribe all files in parallel (separate LLM calls)
  2. Concatenate transcripts with file name headers
  3. Apply selected prompt once to the combined content (single LLM call)

### 6. API Key Management

- **Validation**: Test key on save with validation states ("TESTING KEY..." → "KEY VALID ✓" / "KEY INVALID ✗")
- **Storage**: Encrypted in Supabase
- **Balance checking**: No quota/balance validation, just verify key works

### 7. Results & Output

- **Display**: Copy-to-clipboard and download as .MD file (chaos-smelter implementation)
- **History**: No saving to history for MVP - results are ephemeral
- **Metadata**: No word count, processing time, token usage, or cost estimation for MVP
- **Privacy**: Results not stored server-side

### 8. User Experience

- **Design**: Neobrutalist (hard shadows, thick borders, no border-radius, bold typography)
- **Onboarding**: NONE - UI speaks for itself, no tooltips, no tours, no sample audio
- **Progress**: Real-time WebSocket updates with progress bar
- **Error messages**: Neobrutalist tone (e.g., "FILE TOO CHUNKY. MAX 25MB.")

### 9. Success Metrics

- Weekly active users (WAU)
- Average files processed per user
- Custom prompt creation rate
- 7-day retention rate
- **Initial targets**: 100 WAU, 60% week-1 retention

### 10. Not in MVP

- Example/tutorial prompts
- Prompt versioning or sharing
- Usage statistics ("Last used", "Used X times")
- Advanced prompt parameters (temperature, max_tokens)
- Model selection per prompt
- Payment processing / paid tiers
- Save to history feature
- Projects or collections
- Onboarding experience
- Metadata display (tokens, cost, processing time)
- Balance/quota checking for API keys

---

## Matched Recommendations

### User Management

1. **Define 2-3 specific user personas** → Confirmed: Students, professionals, journalists, content creators
2. **Magic link authentication for simplicity** → Modified: Using Supabase AUTH instead

### File Processing

3. **Start with audio (MP3, WAV, M4A) as primary format, text as secondary** → Confirmed
4. **Set file limits: 25MB per file or 30 minutes of audio** → Confirmed
5. **Process files in memory only, never store** → Confirmed (with temp files for conversion only)

### Prompt System

6. **Start with 5-8 well-crafted prompts** → Confirmed: 5 predefined prompts
7. **Simple text area for custom prompts** → Confirmed
8. **Limit prompts to 4,000 characters** → Confirmed
9. **Store prompts in Supabase with user_id** → Confirmed
10. **Purely visual divisors for organization** → Confirmed

### Usage Limits

11. **Hybrid approach: limited free credits + user API keys** → Confirmed: 1/day anonymous, 5/week logged-in, unlimited with API key
12. **Show prominent usage indicator with color coding** → Confirmed: Lime for available, coral for limit
13. **Only "add your API key" path, no payment processing** → Confirmed

### Multi-File Processing

14. **Send all transcripts together to one prompt** → Confirmed: Transcribe in parallel, then combine
15. **Toggle between SEPARATE/COMBINE modes** → Confirmed, default to COMBINE for logged-in users

### Results & Privacy

16. **Simple split-screen with copy-to-clipboard and download** → Confirmed: Download as .MD
17. **Privacy-first: no saving results** → Confirmed: Ephemeral results only
18. **Validate API key on save** → Confirmed with visual feedback

### UX Decisions

19. **Skip complex tutorials** → Confirmed: No onboarding at all
20. **Not for MVP: usage statistics** → Confirmed

---

## PRD Planning Summary

### Main Functional Requirements

#### Core Processing Engine

1. **File Upload & Validation**
   - Accept audio files (MP3, WAV, M4A) and text input
   - Validate file size (max 25MB) and duration (max 30 minutes)
   - Support drag-and-drop interface
   - Maximum 5 concurrent files

2. **Audio Transcription**
   - Use LLM (via OpenRouter/OpenAI) for audio transcription
   - Process multiple files in parallel
   - Real-time progress updates via WebSocket
   - Temporary file conversion for M4A (current implementation)

3. **Text Synthesis**
   - Apply user-selected prompt to transcribed content
   - For combined mode: concatenate transcripts with headers, then apply prompt once
   - For separate mode: apply prompt to each file individually
   - Return clean markdown output

#### Prompt Management System

1. **Predefined Prompts**
   - 5 default prompts available to all users
   - Displayed near SMELT button (not in sidebar)
   - Cannot be edited or deleted
   - Examples: "Quick Summary," "Action Items," "Detailed Notes," "Q&A Format," "Table of Contents"

2. **Custom Prompts**
   - Available only to logged-in users
   - Create via: (a) upload .MD file, or (b) create from scratch
   - CRUD operations: Create, Read, Delete, inline edit for renaming
   - Visual organization with user-created divisors/sections
   - 4,000 character limit per prompt
   - Persist in Supabase database

#### Usage & Credit System

1. **Anonymous Users**
   - 1 free smelt per day
   - Can only use predefined prompts
   - Can only process files separately
   - Tracked via browser fingerprint or IP

2. **Logged-In Users**
   - 5 free smelts per week
   - Access to custom prompt library
   - Can combine multiple files into one result
   - Toggle between SEPARATE/COMBINE modes
   - Usage counter visible in header

3. **Power Users (Own API Key)**
   - Unlimited processing
   - API key validated on save
   - Keys stored encrypted in Supabase
   - Use their own OpenAI API key

#### Authentication & User Management

1. **Supabase AUTH integration**
2. **User profile with API key storage**
3. **Weekly usage reset mechanism**
4. **Pre-flight credit checks**

#### Results Display

1. **Markdown output in scrollable block**
2. **Copy-to-clipboard button**
3. **Download as .MD file**
4. **No persistence - ephemeral results only**

### Key User Stories

#### Story 1: Anonymous Quick Smelt

**As an** anonymous visitor
**I want to** quickly transcribe a meeting recording
**So that I can** get clean notes without creating an account

**Flow**:

1. Visit SMELT homepage
2. Drop audio file or paste text
3. Select one of 5 predefined prompts
4. Click SMELT IT
5. Watch real-time progress
6. Copy or download markdown result
7. Refreshing page clears everything

**Acceptance Criteria**:

- File processed in <2 minutes for 10-minute audio
- Clear error messages if file too large
- One usage per day enforced
- After daily limit: see "SIGN UP FOR 5/WEEK" message

#### Story 2: Registered User with Custom Prompts

**As a** registered user
**I want to** create and save custom prompts
**So that I can** reuse my preferred formatting styles

**Flow**:

1. Log in to SMELT
2. Navigate to prompt library (left sidebar)
3. Upload .MD file OR create from scratch
4. Name the prompt and assign to a section/divisor
5. Use custom prompt for processing
6. Prompts persist across sessions

**Acceptance Criteria**:

- Unlimited custom prompts
- Prompts sync across devices
- Can rename inline
- Can delete custom prompts
- 4,000 character limit enforced
- Visual divisors for organization

#### Story 3: Multi-File Lecture Notes

**As a** student
**I want to** combine recordings from multiple lecture parts
**So that I can** get one coherent set of notes

**Flow**:

1. Log in to SMELT
2. Drop 3 audio files (lecture parts 1, 2, 3)
3. See toggle: [ SEPARATE ] / [ COMBINE ]
4. Select COMBINE mode
5. Choose "Lecture Summary" prompt
6. Click SMELT IT (uses 1 of 5 weekly credits)
7. Wait for parallel transcription
8. Receive single combined markdown document
9. Download as lecture-notes.md

**Acceptance Criteria**:

- Up to 5 files can be combined
- Each file transcribed in parallel
- Transcripts concatenated with file name headers
- One prompt applied to combined content
- Consumes only 1 credit (not 3)
- Clear indication: "3/5 LEFT THIS WEEK"

#### Story 4: Power User with API Key

**As a** content creator
**I want to** use my own OpenAI API key
**So that I can** process unlimited files without weekly limits

**Flow**:

1. Log in to SMELT
2. Navigate to settings/profile
3. Enter OpenAI API key
4. System validates key ("TESTING KEY..." → "KEY VALID ✓")
5. Key stored encrypted
6. Process unlimited files
7. Usage counter shows "UNLIMITED"

**Acceptance Criteria**:

- API key validated before saving
- Clear error if key invalid
- Key encrypted in Supabase
- No weekly limit enforced
- Can still use all custom prompts
- Can remove key to return to free tier

#### Story 5: Journalist Interview Transcription

**As a** journalist
**I want to** transcribe interview recordings with speaker detection
**So that I can** quickly create interview quotes

**Flow**:

1. Log in to SMELT
2. Upload interview.m4a
3. Select "Interview Transcript" predefined prompt
4. Process in SEPARATE mode
5. Receive transcript with speaker labels
6. Copy specific quotes to article

**Acceptance Criteria**:

- M4A converted to MP3 automatically
- Speaker detection in transcription
- Clean formatting for quotes
- Fast copy-to-clipboard

### Success Criteria & Measurement

#### Product-Market Fit Indicators

1. **Weekly Active Users (WAU)**
   - Target: 100 WAU within 3 months of launch
   - Measurement: Unique users who complete ≥1 smelt per week
   - Tool: Analytics dashboard (PostHog, Plausible, or simple DB query)

2. **7-Day Retention Rate**
   - Target: 60% week-1 retention
   - Measurement: % of new users who return within 7 days
   - Cohort analysis by signup week

3. **Average Files Processed Per User**
   - Target: 3+ files per active user per week
   - Indicates product stickiness and value
   - Measurement: Total smelts / active users

4. **Custom Prompt Creation Rate**
   - Target: 40% of logged-in users create ≥1 custom prompt
   - Indicates engagement beyond basic features
   - Measurement: Users with custom prompts / total registered users

#### Technical Performance Metrics

1. **Processing Time**
   - Target: <2 minutes for 10-minute audio file
   - Measurement: Time from "SMELT IT" click to "DONE" status

2. **Error Rate**
   - Target: <5% of processing attempts fail
   - Measurement: Failed smelts / total attempts
   - Track by error type (file too large, transcription failed, etc.)

3. **API Key Adoption**
   - Target: 10% of users add own API key
   - Indicates power user segment
   - Measurement: Users with valid API key / total registered

#### User Satisfaction Signals

1. **Download Rate**
   - Target: 80%+ of results downloaded as .MD
   - Indicates perceived value of output
   - Measurement: Downloads / completed smelts

2. **Multi-File Usage**
   - Target: 25% of logged-in users use COMBINE mode
   - Validates premium feature value
   - Measurement: Combined smelts / total logged-in smelts

3. **Free → Registered Conversion**
   - Target: 20% of anonymous users create account
   - Measurement: Signups after hitting daily limit

### Design Constraints & Impact

#### Neobrutalist Design System

**Constraints**:

- Hard offset shadows (8-12px, no blur)
- Thick black borders (4-6px)
- Zero border-radius
- Limited color palette: Cream (#FFFEF0), Lime (#E8FF8D), Lavender (#C8B6FF), Coral (#FF6B6B), Cyan (#A8E6FF)
- Typography: Space Mono, uppercase headers
- Physical button press effects

**Impact on Development**:

- Custom CSS required (no standard component libraries)
- Careful attention to accessibility (high contrast helps)
- Consistent shadow/border patterns across all components
- Mobile responsiveness requires custom breakpoints

#### One-Page App Architecture

**Constraints**:

- Single-page application
- All interactions without page reload
- WebSocket for real-time updates
- State managed via nanostores

**Impact on Development**:

- Astro with client-side hydration
- WebSocket connection management
- State persistence in browser (logged-out users)
- Careful loading state management

#### Privacy-First Approach

**Constraints**:

- No server-side storage of uploaded files
- No results history
- Minimal user data collection
- Temporary files only for format conversion

**Impact on Development**:

- In-memory processing where possible
- Immediate cleanup of temp files
- No database tables for file storage
- Clear privacy messaging in UI

#### No Payment Processing

**Constraints**:

- MVP cannot collect payments
- Only "bring your own API key" for power users
- Free tier limits must be sufficient for trial

**Impact on Development**:

- Simpler backend (no Stripe integration)
- Focus on API key management UI
- Credit system purely rate-limiting
- Future revenue model TBD

---

## Unresolved Issues

### Content & Copywriting

1. **Predefined Prompt Content**: Exact wording and prompt engineering for the 5 default prompts needs to be defined
2. **Error Message Catalog**: Complete list of all error states and their neobrutalist messages
3. **UI Microcopy**: Header tagline, footer text, button labels need final copy

### UI/UX Details

4. **Predefined Prompt Placement**: Exact layout near SMELT button (above vs below? horizontal vs vertical?)
5. **Prompt Divisor UI**: Visual design for section headers in prompt library (collapsible? drag-to-reorder?)
6. **Usage Counter Design**: Exact placement in header, size, animation on limit reached
7. **Toggle Component Design**: Visual design for [ SEPARATE ] / [ COMBINE ] toggle
8. **Mobile Responsiveness**: Layout for prompt library sidebar on mobile devices (slide-out drawer? bottom sheet?)

### Technical Implementation

9. **Database Schema**: Complete Supabase schema for prompts table (indexes, constraints)
10. **WebSocket Reconnection**: Handling connection drops during long transcription
11. **File Upload Progress**: Show upload progress before processing starts (for large files)
12. **Concurrent Processing Limits**: Server-side queue management for 5-file limit
13. **API Key Encryption**: Specific Supabase encryption method for API keys
14. **Anonymous User Tracking**: Exact method (IP vs browser fingerprint vs localStorage)
15. **Weekly Reset Logic**: Timezone handling for "week" definition (UTC? User timezone?)

### Edge Cases & Error Handling

16. **Partial Failure in Multi-File**: What if 2 of 3 files transcribe successfully but 1 fails in COMBINE mode?
17. **Credit Consumption on Failure**: Should failed attempts consume credits?
18. **API Key Quota Exhaustion**: How to handle when user's own API key runs out of credits mid-processing?
19. **File Format Edge Cases**: Handling corrupted audio files, zero-length files, non-audio files with audio extensions
20. **Prompt Injection**: Safeguards against malicious custom prompts that might manipulate system behavior

### Performance & Scaling

21. **Concurrent User Limits**: Maximum simultaneous WebSocket connections supported
22. **LLM Rate Limiting**: Handling OpenRouter/OpenAI rate limits gracefully
23. **Large File Optimization**: Chunking strategy for audio files approaching 25MB limit
24. **Database Indexing**: Query optimization for prompt library with many custom prompts

### Future Considerations (Post-MVP)

25. **Monetization Strategy**: Paid tiers, credit packs, or enterprise plans?
26. **History/Projects**: Database design if adding save functionality later
27. **Prompt Sharing**: Community prompt library or marketplace?
28. **Additional File Types**: Image processing (OCR), PDF extraction, video transcription
29. **Export Formats**: Support for formats beyond .MD (PDF, DOCX, TXT)?
30. **Integrations**: Notion, Obsidian, Google Drive sync?

---

## Appendix: Reference Implementation

Current chaos-smelter implementation provides validated patterns for:

- File upload via drag-and-drop
- WebSocket protocol for progress updates
- Audio transcription flow with temporary file conversion
- Results display with copy/download
- Neobrutalist design system
- Error message tone and style

Key files to reference:

- `chaos-smelter/frontend/src/App.tsx` - Overall app structure
- `chaos-smelter/backend/app/routers/process.py` - WebSocket endpoint
- `chaos-smelter/backend/app/services/audio.py` - Transcription service
- `chaos-smelter/CLAUDE.md` - Design system and architecture notes
