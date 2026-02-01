## SMELT (10x-smelter)

![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-087ea4?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-22.14.0-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

> **Development Only**: This project is in development and is NOT deployed anywhere. Run locally for testing.

## Project description

SMELT is a single-page web app that transforms messy notes into clean, structured **Markdown documents**. It's built for quick "drop-and-go" processing of meeting/lecture/interview recordings, with an option to paste text directly.

- **Primary use case**: upload audio → transcribe → synthesize into structured Markdown via a selected prompt
- **Also supports**: direct text input (no transcription stage)
- **Privacy-first MVP**: no permanent server-side file storage (temporary storage only when needed for conversion, then immediate cleanup)

## Table of contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started locally](#getting-started-locally)
- [Environment setup](#environment-setup)
- [Supabase local development](#supabase-local-development)
- [Testing](#testing)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

### Frontend (this package)

- **Astro 5**: fast app shell + pages
- **React 19**: interactive UI components
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui foundation** (Radix primitives + utility libs like `clsx`, `tailwind-merge`, `class-variance-authority`)

### Target architecture (from the product docs)

- **Backend/BaaS**: Supabase (Postgres, Auth, Realtime/WebSockets)
- **AI**: OpenRouter.ai for LLM communication
- **Audio**: FFmpeg for format conversion (e.g. m4a → mp3) with temporary storage and immediate cleanup
- **State management**: Zustand (planned)
- **Deployment**: Docker image containing Node runtime + Astro production build + FFmpeg

## Prerequisites

- **Node.js**: `22.14.0` (pinned in `.nvmrc`)
- **npm**: included with Node
- **Docker**: required for running Supabase locally
- **Supabase CLI**: install via `npm install -g supabase` or [other methods](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Getting started locally

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd 10x-smelter
   nvm use
   npm ci
   ```

2. **Start Supabase locally**

   ```bash
   supabase start
   ```

   This starts the local Supabase stack (Postgres, Auth, Studio, etc.) in Docker containers.

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Then fill in the values (see [Environment setup](#environment-setup) below).

4. **Run database migrations**

   ```bash
   supabase db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open the URL printed by Astro in your terminal.

## Environment setup

Create a `.env` file based on `.env.example`:

```bash
# Server-side Supabase credentials
# Get from `supabase status` after running `supabase start`
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<service_role key from supabase status>

# OpenRouter API key for LLM communication
# Get from https://openrouter.ai/keys
OPENROUTER_API_KEY=<your-openrouter-api-key>

# Encryption secret for user API keys (32 bytes = 64 hex characters)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_KEY_ENCRYPTION_SECRET=<64-character-hex-string>

# Client-side Supabase (PUBLIC_ prefix exposes to browser)
# Get from `supabase status` after running `supabase start`
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>

# Mock processing mode for frontend-only testing (set to "true" to enable)
PUBLIC_MOCK_PROCESSING=false
```

After running `supabase start`, use `supabase status` to get the local URLs and keys.

## Supabase local development

### Common commands

| Command | Description |
|---------|-------------|
| `supabase start` | Start local Supabase stack |
| `supabase stop` | Stop local Supabase stack |
| `supabase db push` | Apply migrations to local database |
| `supabase db reset` | Reset database and re-run migrations + seeds |
| `supabase gen types typescript --local > src/db/database.types.ts` | Generate TypeScript types from database schema |
| `supabase status` | Show local Supabase URLs and keys |

### Local ports

| Service | Port | URL |
|---------|------|-----|
| API | 54321 | http://127.0.0.1:54321 |
| Database (Postgres) | 54322 | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio (Dashboard) | 54323 | http://127.0.0.1:54323 |
| Inbucket (Email testing) | 54324 | http://127.0.0.1:54324 |

### Migrations

Migrations are located in `supabase/migrations/` and follow the naming convention `YYYYMMDDHHMMSS_description.sql`.

Current migrations:

- `20260117152000_initial_schema.sql`
- `20260117200000_anonymous_usage_function.sql`
- `20260118000000_get_profile_with_reset.sql`
- `20260118120000_reorder_sections_function.sql`
- `20260118140000_reorder_prompts_function.sql`
- `20260118160000_smelt_credit_functions.sql`
- `20260118170000_create_anonymous_smelt_function.sql`
- `20260119000000_create_smelt_files_storage.sql`
- `20260201120000_add_default_prompts_table.sql`

To create a new migration:

```bash
supabase migration new <migration_name>
```

## Testing

### Test commands

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Open Vitest UI |
| `npm run test:coverage` | Run tests with coverage report |

### Test structure

Tests are located in `tests/` with the following structure:

```text
tests/
├── fixtures/       # Test data and fixtures
├── mocks/          # Mock implementations
├── setup/          # Test setup and configuration
└── unit/           # Unit tests
    └── services/   # Service layer tests
```

### Coverage thresholds

The project enforces 80% coverage thresholds for statements, branches, functions, and lines. Coverage reports are generated in the `coverage/` directory.

## Available scripts

From `package.json`:

- **`npm run dev`**: start Astro dev server
- **`npm run build`**: production build
- **`npm run preview`**: preview the production build locally
- **`npm run lint`**: run ESLint
- **`npm run lint:fix`**: run ESLint with auto-fixes
- **`npm run format`**: run Prettier
- **`npm run test`**: run tests
- **`npm run test:watch`**: run tests in watch mode
- **`npm run test:ui`**: open Vitest UI
- **`npm run test:coverage`**: run tests with coverage

## Project structure

```text
.
├── src/
│   ├── layouts/        # Astro layouts
│   ├── pages/          # Astro pages
│   │   └── api/        # API endpoints
│   ├── components/     # UI components (Astro & React)
│   │   └── ui/         # Shadcn/ui components
│   ├── lib/
│   │   ├── services/   # Business logic
│   │   ├── schemas/    # Zod validation schemas
│   │   └── utils/      # Error classes, helpers
│   ├── db/             # Supabase client and database types
│   └── assets/         # Static assets
├── tests/
│   ├── fixtures/       # Test data
│   ├── mocks/          # Mock implementations
│   ├── setup/          # Test configuration
│   └── unit/           # Unit tests
├── supabase/
│   └── migrations/     # SQL migration files
├── public/             # Public assets
└── .ai/                # Project documentation and plans
```

## Project scope

This section summarizes the MVP scope from `10x-smelter/.ai/prd.md`.

### In scope (MVP)

- **Inputs**
  - Audio upload (drag & drop or browse): **.mp3, .wav, .m4a**
  - Text paste/type input
  - Mutual exclusivity: selecting files clears text input and vice versa
- **File constraints**
  - Max **25MB per file**
  - Max **30 minutes** audio duration (MVP constraint)
  - Max **5 files** at once
  - Server-side conversion for formats needing it (e.g. m4a), with temporary storage and immediate cleanup
- **Processing modes**
  - **Separate mode**: process each file individually (available to all; anonymous users can only use this mode)
  - **Combine mode**: logged-in only; 2+ files; transcribe in parallel, concatenate transcripts with file-name headers, then apply the prompt once
- **Prompt system**
  - **5 predefined prompts** available to all users
  - **Custom prompts** for logged-in users (CRUD)
    - Max **4,000 characters**
    - Import from `.md` (reject files > 10KB / over limit)
    - Divisors/sections for organization (visual)
- **Usage limits**
  - Anonymous: **1 smelt per day** (tracked by IP), resets at **midnight UTC**
  - Logged-in: **5 smelts per week**, resets **Monday midnight UTC**
  - Power users: bring-your-own OpenAI key → **UNLIMITED**
  - Credit rules:
    - **1 credit per successful operation** (regardless of mode or file count)
    - Failed attempts **do not** consume credits
- **Progress & results**
  - Real-time progress via WebSockets (percent + stage)
  - Results are ephemeral (refresh clears)
  - Export: **copy to clipboard** + **download `.md`**
- **Error handling**
  - Clear, actionable messages in a direct "neobrutalist" tone (often all caps)
  - Examples:
    - "FILE TOO CHUNKY. MAX 25MB."
    - "DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED."

### Out of scope (MVP)

- Payments/subscriptions
- Results history/projects
- More file types (PDF/images/video), exports beyond Markdown (PDF/DOCX)
- Advanced prompt/model parameters (temperature/model selection)
- Analytics-heavy features (token/cost breakdowns), scheduling, batch automation

## Project status

**Status**: Development only - not deployed anywhere.

**Source of truth for product requirements**: `.ai/prd.md`

## License

MIT — see `LICENSE`.
