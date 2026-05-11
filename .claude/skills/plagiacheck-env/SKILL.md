---
name: plagiacheck-env
description: Every environment variable Plagiacheck uses, including the two coexisting Supabase configurations (modern URL/ANON_KEY vs. legacy URL2/SUPABASE_KEY), Mistral, Stripe, and CORS settings. Use when the user asks about env vars, .env setup, missing env, what to set in Vercel, the URL2 suffix, or production deployment.
---

# Plagiacheck Environment Variables

Two Supabase clients, one Mistral, one Stripe, one custom secret, one CORS knob.

## Required for the app to function

| Variable | Used by | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/server-auth.ts`, `lib/server-tokens.ts`, `lib/server-history.ts`, all client code | **Modern** Supabase URL — used by tool API routes, auth, token deduction, history |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above | Anon key for the modern client |
| `NEXT_PUBLIC_SUPABASE_URL2` | `app/api/webhook/stripe/route.js`, `app/api/paymentstuff/*`, `app/api/Redirect/*` | **Legacy** Supabase URL — payments + webhook only |
| `SUPABASE_KEY` | Same legacy clients | Service-role-equivalent key for the legacy client |
| `MISTRAL_API_KEY` | All Mistral-calling routes (`/api/ai-tools`, `/api/check-plagiarism`, `/api/voice-tools`, `/api/speech-to-text`, `/api/image-to-text`, `/api/generate-image`) | Mistral SDK auth |
| `MISTRAL_MODEL` | Same | Optional override; defaults to `mistral-large-latest` |
| `STRIPE_SECRET_KEY` | Webhook + `paymentstuff/*` + `create-checkout-session` | Server-side Stripe API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `app/pricing/page.tsx` (loadStripe) | Client-side Stripe.js init |

## Optional / situational

| Variable | Purpose |
|----------|---------|
| `API_SECRET_KEY` | Used by `/api/paymentstuff/create-prompt-payment-a` to generate the SHA256 verification token stored in `OneTimeToken` |
| `ALLOWED_ORIGIN` | CORS allowed-origin override in `middleware.ts`. If absent, defaults to `*` |

## Why two Supabase env-var sets?

Historical: the original codebase used `URL2` + `SUPABASE_KEY`. The newer modules (`server-auth`, `server-tokens`, `server-history`) were written against the standard `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` naming. The webhook + payment files were never migrated and remain on the legacy variables (and they are in the **DO NOT MODIFY** list — see `plagiacheck-payments`).

In production both sets typically point at the same Supabase project, but with different keys (the legacy `SUPABASE_KEY` is usually a service-role key, whereas `ANON_KEY` is the anon key).

When writing **new** code, always use the modern pair: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Common pitfalls

- **Webhook silently failing:** check `NEXT_PUBLIC_SUPABASE_URL2` and `SUPABASE_KEY` are set — the webhook uses these, not the modern pair.
- **`AI service not configured` errors:** `MISTRAL_API_KEY` is missing. Every Mistral route checks for it and 500s if absent.
- **Stripe checkout 500s on click:** `STRIPE_SECRET_KEY` not set, or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the wrong env (test vs live).
- **CORS errors on API calls from a non-`*` origin:** check `ALLOWED_ORIGIN` (single origin string).

## `.env.local` template (for local dev)

```env
# Supabase — modern (used by tools/auth/tokens/history)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Supabase — legacy (used by webhook + paymentstuff)
NEXT_PUBLIC_SUPABASE_URL2=https://<project>.supabase.co
SUPABASE_KEY=<service-role-key>

# Mistral
MISTRAL_API_KEY=<key>
MISTRAL_MODEL=mistral-large-latest

# Stripe
STRIPE_SECRET_KEY=sk_test_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…

# Misc
API_SECRET_KEY=<random-32+-byte-string>
ALLOWED_ORIGIN=http://localhost:3000
```

In Vercel, set all of the above in Project → Settings → Environment Variables, scoped to Production, Preview, and Development as needed.
