---
name: plagiacheck-payments
description: The Plagiacheck payment system — Stripe subscriptions, one-time purchases, image-token packages, the webhook event handlers, and the restricted payment files that must NEVER be modified. Use when the user asks about Stripe, subscriptions, the webhook, packages, payment flows, the pricing page, billing portal, or anything money-related. Also use to confirm a file is restricted before editing.
---

# Plagiacheck Payments

Stripe handles all charges. Three flows, one webhook.

## ⚠️ Restricted files — DO NOT MODIFY

These directories are **off-limits** for code changes. The pricing UI is fair game; the underlying logic is not.

- `app/api/paymentstuff/*` — Stripe checkout creators for one-time / package payments
- `app/api/Redirect/*` — Post-payment redirect handlers + token allocation
- `app/api/webhook/stripe/route.js` — The webhook (also in `app/api/webhook/*`)
- `app/api/discounts/*` — Coupon creation
- The Stripe `checkout.sessions.create` calls in `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` (the surrounding routing is fine to read; the Stripe call is locked)

The pricing tiers and `priceId` strings in `app/pricing/page.tsx` are also locked. The page **layout** can be redesigned; the plans and prices cannot.

If a task seems to require touching any of these, **stop and confirm with the user** before proceeding.

## The three flows

### Flow 1: Subscription (monthly / yearly Plus or Premium)

```
/pricing
  → GET /api/create-checkout-session?priceId=...&planName=...
  → Stripe Checkout (mode: "subscription")
  → GET /api/handle-subscription-success
      • retrieves session, verifies payment_status === "paid"
      • updates user_profiles: stripe_customer_id, subscription_status, plan
      • redirects to /subscription-success
  → Webhook invoice.paid
      • handleSuccessfulPayment → handleTokenAllocation
      • updates user_profiles.tokens
      • logs Payment row
```

Pricing IDs (from `app/pricing/page.tsx`):
- Plus: `price_1QrlQ3AJsVayTGRcMsOQu8Gy` ($9.99/mo, $119/yr)
- Premium: `price_1S4ntlAJsVayTGRcEL6YUGdf` ($29.99/mo, $239/yr)

### Flow 2: One-time text-token purchase

```
/pricing (custom slider)
  → GET /api/paymentstuff/create-prompt-payment-a?price=…&tokenAmount=…&tokenType=…&userId=…
      • generates SHA256 verification token, stores in OneTimeToken
      • creates Stripe Checkout (mode: "payment")
  → Stripe Checkout
  → GET /api/Redirect/success_prompt
      • validates token + 20-minute window
      • allocates tokens to PurchasedToken.textTokens or user_profiles.tokens
  → Webhook payment_intent.succeeded
      • handleTokenPurchase (idempotent — checks Payment for existing record)
```

### Flow 3: Image-token package subscription (`200Image` / `1000Image`)

```
/pricing (image plans)
  → GET /api/paymentstuff/create-packages-payment-a?priceId=…&userId=…&tokenAmount=…&tokenType=…
      • creates Package row with status ACTIVE
      • creates Stripe Checkout (mode: "subscription")
  → Stripe Checkout
  → GET /api/Redirect/success_package
      • updates Package.expiryDate to +1 month
  → Webhook invoice.paid (recurring monthly)
      • handleSuccessfulPayment → adds imageTokens to PurchasedToken
      • extends Package.expiryDate by 1 month
  → Webhook invoice.payment_failed
      • marks Package as PAST_DUE
      • increments paymentFailureCount
      • auto-cancels subscription via Stripe API after ≥ 2 consecutive failures
```

## The webhook (`app/api/webhook/stripe/route.js`)

Events handled:

| Event | Handler | What it does |
|-------|---------|--------------|
| `invoice.paid` | `handleSuccessfulPayment` → `handleTokenAllocation` | Adds tokens, extends `Package.expiryDate` (+1 month), logs to `Payment` |
| `payment_intent.succeeded` | `handleTokenPurchase` | One-time purchase processing, idempotency-checks `Payment` |
| `invoice.payment_failed` | `handleFailedPayment` | Marks `Package` PAST_DUE, increments `paymentFailureCount`, auto-cancels at ≥2 |

**Metadata fallback:** if subscription metadata is missing on an event, the webhook looks up the `Package` by `stripeSubscriptionId`.

**Important env vars used by the webhook only:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL2`, `SUPABASE_KEY` (the legacy Supabase client — see `plagiacheck-database`).

The webhook is **excluded from the CORS middleware** (see `middleware.ts`) so Stripe can POST raw bodies without preflight interference.

## Discount routes (also restricted)

- `POST /api/discounts/create-coupon` — generic promotional coupons
- `POST /api/discounts/create-first-time-coupon` — first-time-buyer coupons

## Billing-related read-only routes (safe to touch)

- `GET /api/billing-data` — fetches the user's `Payment` history + `Package` status for the `/billing` page
- `GET /api/billing-portal` — creates a Stripe Customer Portal session and returns the URL

## Production URLs

The Stripe checkout `success_url` / `cancel_url` are hardcoded to `https://www.plagiacheck.online/...`. Don't change these without changing the production domain too.

## Common questions

- **"Can I add a new pricing tier?"** Add it to the `plans` array in `app/pricing/page.tsx`, but you'll also need a new Stripe `priceId` and likely a webhook update to handle the new token amount. The webhook is restricted, so coordinate with the user.
- **"Can I change the per-month token amounts?"** Same — change requires a webhook edit, which is restricted.
- **"Can I redesign the pricing page?"** Yes. The visual layout, copy, and component structure are unrestricted. Only the `priceId` strings and the actual price/plan values are locked.
- **"Why two Supabase env-var sets?"** Historical. Webhook + `paymentstuff` use `URL2` + `SUPABASE_KEY`; everything else uses the modern `URL` + `ANON_KEY`. See `plagiacheck-database`.
