# Product Requirements Document (PRD) - SMELT

## 1. Product Overview

SMELT is a single-page web application that transforms messy notes into clean, structured Markdown documents. The application primarily processes audio recordings (meetings, lectures, interviews, brainstorming sessions) but also supports direct text input.

The product originated from a real need during hackathons: participants wanted to focus entirely on ideation and discussion without breaking flow to take notes. SMELT allows users to record conversations, then quickly transform those recordings into structured, actionable notes.

The MVP focuses on simplicity and speed, offering a straightforward interface where users can drop files, select a processing prompt, and receive clean Markdown output within minutes. The application employs a neobrutalist design aesthetic - bold, high-contrast, and deliberately minimal.

Target Users:
- Students recording and summarizing lectures
- Professionals transcribing meeting recordings
- Journalists creating interview transcripts
- Content creators organizing brainstorming sessions

Key Differentiators:
- Privacy-first approach with no server-side file storage
- Customizable prompt library for personalized output formats
- Multi-file combination for coherent notes from multiple sources
- Generous free tier with option to use own API keys for unlimited access

## 2. User Problem

Users face several pain points when trying to convert recorded discussions or messy notes into structured documents:

1. Context Switching: Taking notes during discussions disrupts focus and breaks conversation flow. Users want to participate fully while still capturing important information.

2. Time-Consuming Transcription: Manual transcription of audio recordings is tedious and time-intensive. A 30-minute recording can take hours to transcribe and clean up manually.

3. Inconsistent Formatting: Raw transcripts or hastily written notes lack structure, making them difficult to review and use later. Users need consistent, clean output formats.

4. Tool Complexity: Existing solutions often require complex workflows, multiple tools, or technical expertise. Users want a simple drop-and-go experience.

5. Privacy Concerns: Users are hesitant to upload sensitive recordings (business meetings, confidential interviews) to services that permanently store files.

6. Output Customization: Different use cases require different output formats (meeting summaries vs. detailed transcripts vs. action item lists), but most tools offer only one style.

SMELT solves these problems by providing:
- A fast, simple interface requiring no technical knowledge
- AI-powered transcription and structuring in minutes
- Customizable prompts for different output styles
- Privacy-first design with no permanent file storage
- Free tier for casual users, unlimited access for power users

## 3. Functional Requirements

### 3.1 File Input and Validation

The application must accept audio files and text input through a drag-and-drop interface or manual selection.

Supported Formats:
- Audio: MP3, WAV, M4A
- Text: Direct paste into text area

File Constraints:
- Maximum file size: 25MB per file
- Maximum audio duration: 30 minutes
- Maximum concurrent files: 5 files
- Files requiring format conversion (M4A) are converted server-side using temporary storage with immediate cleanup

Input Methods:
- Drag-and-drop zone for file upload
- Click-to-browse file selector
- Direct text paste area
- Mutual exclusivity: selecting files clears text input and vice versa

### 3.2 Processing Modes

The application supports two processing modes with different availability based on user authentication status.

Separate Mode:
- Processes each file individually
- Each file receives its own result
- Available to all users (anonymous and logged-in)
- Anonymous users can only use this mode

Combine Mode:
- Available only to logged-in users
- Processes multiple files into a single coherent output
- Transcribes all files in parallel
- Concatenates transcripts with file name headers
- Applies selected prompt once to combined content
- Toggle UI element shows when 2 or more files are uploaded
- Default mode for logged-in users with multiple files

### 3.3 Prompt System

The application provides predefined prompts and allows logged-in users to create custom prompts.

Predefined Prompts:
- 5 default prompts available to all users
- Displayed near the process button (above or below upload area)
- Cannot be edited or deleted
- Provide common use cases (summarization, action items, detailed notes, Q&A format, table of contents)

Custom Prompts (Logged-in Users Only):
- Unlimited custom prompts per user
- Two creation methods: upload .MD file or create from scratch
- Maximum prompt length: 4,000 characters
- Visual organization with user-created section divisors
- CRUD operations: Create, Read, Delete
- Inline rename functionality
- Prompts persist across sessions and devices
- Displayed in sidebar prompt library

Prompt Constraints:
- .MD files larger than 10KB rejected with error message
- Character counter displayed during editing
- Only prompt text exposed (no advanced parameters like temperature or model selection)

### 3.4 Usage Limits and Credit System

The application implements a tiered usage system based on authentication status and API key configuration.

Anonymous Users:
- 1 free smelt per day
- Tracked by IP address
- Can only use predefined prompts
- Can only process files in separate mode
- Daily limit resets at midnight UTC

Logged-in Users:
- 5 free smelts per week
- Weekly limit resets every Monday at midnight UTC
- Access to custom prompt library
- Can use both separate and combine modes
- Usage counter visible in header with color coding (lime = available, coral = limit reached)

Power Users (Own API Key):
- Unlimited processing
- Must provide valid OpenAI API key
- API key validated before saving
- Keys stored encrypted
- Usage counter displays "UNLIMITED"

Credit Consumption Rules:
- One completed smelting operation = one credit
- Failed processing attempts do not consume credits
- Credits are consumed per successful operation (per user-initiated run), regardless of mode or file count

Pre-flight Checks:
- System validates sufficient credits before processing
- Clear error messages when limits exceeded
- Call-to-action prompts for account creation or API key addition

### 3.5 Authentication and User Management

User authentication is handled through a third-party authentication service.

Anonymous Access:
- No account required for basic usage
- IP-based rate limiting
- No data persistence (ephemeral session)

Account Creation:
- Required for custom prompts and increased weekly limits
- Authentication handled by external service
- Minimal user data collection

User Profile:
- API key storage (encrypted)
- Custom prompt library
- Usage statistics (credits remaining, reset date)
- API key validation status

### 3.6 Processing and Progress Tracking

File processing occurs in real-time with continuous progress updates.

Processing Flow:
1. File validation (format, size, duration)
2. Audio transcription via LLM API
3. Text synthesis using selected prompt
4. Result delivery

Progress Reporting:
- Real-time progress updates via WebSocket connection
- Progress bar showing percentage complete
- Status messages at each stage
- Multiple file processing shows individual progress

Processing Stages:
- Validating (10%)
- Decoding (20%)
- Transcribing (30-70%)
- Synthesizing (70-100%)
- Done (100%)

### 3.7 Results Display and Export

Processing results are displayed immediately with export options.

Display Format:
- Scrollable text block with Markdown formatting
- Clean, readable presentation
- No metadata (word count, tokens, processing time) in MVP

Export Options:
- Copy to clipboard button
- Download as .MD file
- File naming convention includes timestamp or source file name

Data Persistence:
- Results are ephemeral (not saved server-side)
- Refreshing page clears all results
- Users must download to preserve output
- No history or project management features in MVP

### 3.8 Error Handling

The application provides clear, actionable error messages in a consistent tone.

Error Categories:
- File validation errors (size, format, duration)
- Processing errors (transcription failed, API errors)
- Authentication errors (invalid credentials, session expired)
- Rate limit errors (daily/weekly quota exceeded)
- API key errors (invalid, quota exhausted)

Error Message Tone:
- Neobrutalist style (direct, bold, no apologetic language)
- All caps for emphasis
- Clear indication of the problem
- Actionable next steps where applicable

Examples:
- "FILE TOO CHUNKY. MAX 25MB."
- "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED."
- "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS."
- "5/5 SMELTS USED THIS WEEK. RESETS IN 3 DAYS. OR ADD YOUR API KEY FOR UNLIMITED."

### 3.9 Privacy and Data Handling

The application implements a privacy-first architecture.

File Handling:
- Files processed in memory when possible
- Temporary disk storage only for format conversion
- Immediate deletion after processing
- No permanent server-side file storage

User Data:
- Minimal data collection (email, usage statistics)
- Custom prompts stored with user association
- API keys stored encrypted
- No tracking of file content or results

Privacy Messaging:
- Clear communication that files are never saved
- Transparent about temporary processing
- No analytics on file content

## 4. Product Boundaries

### 4.1 In Scope for MVP

The MVP includes the following features:

User Features:
- Anonymous single-file processing with daily limit
- User registration and authentication
- Custom prompt creation, editing, and deletion
- Multi-file processing with separate and combine modes
- API key management for unlimited access
- Real-time processing progress
- Copy and download results

Processing Capabilities:
- Audio transcription (MP3, WAV, M4A)
- Text input processing
- 5 predefined prompts
- Unlimited custom prompts for logged-in users
- Parallel transcription for multiple files
- Combined synthesis for multi-file processing

Technical Features:
- Single-page application architecture
- Real-time WebSocket progress updates
- Drag-and-drop file upload
- IP-based rate limiting for anonymous users
- Encrypted API key storage
- Mobile-responsive neobrutalist design

### 4.2 Out of Scope for MVP

The following features are explicitly excluded from the MVP:

Advanced Features:
- Payment processing or paid subscriptions
- Results history or saved outputs
- Project management or file organization
- Prompt sharing or community library
- Usage statistics per prompt
- Prompt versioning or collaboration

Processing Features:
- Additional file formats (images, PDFs, video)
- Export formats beyond Markdown (PDF, DOCX)
- Advanced prompt parameters (temperature, max tokens, model selection)
- Cost estimation or token usage display
- Batch processing automation
- Scheduled processing

User Experience:
- Onboarding tutorials or tooltips
- Sample audio files for testing
- Template prompts or examples in library
- Prompt categories or search
- Drag-to-reorder prompts or divisors

Integrations:
- Third-party service integrations (Notion, Obsidian, Google Drive)
- API for external access
- Webhook notifications
- Email delivery of results

Advanced Analytics:
- Processing time display
- Word count or character count
- Token usage tracking
- Cost calculation for API key users
- Detailed error logging for users

### 4.3 Future Considerations

Features that may be added post-MVP based on user demand:

Phase 2 Candidates:
- Results history with search and organization
- Additional file format support (PDF, images with OCR)
- Prompt sharing marketplace
- Team collaboration features
- Advanced prompt parameters for power users

Phase 3 Candidates:
- Paid subscription tiers
- Export format options (PDF, DOCX)
- Integration with note-taking apps
- Mobile native applications
- API for developers

## 5. User Stories

### 5.1 Authentication and Account Management

US-001: Anonymous Access to Application
- Title: Access SMELT without creating an account
- Description: As an anonymous visitor, I want to access SMELT and process files without creating an account, so that I can quickly try the service before committing to registration.
- Acceptance Criteria:
  - User can access the application homepage without login
  - All core UI elements are visible and functional
  - Predefined prompts are available for selection
  - File upload interface is accessible
  - One smelt per day is available
  - Usage counter shows "1/1 DAILY SMELT AVAILABLE" or similar
  - After using daily smelt, message displays: "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED."
  - IP address determines daily limit enforcement

US-002: User Registration
- Title: Create a new SMELT account
- Description: As an anonymous user who has hit my daily limit or wants access to custom prompts, I want to create an account, so that I can access additional features and increased usage limits.
- Acceptance Criteria:
  - Registration interface accessible from header or limit message
  - Authentication handled through external service
  - Successful registration creates user profile
  - User automatically logged in after registration
  - Usage counter updates to show "5/5 LEFT THIS WEEK"
  - Custom prompt library becomes accessible
  - Combine mode becomes available for multi-file uploads

US-003: User Login
- Title: Log in to existing SMELT account
- Description: As a registered user, I want to log in to my account, so that I can access my custom prompts and weekly usage allowance.
- Acceptance Criteria:
  - Login interface accessible from header
  - Authentication handled through external service
  - Successful login loads user profile
  - Custom prompts sync from database
  - Usage counter displays remaining weekly credits
  - API key status displayed if configured
  - Session persists across page refreshes

US-004: User Logout
- Title: Log out of SMELT account
- Description: As a logged-in user, I want to log out of my account, so that I can protect my privacy on shared devices.
- Acceptance Criteria:
  - Logout button accessible in header or profile area
  - Logout clears session data
  - User redirected to anonymous homepage view
  - Custom prompt library no longer visible
  - Usage counter shows anonymous daily limit
  - Any unsaved results are cleared

### 5.2 File Upload and Validation

US-005: Upload Single Audio File
- Title: Upload one audio file for processing
- Description: As a user, I want to drag and drop or select a single audio file, so that I can transcribe and process it.
- Acceptance Criteria:
  - Drag-and-drop zone accepts MP3, WAV, and M4A files
  - Click-to-browse file selector available
  - Selected file displays name and size
  - File validation occurs immediately after selection
  - Valid file enables process button
  - Invalid file shows error message
  - Selecting file clears any existing text input

US-006: Upload Multiple Audio Files
- Title: Upload multiple audio files for processing
- Description: As a logged-in user, I want to upload multiple audio files at once, so that I can process them together or separately.
- Acceptance Criteria:
  - Drag-and-drop zone accepts up to 5 files simultaneously
  - Each selected file displays name and size
  - File list shows all selected files
  - Individual files can be removed from selection
  - Total file count visible
  - Separate/Combine toggle appears when 2+ files selected
  - All files validated before processing allowed

US-007: File Size Validation
- Title: Reject files exceeding size limit
- Description: As a user attempting to upload a large file, I want to receive a clear error message, so that I understand the file size constraint.
- Acceptance Criteria:
  - Files over 25MB are rejected immediately
  - Error message displays: "FILE TOO CHUNKY. MAX 25MB."
  - File size shown in error message (e.g., "YOUR FILE: 32MB")
  - Process button remains disabled
  - User can remove rejected file and select a different one
  - Other valid files in multi-file upload remain selected

US-008: File Format Validation
- Title: Reject unsupported file formats
- Description: As a user attempting to upload an unsupported file type, I want to receive a clear error message, so that I know which formats are accepted.
- Acceptance Criteria:
  - Files with extensions other than .mp3, .wav, .m4a are rejected
  - Error message displays: "CAN'T READ THAT. TRY .MP3 .WAV .M4A"
  - Process button remains disabled
  - User can select a different file
  - Supported formats displayed in error message

US-009: Text Input Entry
- Title: Enter text directly for processing
- Description: As a user with text notes instead of audio, I want to paste text directly, so that I can process it without creating an audio file.
- Acceptance Criteria:
  - Text area accepts pasted or typed text
  - Text area has reasonable size for visibility
  - Character counter optional but helpful
  - Entering text clears any selected files
  - Text input enables process button
  - Empty text input disables process button

US-010: Switch Between File and Text Input
- Title: Change input method before processing
- Description: As a user who selected the wrong input method, I want to switch between file upload and text input, so that I can correct my choice.
- Acceptance Criteria:
  - Selecting files automatically clears text input
  - Entering text automatically clears selected files
  - Only one input method active at a time
  - Process button reflects active input method
  - No confirmation required for switching
  - Previously entered data is lost when switching

### 5.3 Prompt Selection and Management

US-011: Select Predefined Prompt
- Title: Choose from available default prompts
- Description: As any user (anonymous or logged-in), I want to select one of the predefined prompts, so that I can control the output format.
- Acceptance Criteria:
  - 5 predefined prompts visible near process button
  - Each prompt has descriptive name
  - One prompt can be selected at a time
  - Selected prompt visually distinguished
  - Prompts cannot be edited or deleted
  - Selection persists until changed
  - Default prompt selected if none chosen

US-012: Create Custom Prompt from Scratch
- Title: Write a new custom prompt manually
- Description: As a logged-in user, I want to create a custom prompt by typing it directly, so that I can define my preferred output format without using a file.
- Acceptance Criteria:
  - "Create Prompt" button accessible in prompt library
  - Text editor opens for prompt creation
  - Prompt name field required
  - Prompt content field with 4,000 character limit
  - Character counter displays remaining characters
  - Section/divisor assignment optional
  - Save button creates and stores prompt
  - New prompt appears in library immediately
  - Validation prevents saving empty prompts

US-013: Create Custom Prompt from .MD File
- Title: Upload a markdown file as a custom prompt
- Description: As a logged-in user, I want to upload a .MD file containing my prompt, so that I can quickly import prompts I've created elsewhere.
- Acceptance Criteria:
  - "Upload Prompt" button accessible in prompt library
  - File selector accepts .md files
  - File content becomes prompt text
  - Prompt name can be edited before saving
  - Files over 10KB rejected with message: "PROMPT TOO LONG. KEEP IT UNDER 4,000 CHARS."
  - Section/divisor assignment optional
  - Uploaded prompt appears in library immediately
  - File content validated for character limit

US-014: Edit Custom Prompt Name
- Title: Rename an existing custom prompt
- Description: As a logged-in user, I want to rename my custom prompts, so that I can keep my library organized with meaningful names.
- Acceptance Criteria:
  - Click on prompt name enables inline editing
  - Text field allows name modification
  - Enter key or click away saves new name
  - Escape key cancels editing
  - Empty name prevented
  - Name update reflected immediately in library
  - Prompt content unchanged by rename

US-015: Delete Custom Prompt
- Title: Remove a custom prompt from library
- Description: As a logged-in user, I want to delete custom prompts I no longer need, so that I can keep my library clean and relevant.
- Acceptance Criteria:
  - Delete button/icon available for each custom prompt
  - No confirmation dialog required (or simple confirmation)
  - Prompt removed from library immediately
  - Deletion synced to database
  - Cannot delete predefined prompts
  - If deleted prompt was selected, selection reverts to default

US-016: Organize Prompts with Divisors
- Title: Create sections to organize custom prompts
- Description: As a logged-in user with many custom prompts, I want to create named sections/divisors, so that I can organize my prompts by category.
- Acceptance Criteria:
  - "Add Section" or similar button in prompt library
  - Section name can be specified
  - Prompts can be assigned to sections during creation
  - Prompts can be moved between sections
  - Sections appear as visual separators in library
  - Empty sections can exist
  - Sections are purely visual (no functional difference)

US-017: Select Custom Prompt for Processing
- Title: Use a custom prompt instead of predefined ones
- Description: As a logged-in user, I want to select one of my custom prompts for processing, so that I can use my preferred output format.
- Acceptance Criteria:
  - Custom prompts displayed in sidebar library
  - Click on custom prompt selects it
  - Selected prompt visually distinguished
  - Predefined prompt deselected when custom selected
  - Selected custom prompt used for processing
  - Custom prompt selection persists across sessions

### 5.4 Processing Operations

US-018: Process Single File in Separate Mode
- Title: Transcribe and process one audio file
- Description: As any user, I want to process a single audio file with my selected prompt, so that I can receive clean markdown notes.
- Acceptance Criteria:
  - Process button enabled when file and prompt selected
  - Clicking process button initiates processing
  - Real-time progress bar appears
  - Progress updates show percentage and status
  - Processing stages visible (validating, decoding, transcribing, synthesizing)
  - Processing completes within reasonable time (target: <2 min for 10-min audio)
  - Result displays in scrollable markdown block
  - Copy and download buttons available
  - One credit consumed upon successful completion

US-019: Process Multiple Files in Separate Mode
- Title: Process each file individually
- Description: As any user, I want to process multiple files separately, so that I receive individual results for each file.
- Acceptance Criteria:
  - Separate mode selectable when multiple files uploaded
  - Each file processed independently
  - Progress shown for each file individually
  - Files processed in parallel when possible
  - Each file produces separate result
  - Results displayed sequentially or in tabs
  - Only one credit is consumed upon successful completion (per operation, not per file)
  - Anonymous users cannot use this with multiple files (only logged-in)

US-020: Process Multiple Files in Combine Mode
- Title: Combine multiple files into single output
- Description: As a logged-in user, I want to combine multiple audio files into one coherent document, so that I get unified notes from multi-part recordings.
- Acceptance Criteria:
  - Combine mode available when logged in with 2+ files
  - Toggle shows [ SEPARATE ] / [ COMBINE ] options
  - Combine mode selected by default for logged-in users
  - All files transcribed in parallel
  - Progress shown for each transcription
  - Transcripts concatenated with file name headers
  - Selected prompt applied once to combined content
  - Single result displays combined output
  - Only one credit consumed regardless of file count
  - Maximum 5 files can be combined

US-021: Process Text Input
- Title: Process pasted text with selected prompt
- Description: As any user, I want to process text I've pasted, so that I can clean up and structure written notes.
- Acceptance Criteria:
  - Process button enabled when text entered and prompt selected
  - Clicking process initiates text processing
  - Progress bar shows processing stages
  - Skips transcription stage (no audio)
  - Prompt applied directly to text
  - Result displays in markdown block
  - Copy and download buttons available
  - One credit consumed upon successful completion

US-022: View Real-Time Processing Progress
- Title: Monitor processing status while waiting
- Description: As a user who initiated processing, I want to see real-time progress updates, so that I know the system is working and estimate completion time.
- Acceptance Criteria:
  - Progress bar appears immediately after initiating process
  - Percentage complete updates in real-time
  - Status messages change at each stage
  - For multi-file: individual progress for each file
  - WebSocket connection maintains updates
  - Connection loss shows appropriate message
  - No page refresh required for updates
  - Cancel option available (optional for MVP)

US-023: Handle Processing Errors
- Title: Receive clear error messages when processing fails
- Description: As a user whose processing failed, I want to understand what went wrong, so that I can take corrective action.
- Acceptance Criteria:
  - Error message displays in prominent location
  - Message uses neobrutalist tone and styling
  - Specific error reason indicated when possible
  - Actionable next steps provided when applicable
  - Failed processing does not consume credits
  - User can retry processing after fixing issue
  - Error message persists until dismissed or retry

### 5.5 Results and Export

US-024: View Processing Results
- Title: See the processed markdown output
- Description: As a user whose processing completed successfully, I want to view the clean markdown result, so that I can review the output.
- Acceptance Criteria:
  - Result displays in scrollable text block
  - Markdown formatting rendered appropriately
  - Result appears immediately after processing completes
  - Result remains visible until page refresh or new processing
  - Multiple results displayed for separate mode
  - Single result displayed for combine mode
  - Previous results cleared when starting new processing

US-025: Copy Result to Clipboard
- Title: Copy markdown output for pasting elsewhere
- Description: As a user with completed results, I want to copy the output to my clipboard, so that I can paste it into my notes or documents.
- Acceptance Criteria:
  - Copy button visible and accessible
  - Single click copies entire result to clipboard
  - Visual confirmation of successful copy (button state change or notification)
  - Copied content preserves markdown formatting
  - Works across different browsers
  - No selection required before copying

US-026: Download Result as .MD File
- Title: Save markdown output as a file
- Description: As a user with completed results, I want to download the output as a markdown file, so that I can save it permanently to my device.
- Acceptance Criteria:
  - Download button visible and accessible
  - Single click initiates file download
  - Downloaded file has .md extension
  - Filename includes timestamp or source file name
  - File content preserves all markdown formatting
  - Browser handles download per user preferences
  - Multiple results produce multiple download options

US-027: Clear Results and Start New Processing
- Title: Reset interface for new processing task
- Description: As a user who has finished with current results, I want to clear the interface and start fresh, so that I can process new files.
- Acceptance Criteria:
  - Clear/Reset button available after results displayed
  - Clicking reset removes all results
  - File selections cleared
  - Text input cleared
  - Prompt selection optionally retained or reset to default
  - Interface returns to initial state
  - No confirmation required (results are ephemeral)

### 5.6 Usage Limits and Credit Management

US-028: Track Anonymous Daily Usage
- Title: Enforce one smelt per day for anonymous users
- Description: As an anonymous user, I want to understand my usage limit, so that I know when I can process again or need to create an account.
- Acceptance Criteria:
  - Usage counter displays "1/1 DAILY SMELT AVAILABLE" when unused
  - After processing, counter shows "0/1 DAILY SMELTS LEFT"
  - Attempting second processing shows error: "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED."
  - Process button disabled after daily limit reached
  - Call-to-action to create account prominently displayed
  - Limit tracked by IP address
  - Limit resets at midnight UTC
  - Failed processing attempts do not count against limit

US-029: Track Logged-In Weekly Usage
- Title: Monitor weekly smelt allowance
- Description: As a logged-in user, I want to see my remaining weekly credits, so that I can plan my usage and know when I need to add an API key.
- Acceptance Criteria:
  - Usage counter displays remaining credits (e.g., "3/5 LEFT THIS WEEK")
  - Counter updates immediately after successful processing
  - Counter color-coded: lime when credits available, coral when exhausted
  - Counter visible in header at all times
  - Weekly limit resets every Monday at midnight UTC
  - Reset date/time displayed or indicated
  - Failed processing does not consume credits

US-030: Handle Exhausted Weekly Limit
- Title: Inform user when weekly credits are depleted
- Description: As a logged-in user who has used all weekly credits, I want clear information about my options, so that I can continue using the service.
- Acceptance Criteria:
  - Process button disabled when credits exhausted
  - Error message displays: "5/5 SMELTS USED THIS WEEK. RESETS IN 3 DAYS. OR ADD YOUR API KEY FOR UNLIMITED."
  - Days until reset calculated and displayed
  - Call-to-action to add API key prominently displayed
  - Link to API key management in settings/profile
  - No processing allowed until reset or API key added
  - Message persists until credits available

US-031: Pre-Flight Credit Check
- Title: Validate sufficient credits before processing
- Description: As a user attempting to process files, I want the system to check credit availability before starting, so that I don't waste time on a process that will fail.
- Acceptance Criteria:
  - Credit check occurs when process button clicked
  - Insufficient credits prevents processing start
  - Error message displays before any processing begins
  - Different messages for anonymous vs logged-in users
  - No partial processing occurs
  - User informed of exact credit status
  - Alternative actions suggested (create account, add API key)

### 5.7 API Key Management

US-032: Add OpenAI API Key
- Title: Configure personal API key for unlimited usage
- Description: As a logged-in user who wants unlimited processing, I want to add my OpenAI API key, so that I can bypass weekly limits.
- Acceptance Criteria:
  - API key entry field in settings/profile
  - Key input field masked for security
  - Save button initiates validation
  - Validation process shows: "TESTING KEY..."
  - Valid key shows: "KEY VALID ✓"
  - Invalid key shows: "KEY INVALID ✗" with error
  - Valid key stored encrypted in database
  - Usage counter updates to show "UNLIMITED"
  - Key persists across sessions
  - Key used for all subsequent processing

US-033: Remove API Key
- Title: Delete saved API key and return to free tier
- Description: As a user with a configured API key, I want to remove it, so that I can revert to the free tier or use a different key.
- Acceptance Criteria:
  - Remove/delete option available in API key settings
  - Clicking remove deletes key from database
  - Confirmation prompt recommended (optional)
  - Usage counter reverts to showing weekly limit
  - User returned to free tier immediately
  - Remaining weekly credits from before API key addition still available
  - Can add different key after removal

US-034: Process with Personal API Key
- Title: Use own API key for unlimited processing
- Description: As a user with a valid API key configured, I want all processing to use my key, so that I can process unlimited files without weekly restrictions.
- Acceptance Criteria:
  - Processing uses configured API key automatically
  - No credit consumption from system allowance
  - Usage counter displays "UNLIMITED"
  - No weekly limit enforcement
  - Same processing quality and features
  - API key errors handled gracefully
  - Falls back to error message if key quota exhausted (not system error)

### 5.8 Edge Cases and Error Scenarios

US-035: Handle Corrupted Audio File
- Title: Detect and report unprocessable audio files
- Description: As a user who uploaded a corrupted audio file, I want a clear error message, so that I understand the file cannot be processed.
- Acceptance Criteria:
  - Corrupted file detected during validation or decoding stage
  - Error message displays: "CORRUPTED FILE. TRY A DIFFERENT ONE."
  - Processing stops immediately
  - No credit consumed
  - User can upload different file
  - Other files in multi-file upload continue processing (separate mode)

US-036: Handle Partial Failure in Combine Mode
- Title: Require all files to succeed for combine mode
- Description: As a logged-in user processing multiple files in combine mode, I want to know if any file fails, so that I can fix the issue and reprocess all files together.
- Acceptance Criteria:
  - If any file fails in combine mode, entire operation fails
  - Error message identifies which file(s) failed
  - No result produced for successful files
  - No credit consumed due to failure
  - User must fix failed file(s) and reprocess all
  - Clear indication of which file caused failure

US-037: Handle WebSocket Connection Loss
- Title: Manage connection interruption during processing
- Description: As a user whose connection drops during processing, I want to know what happened, so that I can retry if needed.
- Acceptance Criteria:
  - Connection loss detected and displayed
  - Error message indicates connection problem
  - Processing status unknown (may have completed server-side)
  - User prompted to refresh or retry
  - No credit consumed if result not delivered
  - Automatic reconnection attempted (optional)

US-038: Handle Empty Text Input
- Title: Prevent processing of empty text
- Description: As a user who accidentally clicked process with empty text input, I want a clear error, so that I understand text is required.
- Acceptance Criteria:
  - Empty text field disables process button (preventive)
  - If somehow submitted, validation catches it
  - Error message displays: "NOTHING TO PROCESS. TYPE SOMETHING."
  - No credit consumed
  - Text area remains focused for input
  - User can enter text and retry

US-039: Handle Simultaneous Multi-User Load
- Title: Process files reliably under high concurrent load
- Description: As a user during peak usage times, I want my files to process successfully, so that I receive results even when many users are active.
- Acceptance Criteria:
  - System handles up to defined concurrent connections
  - Queue management if limits exceeded
  - User informed of wait time if queued
  - Processing completes successfully once started
  - No data loss or corruption under load
  - Graceful degradation if capacity exceeded
  - Error messages guide users to retry

US-040: Handle API Rate Limiting
- Title: Manage third-party API rate limits gracefully
- Description: As a user when the system hits OpenAI rate limits, I want to understand the issue, so that I know it's temporary and can retry later.
- Acceptance Criteria:
  - Rate limit errors detected from API
  - User-friendly error message displayed
  - Retry-after time indicated when available
  - Message example: "RATE LIMITED. TRY AGAIN IN 30 SECONDS."
  - No credit consumed during rate limit errors
  - Automatic retry option (optional)
  - User can manually retry after wait period

### 5.9 Mobile and Responsive Design

US-041: Use SMELT on Mobile Device
- Title: Access and use application on smartphone or tablet
- Description: As a mobile user, I want to use SMELT on my phone, so that I can process files on the go.
- Acceptance Criteria:
  - Interface responsive and usable on mobile viewports
  - File upload works on mobile (camera roll access)
  - Text input keyboard-friendly
  - Prompt selection accessible on small screens
  - Progress bar visible and readable
  - Results scrollable and readable on mobile
  - Copy and download work on mobile browsers
  - Touch interactions properly handled
  - Sidebar/library accessible (drawer or bottom sheet)

US-042: Upload File from Mobile Camera Roll
- Title: Select audio file from mobile device storage
- Description: As a mobile user, I want to upload audio files from my phone, so that I can process voice memos and recordings.
- Acceptance Criteria:
  - File selector opens native file picker on mobile
  - Access to device storage granted by user
  - Audio files from camera roll/storage selectable
  - File size and format validation same as desktop
  - Upload process same as desktop
  - Progress visible during upload
  - Processing proceeds normally after upload

### 5.10 Accessibility and Usability

US-043: Navigate Interface with Keyboard
- Title: Use SMELT without mouse or touch input
- Description: As a keyboard-only user, I want to navigate and use all features via keyboard, so that I can access the application without pointing devices.
- Acceptance Criteria:
  - Tab order logical and complete
  - All interactive elements focusable
  - Focus indicators clearly visible
  - Enter/Space activate buttons
  - Escape closes modals/dialogs
  - File selection accessible via keyboard
  - Prompt selection navigable with arrows
  - No keyboard traps

US-044: Use SMELT with Screen Reader
- Title: Access application with assistive technology
- Description: As a screen reader user, I want proper semantic markup and labels, so that I can understand and use the interface.
- Acceptance Criteria:
  - Semantic HTML elements used appropriately
  - ARIA labels on custom components
  - Form fields properly labeled
  - Status messages announced
  - Progress updates accessible
  - Error messages announced immediately
  - Buttons have descriptive labels
  - Images have alt text where applicable

## 6. Success Metrics

### 6.1 Product-Market Fit Indicators

Weekly Active Users (WAU)
- Target: 100 WAU within 3 months of launch
- Definition: Unique users who complete at least one smelt per week
- Measurement: Query database for distinct users with successful processing in rolling 7-day window
- Success Indicator: Steady week-over-week growth in WAU
- Data Source: User activity logs

7-Day Retention Rate
- Target: 60% of new users return within 7 days
- Definition: Percentage of new users who return to process files within one week of first use
- Measurement: Cohort analysis tracking user first visit and subsequent visits within 7 days
- Success Indicator: Retention rate above 50% indicates strong product-market fit
- Data Source: User session tracking

Average Files Processed Per User
- Target: 3 or more files per active user per week
- Definition: Total smelts divided by weekly active users
- Measurement: Sum of all processing operations divided by count of active users in week
- Success Indicator: Increasing average indicates growing user engagement
- Data Source: Processing completion logs

Custom Prompt Creation Rate
- Target: 40% of logged-in users create at least one custom prompt
- Definition: Percentage of registered users with one or more custom prompts
- Measurement: Users with custom_prompts count > 0 divided by total registered users
- Success Indicator: High creation rate validates prompt customization feature value
- Data Source: User prompt library records

### 6.2 User Acquisition and Conversion

Free to Registered Conversion Rate
- Target: 20% of anonymous users create accounts
- Definition: Percentage of anonymous users who sign up after hitting daily limit
- Measurement: New registrations divided by unique anonymous users who hit limit
- Success Indicator: Conversion rate above 15% indicates compelling value proposition
- Data Source: User registration events and rate limit triggers

API Key Adoption Rate
- Target: 10% of registered users add their own API key
- Definition: Percentage of logged-in users with valid API key configured
- Measurement: Users with api_key_status = valid divided by total registered users
- Success Indicator: Adoption validates power user segment and unlimited usage need
- Data Source: User profile API key status

Multi-File Combine Mode Usage
- Target: 25% of logged-in processing operations use combine mode
- Definition: Percentage of multi-file smelts that use combine vs separate mode
- Measurement: Combine mode operations divided by total multi-file operations
- Success Indicator: Usage above 20% validates premium feature differentiation
- Data Source: Processing mode selection logs

### 6.3 Technical Performance Metrics

Processing Time (P95)
- Target: 95th percentile processing time under 2 minutes for 10-minute audio
- Definition: Time from process button click to result delivery for 95% of operations
- Measurement: Timestamp delta between processing start and completion
- Success Indicator: Consistently meeting target indicates acceptable performance
- Data Source: Processing event timestamps

Processing Success Rate
- Target: 95% of processing attempts succeed without errors
- Definition: Percentage of processing operations that complete successfully
- Measurement: Successful completions divided by total processing attempts
- Success Indicator: High success rate indicates reliable service
- Data Source: Processing completion and error logs
- Note: Excludes user-caused errors (file too large, invalid format)

WebSocket Connection Stability
- Target: 98% of connections maintain throughout processing
- Definition: Percentage of processing operations with uninterrupted WebSocket connection
- Measurement: Operations without connection loss events divided by total operations
- Success Indicator: Stable connections provide good user experience
- Data Source: WebSocket connection monitoring logs

### 6.4 User Satisfaction Signals

Result Download Rate
- Target: 80% or more of completed smelts result in download
- Definition: Percentage of successful processing operations followed by file download
- Measurement: Download actions divided by completed processing operations
- Success Indicator: High download rate indicates users find value in results
- Data Source: Download button click events

Result Copy Rate
- Target: 60% or more of completed smelts result in copy-to-clipboard
- Definition: Percentage of successful processing operations followed by copy action
- Measurement: Copy actions divided by completed processing operations
- Success Indicator: Combined with download rate, indicates result utility
- Data Source: Copy button click events

Repeat Usage Rate
- Target: 50% of users return for second smelt within 30 days
- Definition: Percentage of users who complete at least 2 smelts in first month
- Measurement: Users with 2+ smelts in first 30 days divided by new users
- Success Indicator: High repeat rate indicates satisfying first experience
- Data Source: User activity logs

### 6.5 Feature Adoption Metrics

Custom Prompt Usage vs Predefined
- Target: 60% of logged-in smelts use custom prompts after creation
- Definition: Percentage of processing operations using custom prompts for users who have created them
- Measurement: Custom prompt selections divided by total selections for users with custom prompts
- Success Indicator: High usage indicates custom prompts provide value
- Data Source: Prompt selection logs

Average Custom Prompts Per User
- Target: 2.5 average custom prompts per user with any custom prompts
- Definition: Mean number of custom prompts for users who have created at least one
- Measurement: Total custom prompts divided by users with custom prompts > 0
- Success Indicator: Multiple prompts per user indicates varied use cases
- Data Source: User prompt library records

Prompt Divisor Usage
- Target: 40% of users with 3+ custom prompts use divisors
- Definition: Percentage of multi-prompt users who organize with sections
- Measurement: Users with divisors divided by users with 3+ prompts
- Success Indicator: Usage validates organizational feature value
- Data Source: User prompt library structure

### 6.6 Business and Growth Metrics

Daily Active Users (DAU)
- Target: 30-40 DAU within first month
- Definition: Unique users who complete at least one smelt on a given day
- Measurement: Distinct users with successful processing each day
- Success Indicator: Growing DAU indicates increasing adoption
- Data Source: Daily user activity aggregation

Weekly Credit Consumption Distribution
- Target: Understand usage patterns across user base
- Definition: Distribution of users by credits consumed (1-5 range for free tier)
- Measurement: Histogram of weekly credit usage across all logged-in users
- Success Indicator: Varied distribution indicates different user segments
- Data Source: Weekly usage summaries

Anonymous vs Logged-In Usage Ratio
- Target: 60% of smelts from logged-in users within 3 months
- Definition: Percentage of processing operations from authenticated users
- Measurement: Logged-in smelts divided by total smelts
- Success Indicator: Growing logged-in percentage indicates conversion success
- Data Source: Processing operation user status

### 6.7 Monitoring and Alerts

Critical Error Rate
- Target: Less than 1% of operations fail due to system errors
- Definition: Processing failures caused by application bugs or infrastructure issues
- Measurement: System errors divided by total processing attempts
- Success Indicator: Low rate indicates stable, reliable service
- Data Source: Error logs categorized by error type
- Alert: Trigger notification if rate exceeds 2% in any 1-hour window

API Cost Per Smelt
- Target: Track and optimize cost efficiency over time
- Definition: Average API cost for transcription and synthesis per successful smelt
- Measurement: Total API costs divided by completed smelts
- Success Indicator: Stable or decreasing cost indicates efficiency
- Data Source: API usage logs and billing data
- Note: Separate tracking for system-provided vs user API key operations

User-Reported Issues
- Target: Less than 5% of users report problems
- Definition: Percentage of active users who report bugs or issues
- Measurement: Unique users with support tickets divided by weekly active users
- Success Indicator: Low rate indicates good user experience
- Data Source: Support ticket system or feedback mechanism

### 6.8 Success Criteria Summary

The MVP will be considered successful if within 3 months of launch:

Must Have (Launch Blockers):
- Processing success rate above 90%
- Processing time P95 under 3 minutes for 10-minute audio
- WebSocket stability above 95%
- Critical error rate below 2%

Should Have (Strong Indicators):
- 100+ weekly active users
- 60%+ 7-day retention rate
- 20%+ free-to-registered conversion
- 80%+ result download rate

Nice to Have (Growth Signals):
- 3+ files processed per active user per week
- 40%+ custom prompt creation rate
- 25%+ combine mode usage among logged-in users
- 10%+ API key adoption rate

These metrics will be reviewed weekly for the first month, then bi-weekly thereafter. Adjustments to features, messaging, or user experience should be made based on metric trends and user feedback.
