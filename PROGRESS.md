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

## Phase 8: Document Upload & Text Extraction
**Commit:** `be3a65f` — added file upload functionality component

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

## Phase 10: Moment Generation Pipeline
**Commit:** `57ce461` — added moment generation pipeline

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

## Phase 11: Workspace Storyboard UI
**Commit:** `2d95f30` — workspace ui + wiring

- **`src/stores/presentation.ts`** — Zustand presentation store
  - Stores current presentation, ordered moments, active moment index, save status, and last saved timestamp
  - Provides actions for setting presentation data, editing moments, adding/deleting moments, and reordering moments
- **Workspace components added:**
  - `TopBar`: Dashboard back link, title, metadata pills, action buttons, and save indicator placement
  - `ArcBar`: Duration-weighted emotional arc with emotion color segments
  - `MomentList`: Vertical storyboard timeline with staggered load animation
  - `MomentCard`: Collapsed/expanded moment UI with slide preview, script preview, timing badge, emotion badge, and source pills
  - `SlideEditor`: Inline editable dark 16:9 slide card with editable heading and bullets
  - `ScriptEditor`: Warm script card with textarea edit mode and Save/Cancel controls
- **`src/components/workspace/WorkspaceClient.tsx`** — Workspace composition
  - Hydrates Zustand from `presentation.getById`
  - Preserves draft upload/generation flow for presentations without moments
  - Renders storyboard workspace with agent sidebar placeholder
- **Validation:**
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed
  - Authenticated workspace rendered at `http://localhost:3000/workspace/8ef57b37-5656-4ab7-b76f-29e2998da181`

---

## Phase 12: Workspace Autosave
**Commit:** `3bd074d` — autosave

- **`src/modules/moment/router.ts`** — Moment persistence API
  - `update`: Saves partial moment edits for title, emotion, duration, slide heading, bullets, script, and sources
  - `batchUpdate`: Saves reordered moment positions through a Supabase RPC transaction
- **`supabase/migrations/002_batch_update_moment_positions.sql`** — Reorder transaction helper
  - Adds `batch_update_moment_positions(p_updates jsonb)` Postgres function
  - Applied manually through Supabase SQL Editor
- **`src/hooks/useAutosave.ts`** — Debounced autosave hook
  - Watches dirty moments in the Zustand store
  - Debounces edits for 1500ms
  - Sends only changed fields to `moment.update`
  - Retries once after 3 seconds on save failure
- **`src/stores/presentation.ts`** — Dirty/save state
  - Adds `saveError`, `dirtyMomentIds`, `markMomentDirty`, and `clearDirtyMoments`
  - Keeps edits optimistic so UI updates immediately while save runs in the background
- **`src/components/ui/SaveIndicator.tsx`** — Top-bar save state UI
  - Shows **All changes saved**, **Saving...**, or **Save failed — retrying**
  - Displays relative saved time such as **Saved 5 seconds ago**
- **`src/components/ui/Toast.tsx`** — Bottom-center toast notifications
  - Auto-dismisses after 4 seconds
  - Used by autosave failure handling
- **Validation:**
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed
  - Authenticated workspace rendered with save indicator visible

---

## Phase 13: AI Agent Chat Sidebar

- **`src/modules/agent/router.ts`** — Agent tRPC router
  - `chat`: Fetches presentation context, loads/creates conversation history, builds the Haiku system prompt, collects the streamed agent response, parses edit tags, applies script/slide updates, persists conversation messages, and returns clean text plus updated moments
  - `getHistory`: Loads existing conversation messages for the workspace sidebar
- **`src/lib/ai/agent.ts`** — Agent model wrapper
  - Uses current Anthropic Haiku model `claude-haiku-4-5-20251001` by default
  - Supports `ANTHROPIC_AGENT_MODEL` override for future model swaps
- **`src/lib/ai/edit-parser.ts`** — Agent edit tag parser
  - Extracts `<newscript moment_id="N">...</newscript>` edits
  - Extracts `<newslide moment_id="N">{"slide_heading":"...","slide_bullets":[...]}</newslide>` edits
  - Removes XML edit tags from the visible agent response and ignores malformed edit payloads safely
- **`src/lib/ai/prompts.ts`** — Agent prompt context
  - Adds presentation metadata to `AGENT_SYSTEM_PROMPT_TEMPLATE`
  - Keeps numeric moment IDs aligned to storyboard positions while preserving database IDs in context
- **`src/stores/agent.ts`** — Zustand chat store
  - Stores user/agent messages with timestamps
  - Tracks `isThinking`
  - Provides `addMessage`, `setThinking`, `loadHistory`, and `clearHistory`
- **`src/components/workspace/AgentSidebar.tsx`** — Workspace co-director UI
  - Fixed 260px desktop sidebar with header status, active moment indicator, scrollable messages, thinking bubble, input, and send button
  - Loads conversation history on mount
  - Sends chat messages through tRPC and applies returned moment edits into the presentation store
- **`src/components/workspace/WorkspaceClient.tsx`** — Workspace wiring
  - Replaces the placeholder agent panel with the live `AgentSidebar`
  - Reserves desktop content space for the fixed sidebar
- **Validation:**
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed
  - Parser smoke test extracted script and slide edits correctly
  - Authenticated workspace rendered with the new **Co-director** sidebar visible
  - Live no-edit agent ping returned `OK` after correcting the Haiku model ID

---

## Phase 14: Source Citation Verification

- **`src/modules/generation/source-verifier.ts`** — Moment source verification
  - Adds `verifyMomentSources(moments, documents)` with `verified`, `partial`, `uncited`, and `clean` statuses
  - Extracts numeric claims, percentages, currencies, and proper nouns from scripts
  - Checks cited filenames against uploaded `source_documents` and verifies claims against extracted source text
  - Persists per-source `verified` flags plus hidden moment-level verification metadata in the `sources` JSON field
- **`src/modules/generation/router.ts`** — Generation pipeline wiring
  - Runs source verification after full generation and single-moment regeneration
  - Stores verification metadata before inserting/updating moments
  - Returns `_verification` to the workspace immediately after generation mutations
- **Workspace UI**
  - `SourceBadge`: Amber citation pill, green checked pill for verified sources
  - `VerificationBadge`: Red uncited-claim pill with hover/focus tooltip
  - `MomentCard`: Shows source badges beside collapsed timing, source + warning badges in the expanded action bar, and a subtle red left border for uncited moments
  - `WorkspaceClient`: Hydrates persisted verification metadata from `sources`
- **Validation:**
  - Verifier smoke test confirmed verified and uncited currency-claim paths
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed
  - Browser sanity check loaded the workspace with new source badges visible

---

## Phase 15: PPTX Export Service *(In Progress — uncommitted)*

- **Package added:** `pptxgenjs`
- **`src/modules/export/pptx-generator.ts`** — PPTX generation
  - Generates simple 16:9 widescreen PowerPoint decks with dark blue-gray backgrounds
  - Adds a title slide with Arial title/subtitle text
  - Maps each moment to one slide with heading, up to six bullet rows, emotion label, slide number, and speaker notes from `script`
  - Keeps the template compatibility-first: Arial only, no animations, no transitions, no images, no gradients
- **`src/modules/export/router.ts`** — Export tRPC router
  - Adds `createPptx({ presentationId })`
  - Fetches owned presentation moments ordered by position
  - Blocks free-plan users with an upgrade message
  - Uploads generated PPTX files to Supabase Storage and stores export records with 1-hour signed URLs
- **`src/app/api/export/download/[id]/route.ts`** — Download redirect
  - Validates the authenticated user owns the export through its presentation
  - Redirects to the stored signed URL or refreshes it when expired
- **`src/components/workspace/ExportButton.tsx`** — Workspace export UI
  - Top-bar Export dropdown with **Download as PowerPoint (.pptx)**
  - Shows spinner while generating, triggers browser download on success, and shows upgrade/export error states
- **`supabase/migrations/003_exports_storage_bucket.sql`** — Storage setup
  - Creates the private `exports` bucket and per-user authenticated Storage policies
- **Validation:**
  - PPTX smoke test generated a valid zip-format buffer for 3-bullet and 6-bullet slides
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed

---

## Phase 16: Free Tier Limits *(In Progress — uncommitted)*

- **`src/modules/auth/plan-check.ts`** — Plan enforcement utilities
  - Adds shared helpers for generation and presentation limits
  - Free generation limit: 3/day, Pro/Team generation limit: 50/day
  - Free presentation limit: 2, Pro/Team presentation limit: 999
  - Resets `generation_count_today` at UTC day boundaries and increments generation usage after successful runs
- **`src/modules/generation/router.ts`** — Generation enforcement
  - Uses shared `checkGenerationLimit` before both full generation and regenerate-one
  - Throws `TOO_MANY_REQUESTS` with a clear free-plan upgrade message when limit is exhausted
  - Uses shared `incrementGenerationCount` after successful generation calls
- **`src/modules/presentation/router.ts`** — Presentation creation enforcement
  - Uses shared `checkPresentationLimit` before creating presentations
  - Blocks creation with: "Free plan allows 2 presentations. Delete one or upgrade to Pro."
- **`src/modules/export/router.ts`** — Export plan message
  - Free-plan export block message updated to: "PPTX export is available on the Pro plan."
- **UI limit surfaces**
  - `src/components/ui/LimitIndicator.tsx`: Top-bar limit pill showing `remaining/limit generations remaining`
  - Color states: green (2+ remaining), amber (1 remaining), red (0 remaining)
  - Clicking at 0 opens upgrade guidance
  - `src/components/ui/UpgradePrompt.tsx`: reusable upgrade card with Pro value summary and a "coming soon" checkout toast
  - `src/components/workspace/TopBar.tsx`: renders `LimitIndicator` beside save state
- **Validation:**
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed

---

## Phase 17: Security Hardening *(In Progress — uncommitted)*

- **`src/middleware/security.ts`** — Input and prompt-boundary helpers
  - Adds `sanitizeInput(input)` for text fields with HTML/script/null/control-character stripping and a 10,000-character cap
  - Adds `sanitizeDocumentContent(input)` for document text with the same stripping and a 50,000-character cap
  - Adds `wrapUserContent(content, tag)` for XML prompt delimiters, including source-document tags with attributes
  - Adds recursive `sanitizeStructuredInput` for tRPC mutation payloads while preserving base64 upload bodies
- **`src/middleware/rate-limiter.ts`** — In-memory token bucket limiter
  - Adds `crud` tier at 10 requests/second/user
  - Adds `generation` tier at 2 requests/second/user
  - Returns retry timing for `Retry-After` responses
- **`src/middleware.ts`** — API route rate limiting
  - Runs middleware on API routes as well as protected pages
  - Applies user-scoped rate limiting to authenticated requests and IP-scoped fallback limiting for anonymous API requests
  - Uses the stricter generation tier for AI generation and agent chat tRPC calls
- **`src/lib/trpc/server.ts`** — Global tRPC mutation sanitization
  - Applies recursive string sanitization to all mutation inputs before route handlers run
- **`src/lib/documents/file-validator.ts`** — Upload security checks
  - Adds filename sanitization for path traversal and unsafe characters
  - Enforces extension allowlist: pdf, docx, txt, csv, md
  - Enforces 10MB max upload size
  - Checks PDF and DOCX magic bytes before extraction/storage
- **`src/modules/document/router.ts`** — Upload validation wiring
  - Uses sanitized filenames for storage paths and database records
  - Sanitizes extracted document text before chunking and persistence
- **`src/modules/generation/router.ts`** — Prompt injection hardening
  - Wraps user topic in `<user_topic>` tags
  - Wraps audience/duration context in `<user_context>` tags
  - Wraps source chunks in `<source_document name="filename">` tags
  - Wraps regeneration instructions and existing moment context before insertion into prompts
- **`src/lib/ai/prompts.ts`** — System prompt warning
  - Adds explicit instruction that XML-tagged content is user-provided data, not instructions to follow
- **`src/scripts/security-check.ts`** — Client secret audit
  - Scans `src/app` and `src/components` client components for `process.env` usage
  - Flags `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` references in client components
  - Runs with `npx tsx src/scripts/security-check.ts`
- **Validation:**
  - `npx tsx src/scripts/security-check.ts` passed
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed

---

## Phase 18: Error Handling & Sentry Monitoring *(In Progress — uncommitted)*

- **Package added:** `@sentry/nextjs`
- **Sentry setup**
  - Ran the Sentry Next.js wizard until it required browser login; completed setup manually to avoid credential handling
  - Adds `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`
  - Adds `instrumentation.ts` with runtime-specific Sentry registration and `onRequestError`
  - Wraps `next.config.ts` with `withSentryConfig`, using env-based org/project/auth token settings and source map upload disabled without `SENTRY_AUTH_TOKEN`
- **`src/middleware/error-handler.ts`** — Global tRPC error handling
  - Captures tRPC errors in Sentry with anonymized user IDs/emails, request path, tRPC path/type, and structured diagnostics
  - Maps Anthropic 429, 500+, and timeout failures to safe client messages
  - Converts Supabase/internal load/save failures to friendly messages without returning raw provider errors
  - Adds partial-generation metadata serialization for the tRPC client
- **`src/lib/trpc/server.ts`** — Error middleware wiring
  - Adds request/user context for Sentry diagnostics
  - Applies the global error handler before mutation input sanitization and router handlers
  - Adds an error formatter that preserves partial-generation metadata while keeping messages safe
- **AI wrappers and timeout handling**
  - Adds structured Anthropic `AIServiceError` metadata for status, provider, operation, and retry state
  - Adds a shared 45-second stream collector used by generation and agent chat
  - Keeps existing one-retry behavior for Anthropic `429` and `500` responses before final failure
- **Partial generation flow**
  - Detects when generated moments were inserted but final presentation updates/counting failed
  - Sends `createdCount`, `expectedCount`, and `presentationId` back through tRPC error data
  - Workspace refetches after generation failures so saved partial moments can render
- **UI error surfaces**
  - `src/components/ui/ErrorBoundary.tsx`: Sentry-reporting workspace render boundary with reload recovery
  - `src/components/workspace/GenerationError.tsx`: generation-specific error UI with retry, timeout guidance, and partial-result banner
  - Workspace route wraps `WorkspaceClient` with `ErrorBoundary`
  - Create modal now shows the sanitized generation error message from the server
- **Validation:**
  - `npx tsx src/scripts/security-check.ts` passed
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed with the existing Next.js `middleware` deprecation warning only

---

## Phase 19: Workspace UI Polish *(In Progress — uncommitted)*

- **Loading and empty states**
  - Replaces workspace spinner loading with shimmer skeletons for the top bar, arc bar, moment cards, and agent rail
  - Adds dashboard presentation-card skeletons while loading
  - Updates the dashboard empty state to **No presentations yet** with an illustration placeholder and **Create your first presentation** action
  - Centers the draft workspace prompt around **Ready to generate** and **Generate my moments**, while keeping source uploads available below
- **Workspace motion and micro-interactions**
  - Adds shared shimmer, toast, message, thinking-dot, and slide-over animation utilities in global CSS
  - Smooths MomentCard expand/collapse with a 300ms height transition
  - Changes initial moment load staggering to 60ms
  - Animates ArcBar segment widths over 500ms on load/data changes
  - Adds hover highlights for editable slide text and tooltips for emotion badges
  - Adds a pulse to the active timeline dot
- **Responsive and keyboard polish**
  - Converts the agent sidebar below 1024px into a floating chat button that opens a right-side slide-over
  - Adds agent message-list skeletons, left/right 200ms message entrances, and pulsing thinking dots
  - Stacks slide and script editors below 768px and uses side-by-side editing at tablet/desktop widths
  - Adds global visible accent focus rings with 2px offset and keyboard activation for moment/dashboard cards and the upload drop zone

---

## Phase 20: Landing Page *(In Progress — uncommitted)*

- **Root marketing page**
  - Replaces the placeholder root route with a warm editorial landing page for Mo(ve)ments
  - Adds a spacious hero with **Your next presentation, nailed.**, primary/secondary CTAs, and a stylized workspace storyboard mockup
  - Adds three-step **How it works** content for uploading materials, generating moments, and editing/exporting
  - Adds **Why moments, not slides** comparison visuals for traditional slide decks versus slide + script + timing + emotional arc
  - Adds Free and Pro pricing cards with current tier limits and export positioning
  - Adds footer wordmark, Terms/Privacy/Contact links, and the product positioning line
- **Metadata and motion**
  - Adds page-level title, description, and Open Graph metadata with a placeholder OG image URL
  - Uses existing Instrument Serif and Plus Jakarta Sans theme fonts
  - Adds subtle scroll-triggered fade-up animation utilities with reduced-motion support
- **Validation:**
  - `npx tsx src/scripts/security-check.ts` passed
  - `npx tsc --noEmit --pretty false` passed
  - `git diff --check` passed
  - `npm run build` passed with the existing Next.js `middleware` deprecation warning only
  - Browser preview verified at `http://localhost:3000/`

---

## Phase 21: Lemon Squeezy Billing *(In Progress — uncommitted)*

- **Package added:** `@lemonsqueezy/lemonsqueezy.js`
- **Stripe artifact review**
  - Found old Stripe env placeholders, planning docs, Supabase profile columns, and the client-secret audit entry
  - No active Stripe checkout, webhook, or billing router implementation existed in `src`
  - Leaves legacy Stripe profile fields intact while adding Lemon Squeezy billing fields
- **Server billing integration**
  - Adds server-only Lemon Squeezy SDK setup with `LEMON_SQUEEZY_API_KEY`
  - Adds `billing` tRPC router with checkout creation, current subscription lookup, and hosted customer portal lookup
  - Creates hosted checkouts with authenticated user email and `custom.user_id`, redirecting to `/dashboard?upgraded=true`
  - Registers billing in the root app router
- **Webhook processing**
  - Adds `/api/lemonsqueezy/webhook` with raw-body HMAC SHA-256 verification using `LEMON_SQUEEZY_WEBHOOK_SECRET`
  - Handles `subscription_created` and `subscription_updated`
  - Updates `profiles.plan`, `ls_customer_id`, `ls_subscription_id`, and `ls_subscription_status` through a service-role Supabase admin client
- **Billing UI**
  - Replaces the settings placeholder with a billing card showing Free/Pro/Team plan status
  - Free users can start Pro checkout from Settings or the upgrade prompt
  - Paid users can open the Lemon Squeezy customer portal to manage subscriptions, payment methods, cancellations, and invoices
  - Dashboard shows a success toast after hosted checkout redirects back
- **Database and security audit**
  - Adds migration `004_lemonsqueezy_billing.sql` for `ls_*` profile fields and subscription lookup index
  - Updates local Supabase types and extends client-secret scanning to Lemon Squeezy secrets

---

## Known Issues
- `/prototype` page has broken import (`@/../../deckbuddy-reimagined`)
- Rehearse is intentionally disabled/coming soon
- Turbopack persistent cache can serve stale server code on file edits (workaround: restart dev server)
- Anthropic warned `claude-sonnet-4-20250514` is deprecated and reaches end-of-life on June 15, 2026
- Next.js warns the `middleware` file convention is deprecated and should eventually migrate to `proxy`
