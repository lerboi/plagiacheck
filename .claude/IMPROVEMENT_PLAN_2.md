# Plagiacheck — Follow-up Implementation Plan (Hardened)

**Drafted:** 2026-05-02 · **Hardened:** 2026-05-02
**Scope:** Six remaining items deferred from `IMPROVEMENT_PLAN.md` after Phases 1–6 shipped.
**Status:** Plan only — nothing implemented yet.
**Audience:** A fresh-context Claude Code agent that has only this file, project CLAUDE.md, and codebase access.

> All codebase facts in this plan were verified against actual files on 2026-05-02 (route paths, request bodies, response shapes, table column casing, Mistral models, token costs). Anything marked **VERIFIED** has been read directly. Anything marked **DECISION REQUIRED** is a user choice that gates implementation.

---

## 0. Pre-flight Checklist (do this first, every time)

Before starting any phase below:

1. **Read these files** to refresh context:
   - `.claude/CLAUDE.md` — project rules, restricted folders.
   - `.claude/IMPROVEMENT_PLAN.md` — Phases 1–6 record (what already shipped).
   - `.claude/db-schema` — current schema (NOTE: file only contains `user_profiles`; `PurchasedToken`/`Package`/`Payment` exist but aren't in this file — see Section F.2 for confirmed `PurchasedToken` schema).
   - `lib/server-auth.ts` — bearer-token auth pattern.
   - `lib/server-tokens.ts` — text-token deduct/refund pattern.
   - `lib/server-history.ts` — history recording pattern.
   - `lib/store.ts` — client token store + `getAuthHeader()` helper + `notifyTokensChanged()`.

2. **Confirm migrations have run** in Supabase (these are prerequisites of Phases 1 and 4 already shipped):
   - `supabase/migrations/0001_token_rpcs.sql` — `decrement_user_tokens`, `refund_user_tokens`.
   - `supabase/migrations/0002_tool_history.sql` — `tool_history` table + RLS.

3. **Restricted folders — DO NOT MODIFY** under any circumstance:
   - `app/api/paymentstuff/*`
   - `app/api/Redirect/*`
   - `app/api/webhook/*`
   - `app/api/discounts/*`
   - The Stripe checkout session creation logic in `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` (you can ADD new routes — never modify these).

4. **Auth pattern** every new protected route MUST follow:
   ```ts
   import { getUserFromRequest } from "@/lib/server-auth"
   const user = await getUserFromRequest(req)
   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
   ```

5. **Token deduction pattern** (text):
   ```ts
   import { calculateTextTokenCost, deductTextTokens, refundTextTokens } from "@/lib/server-tokens"
   const cost = calculateTextTokenCost(text)
   const newBalance = await deductTextTokens(user.id, cost)
   if (newBalance === null) return Response.json({ error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" }, { status: 402 })
   try { /* AI call */ } catch (e) { await refundTextTokens(user.id, cost); throw e }
   ```

6. **Client-side fetch pattern** (in tool pages):
   ```ts
   import { getAuthHeader } from "@/lib/store"
   const authHeader = await getAuthHeader()
   const response = await fetch("/api/...", {
     method: "POST",
     headers: { "Content-Type": "application/json", ...authHeader },
     body: JSON.stringify({ /* ... */ }),
   })
   if (response.status === 401) { router.push("/signin"); return }
   if (response.status === 402) { router.push("/pricing"); return }
   ```

7. **History recording** after every successful protected run:
   ```ts
   import { recordToolUse } from "@/lib/server-history"
   await recordToolUse({ userId: user.id, tool: "<key>", input, output, tokensUsed: cost })
   ```

---

## What's Left and Why

| # | Item | Source | Why deferred |
|---|------|--------|--------------|
| A | Real plagiarism detection backend | Phase 2.1 Option 3 | Largest scope; needs an external search provider decision |
| B | Tool page deduplication (shared hooks + components) | Phase 3.1 | Mechanical refactor; surface fixes were higher value first |
| C | OAuth — Google + GitHub sign-in | Phase 4.2 | Needs Supabase provider config in your dashboard |
| D | Yearly billing toggle | Phase 5.2 | Needs yearly Stripe price IDs you create |
| E | Sentry error tracking + lightweight analytics | Phase 6.2 | Needs an account + DSN you control |
| F | Audio / voice / image tool route hardening | Out of original audit scope | Same security exposure Phase 1.1 fixed for text tools |

---

## Recommended Build Order

| Order | Item | Why this position |
|-------|------|-------------------|
| 1 | **F** Audio/voice/image hardening | Closes the same exploit Phase 1 fixed for text — same severity, just a different surface. Should not wait. |
| 2 | **C** OAuth | Highest UX impact; small scope; user can do Supabase config in parallel |
| 3 | **B** Tool deduplication | Pays off immediately after F adds three more tool pages to the family |
| 4 | **E** Sentry + analytics | Operational visibility for everything that ships |
| 5 | **D** Yearly toggle | Smallest scope — purely waiting on Stripe price IDs from user |
| 6 | **A** Real plagiarism backend | Largest scope; cost implications; requires provider commitment |

---

## Action Items For The User (gate the work)

These can all be done in parallel before any code lands:

| Item | Where | What |
|------|-------|------|
| A | Search provider | Pick Brave / Bing / SerpAPI / Google CSE; obtain API key |
| C | Supabase dashboard | Enable Google + GitHub providers, paste OAuth secrets, configure redirect URLs |
| D | Stripe dashboard | Create yearly Price for Plus and Premium; share priceIds |
| E | Sentry | Create project, share DSN + auth token + org/project slugs |
| E | Analytics | Pick Plausible (paid, ~$9/mo) or Vercel Analytics (free if on Vercel) |

---

# F. Audio / Voice / Image Tool Route Hardening

**Why it matters:** Text tools were hardened in Phase 1.1 (server-side bearer auth, atomic deduction, refund on AI failure, history recording). The image / voice / audio tools still have the same exploit: anyone can call `/api/<tool>` directly to consume Mistral capacity for free; tokens are deducted client-side only.

## F.1 Verified Tool Inventory (read 2026-05-02)

| # | Page (`app/...`) | API route | Request body | Token type | Cost | Model | Response shape |
|---|------------------|-----------|--------------|------------|------|-------|----------------|
| 1 | `audio-summarizer/page.tsx` | `POST /api/voice-tools` | `{ text, tool: "audio-summarize" }` | **text** | `ceil(text.length / 6)` | `mistral-medium` | `{ result: { title, overview, keyPoints[], detailedSummary, contentType, actionItems[] } }` |
| 2 | `voice-to-essay/page.tsx` | `POST /api/voice-tools` | `{ text, tool: "voice-to-essay" }` | **text** | `ceil(text.length / 6)` | `mistral-medium` | `{ result: { essay, title, wordCount, paragraphCount } }` |
| 3 | `speech-to-text/page.tsx` | `POST /api/speech-to-text` | `{ transcript, action: "clean" \| undefined }` | **text** | `ceil(text.length / 6)` | `mistral-medium` | `{ result: { cleanedText, changes } }` |
| 4 | `image-to-text/page.tsx` | `POST /api/image-to-text` | `{ imageBase64, mimeType }` (JSON, base64-encoded) | **image** | `1` | `pixtral-12b-2409` | `{ result: { extractedText, confidence, textType, wordCount } }` |
| 5 | `chart-generator/page.tsx` | `POST /api/generate-image` | `{ text, tool: "chart", options: { chartType } }` | **image** | `2` | `mistral-medium` | `{ result: { svg, chartType, title, description } }` |
| 6 | `infographic-generator/page.tsx` | `POST /api/generate-image` | `{ text, tool: "infographic" }` | **image** | `2` | `mistral-medium` | `{ result: { svg, title, pointCount } }` |
| 7 | `thumbnail-generator/page.tsx` | `POST /api/generate-image` | `{ text, tool: "thumbnail", options: { style } }` | **image** | `2` | `mistral-medium` | `{ result: { svg, title, style } }` |
| 8 | `text-to-speech/page.tsx` | (none — verify) | n/a | **none** | `0` | n/a | n/a |

> **First task:** Read `app/text-to-speech/page.tsx`. If it has no `fetch("/api/...")` call, it's pure client-side (browser SpeechSynthesis API) — no hardening needed. If it has a route, add it to the table.

> **Note:** Routes 1, 2, 3, 5, 6, 7 still use hardcoded `'mistral-medium'`. While hardening, swap each to `process.env.MISTRAL_MODEL || 'mistral-large-latest'` for consistency with `/api/ai-tools` (which Phase 1.1 already did). Image-to-text (route 4) keeps `pixtral-12b-2409` — it's the vision model.

## F.2 PurchasedToken Schema (VERIFIED via `app/api/webhook/stripe/route.js`)

```
Table:    public."PurchasedToken"   (PascalCase identifier — must be quoted)
Columns:  "userId"      uuid
          "imageTokens" int
          "textTokens"  int   (mentioned in CLAUDE.md; verify via Supabase introspection)
```

- All column names are **camelCase** → require double-quoting in raw SQL.
- Missing row → Supabase returns error code `PGRST116`. The webhook treats this as "create new row with starting balance."
- The webhook's update pattern: read current value, compute new total in JS, write absolute value. Race-prone (same bug Phase 1.1 fixed for `user_profiles`).

## F.3 Files to Create

### F.3.1 New SQL migration: `supabase/migrations/0003_image_token_rpcs.sql`

```sql
-- Atomic image-token RPCs mirroring the text-token ones in 0001.
-- Run once in the Supabase SQL editor.

create or replace function public.decrement_image_tokens(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public."PurchasedToken"
  set "imageTokens" = "imageTokens" - p_amount
  where "userId" = p_user_id
    and "imageTokens" >= p_amount
  returning "imageTokens" into new_balance;

  return new_balance;
end;
$$;

create or replace function public.refund_image_tokens(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public."PurchasedToken"
  set "imageTokens" = "imageTokens" + p_amount
  where "userId" = p_user_id
  returning "imageTokens" into new_balance;

  return new_balance;
end;
$$;

revoke all on function public.decrement_image_tokens(uuid, int) from public;
revoke all on function public.refund_image_tokens(uuid, int) from public;
```

> Some `PurchasedToken` rows may have `NULL` for `imageTokens` if they were created before the `imageTokens` column existed. Before running this migration in production, optionally run `update public."PurchasedToken" set "imageTokens" = 0 where "imageTokens" is null;` to ensure the `>=` comparison works.

### F.3.2 Extend `lib/server-tokens.ts`

Add image-token helpers below the existing text-token ones:

```ts
export const IMAGE_TOKEN_COST = {
  imageToText: 1,
  chart: 2,
  infographic: 2,
  thumbnail: 2,
} as const

export async function deductImageTokens(
  userId: string,
  amount: number
): Promise<number | null> {
  if (amount <= 0) return null
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.rpc("decrement_image_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("deductImageTokens RPC error:", error.message)
    return null
  }
  return typeof data === "number" ? data : null
}

export async function refundImageTokens(
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.rpc("refund_image_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("refundImageTokens RPC error:", error.message)
  }
}
```

### F.3.3 Extend `ToolHistoryTool` union in `lib/server-history.ts`

```ts
export type ToolHistoryTool =
  | "plagiarism"
  | "ai-detect"
  | "humanize"
  | "paraphrase"
  | "summarize"
  | "grammar"
  // — added in F —
  | "audio-summarize"
  | "voice-to-essay"
  | "speech-to-text"
  | "image-to-text"
  | "chart"
  | "infographic"
  | "thumbnail"
```

## F.4 Per-route Modifications

### F.4.1 `app/api/voice-tools/route.ts` (handles `audio-summarize` + `voice-to-essay`)

Wrap the existing handler with the standard pattern. Output preview rules:
- `audio-summarize` → `result.overview` (or first 200 chars of `detailedSummary`).
- `voice-to-essay` → `result.title ? result.title + " — " + first 100 chars of essay : first 200 chars`.

```ts
// pseudo-diff
const user = await getUserFromRequest(req)
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

const { text, tool } = await req.json()
// existing validation

const cost = calculateTextTokenCost(text)
const newBalance = await deductTextTokens(user.id, cost)
if (newBalance === null) return Response.json({ error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" }, { status: 402 })

try {
  // existing Mistral call (swap model to MISTRAL_MODEL env)
  // ...
  await recordToolUse({
    userId: user.id,
    tool: tool as ToolHistoryTool,   // "audio-summarize" | "voice-to-essay"
    input: text,
    output: tool === "audio-summarize" ? result.overview : result.title,
    tokensUsed: cost,
  })
  return Response.json({ result, remainingTokens: newBalance, tokensUsed: cost })
} catch (e) {
  await refundTextTokens(user.id, cost)
  // existing error handling
}
```

### F.4.2 `app/api/speech-to-text/route.ts`

Same pattern. Cost on `transcript.length`, not full body. Tool name `"speech-to-text"`. Output preview = `result.cleanedText` first 200 chars.

### F.4.3 `app/api/image-to-text/route.ts`

Uses **image tokens**, not text tokens.

```ts
const user = await getUserFromRequest(req)
if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

const { imageBase64, mimeType } = await req.json()
if (!imageBase64) return Response.json({ error: "No image provided" }, { status: 400 })

// Optional sanity guard: max 8MB base64
if (imageBase64.length > 8 * 1024 * 1024 * 1.4) {
  return Response.json({ error: "Image too large (max ~8MB)" }, { status: 413 })
}

const cost = IMAGE_TOKEN_COST.imageToText  // 1
const newBalance = await deductImageTokens(user.id, cost)
if (newBalance === null) return Response.json({ error: "Insufficient image tokens", code: "INSUFFICIENT_IMAGE_TOKENS" }, { status: 402 })

try {
  // existing pixtral call
  await recordToolUse({
    userId: user.id,
    tool: "image-to-text",
    input: `[image, ${mimeType}, ${Math.round(imageBase64.length / 1024)} KB]`,
    output: result.extractedText,
    metadata: { confidence: result.confidence, textType: result.textType },
    tokensUsed: cost,
  })
  return Response.json({ result, remainingImageTokens: newBalance, tokensUsed: cost })
} catch (e) {
  await refundImageTokens(user.id, cost)
  throw e
}
```

> Use a distinct `code: "INSUFFICIENT_IMAGE_TOKENS"` so the client can route to a different message than text-token shortage.

### F.4.4 `app/api/generate-image/route.ts` (handles `chart` + `infographic` + `thumbnail`)

Same pattern as image-to-text. Cost = `IMAGE_TOKEN_COST[tool]` (2 for all three). Tool name = same as input `tool`. Output preview = `result.title || result.svg.slice(0, 100)`.

### F.4.5 Update existing image-token store helper signature

`lib/store.ts` already has `decrementImageTokens` (which after Phase 1 just refetches). It already triggers `notifyTokensChanged()`. **No changes required.**

## F.5 Per-page Modifications (8 tool pages)

For each of the seven non-free pages (text-to-speech is free if confirmed), apply this minimal patch:

1. Import: `import { getAuthHeader } from "@/lib/store"`.
2. In the fetch call:
   ```ts
   const authHeader = await getAuthHeader()
   const response = await fetch("/api/...", {
     method: "POST",
     headers: { "Content-Type": "application/json", ...authHeader },
     body: JSON.stringify({ /* unchanged */ }),
   })
   if (response.status === 401) { router.push("/signin"); return }
   if (response.status === 402) {
     // For image-token tools, route to pricing with image-token context
     router.push("/pricing")
     return
   }
   ```
3. Existing `decrementWords(requiredTokens)` / `decrementImageTokens(IMAGE_TOKEN_COST)` calls remain — they now refresh the display from server (and trigger `notifyTokensChanged()` automatically).

> The pages already use `decrementImageTokens(IMAGE_TOKEN_COST)` even though server now does the deduction. That's fine — the helper became "refetch from server" in Phase 1; the parameter is unused. No code change needed at the call site.

## F.6 History Page (`app/history/page.tsx`)

Extend `TOOL_META` with the seven new tool labels:

```ts
"audio-summarize":  { label: "Audio Summarizer",      href: "/audio-summarizer",      icon: FileAudio,  color: "text-orange-600", bg: "bg-orange-600/10" },
"voice-to-essay":   { label: "Voice to Essay",        href: "/voice-to-essay",        icon: FileEdit,   color: "text-sky-600",    bg: "bg-sky-600/10" },
"speech-to-text":   { label: "Speech to Text",        href: "/speech-to-text",        icon: Mic,        color: "text-indigo-500", bg: "bg-indigo-500/10" },
"image-to-text":    { label: "Image to Text",         href: "/image-to-text",         icon: Image,      color: "text-rose-500",   bg: "bg-rose-500/10" },
"chart":            { label: "Chart Generator",       href: "/chart-generator",       icon: PieChart,   color: "text-teal-500",   bg: "bg-teal-500/10" },
"infographic":      { label: "Infographic Generator", href: "/infographic-generator", icon: BarChart3,  color: "text-amber-500",  bg: "bg-amber-500/10" },
"thumbnail":        { label: "Thumbnail Generator",   href: "/thumbnail-generator",   icon: ImagePlus,  color: "text-violet-500", bg: "bg-violet-500/10" },
```

Add corresponding `lucide-react` imports: `FileAudio, FileEdit, Mic, Image, PieChart, BarChart3, ImagePlus`.

The filter dropdown derives from `TOOL_META` keys, so it auto-includes the new tools — no other change.

## F.7 Acceptance Criteria

For each route, manually verify:

1. `curl -X POST <route>` (no auth) → 401.
2. With valid auth + insufficient tokens → 402 + `code: "INSUFFICIENT_TOKENS"` (text) or `"INSUFFICIENT_IMAGE_TOKENS"` (image).
3. With valid auth + sufficient tokens + intentionally broken Mistral key → tokens refunded (verify via Supabase row).
4. Successful run → `tool_history` row exists with correct `tool`, `tokens_used`, `input_preview`, `output_preview`.
5. `/history` page shows the new entry with the correct icon and label.
6. Token balance in nav badge updates within 1 second (via `notifyTokensChanged` event).

## F.8 Env Vars Added By This Phase

None new. Uses existing `MISTRAL_API_KEY`, `MISTRAL_MODEL` (optional), `NEXT_PUBLIC_SUPABASE_URL2`, `SUPABASE_KEY`.

## F.9 Risks

- The `text-to-speech` tool may not be free as the pricing page suggests. **Verify before assuming.**
- Pixtral payloads can be large (base64 image). Add `body size limit` consideration to `next.config.js` if Vercel default rejects.
- Some tool pages might not redirect to `/signin` correctly if they don't have the `useRouter` import — verify per file.

---

# C. OAuth — Google + GitHub

**Why it matters:** Email/password is friction. Social sign-in increases conversion and removes the password-management burden.

## C.1 Prerequisite (User Action)

In the Supabase dashboard:
1. **Authentication → Providers → Google** — enable, paste Google OAuth client ID + secret obtained from Google Cloud Console.
2. **Authentication → Providers → GitHub** — enable, paste GitHub OAuth app client ID + secret.
3. Add the redirect URLs to both provider configurations and to Supabase's redirect allow-list:
   - `https://www.plagiacheck.online/auth/callback`
   - `http://localhost:3000/auth/callback` (for dev)

## C.2 Files to Create / Modify

### C.2.1 New: `app/auth/callback/route.ts`

```ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("OAuth callback exchange error:", error)
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent("Sign-in failed. Please try again.")}`
    )
  }

  return NextResponse.redirect(`${origin}/signin?error=Missing+auth+code`)
}
```

### C.2.2 Modify: `app/signin/page.tsx`

Add OAuth buttons above the email form, on **both** the "signin" and "register" tabs (single source: shared component). Pseudocode:

```tsx
const handleOAuth = async (provider: "google" | "github") => {
  setIsLoading(true)
  setError(null)
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) setError(mapAuthError(error))
  setIsLoading(false)
}

// JSX before each <form>:
<div className="space-y-2 mb-6">
  <Button type="button" variant="outline" className="w-full h-12" onClick={() => handleOAuth("google")} disabled={isLoading}>
    <GoogleIcon className="h-4 w-4 mr-2" />
    Continue with Google
  </Button>
  <Button type="button" variant="outline" className="w-full h-12" onClick={() => handleOAuth("github")} disabled={isLoading}>
    <Github className="h-4 w-4 mr-2" />
    Continue with GitHub
  </Button>
</div>
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
  </div>
</div>
```

`Github` icon comes from `lucide-react`. For Google, since lucide doesn't ship a Google logo for trademark reasons, use an inline SVG component:

```tsx
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor"/>
  </svg>
)
```

### C.2.3 Modify: `app/signin/page.tsx` — read `?error` from query

If the callback fails it redirects with `?error=...`. Display it:

```tsx
const errorFromQuery = searchParams.get("error")
useEffect(() => { if (errorFromQuery) setError(errorFromQuery) }, [errorFromQuery])
```

### C.2.4 Modify: `app/forgot-password/page.tsx`

Add a small disclaimer below the form:

```tsx
<p className="text-xs text-muted-foreground mt-4">
  Signed up with Google or GitHub? Use that provider to log in — there&apos;s no password to reset.
</p>
```

## C.3 New User Provisioning — DB Trigger

OAuth users get an `auth.users` row but no `user_profiles` row, so they have no token balance. Fix with a Postgres trigger:

### C.3.1 New migration: `supabase/migrations/0004_user_provisioning.sql`

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, tokens, created_at, updated_at)
  values (new.id, 1000, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> This also covers email/password signups, removing the implicit assumption that `user_profiles` rows always exist.

## C.4 Acceptance Criteria

1. Click **Continue with Google** → opens Google OAuth → returns to `/` signed in.
2. Same for GitHub.
3. New OAuth user has `user_profiles.tokens = 1000` (verify in Supabase).
4. Existing email/password flow unchanged.
5. Failed callback redirects to `/signin?error=...` and the message displays.
6. Forgot-password page shows the OAuth disclaimer.

## C.5 Env Vars Added

None new (Supabase handles OAuth secrets server-side).

## C.6 Risks

- Mismatched redirect URLs cause silent failures. Document the exact strings in `.env.example` / README.
- A user who signs up via email then later via Google with the same email collides — Supabase merges by default but verify behavior with a test.
- The `createRouteHandlerClient` helper must come from `@supabase/auth-helpers-nextjs` (already a dep — verify in `package.json`).

---

# D. Yearly Billing Toggle

**Why it matters:** `yearlyPrice` and `savings` are already shown on pricing cards but the toggle to actually purchase yearly doesn't exist. The Stripe checkout always uses the monthly priceId.

## D.1 Prerequisite (User Action)

In the Stripe dashboard:
1. For each existing Plus / Premium product, add a new **Yearly** Price (e.g., `$119/year` for Plus, `$239/year` for Premium).
2. Note the new `price_xxx` IDs.
3. Provide them to the implementing agent.

## D.2 Files to Modify

### D.2.1 `app/pricing/page.tsx`

1. Add state: `const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")`.

2. Extend each plan object to carry both price IDs:

```ts
{
  name: "Plus",
  description: "...",
  monthlyPrice: "$9.99",
  yearlyPrice: "$119",
  monthlyPriceId: "price_1QrlQ3AJsVayTGRcMsOQu8Gy",
  yearlyPriceId: "price_<<USER_PROVIDED>>",
  savings: "Save $20/year",
  // ...
}
```

3. Add a centered toggle above the pricing cards (use existing `Tabs` component):

```tsx
<div className="flex justify-center mb-8">
  <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as "monthly" | "yearly")}>
    <TabsList>
      <TabsTrigger value="monthly">Monthly</TabsTrigger>
      <TabsTrigger value="yearly">
        Yearly
        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
          Save 17%
        </span>
      </TabsTrigger>
    </TabsList>
  </Tabs>
</div>
```

4. Card price display switches based on `billingPeriod`:

```tsx
const displayedPrice = billingPeriod === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
const displayedPeriod = billingPeriod === "yearly" ? "per year" : plan.period
```

5. `handleGetStarted` uses the right priceId:

```ts
const priceId = billingPeriod === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId
window.location.href = `/api/create-checkout-session?priceId=${priceId}&planName=${plan.name}`
```

6. Hide the existing "$X when billed yearly" subtitle paragraph (now redundant with the toggle).

## D.3 Acceptance Criteria

- Toggle switches displayed prices for Plus and Premium.
- Yearly checkout completes successfully with the new priceId.
- "Save 17%" badge appears on the toggle when yearly is selected.
- Free plan unaffected (no yearly variant).

## D.4 Env Vars Added

None.

## D.5 Risks

- Wrong priceId → Stripe checkout returns 400. Acceptance test must include a real yearly purchase end-to-end.

---

# B. Tool Page Deduplication

**Why it matters:** Five tool pages (`ai-detector`, `ai-humanizer`, `paraphraser`, `summarizer`, `grammar-checker`) plus the home page repeat the same six patterns. Each new bug fix touches all five files. Adding the seven hardened tools from Phase F amplifies this.

## B.1 New Files With Exact Signatures

### B.1.1 `hooks/useAuthUser.ts`

```ts
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

interface UseAuthUserOptions {
  /** If set and no user is found after the initial check, redirect here. */
  redirectTo?: string
}

export interface UseAuthUserReturn {
  user: User | null
  loading: boolean
}

export function useAuthUser(opts: UseAuthUserOptions = {}): UseAuthUserReturn {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      const u = session?.user ?? null
      setUser(u)
      setLoading(false)
      if (!u && opts.redirectTo) router.push(opts.redirectTo)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const u = session?.user ?? null
      setUser(u)
      if (!u && opts.redirectTo) router.push(opts.redirectTo)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [supabase.auth, router, opts.redirectTo])

  return { user, loading }
}
```

### B.1.2 `hooks/useTokenCost.ts`

```ts
"use client"
import { useTokenStore } from "@/lib/store"

export function useTokenCost(text: string) {
  const remaining = useTokenStore((s) => s.remainingWords)
  const cost = text ? Math.ceil(text.length / 6) : 0
  return {
    cost,
    remaining,
    hasEnough: cost === 0 || cost <= remaining,
    shortfall: Math.max(0, cost - remaining),
  }
}
```

### B.1.3 `hooks/useToolRunner.ts`

```ts
"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getAuthHeader } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

export interface ToolRunnerInput<TOptions = Record<string, unknown>> {
  text: string
  tool: string
  options?: TOptions
  /** Override endpoint. Defaults to /api/ai-tools. */
  endpoint?: string
  /** Override body builder. Defaults to { text, tool, options }. */
  buildBody?: () => unknown
}

export interface ToolRunnerReturn<TResult> {
  run: (input: ToolRunnerInput) => Promise<TResult | null>
  isLoading: boolean
  error: string | null
  result: TResult | null
  reset: () => void
}

export function useToolRunner<TResult = unknown>(): ToolRunnerReturn<TResult> {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)

  const run = useCallback(async (input: ToolRunnerInput): Promise<TResult | null> => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const authHeader = await getAuthHeader()
      const endpoint = input.endpoint ?? "/api/ai-tools"
      const body = input.buildBody
        ? input.buildBody()
        : { text: input.text, tool: input.tool, options: input.options }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      })

      if (response.status === 401) { router.push("/signin"); return null }
      if (response.status === 402) { router.push("/pricing"); return null }

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Request failed")

      setResult(data.result as TResult)
      return data.result as TResult
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [router, toast])

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { run, isLoading, error, result, reset }
}
```

### B.1.4 `components/tool/ToolHero.tsx`

```tsx
"use client"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

export interface ToolHeroPill { icon: LucideIcon; label: string; color: string }
export interface ToolHeroProps {
  badge: { icon: LucideIcon; label: string; color: string; bg: string }
  title: string
  description: string
  pills?: ToolHeroPill[]
}

export function ToolHero({ badge, title, description, pills = [] }: ToolHeroProps) {
  const BadgeIcon = badge.icon
  return (
    <motion.div
      className="text-center space-y-6 mb-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={`inline-flex items-center gap-2 ${badge.bg} ${badge.color} px-4 py-2 rounded-full text-sm font-medium`}>
        <BadgeIcon className="h-4 w-4" />
        {badge.label}
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">{title}</h1>
      <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">{description}</p>
      {pills.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {pills.map((pill, i) => {
            const PillIcon = pill.icon
            return (
              <div key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border">
                <PillIcon className={`h-4 w-4 ${pill.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{pill.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
```

### B.1.5 `components/tool/InsufficientTokensCard.tsx`

```tsx
"use client"
import Link from "next/link"
import { motion } from "framer-motion"

export function InsufficientTokensCard({ needed, have }: { needed: number; have: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
    >
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Not enough tokens. You need {needed} but have {have}.{" "}
        <Link href="/pricing" className="font-semibold underline">Upgrade your plan</Link>
      </p>
    </motion.div>
  )
}
```

### B.1.6 `components/tool/ToolEditor.tsx`

```tsx
"use client"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Check, Download, ArrowLeft } from "lucide-react"

export interface ToolEditorProps {
  inputLabel?: string
  outputLabel?: string
  inputPlaceholder?: string
  outputPlaceholder?: string
  inputValue: string
  outputValue: string
  onInputChange: (value: string) => void
  /** Show "Use as input" button on the output card. */
  allowReplace?: boolean
  /** Download filename without extension. */
  downloadName?: string
}

export function ToolEditor({
  inputLabel = "Original Text",
  outputLabel = "Result",
  inputPlaceholder = "Paste your text here...",
  outputPlaceholder = "Output will appear here...",
  inputValue,
  outputValue,
  onInputChange,
  allowReplace = false,
  downloadName = "output",
}: ToolEditorProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!outputValue) return
    await navigator.clipboard.writeText(outputValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!outputValue) return
    const blob = new Blob([outputValue], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${downloadName}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{inputLabel}</h3>
          <span className="text-sm text-muted-foreground">{inputValue.length} characters</span>
        </div>
        <Textarea
          placeholder={inputPlaceholder}
          className="min-h-[300px] resize-none"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          aria-label={inputLabel}
        />
      </Card>
      <Card className="p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{outputLabel}</h3>
          {outputValue && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{outputValue.length} characters</span>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              {allowReplace && (
                <Button variant="ghost" size="sm" onClick={() => onInputChange(outputValue)} className="h-8">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Use as input
                </Button>
              )}
            </div>
          )}
        </div>
        <Textarea
          placeholder={outputPlaceholder}
          className="min-h-[300px] resize-none bg-gray-50 dark:bg-gray-800/50"
          value={outputValue}
          readOnly
          aria-label={`${outputLabel} (read-only)`}
        />
      </Card>
    </div>
  )
}
```

## B.2 Migration Order & Per-page Variations to Preserve

Migrate in this order, one commit each:

### Step 1 — Land hooks + components (no UI change yet)
Create files above. No imports from existing pages yet.

### Step 2 — Migrate `ai-humanizer` (proves abstractions handle complex variants)
**Variants to preserve:**
- Tone dropdown (5 options).
- Humanization-level slider (0–100).
- View mode toggle (`split` ↔ `stacked`) — Phase 3 already renamed `tab` → `stacked`.
- Vocabulary Difference stat below output (Jaccard distance — see existing `getChangedWords`).

The `<ToolEditor>` covers input/output but the view-mode toggle and stats are humanizer-specific — keep them in the page.

### Step 3 — Migrate `paraphraser`, `summarizer`, `grammar-checker`
**`paraphraser`**: mode dropdown (6 options), char count on output (already added).
**`summarizer`**: length slider, output-format tabs (paragraph/bullets), `requestedFormat` capture (preserve the Phase 3 race fix). The output card has a custom render for bullets vs paragraph — keep it bespoke; don't try to fit into `<ToolEditor>` for the bullets case.
**`grammar-checker`**: don't use `<ToolEditor>` for the output (it has a custom issues-list with click-to-fix). Use `<ToolHero>`, `useAuthUser`, `useToolRunner`, `<InsufficientTokensCard>` only.

### Step 4 — Migrate `ai-detector`
Sentence-by-sentence analysis card stays bespoke. Hero + token check + auth + run flow can use the new abstractions.

### Step 5 — Migrate the seven Phase-F tool pages
Same pattern.

### Step 6 — Leave home (`app/page.tsx`) alone
It uses SSE streaming. Different shape. Don't force it into `useToolRunner` — would lose the smooth-progress logic from Phase 2.6.

## B.3 Acceptance Criteria

- Each migrated page is ≥40% smaller in LOC.
- Manual smoke test of every migrated tool: input text → click button → see output.
- All pre-existing variants (sliders, toggles, custom output renderings) still work identically.
- A new "Outline Generator" stub tool can be added in <50 lines using the new primitives.

## B.4 Env Vars Added

None.

## B.5 Risks

- Subtle behavior differences per tool. The project has zero tests — manual QA per page is the only safety net. Don't migrate two pages in one commit.

---

# E. Sentry Error Tracking + Lightweight Analytics

**Why it matters:** Today every client error vanishes silently. The team cannot tell if checkout broke, if Mistral 5xx-ed for 30% of users, or whether the new pricing page actually converts.

## E.1 Sentry — Manual (non-wizard) install

The `@sentry/wizard` requires interactive prompts which won't run inside an agent harness. Use this manual sequence instead.

### E.1.1 Prerequisite (User Action)
Create a Sentry project. Capture:
- `SENTRY_DSN` (public client + server DSN)
- `SENTRY_AUTH_TOKEN` (for source-map upload — create at https://sentry.io/settings/account/api/auth-tokens/, scope `project:releases`)
- `SENTRY_ORG` (e.g., `plagiacheck`)
- `SENTRY_PROJECT` (e.g., `plagiacheck-web`)

### E.1.2 Install dep
Add to `package.json`:
```json
"@sentry/nextjs": "^8.0.0"
```
(User runs `npm install` after the change.)

### E.1.3 New: `sentry.client.config.ts` (project root)
```ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  ignoreErrors: [
    "ChunkLoadError",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
  beforeSend(event) {
    // Strip user content from breadcrumbs/extras to avoid logging text input.
    if (event.request) delete event.request.data
    return event
  },
})
```

### E.1.4 New: `sentry.server.config.ts`
```ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request) delete event.request.data
    return event
  },
})
```

### E.1.5 New: `sentry.edge.config.ts`
```ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

### E.1.6 New: `instrumentation.ts` (project root)
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}
```

### E.1.7 Modify: `next.config.js`

**Back up first** (`cp next.config.js next.config.js.bak`). Wrap the existing export:

```js
const { withSentryConfig } = require("@sentry/nextjs")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // existing config
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
```

> If `next.config.js` already exists with a different shape (TypeScript, ESM, etc.), adapt — the wrap pattern is the same.

### E.1.8 Modify: `app/error.tsx`

Add Sentry capture inside the existing `useEffect`:

```ts
import * as Sentry from "@sentry/nextjs"
useEffect(() => {
  Sentry.captureException(error)
  console.error("Unhandled application error:", error)
}, [error])
```

### E.1.9 Modify: server-side error logs

Replace `console.error` calls in these files with `Sentry.captureException`:
- `lib/server-tokens.ts` (3 logs)
- `lib/server-history.ts` (2 logs)
- `lib/server-auth.ts` (no current logs — skip)
- `app/api/ai-tools/route.ts` (1 log)
- `app/api/check-plagiarism/route.ts` (2 logs)
- `app/api/billing-portal/route.ts` (3 logs)

Pattern:
```ts
import * as Sentry from "@sentry/nextjs"
// ...
Sentry.captureException(error)
console.error("...", error)  // keep console for local dev
```

### E.1.10 Env Vars Added (Sentry)
```
NEXT_PUBLIC_SENTRY_DSN=<dsn>
SENTRY_DSN=<same dsn>
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=<slug>
SENTRY_PROJECT=<slug>
```

## E.2 Analytics — Pick one

### Option A: Plausible (recommended; ~$9/mo; cookieless; GDPR-friendly)

**E.2.A.1 Modify: `app/layout.tsx`**

Add to `<head>` (use `next/script`):
```tsx
import Script from "next/script"
// inside <html> ... <head>
<Script
  defer
  data-domain="plagiacheck.online"
  src="https://plausible.io/js/script.js"
  strategy="afterInteractive"
/>
```

**E.2.A.2 Optional event tracking**
Install `next-plausible`:
```json
"next-plausible": "^3.12.0"
```
Track key conversions:
```ts
import { usePlausible } from "next-plausible"
const plausible = usePlausible()
plausible("tool_run_completed", { props: { tool: "humanize" } })
```

Suggested events:
- `tool_run_completed` (props: `tool`)
- `signup_started`, `signup_completed`
- `checkout_started`, `checkout_completed`

### Option B: Vercel Analytics (free if hosted on Vercel)

```json
"@vercel/analytics": "^1.0.0"
```

```tsx
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react"
// inside <body>, after children
<Analytics />
```

## E.3 Acceptance Criteria

- A thrown error in any tool shows up in Sentry within 60s with stack trace + user ID (Sentry auto-captures from auth state if you set user via `Sentry.setUser`).
- Pageview count visible in Plausible/Vercel Analytics dashboard within 10 min.
- No PII (email, text content) appears in Sentry events (verify by inspecting one).
- Cookie banner not required for Plausible (cookieless); verify Vercel Analytics policy if going that route.

## E.4 Risks

- Sentry source-map upload requires `SENTRY_AUTH_TOKEN` in CI/Vercel env, not just locally.
- Adblockers may block Plausible/Vercel Analytics — analytics will undercount but errors still report (Sentry server-side too).

---

# A. Real Plagiarism Detection Backend

**Why it matters:** Phase 2 honestly relabeled the current LLM-only checker as "similarity analysis." For users who need real-source plagiarism detection (academic, publishing), the current product is insufficient. Hybrid web-search + LLM produces real, citable matches.

## A.1 Provider Decision

**DECISION REQUIRED.** Recommendation: **Brave Search API** (cheapest, simplest).

| Provider | Pricing | Free tier |
|----------|---------|-----------|
| **Brave Search API** (Pro) | $3 / 1000 queries | 2k/mo free |
| Bing Web Search API | $7 / 1000 queries | None |
| SerpAPI | $50/mo (5000 searches) | 100/mo |
| Google Custom Search | $5 / 1000 queries | 100/day |

The implementation below uses Brave. The provider abstraction makes swapping a 1-file change.

## A.2 Brave Search API Reference (VERIFIED via Brave docs)

**Endpoint:** `GET https://api.search.brave.com/res/v1/web/search`

**Headers:**
```
X-Subscription-Token: <BRAVE_SEARCH_API_KEY>
Accept: application/json
```

**Query params:** `q` (required, query string), `count` (1-20, default 10), `country` (default `us`), `safesearch` (default `moderate`), `freshness` (omit for all-time).

**Response JSON shape (relevant fields):**
```ts
{
  web: {
    results: [
      {
        title: string,
        url: string,
        description: string,    // snippet
        // ... other fields ignored
      }
    ]
  },
  // ... other top-level sections (news, videos, etc.) ignored
}
```

**Errors:** Non-2xx responses include `{ message: string, type: string }` JSON.

**Rate limits:** 1 request/second on the Pro plan.

## A.3 Architecture

```
text input
  → split into sentences (regex /[.!?]+/, filter < 20 chars)
  → group consecutive sentences into shingles (~12-25 words each)
  → score each shingle's "searchability" (rare-word density)
  → pick top-N shingles (N=5 default, configurable via SHINGLE_BATCH env)
  → for each shingle: parallel Brave search (cap concurrency at 3)
  → aggregate top-3 results per shingle
  → for each (shingle, result) candidate: ask Mistral to score textual overlap (0-100)
  → keep matches scoring ≥ 30
  → consolidate by URL (dedupe), compute char offsets in original text
  → return { plagiarismPercentage, matches }
```

**Time budget:** ~5-8s for 5 shingles × 1 search each (1 RPS = 5s) + 5 parallel Mistral calls × 1-2s = ~10s total. Well within the existing SSE smoothed progress UX.

## A.4 Files to Create

### A.4.1 `lib/plagiarism/shingles.ts`

```ts
const COMMON_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
  "to", "of", "in", "on", "at", "for", "with", "by", "from",
  "this", "that", "these", "those", "it", "its", "be", "been",
  "as", "if", "then", "than", "so", "such", "into", "about",
])

export interface Shingle {
  text: string
  startIndex: number
  endIndex: number
  searchability: number   // 0-1, higher = better search query
}

/** Split text into shingles. Each shingle = 12-25 words from one or more sentences. */
export function buildShingles(text: string): Shingle[] {
  if (!text || text.length < 60) return []

  // Find sentence boundaries (with positions)
  const sentenceMatches: { text: string; start: number; end: number }[] = []
  const re = /[^.!?]+[.!?]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const trimmed = m[0].trim()
    if (trimmed.length >= 20) {
      sentenceMatches.push({ text: trimmed, start: m.index, end: m.index + m[0].length })
    }
  }

  // Group consecutive sentences into ~12-25 word shingles
  const shingles: Shingle[] = []
  let buf: typeof sentenceMatches = []
  let bufWordCount = 0
  for (const s of sentenceMatches) {
    const wc = s.text.split(/\s+/).length
    buf.push(s)
    bufWordCount += wc
    if (bufWordCount >= 12) {
      const start = buf[0].start
      const end = buf[buf.length - 1].end
      const sliced = text.substring(start, end)
      shingles.push({
        text: sliced,
        startIndex: start,
        endIndex: end,
        searchability: scoreSearchability(sliced),
      })
      buf = []
      bufWordCount = 0
    }
  }
  // Trailing buffer (skip if too short)
  if (buf.length > 0 && bufWordCount >= 8) {
    const start = buf[0].start
    const end = buf[buf.length - 1].end
    const sliced = text.substring(start, end)
    shingles.push({ text: sliced, startIndex: start, endIndex: end, searchability: scoreSearchability(sliced) })
  }
  return shingles
}

/**
 * Searchability heuristic: fraction of words that are NOT common stopwords,
 * boosted by presence of named entities (capitalized mid-sentence words)
 * and numbers (statistics are highly distinctive).
 */
function scoreSearchability(text: string): number {
  const words = text.split(/\s+/)
  if (words.length === 0) return 0
  let rareCount = 0
  let entityCount = 0
  let numberCount = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!w) continue
    if (!COMMON_WORDS.has(w) && w.length > 3) rareCount++
    if (i > 0 && /^[A-Z][a-z]+/.test(words[i])) entityCount++
    if (/\d{2,}/.test(words[i])) numberCount++
  }
  const rareRatio = rareCount / words.length
  return Math.min(1, rareRatio + entityCount * 0.05 + numberCount * 0.1)
}

export function pickTopShingles(shingles: Shingle[], n: number): Shingle[] {
  return [...shingles].sort((a, b) => b.searchability - a.searchability).slice(0, n)
}
```

### A.4.2 `lib/plagiarism/search-provider.ts`

```ts
export interface SearchHit {
  title: string
  url: string
  snippet: string
}

export interface SearchProvider {
  search(query: string, count?: number): Promise<SearchHit[]>
}

class BraveSearchProvider implements SearchProvider {
  constructor(private apiKey: string) {}

  async search(query: string, count = 3): Promise<SearchHit[]> {
    const params = new URLSearchParams({
      q: query.length > 400 ? query.slice(0, 400) : query,
      count: String(Math.min(count, 20)),
      safesearch: "moderate",
    })
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      { headers: { "X-Subscription-Token": this.apiKey, Accept: "application/json" } }
    )
    if (!response.ok) {
      console.error("Brave search error:", response.status, await response.text().catch(() => ""))
      return []
    }
    const data: any = await response.json()
    const results: any[] = data?.web?.results ?? []
    return results.slice(0, count).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.description || "",
    }))
  }
}

export function getSearchProvider(): SearchProvider | null {
  const provider = process.env.PLAGIARISM_SEARCH_PROVIDER || "brave"
  if (provider === "brave") {
    const key = process.env.BRAVE_SEARCH_API_KEY
    if (!key) return null
    return new BraveSearchProvider(key)
  }
  // Add other providers here.
  return null
}
```

### A.4.3 `lib/plagiarism/match-scorer.ts`

```ts
import { Mistral } from "@mistralai/mistralai"

const MATCH_SCORER_PROMPT = `You evaluate textual similarity between a source passage and a candidate web snippet. Decide whether the source passage was copied from, paraphrased from, or just coincidentally similar to the snippet.

Scoring rules:
- 90-100: source is a near-verbatim copy of the snippet (only minor wording differences).
- 70-89: source is clearly a paraphrase of the snippet (same facts, restructured).
- 40-69: source shares specific factual content with the snippet but written independently.
- 10-39: surface-level similarity only (common phrasing, generic facts).
- 0-9: unrelated or coincidental.

Reason field: max 12 words, no quotes.

Return ONLY a valid JSON object:
{
  "similarity": number 0-100,
  "reason": "short reason"
}`

export interface MatchScore {
  similarity: number
  reason: string
}

export async function scoreMatch(
  client: Mistral,
  model: string,
  sourcePassage: string,
  snippet: string
): Promise<MatchScore | null> {
  try {
    const completion = await client.chat.complete({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: MATCH_SCORER_PROMPT },
        { role: "user", content: `SOURCE PASSAGE:\n${sourcePassage}\n\nWEB SNIPPET:\n${snippet}` },
      ],
    })
    const content = completion.choices?.[0]?.message?.content
    if (!content) return null
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: any) => c.text || "").join("") : String(content)
    const json = text.match(/\{[\s\S]*\}/)
    if (!json) return null
    const parsed = JSON.parse(json[0])
    const similarity = Math.max(0, Math.min(100, Number(parsed.similarity) || 0))
    const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 100) : ""
    return { similarity, reason }
  } catch (err) {
    console.error("scoreMatch error:", err)
    return null
  }
}
```

### A.4.4 Modify: `app/api/check-plagiarism/route.ts`

Replace the existing Mistral-only logic with the pipeline. Key changes:

1. Import the new modules + `getSearchProvider`.
2. After auth + token deduct, build shingles. If `< 2` shingles or no provider, fall back to existing LLM-only behavior (gracefully degrade).
3. Pick top-N shingles (N from `PLAGIARISM_SHINGLE_BATCH` env, default `5`).
4. Send progress events: `0` → `15` (shingles built) → `40` (searches done) → `90` (scoring done) → `100`.
5. Run searches in parallel (Promise.all with concurrency cap of 3 — use a small p-limit pattern inline).
6. For each (shingle, hit) pair where `hit.snippet` is non-empty, call `scoreMatch`. Cap to top-3 hits per shingle.
7. Filter `similarity >= 30`.
8. Output match shape:
   ```ts
   {
     text: shingle.text,
     startIndex: shingle.startIndex,
     endIndex: shingle.endIndex,
     similarity: number,
     reason: string,
     sourceUrl: string,
     sourceTitle: string,
   }
   ```
9. `plagiarismPercentage` = sum of `(match.endIndex - match.startIndex)` across **distinct** spans, divided by `text.length`, times 100. Clamp `[0, 100]`. Round.
10. Token cost: see A.6 below.

### A.4.5 Modify: `components/plagiarism-results.tsx`

Extend the `PlagiarismMatch` type with optional `sourceUrl` and `sourceTitle`. In the matches list, render the source as a clickable link below each match's reason:

```tsx
{match.sourceUrl && (
  <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer"
     className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block truncate">
    {match.sourceTitle || match.sourceUrl}
  </a>
)}
```

The `Detected Matches` heading already exists — no further structural changes needed.

## A.5 Token Cost (DECISION REQUIRED)

Each plagiarism check now costs:
- 1 search call per shingle × 5 shingles = 5 searches × $3/1000 = **$0.015**
- Up to 5 × 3 = 15 Mistral scoring calls (typically less after dedupe), say avg 8 × ~$0.001 = **$0.008**
- **~$0.023 per check** at the high end.

Old cost (LLM-only): ~$0.003.
New cost is ~8× higher.

**Two options:**

**Option α (recommended):** Bump the user-facing cost. Add a plagiarism-specific cost function in `lib/server-tokens.ts`:
```ts
export function calculatePlagiarismTokenCost(text: string): number {
  return Math.ceil(text.length / 3)  // 2× the standard rate
}
```
Use this in `/api/check-plagiarism` instead of `calculateTextTokenCost`. Update the home page button label.

**Option β:** Absorb the cost. Don't change tokens. Cap user usage with a per-user rate limit (e.g., 20 plagiarism checks per hour) implemented via Upstash Redis.

Recommend Option α — clearer signal to users that plagiarism is the heavyweight tool.

## A.6 Caching (Optional but Recommended)

Same shingle, re-checked, can return cached search hits for 24h. Use Upstash KV (free tier 10k commands/day):

```ts
const cacheKey = `brave:${sha256(shingle.text)}`
const cached = await kv.get(cacheKey)
if (cached) return cached
const fresh = await provider.search(shingle.text, 3)
await kv.set(cacheKey, fresh, { ex: 86400 })
```

Defer to a follow-up if not adding KV in this phase.

## A.7 Acceptance Criteria

- A check on text plagiarized verbatim from a known Wikipedia article surfaces the actual Wikipedia URL with `similarity ≥ 80`.
- A check on original text returns `plagiarismPercentage < 15` and zero matches with `similarity ≥ 50`.
- Total cost per check stays ≤ $0.05.
- Token deduction reflects the new cost; users see updated `(N tokens)` button label.
- The "Detected Matches" list shows source URLs that resolve to real pages.
- No regression in the existing inline-highlight or Copy Report / Download Report flows.

## A.8 Env Vars Added

```
PLAGIARISM_SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=<key>
PLAGIARISM_SHINGLE_BATCH=5
```

## A.9 Risks

- **False positives** when a flagged sentence is a common phrase that just happens to appear on many sites. Mitigated by the LLM scoring step.
- **Latency**: ~10s response time. Acceptable since the smoothed progress bar (Phase 2.6) already handles this UX-wise.
- **Brave rate limit**: 1 RPS on Pro plan. With concurrency cap of 3 and 5 shingles, you'll hit it. The `pLimit(3)` pattern + 200ms backoff handles this.
- **Snippet truncation**: Brave snippets are ~150 chars. The Mistral score is based on snippet, not full page. False negatives possible when the actual match is on the page but not in the snippet. Acceptable trade-off vs full-page fetching.

---

## Phase-Level Acceptance Summary (cross-cutting)

For every phase, before marking it complete:

1. **Build passes.** Run `npm run lint` if dependencies are installed (otherwise note as deferred).
2. **No TypeScript regression** in the touched files.
3. **No file in restricted folders modified.** Verify with `git diff --stat`.
4. **Migrations listed in section** are recorded in `supabase/migrations/` and the user has been told to run them.
5. **Env-var additions** are documented (in this file or a `.env.example`).
6. **`IMPROVEMENT_PLAN.md` Out-of-Scope section** is updated to reflect what now exists.

---

## Out of Scope (This Plan)

- Any change to `app/api/paymentstuff/*`, `app/api/Redirect/*`, `app/api/webhook/*`, `app/api/discounts/*`.
- Pricing tier changes (only the yearly toggle is added; monthly tiers stay).
- Multi-language UI.
- Native mobile apps.
- Team / workspace features (would require schema changes far beyond the current single-user model).
- Hardening the `text-to-speech` route (verified to be free / client-only — confirm before assuming during F implementation).
