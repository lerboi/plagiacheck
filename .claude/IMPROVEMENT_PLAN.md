# Plagiacheck — Improvement & Implementation Plan

**Audit date:** 2026-05-02
**Scope:** Full site — every tool, page, API, and shared component.
**Method:** Five parallel code-explorer agents + architecture skill reference.

---

## Executive Summary

Plagiacheck has a working scaffold (Next.js 15, Supabase, Stripe, Mistral) and a polished marketing surface, but a substantial portion of the **product surface is non-functional, exploitable, or misleading**:

- **Three security/correctness exposures** — `/api/ai-tools` and `/api/check-plagiarism` have **zero server-side auth or token enforcement**. Anyone can call them directly and consume Mistral capacity for free. Tokens are deducted only client-side, and the `decrementWords` flow is racy.
- **One billing fulfillment bug** — the custom-plan slider sends `imageTokens` and `voiceMinutes` to a route that ignores them. Users pay for capacity they never receive.
- **Fake / dead features** — the `/history` page does not load history; no `history` table exists. `/redirects` is a developer test page that fires a real Stripe checkout on every render and is publicly routable. The `<Hero>` component is orphaned.
- **Fundamentally weak plagiarism detection** — Mistral is a language model with no source corpus; the "plagiarism percentage" is a hallucination, the algorithmic fallback only flags repeated words, and the marketing copy claims "50B+ sources checked."
- **Broken file upload, broken token gate, broken AI-detector PDF, broken summarizer race condition, broken grammar fix-application, broken theme-aware FAQ text, broken yearly price rendering (`$$119`), broken testimonial entities (`&ldquo;…&ldquo`), broken auth flows (no forgot-password, no OAuth, generic error messages).**

This document is structured as a phased, prioritized plan. **Phase 1 (security + correctness)** is non-negotiable and should ship before any new feature work. **Phases 2–5** are functional restoration and UX upgrades. **Phase 6** is design polish.

> **Constraint:** Restricted routes — `app/api/paymentstuff/*`, `app/api/Redirect/*`, `app/api/webhook/*`, `app/api/discounts/*`, and the Stripe checkout session creation logic — must NOT be modified. The pricing structure, plans, and Stripe integration stay the same. Pricing UI/design CAN change.

---

## Phase 1 — Critical Security & Correctness (ship first)

### 1.1 Server-side auth + atomic token deduction
**Files:** `app/api/ai-tools/route.ts`, `app/api/check-plagiarism/route.ts`, `lib/store.ts`, new `lib/server-tokens.ts`

**Problem:**
- Both AI endpoints accept any POST and call Mistral with no session check. (`app/api/ai-tools/route.ts:121-190`, `app/api/check-plagiarism/route.ts` entire route).
- `lib/store.ts:54-73` `decrementWords` reads local Zustand state then writes it back to Supabase as an absolute value. Two concurrent calls overwrite each other with stale values; failed writes silently desync from the DB.

**Fix:**
1. Read the Supabase access token from the `Authorization` header on every AI route, validate via `supabase.auth.getUser(token)`, reject 401 if missing/invalid.
2. Compute required tokens **server-side** from the request body. Refuse the call if `user_profiles.tokens < required`.
3. Replace the Zustand-driven update with a Postgres RPC `decrement_user_tokens(user_id uuid, amount int)` that does `UPDATE user_profiles SET tokens = tokens - amount WHERE id = user_id AND tokens >= amount RETURNING tokens`. Atomic, race-free, server-authoritative.
4. The client store becomes read-only display: it `fetchRemainingWords()` after every successful API call to reconcile.
5. Add a per-user rate limiter (Upstash Redis or simple in-memory for MVP) — N requests per minute per `user.id`.

### 1.2 Custom-plan billing fulfillment bug
**Files:** `components/PricingPage/CustomPlanSlider.tsx`, `app/api/create-custom-checkout-session/route.ts`

**Problem:** The slider POSTs `{ wordCount, imageTokens, voiceMinutes, price }`. The route reads only `{ wordCount, price }` (line 7). Stripe line item is named `"Custom Plan - X words"`. Image and voice selections are silently dropped, so the user pays but never receives those tokens.

**Fix:** Either (a) make the slider word-count-only — strip image/voice from the UI until the route + webhook can be coordinated (webhook is restricted), or (b) defer image/voice selections to the existing dedicated package routes (`200Image`, `1000Image`). Option (a) is the safest immediate fix.

### 1.3 `/redirects` page is a live debug endpoint
**File:** `app/redirects/page.tsx`

**Problem:** A `useEffect` with no dep array fires `/api/create-checkout-session-a` (which doesn't exist — typo) with a hardcoded developer email on every render. Publicly routable. No auth gate.

**Fix:** **Delete the file.** It is dev scaffolding and has no production purpose.

### 1.4 Plagiarism API token-deduction race
**File:** `app/page.tsx:140-147`

**Problem:** Token deduction fires on every `data.result` SSE frame. If the stream ever delivers more than one, the user is double-charged. Once 1.1 lands and deduction moves server-side, this is naturally fixed; until then, add a `resultReceived` flag guard.

### 1.5 SSE chunk parsing
**File:** `app/page.tsx:129-134`

**Problem:** `chunk.split("\n")` per `read()` call. TCP can split a `data: {...}` line across reads; the partial line silently fails `JSON.parse` inside `catch {}`.

**Fix:** Buffer leftover bytes between reads. Parse only complete lines (lines ending with `\n`); keep the trailing partial line for the next iteration.

---

## Phase 2 — Restore Plagiarism Checker

### 2.1 Re-architect plagiarism detection
**File:** `app/api/check-plagiarism/route.ts`

**Problem:** Mistral is a pretrained LM with no real-time source corpus. The "plagiarism percentage" it returns is a hallucination. The fallback only counts repeated words.

**Options (pick one):**
1. **Honest pivot:** Rebrand the tool as "AI-style similarity analysis" — Mistral evaluates if text reads like common online content patterns. Update marketing copy. Cheap; no infrastructure change.
2. **Real detection:** Integrate a true plagiarism API (Copyleaks, PlagScan, Quetext) and meter token cost to match. Most defensible; significant cost.
3. **Hybrid:** Use Bing/Google web-search snippets for direct quote matching on top-N sentence shingles, then run Mistral over the matches. Medium effort.

**Recommendation:** Option 1 immediately (truth in marketing); plan Option 3 within a quarter.

### 2.2 Fix token gate
**File:** `app/page.tsx:64-69`

**Problem:** `fetchRemainingWords` is never called inside `checkSession`. Fresh sessions show `remainingWords: 0` and the submit button is disabled even for users with 10,000 tokens.

**Fix:** Call `fetchRemainingWords(user.id)` inside the auth callback after `setUser`.

### 2.3 Fix file upload
**File:** `app/page.tsx:171-181`

**Problem:** `reader.readAsText(file)` is called on `.doc`, `.docx`, `.pdf`. These are binary; the result is garbage.

**Fix:** Branch on file extension. `.txt` → `readAsText`. `.docx` → `mammoth.js` extractor. `.pdf` → `pdfjs-dist` text extraction. `.doc` → reject with a clear "convert to .docx or .pdf" message.

### 2.4 Fix highlighting + show match list
**File:** `components/plagiarism-results.tsx:48-50, app/api/check-plagiarism/route.ts:192`

**Problem:** API normalizes missing `startIndex`/`endIndex` to `0`. The component filter checks for `undefined` not `0`. Zero-length highlights render silently.

**Fix:** API: omit matches without valid indices instead of defaulting to 0. Component: filter `start === end` and add a dedicated **list view** of all matches with similarity %, source snippet, and offending span — hover-to-highlight is not keyboard accessible.

### 2.5 Output actions
Add Copy Report, Download PDF, and Save to History buttons (history persistence covered in Phase 4.1).

### 2.6 Smoother progress UX
Progress jumps 0 → 30 → 80 → 100 with the bar frozen at 30% during the entire Mistral call. Replace with an indeterminate loader during the LLM call, jumping to 100% on result.

---

## Phase 3 — Fix Each AI Tool

### 3.1 Eliminate copy-paste across `/paraphraser`, `/summarizer`, `/grammar-checker`, `/ai-humanizer`, `/ai-detector`

**Files:** all five tool pages

Each page duplicates: the auth `useEffect`, `calculateRequiredTokens`, the "not enough words" warning card, the hero badge/headline structure, `handleCopy`/`copied` state, and the loading spinner.

**Extract:**
- `hooks/useAuthUser.ts` — returns `{ user, loading }`
- `hooks/useToolRunner.ts` — handles fetch, deduction reconciliation, error state, copied state
- `components/ToolHero.tsx` — hero card with badge, title, subtitle, feature pills
- `components/InsufficientTokensCard.tsx`
- `components/ToolEditor.tsx` — input/output panel pair with character count, copy, download, replace-original

This deduplication is a prerequisite for cleanly fixing the per-tool issues below.

### 3.2 Token unit lie ("characters/6" labeled as "words")
**Files:** all tool pages, the "X words" button label, the "Words remaining" copy in nav and billing

`Math.ceil(text.length / 6)` is **characters / 6**, not word count. The labels mislead users. Either:
- Rename internal references to "tokens" and display the real cost ("Use 100 tokens"), OR
- Compute actual `text.trim().split(/\s+/).length` if the brand wants to keep "words."

Pick one; do not mix.

### 3.3 AI Detector
**File:** `app/ai-detector/page.tsx`, `lib/pdf-generator.ts`

- Architecture doc was wrong: detection IS server-side via Mistral with `tool: "ai-detect"`. Update internal docs.
- The "99% Accurate" badge is unverifiable marketing — remove or replace with "AI-assisted estimate."
- Copy button copies the **input**, not the analysis. Fix `handleCopy` to copy verdict + analysis + per-sentence breakdown.
- PDF report (`generateAIDetectorReport`) accepts no `sentences` array — the most valuable output is missing from the PDF. Extend the signature and render per-sentence rows with color coding.
- Add minimum text length guard (e.g., 50 chars) before charging tokens.
- Hardcoded "New Feature!" sidebar callout — remove or wire to a real announcement system.
- Fake progress bar (3% per 100ms) — replace with indeterminate loader.

### 3.4 AI Humanizer
**File:** `app/ai-humanizer/page.tsx`, `app/api/ai-tools/route.ts:13-26`

- System prompt has no behavioral mapping for `level` (0–100) or each `tone`. Add explicit rules: "At level 0, preserve sentence structure and vocabulary. At level 100, fully restructure with idiomatic informal phrasing." Same for tone — define each style concretely.
- "Transformation Rate" stat (`getChangedWords`) is positional, not a real diff — every insertion/deletion shifts indices and inflates the number. Use a true LCS/diff (e.g., `diff` library) or remove the stat.
- Output textarea is `readOnly` with no affordance. Add a small label ("Result — copy or edit a copy below").
- "Stacked" view is mislabeled "tab" — rename.
- Add download as `.txt` and "Use as input" button.

### 3.5 Paraphraser
**File:** `app/paraphraser/page.tsx`, `app/api/ai-tools/route.ts:28-40`

- System prompt instructs "Adapt the style based on the requested mode" with no per-mode guidance — at temperature 0.3 all modes produce near-identical output. Add explicit mode definitions (Standard, Fluency, Formal, Simple, Creative, Academic).
- Output card has no character/word count.
- No max input length validation.
- Add download, replace-original, and tone preservation toggle.

### 3.6 Summarizer
**File:** `app/summarizer/page.tsx:89-93`, `app/api/ai-tools/route.ts:42-55`

- **Race:** the response handler reads React state `outputType` at completion time, not at request time. Toggling format mid-flight crosses the wires. Capture into a local `const` before `fetch`.
- Define summary length precisely in the prompt (sentence/word count target per "short/medium/long").
- Validate `bulletPoints` is an array, not a single string the model returned.
- Add minimum input length (summarization of <100 words is meaningless).

### 3.7 Grammar Checker
**File:** `app/grammar-checker/page.tsx:137-162, 356`

- `applyFix` blindly trusts Mistral's `startIndex`/`endIndex`. LLMs return wrong character offsets routinely. **Verify** that `text.slice(start, end) === issue.text` before applying; if not, fall back to a string-replace of the first occurrence; if that also fails, surface an error and skip.
- Corrected text card is hidden when `issues.length === 0`. If the AI auto-corrected without flagging issues, the result is discarded. Always render the corrected text card if `correctedText` exists.
- Add **inline highlight view** of the original text with issues underlined and click-to-jump-to-fix. This is the table-stakes UX for grammar tools.
- Add diff view between original and corrected.

### 3.8 Word Counter
**File:** `app/word-counter/page.tsx`

- Word counter is correct functionally. Issues are layout/UX:
- Removes the `<Hero />` and `<FeatureShowcase />` at the bottom of the page — they advertise plagiarism checking on a word counter page (off-context).
- "Title Case" button breaks on `\n`/`\t`/multi-space text. Fix: split on `/(\s+)/` keeping separators, transform tokens, rejoin.
- Add `.txt` upload and "Download stats" actions.
- Promote sidebar stats above the fold on mobile.

### 3.9 Mistral model
**File:** `app/api/ai-tools/route.ts`, `app/api/check-plagiarism/route.ts`

`mistral-medium` is being phased out. Pin to `mistral-large-latest` (or another current named model). Add a single env-var-driven `MISTRAL_MODEL` constant so swaps are one-line.

---

## Phase 4 — Real History, Real Auth, Real Billing

### 4.1 Build a real history feature
**File:** `app/history/page.tsx`, new table `tool_history`, write-points in every tool API

`/history` currently lists tool launchers — there is no history feature. Either:
1. **Build it:** Create `tool_history` table (`id, user_id, tool, input_preview, output_preview, tokens_used, created_at`). Insert from each AI route on success. Page becomes a paginated list with filters (tool, date), search, and "rerun" action.
2. **Remove it:** Delete `/history`, take the link out of nav, and rename the existing tool-launcher page if the directory layout is genuinely useful. Currently the `/history` route doubles the function of `/`'s tools dropdown.

**Recommendation:** Build it (Option 1) — history is part of the product promise implied by the nav link.

### 4.2 Auth flows
**File:** `app/signin/page.tsx`, new `app/forgot-password/page.tsx`, new `app/reset-password/page.tsx`

- **No forgot-password flow exists.** Add link, page, `supabase.auth.resetPasswordForEmail`, and reset-confirmation page.
- **No social auth.** Add Google + GitHub OAuth buttons via `supabase.auth.signInWithOAuth`.
- Generic error message ("Invalid login credentials") for every failure mode. Map Supabase error codes to specific messages — unverified email, account not found, wrong password, rate-limited.
- Don't share `email`/`password` state between sign-in and register tabs. Separate state per tab.
- Add `aria-label` to password visibility toggles.
- Add email verification flow if not already enforced server-side.

### 4.3 Billing page
**File:** `app/billing/page.tsx`

- `getPlanName`/`getPlanPrice` only handle `200Image`/`1000Image`. Subscription plans (Plus, Premium) fall through to "Free Plan." Map all package names.
- **No cancel-subscription button.** Add one that calls the existing `cancelPackageAPI` (restricted but already-correct route) for packages, and a separate flow for subscriptions (the underlying Stripe portal link is the simplest answer — `stripe.billingPortal.sessions.create` from a new non-restricted route).
- **No invoice/receipt download.** Use Stripe's hosted invoice URLs (already attached to invoice events) — store `hosted_invoice_url` in `Payment` records via the webhook (webhook restricted, so this requires a follow-up; until then, link to Stripe portal where invoices are accessible).
- **`remainingWords` reads from Zustand/localStorage only** — wrong on a new device or after clearing storage. Fetch from `user_profiles` on page load.
- Errors in `fetchBillingData` are silently swallowed. Surface them with retry.

### 4.4 Profile dropdown
**File:** `components/Profile/ProfileDropdown.tsx`

Add: Account Settings (`/account`), Change Password (or link to forgot-password flow), History (`/history`), Pricing (`/pricing`).

---

## Phase 5 — Marketing Truthfulness, Brand, Legal

### 5.1 Misleading marketing claims
**Files:** `app/page.tsx:260-274, 577`, `components/Hero.tsx:14`, `components/FeatureShowcase.tsx:9`, `app/ai-detector/page.tsx` ("99% Accurate")

Remove or replace:
- "500K+ Active Users" / "50B+ Sources Checked" / "<30s Avg. Results" — fabricated.
- "Billions of sources" — Mistral does not search the web. False as long as the product runs on an LLM-only pipeline. Remove unless Phase 2.1 Option 2/3 ships.
- "99% Accurate" on AI Detector — unverifiable; replace with "AI-assisted estimate."

### 5.2 Pricing page polish
**File:** `app/pricing/page.tsx`

- **`$$119`** display bug at line 182-183 — duplicate `$` sign (hardcoded `$` plus `${plan.yearlyPrice}` which already includes `$`). Remove one.
- No monthly/yearly toggle — `yearlyPrice` and `savings` are defined but the user can only buy monthly. Add the toggle.
- "Get Started Free" button is a dead `console.log` for logged-in users (line 109-122). Disable + change copy to "Current Plan" or remove the button entirely for signed-in users on the free tier.

### 5.3 TrustSection HTML entity bug
**File:** `components/PricingPage/TrustSection.tsx:177`

`&ldquo{testimonial.content}&ldquo` — closing entity wrong, missing semicolons. Fix to `&ldquo;{...}&rdquo;`.

### 5.4 FAQ theme bug
**File:** `components/FAQ.tsx:63`

`theme === "light" ? "text-gray-800" : "text-white"` — when `theme === "system"`, falls through to white-on-white on light system. Use `resolvedTheme` from `useTheme`, OR replace with Tailwind dark-mode classes (`text-gray-800 dark:text-white`).

### 5.5 FAQ animation
**File:** `components/FAQ.tsx:75-80`

Uses `animate` not `whileInView` — all 10 items animate on mount even if below the fold. Switch to `whileInView` with `viewport={{ once: true }}`.

### 5.6 Theme toggle: add System
**File:** `components/theme-toggle.tsx`

`enableSystem` is on, but the toggle has only Light/Dark. Add System.

### 5.7 Layout consistency
**Files:** `app/layout.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`

`<Nav>` is not in the root layout — every page must include it. Privacy/Terms forget it. Move `<Nav />` into `app/layout.tsx` so every page gets it automatically. Remove duplicate `container mx-auto` nesting on legal pages.

### 5.8 Dead components
**Files:** `components/Hero.tsx`

Orphaned (`app/page.tsx` defines its own inline hero). Either delete or use it on the home page in place of the inline section.

---

## Phase 6 — Observability, Polish, Hardening

### 6.1 Error boundaries
Add a top-level `<ErrorBoundary>` and per-tool boundary so AI failures don't blank the page.

### 6.2 Observability
No Sentry/PostHog/Analytics anywhere. Add Sentry (errors), and a privacy-respecting analytics tool (Plausible/Umami) for funnel data.

### 6.3 CORS
**File:** `middleware.ts:15-18`

Wildcard `Access-Control-Allow-Origin: *` on every API. Restrict to `process.env.ALLOWED_ORIGIN` (already declared but unused).

### 6.4 Token-count nav refresh
**File:** `components/nav.tsx:127-132`

Nav doesn't re-fetch tokens after a tool runs. Subscribe to a "tool-completed" event (or after `useToolRunner.run()` resolves, call `fetchRemainingWords()`). Once Phase 1.1 lands, server-authoritative reconciliation makes this automatic.

### 6.5 PageSkeleton
**File:** `components/PageSkeleton.tsx`

Layout doesn't match any real page. Either rewrite per-tool or delete.

### 6.6 ESLint + TS strictness
Add `react-hooks/exhaustive-deps` enforcement, `@typescript-eslint/no-explicit-any` warn level.

---

## Suggested Build Order

| Order | Phase | Why |
|-------|-------|-----|
| 1 | 1.1, 1.2, 1.3 | Stops free-tier abuse, billing fraud, and removes a publicly accessible debug Stripe trigger |
| 2 | 1.4, 1.5, 2.2, 2.3 | Restores plagiarism checker for real users |
| 3 | 3.1 | Refactor — makes 3.2–3.7 fast and consistent |
| 4 | 3.2–3.9 | Tool functionality across the board |
| 5 | 4.1 | Real history feature |
| 6 | 4.2, 4.3, 4.4 | Auth + billing UX |
| 7 | 5.1–5.8 | Marketing, layout |
| 8 | 6.x | Observability + polish |
| 9 | 2.1 | Decide on real plagiarism backend (largest scope, least urgent if marketing copy is fixed in 5.2) |

---

## Files That Should Be Deleted

- `app/redirects/page.tsx` — debug-only, fires Stripe checkout on render, hits non-existent route.
- `components/Hero.tsx` — orphaned, unless reintegrated.
- `components/PageSkeleton.tsx` — layout doesn't match any page; rewrite or remove.

---

## Out of Scope (per project rules)

- Anything inside `app/api/paymentstuff/*`, `app/api/Redirect/*`, `app/api/webhook/*`, `app/api/discounts/*`.
- Stripe checkout session creation logic in `create-checkout-session/route.ts` and `create-custom-checkout-session/route.ts` (NOTE: 1.2 may require updating `create-custom-checkout-session/route.ts` — confirm with project owner before touching, since the doc says "do not change Stripe session creation logic" and this *is* that file. Safer alternative: strip `imageTokens`/`voiceMinutes` from the slider UI without touching the route).
- Changing pricing tiers, plan structure, or Stripe price IDs.
