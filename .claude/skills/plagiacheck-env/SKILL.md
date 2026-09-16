---
name: plagiacheck-env
description: Every environment variable Plagiacheck uses, including the two coexisting Supabase configurations (modern URL/ANON_KEY vs. legacy URL2/SUPABASE_KEY), Google Gemini, Stripe, and CORS settings. Use when the user asks about env vars, .env setup, missing env, what to set in Vercel, the URL2 suffix, or production deployment.
---

# Plagiacheck Environment Variables

Two Supabase clients, one Google Gemini key, one Stripe, one custom secret, one CORS knob.

## Required for the app to function

| Variable | Used by | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/server-auth.ts`, `lib/server-tokens.ts`, `lib/server-history.ts`, all client code | **Modern** Supabase URL — used by tool API routes, auth, token deduction, history |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above | Anon key for the modern client |
| `NEXT_PUBLIC_SUPABASE_URL2` | `app/api/webhook/stripe/route.js`, `app/api/paymentstuff/*`, `app/api/Redirect/*` | **Legacy** Supabase URL — payments + webhook only |
| `SUPABASE_KEY` | Same legacy clients | Service-role-equivalent key for the legacy client |
| `GEMINI_API_KEY` | `lib/ai/gemini.ts`, used by every AI route (`/api/ai-tools`, `/api/check-plagiarism`, `/api/voice-tools`, `/api/speech-to-text`, `/api/image-to-text`, `/api/generate-image`, `/api/plagia-ai`) | Google Gemini auth. The `@google/genai` SDK also accepts `GOOGLE_API_KEY`; we standardise on `GEMINI_API_KEY` |
| `GEMINI_MODEL` | Same | Optional override; defaults to `gemini-3.5-flash-lite` |
| `GEMINI_VISION_MODEL` | `/api/image-to-text` | Optional override for OCR; defaults to whatever `GEMINI_MODEL` resolves to |
| `STRIPE_SECRET_KEY` | Webhook + `paymentstuff/*` + `create-checkout-session` | Server-side Stripe API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `app/pricing/page.tsx` (loadStripe) | Client-side Stripe.js init |

## Optional / situational

| Variable | Purpose |
|----------|---------|
| `API_SECRET_KEY` | Used by `/api/paymentstuff/create-prompt-payment-a` to generate the SHA256 verification token stored in `OneTimeToken` |
| `ALLOWED_ORIGIN` | CORS allowed-origin override in `middleware.ts`. If absent, defaults to `*` |

## Google Gemini: free-tier caveats worth knowing

The provider lives behind `lib/ai`; `lib/ai/gemini.ts` is the only file that
touches the SDK. Three things about the FREE tier that are not obvious:

1. **Model choice is about the daily cap, not quality.** The full Flash models
   (`gemini-3.8-flash` and siblings) are capped around **20 requests per day**
   on the free tier — a development allowance, not something a live product can
   run on. The Lite line is the one with a usable daily quota, which is why the
   default is `gemini-3.5-flash-lite`. Treat the widely-quoted ~500 req/day as
   a planning floor: Google no longer publishes per-model free-tier numbers,
   and the only authoritative figure for a given key is the (sign-in gated)
   <https://aistudio.google.com/rate-limit>.

2. **Free-tier prompts are used to improve Google's products.** The paid tier
   opts out; the free tier does not (the exception is EEA/Switzerland/UK, where
   the paid-services data terms govern the unpaid quota too). For a plagiarism
   and AI-detection product, where users paste unpublished academic work, this
   is a privacy question to settle before production, and `/privacy` would need
   to reflect it.

3. **Google's API terms require Paid Services for EEA / Swiss / UK users.**
   Plagiacheck is a public site, so serving those visitors on the free tier
   would be a terms violation regardless of how much quota is left. The free
   tier is fine for development and evaluation; production needs billing
   enabled. Enabling billing also resolves caveat 2.

Quota exhaustion surfaces as HTTP 429 `RESOURCE_EXHAUSTED`; the adapter
relabels it so it is obvious in the logs. Daily quota resets at midnight
Pacific. If a model id is ever retired the call fails with NOT_FOUND — set
`GEMINI_MODEL` rather than editing code. Avoid `gemini-2.5-flash-lite`: it
looks like a higher-quota free option but 404s for new API keys.

OCR is Flash-Lite's weakest evaluated area, so if `/image-to-text` quality
disappoints, point `GEMINI_VISION_MODEL` at a full Flash model — at the cost of
that model's much smaller daily allowance.

## Why two Supabase env-var sets?

Historical: the original codebase used `URL2` + `SUPABASE_KEY`. The newer modules (`server-auth`, `server-tokens`, `server-history`) were written against the standard `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` naming. The webhook + payment files were never migrated and remain on the legacy variables (and they are in the **DO NOT MODIFY** list — see `plagiacheck-payments`).

In production both sets typically point at the same Supabase project, but with different keys (the legacy `SUPABASE_KEY` is usually a service-role key, whereas `ANON_KEY` is the anon key).

When writing **new** code, always use the modern pair: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Common pitfalls

- **Webhook silently failing:** check `NEXT_PUBLIC_SUPABASE_URL2` and `SUPABASE_KEY` are set — the webhook uses these, not the modern pair.
- **`AI service not configured` errors:** `GEMINI_API_KEY` is missing. Every AI route calls `ai.isConfigured()` and 500s if absent.
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

# Google Gemini
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-3.5-flash-lite

# Stripe
STRIPE_SECRET_KEY=sk_test_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…

# Misc
API_SECRET_KEY=<random-32+-byte-string>
ALLOWED_ORIGIN=http://localhost:3000
```

In Vercel, set all of the above in Project → Settings → Environment Variables, scoped to Production, Preview, and Development as needed.
