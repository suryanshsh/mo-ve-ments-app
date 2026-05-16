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

## Known Issues
- `/prototype` page has broken import (`@/../../deckbuddy-reimagined`)
- `/workspace/[id]` uses sync `params.id` — needs `await params` (Next.js 16 breaking change)
- Turbopack persistent cache can serve stale server code on file edits (workaround: restart dev server)
