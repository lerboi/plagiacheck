---
name: plagiacheck-tokens
description: The Plagiacheck token system — text tokens vs image tokens, the cost formula (Math.ceil(length/6) for text, fixed amounts for image), the deduct-then-refund pattern in API routes, the Zustand client mirror, and how guest tokens work. Use when the user asks about tokens, token costs, deduction, refunds, the token store, the 1000-free-tokens rule, or wants to add/change a token-gated tool.
---

# Plagiacheck Tokens

Two separate currencies, both atomic, both server-authoritative.

## The two currencies

| Currency | Where it lives | Spent by | Cost |
|----------|----------------|----------|------|
| **Text tokens** | `user_profiles.tokens` (free + included) and `PurchasedToken.textTokens` (top-ups) | All text tools (plagiarism, AI detect, humanize, paraphrase, summarize, grammar, voice → Mistral cleanup) | `Math.ceil(text.length / 6)` per call |
| **Image tokens** | `PurchasedToken.imageTokens` | Image tools (image-to-text, chart, infographic, thumbnail) | Fixed: 1 for image-to-text, 2 for the SVG generators |

> The two currencies are deliberately **not interchangeable** — image tokens come from the package subscriptions (`200Image`, `1000Image`), text tokens come from monthly subscriptions or one-time purchases.

## Cost constants

`lib/server-tokens.ts` exports:

```ts
export const IMAGE_TOKEN_COST = {
  imageToText: 1,
  chart: 2,
  infographic: 2,
  thumbnail: 2,
} as const

export function calculateTextTokenCost(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 6)
}
```

Always import these — never hardcode the formula or constants in a route.

## The deduct-then-refund pattern

Every token-gated API route follows this exact shape:

```ts
const cost = calculateTextTokenCost(text)              // or IMAGE_TOKEN_COST.x
const newBalance = await deductTextTokens(user.id, cost)
if (newBalance === null) {
  return Response.json({ error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" }, { status: 402 })
}

try {
  // ... call Mistral / do work ...
} catch (err) {
  await refundTextTokens(user.id, cost)
  return Response.json({ error: "..." }, { status: 502 })
}

if (parseFailed) {
  await refundTextTokens(user.id, cost)
  return Response.json({ error: "..." }, { status: 500 })
}

return Response.json({ result, remainingTokens: newBalance, tokensUsed: cost })
```

The deduction uses an atomic Postgres RPC (see `plagiacheck-database`). Insufficient → returns `null`, which becomes a `402` for the client.

**Always refund on every failure path after deduction**, including JSON-parse failures and "no response from AI" branches. Missing a refund is a customer-visible billing bug.

## Client side: the Zustand store

`lib/store.ts` exposes:

```ts
const {
  remainingWords,           // text-token mirror (display only)
  remainingImageTokens,     // image-token mirror
  guestTokens,              // 200 default for non-logged-in visitors
  fetchRemainingWords(userId),
  fetchImageTokens(userId),
  decrementWords(),         // re-fetches from server (server already deducted)
  decrementImageTokens(),
  clearTokens(),            // logout: wipe text+image, keep guest
} = useTokenStore()
```

Persisted in `localStorage` as `token-storage`. **The store is a display cache, not a source of truth.** The deprecated `_amount` parameter on `decrementWords` is ignored — the function just refetches the authoritative balance.

After a successful tool run, the page should call `decrementWords()` (or `decrementImageTokens()`) so the nav badge updates immediately. There's also a `TOKENS_CHANGED_EVENT` (`plagiacheck:tokens-changed`) that nav listens to — `notifyTokensChanged()` fires it from inside the decrement helpers.

## Pre-flight checks (UX, not auth)

Tool pages do a pre-flight check **before** calling the API:

```ts
const requiredTokens = calculateRequiredTokens(text)  // duplicated formula in the page
if (requiredTokens > remainingWords) {
  router.push("/pricing")
  return
}
```

This is purely UX (avoiding a round-trip for an obvious failure). The server is still the only authority — if a user forges the cached balance, the RPC rejects them.

> The page-level `calculateRequiredTokens` formula is the same as `calculateTextTokenCost`. Future cleanup: import the lib version on the client too.

## Guest tokens (200 free)

For non-logged-in visitors, the store seeds `guestTokens: 200` and shows it in the nav. Guests cannot actually call any token-gated API — the Bearer-JWT check rejects them. The 200 number is a marketing nudge to encourage sign-up.

## Token allocation flows (recap)

- **New user signup** → `user_profiles.tokens` defaults to 1000.
- **Subscription purchase (Plus/Premium)** → webhook adds monthly tokens to `user_profiles.tokens` on `invoice.paid`.
- **One-time text-token purchase** → webhook adds to `PurchasedToken.textTokens` (or `user_profiles.tokens` for some token types) on `payment_intent.succeeded`.
- **Image package purchase (`200Image` / `1000Image`)** → webhook adds `imageTokens` to `PurchasedToken` on `invoice.paid` and extends the `Package.expiryDate`.

For full payment-flow details see the `plagiacheck-payments` skill.

## Common edits

- **Adding a new text-token tool:** import `calculateTextTokenCost` + `deductTextTokens` + `refundTextTokens`. Follow the deduct-then-refund pattern verbatim.
- **Adding a new image-token tool:** add a key to `IMAGE_TOKEN_COST`, then use `deductImageTokens` / `refundImageTokens`.
- **Changing the cost formula:** edit `calculateTextTokenCost` AND every page-level `calculateRequiredTokens` (see Common edits comment above).
