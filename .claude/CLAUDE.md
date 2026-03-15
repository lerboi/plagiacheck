# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plagiacheck is an AI-powered writing tools platform built with Next.js 15 (App Router). It offers plagiarism checking, AI detection, AI humanizing, paraphrasing, summarizing, grammar checking, and word counting. The app uses a token-based system where users purchase or subscribe to get word/image tokens.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server

## DO NOT TOUCH — Restricted Files

These folders/routes must NEVER be modified:
- `app/api/paymentstuff/*`
- `app/api/Redirect/*`
- `app/api/webhook/*`
- `app/api/discounts/*`

## DO NOT CHANGE — Pricing & Payments

- Do NOT change the core Pricing structure, tiers, or Stripe checkout/payment session logic
- The pricing UI/design CAN be changed, but the actual plans, prices, and Stripe integration must stay the same
- `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` — do not change the Stripe session creation logic

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components (Radix UI primitives)
- **Auth & Database**: Supabase (auth-helpers-nextjs for client-side auth, direct supabase-js for server-side)
- **Payments**: Stripe (subscriptions + one-time payments)
- **AI**: Mistral AI for text processing (plagiarism detection, AI detection, humanizing, paraphrasing, summarizing, grammar checking)
- **State**: Zustand (persisted token store in `lib/store.ts`, localStorage key: `token-storage`)
- **Animations**: Framer Motion

### Key Patterns

**Authentication**: Uses `createClientComponentClient()` from `@supabase/auth-helpers-nextjs` in client components. Server-side API routes use `createClient()` from `@supabase/supabase-js` directly with `NEXT_PUBLIC_SUPABASE_URL2` and `SUPABASE_KEY` env vars (note the `URL2` suffix).

**Token System**: Users have tokens tracked in a `user_profiles` table (for text tokens via Zustand store in `lib/store.ts`) and a `PurchasedToken` table (for purchased text/image tokens managed by the webhook). The Zustand store persists to localStorage as `token-storage`.

**AI Tools API**: All AI-powered tools (except plagiarism checker) use `app/api/ai-tools/route.ts` — a shared API route that calls Mistral AI with tool-specific system prompts. The plagiarism checker has its own route at `app/api/check-plagiarism/route.ts`.

**Payment Flow**:
- Subscription checkout: `api/create-checkout-session` → Stripe → webhook handles token allocation
- One-time token purchase: `api/paymentstuff/create-prompt-payment-a` → Stripe → webhook `payment_intent.succeeded`
- Package subscriptions: `api/paymentstuff/create-packages-payment-a` → Stripe → webhook `invoice.paid`
- All token/package processing happens in the Stripe webhook (`api/webhook/stripe/route.js`)

**Supabase Tables**: `user_profiles` (tokens, user data), `PurchasedToken` (textTokens, imageTokens), `Package` (subscription packages with status/expiry), `Payment` (payment records with idempotency checks)

**Middleware** (`middleware.ts`): Adds CORS headers to API routes and skips the Stripe webhook path.

### UI Components
- `components/ui/` — shadcn/ui components (configured via `components.json` with `@/` path alias)
- `components/` — App-specific components (Nav, Hero, FAQ, Footer, etc.)
- Theme support via `next-themes` with `ThemeProvider`, default dark mode

### Production URL
The app is deployed at `https://www.plagiacheck.online/` — hardcoded in Stripe success/cancel URLs.
