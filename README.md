## SMELT (10x-smelter)

![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-087ea4?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-22.14.0-339933?logo=node.js&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Project description

SMELT is a single-page web app that transforms messy notes into clean, structured **Markdown documents**. It’s built for quick “drop-and-go” processing of meeting/lecture/interview recordings, with an option to paste text directly.

- **Primary use case**: upload audio → transcribe → synthesize into structured Markdown via a selected prompt
- **Also supports**: direct text input (no transcription stage)
- **Privacy-first MVP**: no permanent server-side file storage (temporary storage only when needed for conversion, then immediate cleanup)

> Note: This `10x-smelter` package is an Astro + React scaffold for the SMELT product. The existing one-page app you want to refine lives in `chaos-smelter/`.

## Table of contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
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

## Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (pinned in `.nvmrc`)
- **npm**: included with Node

### Install & run

```bash
cd 10x-smelter
nvm use
npm ci
npm run dev
```

Then open the URL printed by Astro in your terminal.

## Available scripts

From `package.json`:

- **`npm run dev`**: start Astro dev server
- **`npm run build`**: production build
- **`npm run preview`**: preview the production build locally
- **`npm run lint`**: run ESLint
- **`npm run lint:fix`**: run ESLint with auto-fixes
- **`npm run format`**: run Prettier

## Project structure

This project inherits the starter layout from the Astro starter:

```text
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
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
  - Clear, actionable messages in a direct “neobrutalist” tone (often all caps)
  - Examples:
    - “FILE TOO CHUNKY. MAX 25MB.”
    - “DAILY LIMIT HIT. SIGN UP FOR 5/WEEK OR ADD YOUR API KEY FOR UNLIMITED.”

### Out of scope (MVP)

- Payments/subscriptions
- Results history/projects
- More file types (PDF/images/video), exports beyond Markdown (PDF/DOCX)
- Advanced prompt/model parameters (temperature/model selection)
- Analytics-heavy features (token/cost breakdowns), scheduling, batch automation

## Project status

- **Status**: early-stage scaffold/prototype for SMELT’s Astro + React UI.
- **Source of truth for product requirements**: `10x-smelter/.ai/prd.md`
- **Main app to refine**: `chaos-smelter/` (per your note)

## License

MIT — see `LICENSE`.
