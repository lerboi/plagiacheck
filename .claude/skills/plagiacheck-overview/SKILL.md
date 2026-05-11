---
name: plagiacheck-overview
description: High-level map of the Plagiacheck codebase and an index of every other plagiacheck-* skill. Use this first whenever someone asks how the site works, where a feature lives, what tools exist, how something connects end-to-end, or before modifying any tool, page, API route, or shared infrastructure. Trigger on questions like "how does X work", "where is Y", "what tools do we have", "which API does Z call", "show me the architecture", or any open-ended ask about the project.
---

# Plagiacheck Overview

This is the **starting point** for any question about the Plagiacheck codebase. Use it to get oriented, then jump into a more specific skill for the actual answer.

## What Plagiacheck is

A Next.js 15 (App Router) writing-tools SaaS at `https://www.plagiacheck.online/`. It bundles **15 tools** across three categories (Writing, Image & Visual, Voice & Audio), gated by a **two-currency token system** (text tokens + image tokens) that is topped up via Stripe subscriptions or one-time purchases.

**Stack:** Next.js 15 / React 19 / TypeScript / Tailwind / shadcn-ui / Supabase (auth + Postgres) / Stripe / Mistral AI / Zustand / Framer Motion.

## Two-minute mental model

1. **User signs up** through Supabase auth (`/signin`). New rows get 1000 text tokens by default.
2. **User picks a tool** from the nav mega-menu (`components/nav.tsx`). Pages live at `app/<tool-name>/page.tsx`.
3. **Tool calls an API route** (`app/api/.../route.ts`). The route:
   - Validates the Supabase JWT via `lib/server-auth.ts`.
   - Atomically deducts tokens via Supabase RPCs (`lib/server-tokens.ts`).
   - Calls Mistral AI (or browser APIs for voice tools).
   - Refunds tokens on failure, records the run in `tool_history` (`lib/server-history.ts`).
4. **Token balance** is mirrored client-side in a Zustand store (`lib/store.ts`) for display; the **server is authoritative**.
5. **Payments** flow through Stripe checkout → Stripe webhook (`app/api/webhook/stripe/route.js`) → Supabase tables (`PurchasedToken`, `Package`, `user_profiles`, `Payment`).

## The skill index — go here for details

Each topic has its own `plagiacheck-*` skill. Read the skill instead of re-deriving from the codebase.

### Per-tool skills (one per tool, 15 total)

**Writing tools (consume text tokens):**
- `plagiacheck-tool-plagiarism-checker` — home page (`/`), Mistral + algorithmic fallback, SSE streaming
- `plagiacheck-tool-ai-detector` — `/ai-detector`, Mistral sentence-by-sentence scoring
- `plagiacheck-tool-ai-humanizer` — `/ai-humanizer`, Mistral with tone + level controls
- `plagiacheck-tool-paraphraser` — `/paraphraser`, Mistral with 6 modes
- `plagiacheck-tool-summarizer` — `/summarizer`, Mistral, paragraph or bullet output
- `plagiacheck-tool-grammar-checker` — `/grammar-checker`, Mistral, returns issues + corrected text
- `plagiacheck-tool-word-counter` — `/word-counter`, **FREE**, client-only, no API call

**Image & visual tools (consume image tokens):**
- `plagiacheck-tool-image-to-text` — `/image-to-text`, Mistral pixtral-12b vision OCR
- `plagiacheck-tool-infographic-generator` — `/infographic-generator`, LLM produces JSON spec → server renders SVG via `lib/svg-templates.ts`
- `plagiacheck-tool-thumbnail-generator` — `/thumbnail-generator`, LLM picks palette + headline → server renders 1200×630 SVG via `lib/svg-templates.ts`
- `plagiacheck-tool-chart-generator` — `/chart-generator`, LLM produces structured chart spec → server renders SVG via `lib/svg-templates.ts` (supports bar, line, pie, flowchart, mindmap, timeline, comparison)

**Voice & audio tools (browser-dependent):**
- `plagiacheck-tool-speech-to-text` — `/speech-to-text`, Web Speech API + Mistral cleanup
- `plagiacheck-tool-text-to-speech` — `/text-to-speech`, **FREE**, browser SpeechSynthesis only, no API
- `plagiacheck-tool-voice-to-essay` — `/voice-to-essay`, Web Speech API + Mistral essay rewrite
- `plagiacheck-tool-audio-summarizer` — `/audio-summarizer`, Web Speech API + Mistral summarization

> **Architecture note for the SVG generators (chart, infographic, thumbnail):** the LLM emits a structured JSON spec, never raw SVG. The route validates the spec and `lib/svg-templates.ts` renders the SVG deterministically. Output quality therefore does not depend on the LLM getting positioning right — it just has to extract content.

### Infrastructure & cross-cutting skills

- `plagiacheck-database` — Supabase tables, columns, RPCs (`decrement_user_tokens`, etc.), the **two sets** of env-var-aliased Supabase clients
- `plagiacheck-auth` — Supabase auth on client (`auth-helpers-nextjs`) and server (Bearer JWT in `getUserFromRequest`)
- `plagiacheck-tokens` — text tokens vs image tokens, deduct/refund pattern, cost formula, Zustand mirror
- `plagiacheck-payments` — Stripe flows (subscription, one-time, packages), webhook event handling, restricted files
- `plagiacheck-history` — `tool_history` table, `recordToolUse`, what shows up on `/history`
- `plagiacheck-components` — `nav.tsx`, `tool-page-header`, `tool-signin-prompt`, shadcn-ui inventory
- `plagiacheck-pages-non-tool` — `/pricing`, `/billing`, `/signin`, `/history`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`
- `plagiacheck-env` — every environment variable the app uses, including the `URL2` legacy alias

## Restricted areas (DO NOT MODIFY)

These payment / redirect routes are off-limits. If a task seems to require touching them, stop and confirm with the user first.

- `app/api/paymentstuff/*`
- `app/api/Redirect/*`
- `app/api/webhook/*`
- `app/api/discounts/*`
- The **Stripe session creation logic** inside `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` (the surrounding pricing UI is fair game; the Stripe call is not)

The pricing tiers and Stripe price IDs in `app/pricing/page.tsx` are also locked. The visual presentation of pricing can be redesigned; the plans, prices, and `priceId` strings cannot.

## How to use this skill

When a question lands, identify which slice of the system it touches and consult the matching skill above. Most questions are answered by **one** skill; cross-cutting tasks (e.g. "add a new tool") will pull in 3-4 (database, tokens, history, components).

Don't paraphrase the per-tool skills here — read them when you need them.
