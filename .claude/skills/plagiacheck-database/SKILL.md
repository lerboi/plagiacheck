---
name: plagiacheck-database
description: Plagiacheck's Supabase database — every table, column, RPC, and the two coexisting Supabase client configurations (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY for tools, SUPABASE_URL2/SUPABASE_KEY for legacy payment routes). Use when the user asks about the database schema, tables, columns, Supabase RPCs, the two URL env vars, atomic token deduction, or wants to add/modify a table or query.
---

# Plagiacheck Database

Postgres on Supabase. Schema reference lives at `.claude/db-schema` (a flat SQL file).

## The two Supabase clients (important)

The codebase uses **two different sets** of Supabase env vars depending on the file:

| Env vars | Used by | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/server-auth.ts`, `lib/server-tokens.ts`, `lib/server-history.ts`, all client code via `createClientComponentClient()` | Modern path — tool API routes, auth, token deduction, history |
| `NEXT_PUBLIC_SUPABASE_URL2` + `SUPABASE_KEY` | `app/api/webhook/stripe/route.js`, the restricted `app/api/paymentstuff/*` routes, `app/api/Redirect/*` | Legacy path — payments and webhook |

**Both sets must be present** for the app to work end-to-end. They typically point at the same Supabase project but use different keys (anon vs. service role). When in doubt about which to use in a NEW route: use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the modern path) and rely on Supabase RLS for safety.

## Tables

### `user_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, FK → `auth.users(id)` |
| `tokens` | int | Text-token balance, default `1000` |
| `stripe_customer_id` | text | Set on first paid checkout |
| `subscription_status` | text | "active", "past_due", "canceled", etc. |
| `plan` | text | "Plus", "Premium", or null |
| `created_at` / `updated_at` | timestamptz | UTC, default `now()` |

This is the **canonical user record**. The Zustand store mirrors `tokens` into `remainingWords` for display.

### `PurchasedToken`

Holds **purchased** text and image tokens (separate from the free `user_profiles.tokens`).

| Column | Type | Notes |
|--------|------|-------|
| `userId` | uuid | FK → `auth.users(id)` |
| `textTokens` | int | Top-up text balance |
| `imageTokens` | int | Image-token balance |

> Note the camelCase column names — they differ from `user_profiles`. Quote them in raw SQL.

### `Package`

Active package subscriptions (image-token plans).

| Column | Type | Notes |
|--------|------|-------|
| `userId` | uuid | FK |
| `packageName` | text | `"200Image"` or `"1000Image"` |
| `status` | text | `ACTIVE`, `PAST_DUE`, `CANCELED` |
| `expiryDate` | timestamptz | Extended on each successful invoice |
| `stripeSubscriptionId` | text | For matching webhook events |
| `paymentFailureCount` | int | Auto-cancel after ≥2 |

### `Payment`

Audit log of every successful charge. Used by `/billing` and for idempotency checks in the webhook.

### `OneTimeToken`

Verification record for one-time text-token purchases. SHA256 token + timestamp; the success-redirect handler validates against a 20-minute window.

### `tool_history`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | FK |
| `tool` | text | Matches `ToolHistoryTool` union in `lib/server-history.ts` |
| `input_preview` | text | First 600 chars |
| `output_preview` | text | First 600 chars or null |
| `metadata` | jsonb | Tool-specific options |
| `tokens_used` | int | |
| `created_at` | timestamptz | |

Powers the `/history` page.

## RPCs

These Postgres functions implement **atomic** balance changes (the reason RPCs exist instead of plain UPDATE).

| RPC | Args | Returns | Used by |
|-----|------|---------|---------|
| `decrement_user_tokens` | `p_user_id uuid, p_amount int` | new balance, or null on insufficient | `deductTextTokens` |
| `refund_user_tokens` | `p_user_id uuid, p_amount int` | void | `refundTextTokens` |
| `decrement_image_tokens` | `p_user_id uuid, p_amount int` | new balance, or null on insufficient | `deductImageTokens` |
| `refund_image_tokens` | `p_user_id uuid, p_amount int` | void | `refundImageTokens` |

Insufficient balance returns `null` so the route can respond `402 Insufficient tokens`. **Don't replace these with client-side `update` calls** — race conditions would let users spend tokens they don't have.

## Adding a new table or column

1. Run the migration in Supabase SQL editor (project owner).
2. Update `.claude/db-schema` to mirror the new shape (this is for context only — it's not run).
3. If touching tokens or balance, add the corresponding RPC and update `lib/server-tokens.ts`.
4. Update this skill so future Claude instances see the change.
