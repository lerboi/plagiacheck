---
name: plagiacheck-architecture
description: Comprehensive architectural reference for the Plagiacheck website. Use this skill whenever someone asks about the site structure, architecture, how the AI tools work, what API routes exist, how pages connect to APIs, payment and token flows, database schema, component layout, navigation structure, authentication patterns, or any question about how the Plagiacheck platform is built. Also trigger when the user asks where something is in the codebase, how a feature connects end-to-end, or needs context before modifying a page or API route.
---

# Plagiacheck Architecture Reference

## Project Overview

Plagiacheck is an AI-powered writing tools platform built with Next.js 15 (App Router), React 19, TypeScript. It offers seven tools: plagiarism checking, AI detection, AI humanizing, paraphrasing, summarizing, grammar checking, and word counting. Users purchase or subscribe to get word/image tokens that are consumed when using paid tools.

**Production URL:** `https://www.plagiacheck.online/`

## Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components (Radix UI primitives)
- **Auth & Database**: Supabase (auth-helpers-nextjs for client-side, direct supabase-js for server-side)
- **Payments**: Stripe (subscriptions + one-time payments)
- **AI**: Mistral AI (mistral-medium model) for text processing
- **State Management**: Zustand (persisted token store in `lib/store.ts`, localStorage key: `token-storage`)
- **Animations**: Framer Motion
- **Theme**: next-themes with ThemeProvider, default dark mode

## Database Schema (Supabase)

Full schema definition lives in `.claude/db-schema`. Here is a summary of the tables:

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_profiles` | Primary user data & text token balance | `id` (uuid, FK to auth.users), `tokens` (int, default 1000), `stripe_customer_id`, `subscription_status`, `plan`, `created_at`, `updated_at` |
| `PurchasedToken` | Purchased text/image token balances | `textTokens`, `imageTokens`, linked to user |
| `Package` | Active package subscriptions | `packageName`, `status` (ACTIVE/PAST_DUE/CANCELED), `expiryDate`, `stripeSubscriptionId`, `paymentFailureCount` |
| `Payment` | Payment history & audit log | `amount`, `status`, `paymentType`, `createdAt`, idempotency checks |
| `OneTimeToken` | Verification tokens for one-time purchases | SHA256 token, used/unused tracking |

## All Pages & Routes

### User-Facing Pages

| Path | File | Description |
|------|------|-------------|
| `/` | `app/page.tsx` | Home page + Plagiarism Checker tool (main entry point) |
| `/ai-detector` | `app/ai-detector/page.tsx` | AI content detection tool |
| `/ai-humanizer` | `app/ai-humanizer/page.tsx` | AI text humanization tool |
| `/paraphraser` | `app/paraphraser/page.tsx` | Text paraphrasing tool |
| `/summarizer` | `app/summarizer/page.tsx` | Text summarization tool |
| `/grammar-checker` | `app/grammar-checker/page.tsx` | Grammar checking tool |
| `/word-counter` | `app/word-counter/page.tsx` | Word counting tool (FREE -- no tokens needed) |
| `/pricing` | `app/pricing/page.tsx` | Subscription plans & token purchases |
| `/signin` | `app/signin/page.tsx` | Authentication (sign in & sign up) |
| `/billing` | `app/billing/page.tsx` | User billing dashboard, payment history |
| `/history` | `app/history/page.tsx` | Tool usage history dashboard |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/redirects` | `app/redirects/page.tsx` | Redirect handling |

### Root Layout
`app/layout.tsx` -- Root layout with ThemeProvider, Footer, Toaster

## All API Routes

### AI Tool Endpoints

**`POST /api/ai-tools`** (`app/api/ai-tools/route.ts`)
- Unified endpoint for humanize, paraphrase, summarize, and grammar checking
- Uses Mistral AI (mistral-medium model)
- Request body: `{ text, tool, options }` where tool = `"humanize"` | `"paraphrase"` | `"summarize"` | `"grammar"`
- Options vary by tool: tone, level, mode, format
- Returns tool-specific JSON results
- **Used by pages:** `/ai-humanizer`, `/paraphraser`, `/summarizer`, `/grammar-checker`

**`POST /api/check-plagiarism`** (`app/api/check-plagiarism/route.ts`)
- Streaming endpoint using Server-Sent Events (SSE)
- Uses Mistral AI for plagiarism detection with algorithmic fallback if AI fails
- Returns: `{ plagiarismPercentage, matches: [{ text, similarity }] }`
- Sends progress updates: 0% -> 30% -> 80% -> 100%
- **Used by page:** `/` (home page)

### Tool-to-API Mapping

| Tool | Page | API Route | AI Model | Tokens Required |
|------|------|-----------|----------|-----------------|
| Plagiarism Checker | `/` | `POST /api/check-plagiarism` | Mistral (medium) | Yes |
| AI Detector | `/ai-detector` | Client-side analysis | None (local) | Yes |
| AI Humanizer | `/ai-humanizer` | `POST /api/ai-tools` (tool: "humanize") | Mistral (medium) | Yes |
| Paraphraser | `/paraphraser` | `POST /api/ai-tools` (tool: "paraphrase") | Mistral (medium) | Yes |
| Summarizer | `/summarizer` | `POST /api/ai-tools` (tool: "summarize") | Mistral (medium) | Yes |
| Grammar Checker | `/grammar-checker` | `POST /api/ai-tools` (tool: "grammar") | Mistral (medium) | Yes |
| Word Counter | `/word-counter` | None (client-side only) | None | **FREE** |

**Token cost formula:** `Math.ceil(text.length / 6)` tokens per use for all paid tools.

### Payment & Checkout Endpoints

**`GET /api/create-checkout-session`** (`app/api/create-checkout-session/route.ts`)
- Creates Stripe checkout for monthly/yearly subscriptions
- Params: `priceId`, `planName`
- Success -> `/api/handle-subscription-success`, Cancel -> `/pricing`

**`GET /api/handle-subscription-success`** (`app/api/handle-subscription-success/route.ts`)
- Called after Stripe subscription checkout completes
- Retrieves session, verifies `payment_status = "paid"`
- Updates `user_profiles`: `stripe_customer_id`, `subscription_status`, `plan`
- Redirects to `/subscription-success`

**`GET /api/paymentstuff/create-prompt-payment-a`** [RESTRICTED]
- Creates Stripe checkout for one-time text token purchases
- Params: `price`, `tokenAmount`, `tokenType`, `userId`, `email`, `currency`, `locale`
- Generates SHA256 verification token stored in `OneTimeToken` table
- Handles INR/USD currency conversion
- Success -> `/api/Redirect/success_prompt`, Cancel -> `/api/Redirect/canceled_prompt`

**`GET /api/paymentstuff/create-packages-payment-a`** [RESTRICTED]
- Creates Stripe checkout for image token packages (200Image, 1000Image)
- Params: `priceId`, `userId`, `email`, `tokenAmount`, `tokenType`, `currency`, `locale`
- Creates `Package` record with ACTIVE status
- Success -> `/api/Redirect/success_package`

**`GET /api/paymentstuff/cancelPackageAPI`** [RESTRICTED]
- Cancels active package subscriptions in Stripe and updates Package status to CANCELED

**`POST /api/paymentstuff/retry-subscription-payment`** [RESTRICTED]
- Retries failed package subscription payments

### Redirect Handlers [ALL RESTRICTED]

- `GET /api/Redirect/success_prompt` -- Verifies token + timestamp (20 min window), allocates tokens to `PurchasedToken`
- `GET /api/Redirect/canceled_prompt` -- Marks `OneTimeToken` as used, redirects to `/pricing`
- `GET|POST /api/Redirect/success_package` -- Updates Package with expiry date
- `GET|POST /api/Redirect/canceled_package` -- Handles canceled package payment

### Stripe Webhook [RESTRICTED]

**`POST /api/webhook/stripe`** (`app/api/webhook/stripe/route.js`)

This is the core payment processing endpoint. Events handled:

- **`invoice.paid`** -> `handleSuccessfulPayment()` -> `handleTokenAllocation()`:
  Adds imageTokens to `PurchasedToken`, updates `Package` expiryDate (+1 month), logs to `Payment` table.

- **`payment_intent.succeeded`** -> `handleTokenPurchase()`:
  Processes one-time purchases, updates `PurchasedToken` or `user_profiles` depending on token type.

- **`invoice.payment_failed`** -> `handleFailedPayment()`:
  Marks Package as PAST_DUE, increments `paymentFailureCount`, auto-cancels subscription after 2+ consecutive failures.

**Metadata fallback:** If subscription metadata is missing, the webhook looks up the Package by `stripeSubscriptionId`.

### Discount Routes [RESTRICTED]

- `POST /api/discounts/create-coupon` -- Creates promotional coupons
- `POST /api/discounts/create-first-time-coupon` -- Creates first-time buyer coupons

## Payment Flows

### Flow 1: Subscription (Monthly/Yearly Plans)

```
/pricing -> GET /api/create-checkout-session -> Stripe Checkout (mode: "subscription")
-> GET /api/handle-subscription-success -> Updates user_profiles -> Redirect /subscription-success
-> Webhook: invoice.paid -> handleSuccessfulPayment() -> handleTokenAllocation()
```

### Flow 2: One-Time Token Purchase

```
/pricing -> GET /api/paymentstuff/create-prompt-payment-a -> Creates OneTimeToken + Stripe Checkout (mode: "payment")
-> GET /api/Redirect/success_prompt -> Validates token (20 min window) -> Allocates tokens
-> Webhook: payment_intent.succeeded -> handleTokenPurchase() -> Updates PurchasedToken/user_profiles
```

### Flow 3: Package Subscription (Image Tokens)

```
/pricing -> GET /api/paymentstuff/create-packages-payment-a -> Creates Package + Stripe Checkout (mode: "subscription")
-> GET /api/Redirect/success_package -> Updates Package expiryDate
-> Webhook: invoice.paid (monthly) -> handleSuccessfulPayment() -> Allocates imageTokens + extends expiryDate
-> Webhook: invoice.payment_failed -> PAST_DUE -> Auto-cancel after 2+ failures
```

### Token Types

- **Text Tokens** (`user_profiles.tokens`): Consumed by all paid AI tools. New users start with 1000.
- **Image Tokens** (`PurchasedToken.imageTokens`): Purchased via package subscriptions.
- **Package Names:** `"200Image"` -> 200 imageTokens/month, `"1000Image"` -> 1000 imageTokens/month.

## Component Architecture

### Core Components (`components/`)

| File | Purpose |
|------|---------|
| `nav.tsx` | Main nav bar: tools dropdown, auth state, token count display |
| `Hero.tsx` | Hero section with CTA |
| `FAQ.tsx` | FAQ accordion |
| `FeatureShowcase.tsx` | Features display section |
| `footer.tsx` | Site footer |
| `PageSkeleton.tsx` | Loading skeleton UI |
| `plagiarism-results.tsx` | Plagiarism checker results display |
| `theme-provider.tsx` | Dark mode provider wrapper |
| `theme-toggle.tsx` | Light/dark mode toggle button |

### Feature Components

| File | Purpose |
|------|---------|
| `PricingPage/CustomPlanSlider.tsx` | Custom token amount slider |
| `PricingPage/TrustSection.tsx` | Trust/testimonials section |
| `Billing/Badge.tsx` | Payment status badges |
| `Profile/Avatar.tsx` | User avatar display |
| `Profile/ProfileDropdown.tsx` | User profile dropdown menu |

### shadcn/ui Components (`components/ui/`)

accordion, avatar, button, card, dropdown-menu, input, label, progress, select, skeleton, slider, tabs, textarea, toast, toaster

## Key Library Files

| File | Purpose |
|------|---------|
| `lib/store.ts` | Zustand token store. State: `remainingWords`. Methods: `fetchRemainingWords(userId)`, `decrementWords(amount)`, `clearTokens()`. Reads from `user_profiles.tokens`. |
| `lib/pdf-generator.ts` | PDF report generation via `generateAIDetectorReport()` |
| `lib/stripe.js` | Stripe client initialization |
| `lib/utils.ts` | General utility functions |

## Authentication

- **Client-side:** `createClientComponentClient()` from `@supabase/auth-helpers-nextjs`
- **Server-side:** `createClient()` from `@supabase/supabase-js` with `NEXT_PUBLIC_SUPABASE_URL2` and `SUPABASE_KEY` (note the `URL2` suffix -- not `URL`)
- Session checked on page load via `onAuthStateChange()` listener
- Tokens cleared on sign out via `clearTokens()` in the Zustand store

## Middleware (`middleware.ts`)

- Adds CORS headers to all API responses (`Access-Control-Allow-Origin: *`)
- Skips the Stripe webhook path (`/api/webhook/stripe`) so it can receive raw body
- Matcher: applies to `/api/:path*` and all other routes

## Navigation Structure

```
Nav Bar
+-- Tools Dropdown
|   +-- Plagiarism Checker (/)
|   +-- AI Detector (/ai-detector)
|   +-- AI Humanizer (/ai-humanizer)
|   +-- Paraphraser (/paraphraser)
|   +-- Summarizer (/summarizer)
|   +-- Grammar Checker (/grammar-checker)
|   +-- Word Counter (/word-counter)
+-- Pricing (/pricing)
+-- History (/history)
+-- Billing (/billing)
+-- Sign In (/signin)
+-- Profile Dropdown
|   +-- Sign Out
+-- Theme Toggle
```

**Key navigation behaviors:**
- Insufficient tokens -> redirects to `/pricing`
- Not signed in -> redirects to `/signin`
- Token count displayed in nav via `useTokenStore` hook

## Restricted Files (DO NOT MODIFY)

Per project rules in CLAUDE.md, these routes must never be modified:

- `app/api/paymentstuff/*` -- Payment processing
- `app/api/Redirect/*` -- Redirect handling
- `app/api/webhook/*` -- Stripe webhook
- `app/api/discounts/*` -- Discount management
- Stripe checkout session creation logic in `create-checkout-session` and `create-custom-checkout-session`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL2` | Supabase URL (server-side -- note the `URL2` suffix) |
| `SUPABASE_KEY` | Supabase service role key |
| `MISTRAL_API_KEY` | Mistral AI API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `API_SECRET_KEY` | Used for SHA256 verification token generation |
| `ALLOWED_ORIGIN` | CORS origin validation |
