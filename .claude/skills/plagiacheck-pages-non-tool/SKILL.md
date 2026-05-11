---
name: plagiacheck-pages-non-tool
description: The non-tool pages in Plagiacheck — /pricing, /billing, /history, /signin, /forgot-password, /reset-password, /privacy, /terms, plus the api/billing-data and api/billing-portal routes. Use when the user asks about the pricing page, billing dashboard, history dashboard, sign in, password reset, privacy, terms, or any page that isn't one of the 15 tools.
---

# Plagiacheck Non-Tool Pages

Everything that isn't a tool page lives here. Tool pages → see the per-tool skills.

## `/pricing` (`app/pricing/page.tsx`)

The plans + custom slider. **Pricing tiers and Stripe `priceId` values are restricted** — see `plagiacheck-payments`.

### Subscription plans (locked)

| Plan | Monthly | Yearly | priceId |
|------|---------|--------|---------|
| Free | $0 | — | (no priceId) |
| Plus | $9.99 | $119 | `price_1QrlQ3AJsVayTGRcMsOQu8Gy` |
| Premium | $29.99 | $239 | `price_1S4ntlAJsVayTGRcEL6YUGdf` |

Clicking a paid plan → `/api/create-checkout-session?priceId=...&planName=...` (Stripe Checkout, subscription mode). Logged-out users get redirected to `/signin?tab=register` first.

### Custom plan slider

`components/PricingPage/CustomPlanSlider.tsx` lets users buy arbitrary token amounts. The page calls `/api/paymentstuff/create-prompt-payment-a` for one-time text tokens, or `/api/paymentstuff/create-packages-payment-a` for image-token packages (`200Image`, `1000Image`).

### Restricted vs free to edit

- **Free to edit:** the visual layout, copy, animations, tier card design.
- **Locked:** the `priceId` strings, the price/plan values, the `handleGetStarted` click handler's actual checkout call.

## `/billing` (`app/billing/page.tsx`)

User's payment dashboard. Reads from two safe-to-edit routes:

| Route | Returns |
|-------|---------|
| `GET /api/billing-data` | Current `Payment` history + active `Package` status |
| `GET /api/billing-portal` | A Stripe Customer Portal URL for managing the subscription |

The "Manage Subscription" button opens the portal URL in a new tab. The page also shows payment history with status badges from `components/Billing/Badge.tsx` (paid/past-due/canceled).

## `/history` (`app/history/page.tsx`)

Tool usage history. Fetches from `tool_history` (via Supabase client). Search by input/output, filter by tool, paginate. See `plagiacheck-history` for the schema.

## `/signin` (`app/signin/page.tsx`)

Tabbed UI: sign in (`tab=login`) or sign up (`tab=register`). Honors `?next=...` query param to redirect after auth. Uses Supabase Auth — see `plagiacheck-auth`.

After successful sign-up, the page (or a Supabase trigger — verify before assuming) creates a `user_profiles` row with the default 1000 tokens.

There's a "Forgot password?" link → `/forgot-password`.

## `/forgot-password` (`app/forgot-password/page.tsx`)

Single email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`. Shows a success toast either way (no enumeration).

## `/reset-password` (`app/reset-password/page.tsx`)

Reached via the email link. Captures the new password and calls `supabase.auth.updateUser({ password })`. Redirects to `/signin` on success.

## `/privacy` (`app/privacy/page.tsx`)

Static privacy policy markup. Pure JSX — edit the text directly. No CMS.

## `/terms` (`app/terms/page.tsx`)

Static terms of service. Same — edit the JSX.

## Subscription success redirect

`app/api/subscription-success/page.tsx` — the post-Stripe-checkout landing for subscriptions. Shows a success message and the new plan; not a tool, but worth knowing it exists.

## `app/api/custom-success/page.tsx`

The post-checkout landing for one-time custom token purchases. Reads tokens from the URL params and confirms the allocation.

## Common edits

- **Pricing redesign:** all visual changes in `app/pricing/page.tsx`. Don't touch `priceId` strings or the actual prices without user direction.
- **Adding a payment-history filter:** read-only against `Payment` — touch `app/api/billing-data/route.ts` (safe to edit) or filter client-side in `app/billing/page.tsx`.
- **Static page (privacy/terms) updates:** edit the JSX directly. They're not behind a CMS.
