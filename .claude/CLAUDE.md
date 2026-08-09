# CLAUDE.md

Guidance for Claude Code working on the **Plagiacheck** repo.

## How this file is organized

This file is the **front door**. It gives a fast mental model of the project and a directory of `plagiacheck-*` skills. Don't memorize details from here — when you need depth, **load the matching skill** and read it. The skills are the source of truth; this file is the index.

If you ever find yourself searching the codebase to answer a question that has an obvious skill match below, stop and read the skill first.

---

## What Plagiacheck is (one paragraph)

A Next.js 15 (App Router) writing-tools SaaS at `https://www.plagiacheck.online/`. It bundles **15 tools** across three categories (Writing, Image & Visual, Voice & Audio), gated by a **two-currency token system** (text tokens + image tokens) topped up via Stripe. Auth + DB are Supabase. AI is Mistral. State is Zustand. UI is Tailwind + shadcn.

## Two-minute mental model

1. User signs in via Supabase (`/signin`). New rows seeded with 1000 text tokens.
2. User picks a tool from the categorized nav mega-menu (`components/nav.tsx`). Pages live at `app/<tool>/page.tsx`.
3. Tool calls an API route (`app/api/.../route.ts`) which:
   - validates the Supabase JWT (Bearer header) via `lib/server-auth.ts`
   - atomically deducts tokens via Supabase RPCs (`lib/server-tokens.ts`)
   - calls Mistral AI (or browser APIs for voice tools)
   - refunds tokens on failure, records the run in `tool_history` (`lib/server-history.ts`)
4. Token balance is mirrored client-side in a Zustand store (`lib/store.ts`) for display. Server is authoritative.
5. Payments flow Stripe Checkout → Stripe webhook (`app/api/webhook/stripe/route.js`) → Supabase tables (`PurchasedToken`, `Package`, `user_profiles`, `Payment`).

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

---

## Skill index — read these for details

When a user question or task lands, identify which slice of the system it touches and **load the matching skill via the Skill tool**. Most tasks are answered by one skill; cross-cutting work pulls in 2-4.

### Start here for any open-ended question

- **`plagiacheck-overview`** — high-level map + skill index. Load first when you don't know which specific skill applies, or when the user asks something broad like "how does this work".

### Per-tool skills (one per tool, 15 total)

**Writing tools (text tokens):**
- `plagiacheck-tool-plagiarism-checker` — `/plagiarism-checker` (the home page `/` now hosts PlagiaAI chat), SSE streaming, Mistral + algorithmic fallback
- `plagiacheck-tool-ai-detector` — `/ai-detector`, sentence-by-sentence scoring, PDF report
- `plagiacheck-tool-ai-humanizer` — `/ai-humanizer`, tone × level controls
- `plagiacheck-tool-paraphraser` — `/paraphraser`, 6 modes
- `plagiacheck-tool-summarizer` — `/summarizer`, paragraph or bullets
- `plagiacheck-tool-grammar-checker` — `/grammar-checker`, issue list with positions
- `plagiacheck-tool-word-counter` — `/word-counter`, **FREE**, client-only

**Image & visual tools (image tokens):**
- `plagiacheck-tool-image-to-text` — `/image-to-text`, Mistral pixtral-12b OCR
- `plagiacheck-tool-infographic-generator` — `/infographic-generator`, LLM JSON spec → deterministic SVG via `lib/svg-templates.ts`
- `plagiacheck-tool-thumbnail-generator` — `/thumbnail-generator`, LLM JSON spec → deterministic 1200×630 SVG via `lib/svg-templates.ts`
- `plagiacheck-tool-chart-generator` — `/chart-generator`, LLM JSON spec → deterministic SVG (bar / line / pie / flowchart / mindmap / timeline / comparison) via `lib/svg-templates.ts`

**Voice & audio tools (browser-dependent):**
- `plagiacheck-tool-speech-to-text` — `/speech-to-text`, Web Speech API + Mistral cleanup
- `plagiacheck-tool-text-to-speech` — `/text-to-speech`, **FREE**, browser SpeechSynthesis only
- `plagiacheck-tool-voice-to-essay` — `/voice-to-essay`, Web Speech API + Mistral
- `plagiacheck-tool-audio-summarizer` — `/audio-summarizer`, Web Speech API + Mistral

### Cross-cutting infrastructure skills

- `plagiacheck-database` — Supabase tables, RPCs, **two coexisting Supabase clients** (modern URL/ANON_KEY vs. legacy URL2/SUPABASE_KEY)
- `plagiacheck-auth` — Supabase auth client+server, sign-in/up/forgot/reset pages, guest tokens
- `plagiacheck-tokens` — text vs image tokens, deduct/refund pattern, cost formula, Zustand store
- `plagiacheck-payments` — Stripe flows, webhook event handlers, **restricted files** list
- `plagiacheck-history` — `tool_history` table, `recordToolUse`, the `/history` page
- `plagiacheck-components` — nav mega-menu, ToolPageHeader, FAQ, shadcn/ui inventory
- `plagiacheck-pages-non-tool` — `/pricing`, `/billing`, `/history`, `/signin`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`
- `plagiacheck-env` — every env var, including the `URL2` legacy alias

---

## ⚠️ Restricted areas — DO NOT MODIFY

These directories handle real money. **Never edit them** without explicit user confirmation. If a task seems to require it, stop and ask first.

- `app/api/paymentstuff/*`
- `app/api/Redirect/*`
- `app/api/webhook/*`
- `app/api/discounts/*`
- The Stripe `checkout.sessions.create` calls inside `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` (the surrounding routing logic is fine to read; the Stripe call is locked)

### Pricing rules

- **Pricing structure, plan tiers, and Stripe `priceId` strings in `app/pricing/page.tsx` are locked.** Don't change `$9.99`, `$29.99`, `price_1QrlQ3AJsVayTGRcMsOQu8Gy`, etc.
- **The pricing UI is fair game** — visual layout, copy, animations, card designs can be redesigned freely.

For full payment context, load `plagiacheck-payments`.

---

## Conventions to preserve

These come up often enough that they belong in the front door:

- **Tool page skeleton.** Every tool page imports `<Nav />`, then `<ToolPageHeader … />`, then a `<section className="container max-w-5xl …">`, then `<FAQ />`. Don't deviate without reason.
- **Auth pattern.** Client uses `createClientComponentClient()` from `@supabase/auth-helpers-nextjs`; servers use `getUserFromRequest(req)` from `lib/server-auth.ts` with Bearer JWT.
- **Token deduction.** Always deduct via the RPC, refund on every failure path, return `remainingTokens` in the response. Page calls `decrementWords()` (no args — it refetches) on success.
- **`recordToolUse` is best-effort.** Errors are caught and logged. Don't `await` it inside a try/catch that fails the request.
- **No emojis in committed code** unless the user asks.

---

## Project metadata

- **Production URL:** `https://www.plagiacheck.online/`
- **Stack:** Next.js 15 / React 19 / TypeScript / Tailwind / shadcn-ui / Supabase / Stripe / Mistral AI / Zustand / Framer Motion
- **Default theme:** dark (`next-themes`)
- **Path alias:** `@/` → repo root (configured in `components.json`)

Database SQL reference (context only — not runnable): `.claude/db-schema`
