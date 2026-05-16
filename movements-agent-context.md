# Mo(ve)ments — Project Context for Coding Agent

> This document is the single source of truth for building Mo(ve)ments. Read it fully before starting any task.

---

## 1. What is Mo(ve)ments?

Mo(ve)ments is a web app that transforms user inputs (topic, context, uploaded documents) into structured "moments" — atomic presentation units containing what the audience sees (slide), what the presenter says (script), how long it takes (timing), and what emotion it creates (beat). The user then edits both the slides and scripts inline, chats with an AI agent for revisions, and exports a .pptx file with speaker notes.

The product is NOT a slide generator. It's a presentation preparation tool. The deliverable is a prepared presenter, not a pretty file.

### Core concept: Moments, not slides

A "moment" is the atomic unit of the product. Every feature operates on moments. A moment contains:

| Field | Type | Purpose |
|-------|------|---------|
| id | uuid | Primary key |
| presentation_id | uuid | Parent presentation |
| position | int | Order in the storyboard |
| title | string | Short label ("The hook", "Market size") |
| emotion | enum | Narrative beat: hook, empathy, build, reveal, proof, close |
| duration_seconds | int | How long this moment should take |
| slide_heading | string | The heading shown on the actual slide |
| slide_bullets | string[] (jsonb) | Bullet points shown on the slide |
| script | text | Full conversational speaker script |
| sources | string[] (jsonb) | Source citations like "pitch-doc.pdf p.3" |

This is different from slides. Slides don't have emotion, timing, scripts, or source citations. Moments do.

---

## 2. Reference MVP prototype

A working prototype exists at `deckbuddy-reimagined.jsx` (React component). This is the UX reference for the production app. Key patterns from the prototype:

### Input screen
- Clean, editorial feel
- Fields: topic (text), context (textarea), audience (select), duration (select), file upload zone
- Uses Instrument Serif for headings, Plus Jakarta Sans for body
- Warm accent color #C4501B
- "Build my moments →" button triggers generation

### Workspace (storyboard view)
- **Top bar**: presentation title, metadata (moment count, duration, audience), action buttons (Sources, Rehearse, Export)
- **Arc bar**: horizontal colored bar showing the emotional arc. Each segment's width = moment duration. Colors: hook=#3A7BD5, empathy=#D85A30, build=#C68B1E, reveal=#1D9E75, proof=#2A8C5E, close=#C4501B
- **Moment list**: vertical timeline of moments, each with:
  - Timeline dot + vertical connector line
  - Collapsed view: mini dark slide preview (showing actual heading/bullets as tiny text) + script preview (2-line clamp) + emotion badge + timing + source pills
  - Expanded view (on click): side-by-side layout with SlideEditor (left) and ScriptEditor (right)
- **Agent sidebar**: right panel, 260px wide, with chat messages, input field, contextual awareness of active moment

### SlideEditor (expanded moment, left side)
- Dark card (#1E293B background, 16:9 aspect ratio)
- Click heading text to edit inline → becomes input field
- Click any bullet to edit inline → becomes input field
- "×" to remove bullet, "+ Add point" to add
- Slide number badge in corner

### ScriptEditor (expanded moment, right side)
- Warm background card (#F3F2EE)
- "🎤 SPEAKER SCRIPT" label
- Script text at 13-14px, 1.8 line height
- "Edit script" button opens textarea mode
- Save/Cancel when editing
- Action bar: Edit script, Revise with agent, source citation pills

### AI integration in prototype
- Generation: calls Claude Sonnet, sends topic + context + audience + duration + uploaded file contents, receives JSON array of moments
- Agent chat: calls Claude Haiku, sends presentation context + active moment + user message, receives text response with optional `<newscript moment_id="N">` XML tags that are parsed and applied to moments

---

## 3. Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ (App Router) | TypeScript strict mode |
| Styling | Tailwind CSS 4.x | Custom color palette (see section 8) |
| State | Zustand | With temporal middleware for undo/redo (P1) |
| API | tRPC 11.x | End-to-end type safety |
| Database | PostgreSQL via Supabase | RLS on all tables |
| Auth | Supabase Auth | Email + Google OAuth |
| File storage | Supabase Storage | User-scoped buckets: documents, exports |
| AI (generation) | Claude Sonnet 4.6 | model: claude-sonnet-4-20250514 |
| AI (agent) | Claude Haiku 4.5 | model: claude-haiku-4-5-20250414 |
| Payments | Stripe | Subscriptions |
| PPTX export | pptxgenjs 3.x | Server-side generation |
| PDF parsing | pdf-parse | Text extraction from uploads |
| DOCX parsing | mammoth | Text extraction from uploads |
| Monitoring | Sentry | Error tracking |
| Analytics | PostHog | Product analytics |
| Hosting | Vercel | Zero-config Next.js |

---

## 4. Architecture — Modular monolith

Everything deploys as a single Next.js app. Services are logical modules, not separate deployments.

```
src/
  app/                         # Next.js App Router pages
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (auth)/callback/route.ts
    dashboard/page.tsx
    workspace/[id]/page.tsx
    settings/page.tsx
    api/trpc/[trpc]/route.ts   # tRPC handler
    api/stripe/webhook/route.ts
    api/export/download/[id]/route.ts
    page.tsx                    # Landing page
    layout.tsx
  modules/                     # Backend service modules
    auth/router.ts
    presentation/router.ts
    document/router.ts
    generation/router.ts
    generation/source-verifier.ts
    moment/router.ts
    agent/router.ts
    export/router.ts
    export/pptx-generator.ts
    billing/router.ts
  lib/                         # Shared libraries
    supabase/client.ts         # Browser Supabase client
    supabase/server.ts         # Server Supabase client (cookies)
    supabase/middleware.ts     # Session refresh
    supabase/types.ts          # Generated TypeScript types
    trpc/server.ts             # tRPC init + context
    trpc/client.ts             # tRPC React client
    trpc/router.ts             # Root router composing all modules
    ai/client.ts               # Anthropic SDK init
    ai/generate.ts             # Sonnet streaming wrapper
    ai/agent.ts                # Haiku streaming wrapper
    ai/prompts.ts              # System prompt templates
    ai/edit-parser.ts          # Parse <newscript>/<newslide> XML from agent
    ai/cost-logger.ts          # Log token usage
    stripe/client.ts           # Stripe SDK init
    documents/parser.ts        # Text extraction (PDF, DOCX, TXT)
    documents/chunker.ts       # Text chunking
    documents/file-validator.ts # Magic byte + size validation
  stores/                      # Zustand stores
    presentation.ts            # Moments array, active index, save state
    agent.ts                   # Chat messages, thinking state
  components/
    auth/AuthGuard.tsx
    workspace/TopBar.tsx
    workspace/ArcBar.tsx
    workspace/MomentList.tsx
    workspace/MomentCard.tsx
    workspace/SlideEditor.tsx
    workspace/ScriptEditor.tsx
    workspace/AgentSidebar.tsx
    workspace/ExportButton.tsx
    workspace/GenerationError.tsx
    presentation/CreateModal.tsx
    document/FileUploadZone.tsx
    ui/SaveIndicator.tsx
    ui/Toast.tsx
    ui/LimitIndicator.tsx
    ui/UpgradePrompt.tsx
    ui/ErrorBoundary.tsx
  middleware/
    security.ts                # Input sanitizer, prompt injection defense
    rate-limiter.ts            # Token bucket per-user
    error-handler.ts           # Global tRPC error handler
  hooks/
    useAutosave.ts             # Debounced save to DB
  middleware.ts                # Next.js middleware (auth + session refresh)
```

---

## 5. Database schema

The schema is deployed in Supabase. Source file: `supabase/migrations/001_initial_schema.sql`

### Tables

**profiles** — extends Supabase auth.users
- id (uuid, PK, FK → auth.users)
- email, display_name, plan (free/pro/team)
- stripe_customer_id, stripe_subscription_id
- generation_count_today (int), generation_count_reset_at (timestamptz)

**presentations** — aggregate root
- id (uuid, PK), user_id (uuid, FK → profiles, CASCADE)
- title, audience, target_duration, total_duration
- status (draft/generated/edited/exported)
- prompt_version (int), tips (jsonb)
- created_at, updated_at (auto-trigger)

**moments** — core domain object
- id (uuid, PK), presentation_id (uuid, FK → presentations, CASCADE)
- position (int), title, emotion (hook/empathy/build/reveal/proof/close)
- duration_seconds (int), slide_heading, slide_bullets (jsonb)
- script (text), sources (jsonb)
- created_at, updated_at (auto-trigger)

**source_documents** — uploaded reference files
- id (uuid, PK), presentation_id (FK, CASCADE)
- filename, file_path, file_size, extracted_text, chunks (jsonb)

**agent_conversations** — chat history per presentation
- id (uuid, PK), presentation_id (FK, CASCADE)
- messages (jsonb array of {role, text, timestamp})
- updated_at (auto-trigger)

**exports** — generated output files
- id (uuid, PK), presentation_id (FK, CASCADE)
- format (pptx/pdf/md), file_path, signed_url, expires_at

### Key constraints
- RLS enabled on ALL tables
- Child tables use `exists (select 1 from presentations where ...)` pattern for RLS
- Auto-profile creation trigger on auth.users insert
- updated_at auto-set via triggers on presentations, moments, agent_conversations
- Daily generation count reset via pg_cron at midnight UTC

---

## 6. Service module specifications

### Auth module (src/modules/auth/)
- Session validation, profile access
- Plan checking utility: `checkGenerationLimit(userId)`, `checkPresentationLimit(userId)`, `incrementGenerationCount(userId)`
- Used by: generation, presentation, export modules

### Presentation module (src/modules/presentation/)
- CRUD: create, list, getById (with moments join), delete
- create checks presentation limit (free=2)
- getById returns presentation + all moments ordered by position

### Document module (src/modules/document/)
- Upload: validate → store in Supabase Storage → extract text → chunk → save to DB
- Pipeline: pdf-parse (PDF), mammoth (DOCX), readFile (TXT/CSV/MD)
- Chunks: 4000 chars with 200 char overlap
- File limits: 10MB max, allowlist (pdf, docx, txt, csv, md)

### Generation module (src/modules/generation/)
- Core AI pipeline. 5 stages: prompt assembly → Claude Sonnet call → JSON parse → validation → source verification
- Input: presentationId. Fetches topic/audience/duration + source doc chunks
- System prompt instructs JSON output with moments array
- Checks generation limit before calling API
- Deletes existing moments on regeneration (idempotent)
- Source verification: checks cited filenames exist, fuzzy-matches claims against doc text

### Moment module (src/modules/moment/)
- CRUD for individual moments: update (partial), batchUpdate (reorder), create, delete
- Used by workspace autosave (debounced PUT on edit)
- Used by agent module (applies script/slide revisions)

### Agent module (src/modules/agent/)
- Chat with AI co-director using Claude Haiku
- Context: presentation metadata + all moment titles/emotions + active moment full content + conversation history (last 20 messages)
- Parses response for `<newscript moment_id="N">` and `<newslide moment_id="N">` XML tags
- When tags found: updates the moment via Moment module, returns update info to client
- Stores conversation in agent_conversations table

### Export module (src/modules/export/)
- PPTX generation via pptxgenjs
- Each moment → one slide: slide_heading as title, slide_bullets as body, script as speaker notes
- Template: dark background (#1E293B), white text (Arial 28pt heading, 18pt bullets), slide numbers
- Upload to Supabase Storage → signed URL (1 hour) → return download link
- Free users blocked from PPTX export

### Billing module (src/modules/billing/)
- Stripe checkout session creation (Pro $15/mo, Team $25/user/mo)
- Stripe billing portal for existing subscribers
- Webhook handler: checkout.session.completed → update plan, subscription.deleted → downgrade

---

## 7. AI pipeline details

### Generation prompt structure
```
[SYSTEM PROMPT — cached, identical across all requests]
You are a world-class presentation director...
Respond ONLY with JSON. Schema: { title, moments: [...], total_duration, tips }

[USER CONTEXT — varies per request]
<user_topic>{topic}</user_topic>
<user_context>{context}</user_context>
AUDIENCE: {audience}
DURATION: {duration}

[SOURCE DOCUMENTS — from uploads]
<source_document name="pitch-doc.pdf">
{extracted text chunks}
</source_document>

[FORMAT INSTRUCTIONS]
Each moment must have: id, title, emotion (hook|empathy|build|reveal|proof|close),
duration_seconds, slide_heading, slide_bullets, script, sources
```

### Agent prompt structure
```
[SYSTEM PROMPT]
You are the AI co-director for Mo(ve)ments...
When revising a script, wrap in <newscript moment_id="N">...</newscript>
When revising a slide, wrap in <newslide moment_id="N">{JSON}</newslide>

[CONTEXT]
Presentation: {title}, {audience}, {duration}
Moments: [{id, title, emotion}...]
Active moment (full): {title, slide_heading, slide_bullets, script, sources}

[CONVERSATION HISTORY — last 20 messages]
user: ...
assistant: ...

[NEW MESSAGE]
user: {message}
```

### Edit parser (src/lib/ai/edit-parser.ts)
Scans agent response for XML tags:
- `<newscript moment_id="3">new script text</newscript>` → update moment 3's script
- `<newslide moment_id="3">{"slide_heading":"...","slide_bullets":[...]}</newslide>` → update moment 3's slide content
Returns: `{ cleanText: string, edits: Array<{momentId, field, value}> }`

### Model usage
- **Sonnet 4.6** (`claude-sonnet-4-20250514`): generation only. max_tokens=4096, temperature=0.7
- **Haiku 4.5** (`claude-haiku-4-5-20250414`): agent chat only. max_tokens=1000, temperature=0.7
- Prompt caching: system prompt is cacheable (90% input cost savings after first request)
- Retry: on 429/500, wait 1s, retry once. On second failure, return error.

---

## 8. Design system

### Typography
- Headings: `Instrument Serif`, 400-700 weight
- Body: `Plus Jakarta Sans`, 300-600 weight
- Google Fonts link: `https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap`

### Color palette

```
accent:     #C4501B   — primary action color, CTAs, active states
accentSoft: #FDF0EB   — light accent backgrounds
accentText: #9A3A10   — dark accent for text on light backgrounds

bg:         #FAFAF7   — page background
bgAlt:      #F3F2EE   — card backgrounds, code blocks
surface:    #FFFFFF   — elevated surfaces

text:       #1C1C1A   — primary text
textMid:    #5A5A56   — secondary text
textLight:  #9C9C96   — tertiary text, placeholders

border:     #E8E6E0   — borders, dividers
borderLight:#F0EEEA   — subtle dividers

slide:      #1E293B   — slide card background (dark)
slideAccent:#F59E0B   — bullet dots and highlights on slides

Emotion colors:
  hook:     #3A7BD5 / #EBF2FC
  empathy:  #D85A30 / #FAECE7
  build:    #C68B1E / #FDF5E6
  reveal:   #1D9E75 / #E1F5EE
  proof:    #2A8C5E / #E8F5EE
  close:    #C4501B / #FDF0EB

Status colors:
  success:  #2A8C5E / #E8F5EE
  warning:  #C68B1E / #FDF5E6
  danger:   #E24B4A / #FEE
  info:     #3A7BD5 / #EBF2FC
```

### Tailwind config
These colors should be in `tailwind.config.ts` under `theme.extend.colors`.

### Design principles
- Warm, editorial, premium — not a typical SaaS template
- Minimal use of borders — use spacing and background color changes instead
- Rounded corners: 8-14px on cards, 10px on inputs, 20px on pills/badges
- Subtle shadows only on elevated elements (modals, dropdowns)
- No stock illustrations or generic icons
- The workspace should feel like a creative tool (think Linear, Notion, Figma), not a form

---

## 9. P0 functional requirements (launch scope)

| ID | Requirement | Module |
|----|-------------|--------|
| FR-1 | User registration + login (email + Google OAuth) | Auth |
| FR-2 | Data isolation via RLS | Auth |
| FR-3 | Create presentation (topic, audience, duration) | Presentation |
| FR-4 | Upload source documents (PDF, DOCX, TXT, CSV, MD) | Document |
| FR-5 | List + manage presentations (dashboard) | Presentation |
| FR-6 | Generate moments from inputs via Claude Sonnet | Generation |
| FR-8 | Source-grounded scripts with citation verification | Generation |
| FR-10 | Inline slide editing (heading + bullets, click to edit) | Moment |
| FR-11 | Inline script editing (textarea mode) | Moment |
| FR-15 | Conversational AI agent (Claude Haiku) | Agent |
| FR-16 | Agent applies edits directly to moments | Agent |
| FR-18 | Export to PPTX with speaker notes | Export |
| FR-20 | PPTX compatibility (PowerPoint, Google Slides, Keynote) | Export |
| FR-22 | Free tier limits (2 presentations, 3 gen/day, no PPTX) | Auth |

## 10. P0 non-functional requirements

| ID | Requirement | How it's satisfied |
|----|-------------|-------------------|
| NF-1 | First moment appears within 5s | Streaming from generation service |
| NF-2 | Agent response starts within 1.5s | Haiku model (fast) + streaming |
| NF-3 | Edit latency under 100ms | Optimistic UI updates in Zustand |
| NF-7 | Handle 50 concurrent generations | Per-user queue + retry with backoff |
| NF-9 | Graceful AI failure degradation | Retry once → partial results → user-friendly error |
| NF-10 | Max 2s data loss on crash | Debounced autosave at 1500ms |
| NF-11 | API keys server-side only | All AI/Stripe calls in API routes, never in client |
| NF-12 | Data isolation at DB level | RLS on all tables |
| NF-13 | Upload file validation | Magic byte check + size limit + type allowlist |
| NF-14 | Prompt injection defense | XML delimiters + "treat as data" system prompt |
| NF-16 | No training on user data | Anthropic API data retention flags |
| NF-18 | Error monitoring | Sentry on all API routes + client error boundary |

---

## 11. Key patterns and conventions

### tRPC pattern
Every module exports a tRPC router. All routers are composed in `src/lib/trpc/router.ts`:
```typescript
export const appRouter = router({
  auth: authRouter,
  presentation: presentationRouter,
  document: documentRouter,
  generation: generationRouter,
  moment: momentRouter,
  agent: agentRouter,
  export: exportRouter,
  billing: billingRouter,
});
```

### Supabase client pattern
- Browser (client components): `src/lib/supabase/client.ts` — uses `createBrowserClient`
- Server (API routes, server components): `src/lib/supabase/server.ts` — uses `createServerClient` with cookies
- Never import the server client in client components

### Autosave pattern
1. User edits a moment (slide heading, bullet, script)
2. Zustand store updates immediately (optimistic, 0ms)
3. `useAutosave` hook detects the change, marks moment as dirty
4. After 1500ms of no changes, fires tRPC `moment.update` mutation
5. On success: update `lastSavedAt`, clear dirty flag
6. On failure: show toast, retry once after 3s

### Agent edit pattern
1. User sends message in AgentSidebar
2. Client calls `agent.chat` with message + activeMomentIndex
3. Server builds context, calls Haiku, gets response
4. Server parses response for `<newscript>`/`<newslide>` XML tags
5. If tags found: server updates moment in DB, returns `updatedMoments` array
6. Client receives response: adds agent message to chat, applies moment updates to Zustand store
7. Workspace re-renders with updated content

### File upload pattern
1. User drops files in FileUploadZone
2. Client converts to base64, calls `document.upload` for each file
3. Server validates (type, size, magic bytes)
4. Server uploads to Supabase Storage at `{user_id}/{presentation_id}/{filename}`
5. Server extracts text (pdf-parse / mammoth / readFile)
6. Server chunks text into 4000-char segments with 200-char overlap
7. Server stores metadata + extracted_text + chunks in source_documents table

### Generation pattern
1. User clicks "Generate my moments"
2. Client calls `generation.create` with presentationId
3. Server checks generation limit → assembles prompt → calls Sonnet → streams response
4. Server parses JSON, validates moments, runs source verification
5. Server deletes existing moments (idempotent), inserts new ones
6. Server updates presentation status to 'generated'
7. Client renders moments as they arrive (streaming) or after completion

---

## 12. What NOT to build (out of scope for launch)

- Rehearsal / teleprompter mode
- Drag-to-reorder moments (use position field, but no drag UI yet)
- Undo/redo
- PDF export (only PPTX at launch)
- Team features / shared workspaces
- Audience switcher (same moment, different audiences)
- Draggable narrative arc designer
- Mobile responsive workspace (desktop/tablet only)
- Dark mode
- Image upload or AI image generation for slides
- Video/avatar output
- Real-time collaboration
