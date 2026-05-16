# Mo-ve-ments App — Progress

## Phase 1: Initial Setup
**Commit:** `8d416d0` — Initial commit

- Created Next.js 16 project with TypeScript, Tailwind CSS, Turbopack

---

## Phase 2: Project Planning
**Commit:** `0a261a7` — Initial plan

- Defined product vision: AI-powered presentation builder with "moments" (emotional arcs, scripts, slides)
- Outlined architecture: Next.js + tRPC + Supabase + AI generation pipeline

---

## Phase 3: Directory Scaffolding
**Commit:** `9c93bc2` — Scaffold required src directory layout

- Created folder structure: `app/`, `components/`, `lib/`, `modules/`, `stores/`
- Set up tRPC server/client/router foundation
- Configured Supabase client (server + browser)
- Added AI client stub
- Created module routers: auth, agent, document, export, generation, moment, presentation

---

## Phase 4: Core Scaffolding
**Commit:** `be1deb6` — Scaffolding commit

- Wired tRPC API route (`/api/trpc/[trpc]`)
- Set up providers (tRPC + React Query)
- Added Supabase middleware for session management
- Created base layouts and pages

---

## Phase 5: Supabase Schema
**Commit:** `dde989a` — Setup Supabase schema

- Designed and applied full database schema (`001_initial_schema.sql`)
- Tables: users, presentations, moments, source_documents, conversations, messages, exports
- Row-level security policies
- Indexes for performance

**Commit:** `5370644` — Put Supabase types

- Generated TypeScript types from Supabase schema

---

## Phase 6: Authentication Flow
**Commit:** `cf540e4` — Added auth flow

- Login page with email/password + Google OAuth
- Registration page
- Auth callback route (OAuth redirect handling)
- Sign-out API route
- Middleware for protected routes (redirect unauthenticated users to `/login`)
- `AuthGuard` component

---

## Phase 7: Dashboard & Presentation Management
**Commit:** `4ee4cac` — Added dashboard

- Dashboard page listing user's presentations with status badges, timestamps
- Create presentation modal (title + optional description)
- Delete presentation with confirmation dialog
- Presentation tRPC router (list, create, delete mutations)
- Dashboard layout with nav bar and sign-out
- Workspace page stub (`/workspace/[id]`)
- Custom design system: fonts, colors, rounded cards

---

## Phase 8: Document Upload & Text Extraction *(In Progress — uncommitted)*

- **Packages added:** `pdf-parse`, `mammoth`
- **`src/lib/documents/parser.ts`** — Text extraction utility
  - PDF: Uses `PDFParse` class with `ArrayBuffer` (pdfjs-dist compatibility fix)
  - DOCX: Uses `mammoth.extractRawText`
  - TXT/CSV/MD: Direct UTF-8 decode
- **`src/lib/documents/chunker.ts`** — Text chunking utility
  - ~4000 char chunks with 200 char overlap
  - Sentence-boundary aware splitting
- **`src/modules/document/router.ts`** — tRPC document router
  - `upload`: Validates file type/size → uploads to Supabase Storage → extracts text → chunks → inserts to DB
  - `list`: Fetches documents by presentation ID
  - `delete`: Removes from storage + database
- **`src/components/document/FileUploadZone.tsx`** — Drag-and-drop upload UI
  - File picker + drag-drop zone
  - Progress tracking per file
  - File chips with delete capability
- **`next.config.ts`** — Added `serverExternalPackages: ['pdf-parse', 'mammoth']`
- **Status:** Upload, extraction, and chunking all working end-to-end ✓
- **Tested:** 25-page PDF → 23 chunks (~960-1000 tokens each), sentence-boundary splitting confirmed correct
- Dashboard test section removed after validation

---

## Phase 9: Anthropic API Wrapper
**Commit:** `0a745a8` — added anthropic sdk wrapper

- **Packages added:** `server-only`, `tsx`
- **`src/lib/ai/client.ts`** — Server-only Anthropic client
  - Uses `ANTHROPIC_API_KEY`
  - Disables SDK retries so wrapper-level retry behavior is explicit
  - Uses string API key initialization; async API key setter type-checks in SDK `0.96.0` but does not authenticate at runtime
- **`src/lib/ai/generate.ts`** — Streaming generation wrapper
  - `generateMoments(prompt)` calls Claude Sonnet (`claude-sonnet-4-20250514`)
  - Streams text chunks as they arrive
  - Retries once after 1 second for `429` or `500` before any text is yielded
  - Sends generation system prompt as a cacheable prompt block
- **`src/lib/ai/agent.ts`** — Streaming agent chat wrapper
  - `agentChat(systemPrompt, messages)` calls Claude Haiku (`claude-haiku-4-5-20250414`)
  - Streams text chunks as they arrive
  - Uses same one-retry behavior for `429` or `500`
- **`src/lib/ai/prompts.ts`** — Prompt templates
  - Generation prompt returns valid JSON moments only
  - Agent prompt template supports `<newscript>` and `<newslide>` edit tags
- **`src/lib/ai/cost-logger.ts`** — Development cost logger and production analytics stub
- **`src/lib/ai/index.ts`** — Barrel exports for AI utilities
- **`scripts/test-ai-wrapper.ts`** — Smoke test script
  - `npm run test:ai -- retry`: forced mocked `500` verified retry once for generation and agent
  - `npm run test:ai -- stream`: real Sonnet generation streamed 28 chunks, 2488 chars, parsed 5 JSON moments
- **Validation:** `npx tsc --noEmit --pretty false` passed

---

## Phase 10: Moment Generation Pipeline *(In Progress — uncommitted)*

- **`src/modules/generation/router.ts`** — Core generation tRPC router
  - `create`: Fetches presentation context and source documents, checks daily plan limits (`free=3`, `pro=50`, `team=50`), assembles the generation prompt, streams and collects `generateMoments(prompt)`, strips markdown fences, parses/validates JSON, replaces existing moments, updates presentation status/duration/tips, increments generation count, and returns created moments
  - `regenerateOne`: Regenerates a single moment with an instruction and updates only that moment
  - Handles generation failures with a user-safe `TRPCError` message instead of exposing raw API errors
- **`src/modules/generation/source-verifier.ts`** — Source citation verification helper
  - Checks cited filenames against uploaded `source_documents`
  - Uses simple phrase matching on numbers, quoted text, and proper nouns from scripts
  - Adds `_warning` and `_sourceVerification` metadata when citations cannot be verified
- **`src/app/workspace/[id]/page.tsx`** — Workspace route updated for Next.js 16
  - Uses async `params` with `await params`
  - Renders the new client workspace shell
- **`src/components/workspace/WorkspaceClient.tsx`** — Workspace generation UI
  - Fetches presentation and moments via `presentation.getById`
  - Shows draft workspace upload area with `FileUploadZone`
  - Shows Generate button, animated generation progress messages, graceful retry state, and generated moment cards
- **`src/components/presentation/CreateModal.tsx`** — Create-to-generate flow
  - After presentation creation, modal stays open and switches to **Add source documents**
  - Shows `FileUploadZone`, upload chips, **Generate my moments**, progress messages, and friendly retry errors
  - Redirects to workspace after generation completes
- **`src/lib/trpc/client.tsx`** — Mutation callback fix
  - Global mutation override now calls `opts.originalFn()` before invalidating queries
  - Fixes create modal not switching to the upload step after `presentation.create` succeeds
- **Validation:**
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed after clearing stale `.next` output and safe local caches (`~/.cache/huggingface`, `~/.npm/_cacache`)
  - Dev server restarted and verified at `http://localhost:3000`
- **Manual testing notes:**
  - Create modal flow now advances from presentation details to **Add source documents**
  - Draft workspace also shows source upload before generation, so skipped modal uploads can be recovered

---

## Known Issues
- `/prototype` page has broken import (`@/../../deckbuddy-reimagined`)
- Turbopack persistent cache can serve stale server code on file edits (workaround: restart dev server)
- Anthropic warned `claude-sonnet-4-20250514` is deprecated and reaches end-of-life on June 15, 2026
- Next.js warns the `middleware` file convention is deprecated and should eventually migrate to `proxy`
