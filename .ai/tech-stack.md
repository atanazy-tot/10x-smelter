# SMELT - Technology Stack

## Frontend

### Astro 5 with React for Interactive Components

- Astro 5 for building fast, efficient pages and applications with minimal JavaScript
- React 19 provides interactivity where needed
- TypeScript 5 for static typing and better IDE support
- Tailwind CSS 4 for utility-first styling
- Shadcn/ui provides accessible React component library foundation
- Neobrutalism components (https://www.neobrutalism.dev/) built on Shadcn/ui for UI components

### State Management

- Zustand for React state management across interactive islands

## Backend

### Supabase as Complete Backend Solution

- PostgreSQL database
- SDK in multiple languages serving as Backend-as-a-Service
- Open-source solution that can be hosted locally or on own server
- Built-in user authentication (Supabase Auth)
- Real-time WebSocket subscriptions (Supabase Realtime) for processing progress updates

## Audio Processing

### FFmpeg

- Audio format conversion (M4A, AAC to MP3)
- Server-side processing with temporary file handling
- Immediate cleanup after processing

## AI Services

### OpenRouter.ai for LLM Communication

- Access to wide range of models (OpenAI, Anthropic, Google, and others)
- Enables finding solutions with high efficiency and low costs
- Financial limits on API keys

## CI/CD and Hosting

### Version Control

- GitHub for source code repository and project management

### CI/CD Pipeline

- GitHub Actions for building CI/CD pipelines

### Containerization

- Docker single container deployment including:
  - Node.js runtime
  - Astro production build
  - FFmpeg binaries
  - Environment configuration

### Hosting

- Dokploy via Hostinger for application deployment
- Docker image deployment
- Automatic SSL certificates
- Environment variable management

## Development Tools

- npm or pnpm for package management
- TypeScript compiler for type checking
- ESLint for code linting
- Prettier for code formatting

## Technology Versions

- Astro: 5.x
- React: 19.x
- TypeScript: 5.x
- Tailwind CSS: 4.x
- Node.js: 20.x LTS
- PostgreSQL: 15.x
- FFmpeg: 6.x
