# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude to generate React components in a virtual file system, with real-time preview and code editing capabilities.

## Tech Stack

- **Next.js 15** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS v4** with PostCSS plugin (`@tailwindcss/postcss`)
- **Prisma** with SQLite (`prisma/dev.db`)
- **Anthropic Claude AI** (`claude-haiku-4-5`) via Vercel AI SDK — falls back to `MockLanguageModel` when no API key
- **Babel Standalone** for in-browser JSX transformation
- **Monaco Editor** for code editing

## Development Commands

```bash
npm run setup          # Install deps, generate Prisma client, run migrations
npm run dev            # Dev server with Turbopack on port 3000
npm run dev:daemon     # Dev server in background, logs to logs.txt
npm run build          # Production build
npm start              # Production server
npm run lint           # ESLint (extends next config)
npm test               # Vitest in watch mode
npm test -- --run      # Single test run (no watch)
npm test -- path/to/test.test.tsx  # Run specific test file
npx prisma generate    # Regenerate Prisma client after schema changes
npx prisma migrate dev # Create and apply new migration
npm run db:reset       # Force-reset database
```

## Environment Variables

- `ANTHROPIC_API_KEY` — Optional. Without it, the system uses `MockLanguageModel` which generates static counter/form/card components (useful for development without API costs).
- `JWT_SECRET` — Defaults to `"development-secret-key"` in dev. Set in production.
- `NODE_ENV` — Standard Node.js environment variable.

## Architecture

### Virtual File System (VFS)

The core abstraction is `VirtualFileSystem` (`src/lib/file-system.ts`):
- All generated component files exist only in memory, not on disk
- Supports create, read, update, delete, rename with automatic parent directory creation
- Serializes to/from JSON for persistence in the database (`Project.data` field)
- Returns `null` for failed reads, `false` for failed mutations, error strings prefixed with `"Error:"` for editor commands — no exceptions thrown
- Built-in editor commands (`viewFile`, `replaceInFile`, `insertInFile`) return line-numbered content for AI tool usage

### `@/` Path Alias — Dual Meaning

The `@/` alias has different meanings depending on context:
- **In source code** (tsconfig): `@/*` maps to `./src/*`
- **In VFS-generated components**: `@/` maps to `/` (the VFS root), so `import Foo from '@/components/Foo'` resolves to `/components/Foo.jsx` in the virtual file system

### AI Chat System

1. User sends message → `ChatInterface` component → `/api/chat/route.ts`
2. API uses Vercel AI SDK `streamText` with Claude or mock provider
3. AI has two tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view, create, str_replace, insert files in VFS (uses Zod validation)
   - `file_manager` (`src/lib/tools/file-manager.ts`) — list, rename, delete files (uses Vercel AI SDK `tool()` helper, returns `{success, message/error}` objects)
4. VFS state and messages saved to database on completion (authenticated users only)
5. System prompt defined in `src/lib/prompts/generation.tsx`
6. Mock provider uses 4 max tool roundtrips; real provider uses 40

### Component Preview Pipeline

JSX files cannot run directly in the browser. The transformation pipeline:
1. Parse and remove CSS imports, collect CSS content
2. Transform JSX with Babel (`src/lib/transform/jsx-transformer.ts`)
3. Build import map: each VFS file gets multiple path variations (with/without leading `/`, with/without extension, with `@/` alias), plus CDN URLs for React packages and `esm.sh` for third-party packages
4. Files with syntax errors are excluded from import map; placeholder modules are created for failed imports
5. Inject into iframe with import map, Tailwind CDN, error boundary, and collected CSS as `<style>` tags

### Database & Prisma

- **Always reference `prisma/schema.prisma` to understand the structure of data stored in the database.**
- Schema at `prisma/schema.prisma`, custom output to `src/generated/prisma/` (not default `node_modules/.prisma/client`)
- `User` — email/password (bcrypt), cuid IDs
- `Project` — `messages` (JSON string of chat history) and `data` (JSON string of serialized VFS), nullable `userId` for anonymous projects, cascade delete on user
- Prisma client uses global singleton pattern in `src/lib/prisma.ts` to prevent multiple instances during Next.js hot reload

### Authentication & Middleware

- JWT-based sessions (`src/lib/auth.ts`) using `jose` library, HTTP-only cookies, 7-day expiration
- `src/lib/auth.ts` uses `"server-only"` import guard
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes (returns 401 JSON)
- `/api/chat` is unprotected — allows anonymous usage
- Anonymous work tracked in sessionStorage (`src/lib/anon-work-tracker.ts`)

### React Contexts

- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — manages VFS instance, selected file, CRUD operations, handles AI tool calls, uses refresh counter to notify components of changes
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK `useChat`, integrates with FileSystemContext, sends serialized VFS with each request

## Code Style

- Use comments sparingly. Only comment complex code.

## Important Patterns

### VFS File Conventions

- `/App.jsx` — Required entrypoint for every project
- `/components/Foo.jsx` — Component files
- All paths use root `/` prefix

### Error Handling Convention

The codebase uses defensive returns rather than exceptions:
- VFS operations return `null`/`false`/error strings
- Auth functions return `null` on failure
- Server actions throw `Error("Unauthorized")` for auth failures
- Preview frame has an error boundary for rendering failures

## Testing

- **Framework:** Vitest with jsdom environment
- **Test location:** `__tests__/` directories next to source files, named `*.test.ts` or `*.test.tsx`
- **Libraries:** @testing-library/react (`render`, `renderHook`, `screen`), @testing-library/user-event
- **Config:** `vitest.config.mts` — uses `vite-tsconfig-paths` for `@/` alias and `@vitejs/plugin-react`
- **Patterns:** Mock child components with simple divs + testids to isolate parents; use `vi.mock()` for modules; suppress console.error in error tests with `vi.spyOn(console, "error").mockImplementation(() => {})`

## Configuration Notes

- **API Route Timeout:** 120s for chat endpoint (`maxDuration = 120`)
- **Next.js config:** Minimal — only disables dev indicators
- **ESLint:** `{"extends": "next"}` — no custom rules
