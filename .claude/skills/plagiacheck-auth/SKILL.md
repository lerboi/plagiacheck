---
name: plagiacheck-auth
description: How authentication works in Plagiacheck — Supabase auth on the client via auth-helpers-nextjs, the Bearer-JWT pattern on API routes via lib/server-auth.ts, sign-in / sign-up / forgot-password / reset-password pages, and the guest-token fallback for non-logged-in visitors. Use when the user asks about auth, sign-in, sign-up, sessions, JWTs, the signin page, password reset, or wants to protect/unprotect a route.
---

# Plagiacheck Auth

Authentication is **Supabase Auth** end-to-end. There's no custom user table or password hashing — Supabase owns it.

## Client side

Every client component that needs session info uses:

```ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const supabase = createClientComponentClient()
const { data: { session } } = await supabase.auth.getSession()
```

The standard pattern (used in every tool page and `components/nav.tsx`):

```ts
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
  }
  checkSession()

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null)
  })
  return () => { authListener.subscription.unsubscribe() }
}, [supabase.auth])
```

This is intentionally repetitive — there's no shared `useUser()` hook. If you abstract it, do so for all tool pages at once.

## Server side (API routes)

Every protected API route validates the Bearer token via `lib/server-auth.ts`:

```ts
import { getUserFromRequest } from "@/lib/server-auth"

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  // ... user.id is available
}
```

`getUserFromRequest` reads the `Authorization: Bearer <token>` header, calls `supabase.auth.getUser(token)` against the modern client (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and returns either the user or `null`.

The client side attaches the header via `getAuthHeader()` in `lib/store.ts`:

```ts
import { getAuthHeader } from "@/lib/store"
const authHeader = await getAuthHeader()
fetch("/api/...", { headers: { ...authHeader, "Content-Type": "application/json" }, ... })
```

## Auth-related pages

| Page | Path | What it does |
|------|------|--------------|
| Sign in / sign up | `/signin` | Tabbed UI — email+password sign in, sign up. Uses `supabase.auth.signInWithPassword` and `signUp`. After sign-up, creates a `user_profiles` row with default 1000 tokens. Honors `?next=` redirect. |
| Forgot password | `/forgot-password` | Calls `supabase.auth.resetPasswordForEmail` with a redirect URL pointing at `/reset-password` |
| Reset password | `/reset-password` | Updates the password via `supabase.auth.updateUser({ password })`. Reached only via Supabase's email link |

There is no email-verification gate, no MFA, and no OAuth providers configured. Adding any of those is a Supabase dashboard config change plus a UI hook.

## Guest tokens (non-logged-in visitors)

Visitors without an account get **200 free guest tokens**, tracked in the Zustand store as `guestTokens` and persisted to `localStorage` as `token-storage`. These are display-only — guests cannot actually call any token-gated API (the API requires a Bearer JWT). The 200 number is decorative + funnel-driving.

When the user actually clicks a tool action without auth, the page shows `<ToolSignInPrompt />` (in `components/tool-signin-prompt.tsx`) prompting them to sign in.

`clearTokens()` deliberately preserves `guestTokens` on logout so the count survives across sign-out events.

## Sign-out

```ts
await supabase.auth.signOut()
clearTokens()  // resets remainingWords + remainingImageTokens, keeps guestTokens
```

The nav-level "Sign Out" button (in `ProfileDropdown` and the mobile menu) handles this.

## Common edits

- **Adding a new protected API route:** copy the `getUserFromRequest` pattern. Don't use cookies — the codebase is JWT-Bearer.
- **Adding a public route:** just skip the auth check.
- **Adding OAuth (Google, GitHub):** Supabase dashboard → Auth → Providers, then add a button in `/signin` calling `supabase.auth.signInWithOAuth`.
