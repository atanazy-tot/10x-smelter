# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SMELT is a web app that transforms audio recordings and text into structured Markdown documents. Users upload audio files (MP3, WAV, M4A) or paste text, select a prompt, and receive synthesized Markdown output via real-time WebSocket updates.

## Commands

```bash
npm run dev        # Start Astro dev server
npm run build      # Production build
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint with auto-fixes
npm run format     # Run Prettier
```

Node version is pinned to 22.14.0 (see `.nvmrc`).

## Architecture

### Tech Stack

- **Frontend**: Astro 5 + React 19 + TypeScript 5 + Tailwind CSS 4 + Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime WebSockets)
- **AI**: OpenRouter.ai for LLM communication
- **Audio**: FFmpeg for format conversion

### Project Structure

```
src/
├── pages/api/           # API endpoints (POST, GET handlers)
├── middleware/          # Auth token extraction, injects supabase into context.locals
├── db/                  # Supabase clients, database.types.ts (auto-generated)
├── lib/
│   ├── services/        # Business logic (auth, smelts, prompts, usage, api-keys, etc.)
│   ├── schemas/         # Zod validation schemas
│   ├── utils/           # Error classes (AppError hierarchy), helpers
│   └── realtime/        # WebSocket subscription for processing progress
├── components/          # Astro (.astro) for static, React (.tsx) for interactive
│   └── ui/              # Shadcn/ui components
├── types.ts             # Shared DTOs and entity types for frontend/backend
└── env.d.ts             # Environment variable types

supabase/
└── migrations/          # SQL migration files
```

### Key Patterns

**Service Layer**: All business logic lives in `src/lib/services/`. API endpoints are thin wrappers that call services.

**Error Handling**: Extend `AppError` base class from `src/lib/utils/errors.ts`. Each error has `status`, `code`, and `toResponse()`. Use `toAppError()` to convert unknown errors. Use early returns and guard clauses.

**Auth Flow**: Middleware extracts Bearer token from Authorization header, creates authenticated Supabase client in `context.locals.supabase`. Use `context.locals.supabase` in API routes, never import supabaseClient directly.

**Supabase Types**: Import `SupabaseClient` from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`.

**Anonymous vs Authenticated**:

- Anonymous users tracked by IP hash via SECURITY DEFINER RPC functions (bypass RLS)
- Authenticated users use direct database writes with RLS

**Real-Time Processing**: Smelt jobs are fire-and-forget. Progress events broadcast via Supabase Realtime channel `smelt:{smelt_id}`.

**DTOs**: All types in `src/types.ts` derive from database types in `src/db/database.types.ts`. DTOs define API request/response shapes.

### API Conventions

- Use `export const prerender = false` for API routes
- Handler names: uppercase `GET`, `POST`, `PATCH`, `DELETE`
- Validate input with Zod schemas
- Return `jsonResponse(data)` for success, `error.toResponse()` for errors

### UI Conventions

- Use Astro components for static content, React only when interactivity is needed
- Never use Next.js directives ("use client")
- Extract React logic into custom hooks in `src/components/hooks`
- Neobrutalist design: error messages often use ALL CAPS with direct tone

## Reference Documentation

- Product requirements: `.ai/prd.md`
- Database design: `.ai/db-plan.md`
- API design: `.ai/api-plan.md`
- Implementation plans: `.ai/01-*-plan.md` through `.ai/08-*-plan.md`
