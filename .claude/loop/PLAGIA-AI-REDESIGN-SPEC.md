# PlagiaAI redesign + home-page swap — UX spec

**Status:** active spec. Referenced by FS-07, FS-08, FS-09 in `improvements.md`.
**Authored:** 2026-05-11 (post-FE-02 / P1-11 pause).
**Read order for the loop:** read this file in full before starting FS-07, FS-08, or FS-09.

---

## Goal

Make PlagiaAI the front door of Plagiacheck. The current homepage (plagiarism-checker UI) moves to its own route. The new homepage is a ChatGPT-style empty state with suggestion chips, a "see all tools" button, and a scroll-down marketing section explaining PlagiaAI.

---

## Three-PR split

| ID | What | Touches |
|---|---|---|
| **FS-07** | Move plagiarism checker to `/plagiarism-checker` (simplified, tool-only) | `app/plagiarism-checker/page.tsx` (new), `components/nav.tsx`, `app/all-tools/page.tsx`, `app/history/page.tsx`, `app/sitemap.ts` if present. Leaves `app/page.tsx` UNTOUCHED. |
| **FS-08** | PlagiaAI UI redesign (still at `/plagia-ai`) — ChatGPT-style empty state, suggestion chips, "see all tools" button | `app/plagia-ai/page.tsx`, new `components/plagia-ai/EmptyState.tsx`, new `components/plagia-ai/SuggestionChipBar.tsx` |
| **FS-09** | Swap `/` to render PlagiaAI + add scroll-down marketing. Keep `/plagia-ai` alive as redirect | `app/page.tsx` (rewrite), new `components/plagia-ai/OneChatAllTools.tsx`, `app/plagia-ai/page.tsx` → thin redirect OR keep dual rendering, update nav |

**Sequencing rationale:** FS-07 is a pure refactor and ships safely first. FS-08 polishes the chat at its current route — validates the new UX before it's the homepage. FS-09 then routes that polished chat to `/`. Each PR can roll back independently.

**FS-09 hard depends on FS-08 (the redesigned empty state must exist) and FS-07 (`/` must be free of the plagiarism UI).** Do not start FS-09 until both are merged to `main`.

---

## Layout — above the fold (empty state)

```
┌──────────────────────────────────────────────────────┐
│ <Nav />                                               │
├──────────┬───────────────────────────────────────────┤
│ Sidebar  │                                            │
│ (chats   │       What can I help with today?         │
│  FS-05)  │       One chat. 15 tools.                  │
│          │                                            │
│ collapsi-│   [🛡 Check plagiarism] [✏ Paraphrase]    │
│ ble on   │   [🤖 Detect AI]  [📝 Summarize]          │
│ mobile   │   [📊 Make chart] [→ See all tools]       │
│          │                                            │
│          │   ┌──────────────────────────────────┐    │
│          │   │ Ask anything…                    │    │
│          │   │                                  │    │
│          │   │ [📎] [🎤]                  [↑]  │    │
│          │   └──────────────────────────────────┘    │
│          │   Free 1,000 tokens to start.              │
│          │                                            │
│          │   ─────── scroll for more ──────          │
└──────────┴───────────────────────────────────────────┘
```

### Vertical rhythm (desktop)
- Hero block is vertically centered within the available chat-pane height (after Nav).
- Sequence top-to-bottom: H1, sub, chip row, input, helper text. Spacing: `space-y-6` between blocks.
- Below the input, a faint "↓ scroll for more" affordance hints at the marketing section.

### Headline copy
- **H1:** `What can I help with today?` (text-3xl md:text-4xl, font-semibold, balanced)
- **Sub:** `One chat. 15 tools.` (text-muted-foreground, text-base)
- Avoid marketing fluff in the hero — this is a chat surface, not a landing page. The marketing belongs below the fold.

### Empty state vs conversation state
- `messages.length === 0` → render full-viewport hero + marketing scroll section below.
- `messages.length > 0` → render existing chat thread layout. **Marketing sections hidden** (focused chat app). The user can return to empty state via "New chat" in the sidebar.
- Same logic on `/` (FS-09) and `/plagia-ai` (FS-08).

---

## Suggestion chips spec

### Count and content
Exactly **6 chips**: 5 tool starters + 1 outline "See all tools" link.

| # | Label | Icon (lucide) | Behavior on click |
|---|---|---|---|
| 1 | Check plagiarism | Shield | Prefill textarea with `Check this text for plagiarism:\n\n` and focus the textarea (cursor at end). |
| 2 | Paraphrase | Pencil | Prefill `Paraphrase this in a formal tone:\n\n` |
| 3 | Detect AI | Bot | Prefill `Is this text AI-generated?\n\n` |
| 4 | Summarize | FileText | Prefill `Summarize this in 3 bullet points:\n\n` |
| 5 | Make a chart | BarChart3 | Prefill `Make a bar chart showing ` |
| 6 | See all tools | ArrowRight | `Link href="/all-tools"` (outline variant, no prefill) |

**Picking rationale:** the 5 tool chips cover one item from each of the four PlagiaAI "killer" use cases (plagiarism, rewriting, detection, summarization) + one image-gen example (chart) to advertise the visual-tool capability. word-counter / TTS / speech-to-text are intentionally absent — they're not in the tool registry.

### Click behavior — prefill, never auto-submit
- Click prefills the textarea with the starter prompt.
- Cursor is positioned at the end so the user types their content right where it goes.
- Textarea is auto-focused.
- The chip row remains visible until the first message is sent (i.e., still in empty state). Re-clicks just overwrite the textarea content (acceptable — most users won't re-click).

### Visual spec
- Pill shape: `rounded-full`, `h-10`, `px-4`, `gap-2`, `text-sm`.
- Default: `bg-accent/40 hover:bg-accent border border-border`.
- Icon: `size-4`, color inherits from text.
- "See all tools": `border border-primary/30 hover:border-primary text-foreground` (outline-style to distinguish from action chips).
- Container: flex wrap, `gap-2`, `justify-center`, `max-w-2xl mx-auto`.

### Responsive
- Mobile (sm-): chips wrap onto 2 rows. No horizontal scroll.
- Tablet (md): wrap onto 1–2 rows depending on screen width.
- Desktop (lg+): single row, centered.
- Decision: **no horizontal scrolling** — wrap is cleaner and prevents hidden chips. ChatGPT scrolls because they have many chips; we have 6 by design.

### Accessibility
- Each chip is a `<button>` (the prefill chips) or `<Link>` (See all tools), with `aria-label` matching the visible text.
- Tab order: H1 → sub → chip 1..6 → textarea → submit.
- Chip row container: `role="group"`, `aria-label="Suggested prompts"`.

---

## Layout — below the fold (empty state only)

Order:

1. **"One chat. Every tool." explainer** (NEW, write fresh in this PR)
2. **"How it works" 3-step** (NEW)
3. **TrustSection** (REUSE existing component)
4. **FAQ** (REUSE existing `<FAQ />`)
5. **Footer** (layout default)

### 1. "One chat. Every tool." explainer (FS-09)

New component: `components/plagia-ai/OneChatAllTools.tsx`. Server-renderable.

Structure:
- Section header: H2 "One chat. Every tool." + sub "Just describe what you need. PlagiaAI picks the right tool and runs it."
- 3-column responsive grid (1 col mobile, 2 col tablet, 3 col desktop):
  - **Writing** (icon: PenLine) — list: Plagiarism Checker, AI Detector, Humanizer, Paraphraser, Summarizer, Grammar Checker, Word Counter
  - **Image & Visual** (icon: Image) — list: Infographic Generator, Thumbnail Generator, Chart Generator, Image-to-Text
  - **Voice & Audio** (icon: Mic) — list: Speech-to-Text, Text-to-Speech, Voice-to-Essay, Audio Summarizer
- Each item: tool icon (size-4) + label, no link (the chat is the entry point; users who want direct access click "See all tools").

### 2. "How it works" 3-step (FS-09)

Inline section, no new component required (just JSX in `app/page.tsx`).

Three cards (1 col mobile, 3 col desktop):
1. **You ask.** "Type or speak what you need — plain English."
2. **PlagiaAI dispatches.** "It picks the right tool from 15 available."
3. **You get the result.** "Output appears in the chat, ready to copy or download."

Each card: numbered badge + heading + 1-line description. Keep it tight.

### 3. TrustSection (REUSE — FS-09)

Pull `<TrustSection />` from where it currently lives in `app/page.tsx`. **Do not rewrite** — known concerns about unverified stats (P1-35) are out-of-scope for this PR. If the component doesn't already exist as a standalone file, extract it during FS-09 (move the JSX into `components/TrustSection.tsx` first, then reuse).

### 4. FAQ (REUSE — FS-09)

`<FAQ />` is already a shared component used on every tool page. Drop it in. Consider whether the home FAQ should differ from tool-page FAQs — if there's no homepage-specific FAQ data, keep using the shared one. Defer customization to a future FE item if needed.

---

## Plagiarism-checker move (FS-07)

### New page: `app/plagiarism-checker/page.tsx`

Strip down the current `app/page.tsx` to this skeleton (standard tool-page pattern from `CLAUDE.md`):

```
"use client"

import { Nav } from "@/components/nav"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
// + existing plagiarism state + handlers + PlagiarismResults + drop-zone JSX

export default function PlagiarismCheckerPage() {
  // copy ALL plagiarism state/handlers from current app/page.tsx
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <ToolPageHeader
        icon={Shield}
        title="Plagiarism Checker"
        subtitle="AI-powered originality detection across the web"
      />
      <section className="container max-w-5xl mx-auto px-4 py-8 flex-1">
        {/* existing input + upload + results JSX, unchanged */}
      </section>
      <FAQ />
    </div>
  )
}
```

### What to keep
- The complete plagiarism tool logic (state, handlers, SSE streaming, file upload, drop-zone, PlagiarismResults).
- ToolPageHeader, ToolSignInPrompt, FAQ.
- All token-deduction + auth wiring as-is — same `/api/check-plagiarism` route.

### What to strip
Anything that's marketing-page content, not the tool itself:
- Hero copy ("AI-powered plagiarism detection that..."), Hero CTA buttons.
- TrustSection.
- FeatureShowcase.
- Anything else not directly part of the plagiarism input/output flow.

These removed sections will be reborn (rewritten, not copy-pasted) in FS-09's new home page.

### Internal link migration (must update in FS-07)

1. `components/nav.tsx` — desktop mega-menu and mobile slide-out:
   - In the Writing tools section, add a "Plagiarism Checker" entry with the Shield icon, linking to `/plagiarism-checker`.
   - Keep the "PlagiaAI" featured entry pointing at `/plagia-ai` (FS-09 will change it to `/`).
2. `app/all-tools/page.tsx` — Writing grid:
   - Add a Plagiarism Checker card linking to `/plagiarism-checker`.
   - The featured PlagiaAI hero stays unchanged here (FS-09 updates it).
3. `app/history/page.tsx` — the "View tool" link logic:
   - When `tool === "plagiarism"`, link to `/plagiarism-checker`.
   - Grep for any other tool→route mapping and update.
4. `app/sitemap.ts` (if it exists): add `/plagiarism-checker` route.

### SEO

`app/plagiarism-checker/page.tsx` needs metadata. Pattern:
```
export const metadata = {
  title: "Plagiarism Checker — Plagiacheck",
  description: "AI-powered plagiarism detection. Paste or upload your text and find originality issues across the web.",
}
```
**But:** the page is a `"use client"` component, so metadata must be exported from a sibling `layout.tsx` OR the page must be split into server-page + client-content. Decision: **split into `app/plagiarism-checker/page.tsx` (server, exports metadata) + `app/plagiarism-checker/content.tsx` ("use client", the tool JSX)** — this is the same pattern documented in `learnings.md` for `/all-tools`.

### What FS-07 must NOT touch

- `app/page.tsx` stays as-is in FS-07 (still serves the plagiarism UI from `/`). The home swap happens in FS-09. This means after FS-07 ships, the plagiarism checker is **reachable at both `/` and `/plagiarism-checker`** — that's fine, intentional, and gets resolved in FS-09.
- Any payment, billing, auth, or restricted route.

---

## PlagiaAI redesign at `/plagia-ai` (FS-08)

### Files to create

- `components/plagia-ai/EmptyState.tsx` — the H1 + sub + chip bar block. Pure presentational.
- `components/plagia-ai/SuggestionChipBar.tsx` — the 6-chip row. Takes an `onChipClick(prefill: string)` callback and an optional `disabled` prop (when not signed in, chips are still clickable but submitting the prefilled prompt triggers `ToolSignInPrompt`).

### Edits to `app/plagia-ai/page.tsx`

- Replace the existing empty state (currently 4 suggested-prompt chips per FS-01) with the new `<EmptyState />` + `<SuggestionChipBar onChipClick={handlePrefill} />`.
- Add a `handlePrefill(prefill: string)` that calls `setInputValue(prefill)` and refocuses the textarea (use the existing textarea ref).
- The existing "New conversation"/sidebar/auth/scrollbar logic stays untouched.
- The marketing scroll section (OneChatAllTools, How-it-works, TrustSection, FAQ) is **NOT added in FS-08** — that's an FS-09 deliverable for the homepage swap. `/plagia-ai` stays as a focused chat app for now.

### Mobile

- Chip row wraps onto 2 rows; no horizontal scroll.
- Sidebar collapses behind a hamburger trigger (already exists from FS-05).
- Textarea on mobile: full-width minus container padding, `min-h-24`.
- The H1 + sub collapse to a smaller size on mobile: `text-2xl` instead of `text-3xl md:text-4xl`.

### Accessibility

- Chip row has `role="group"` + `aria-label="Suggested prompts"`.
- H1 is the page's only `<h1>` (Nav doesn't render one, so this is fine).
- "See all tools" chip uses `<Link>` semantics, not button (clearly a navigation, not an action).

---

## Homepage swap (FS-09)

### `app/page.tsx` rewrite

After FS-07 and FS-08 ship, this PR rewrites `app/page.tsx` to render the PlagiaAI chat (in empty state) + the marketing scroll-down.

Two implementation options:

**Option A (recommended): rename + thin re-export**
- Rename the current `/plagia-ai/page.tsx` to a shared component `components/plagia-ai/PlagiaAiApp.tsx`.
- `app/page.tsx` imports `<PlagiaAiApp />` and renders it, then appends the marketing scroll section.
- `app/plagia-ai/page.tsx` becomes a thin shell that also imports `<PlagiaAiApp />` (no marketing).
- Pro: one source of truth for the chat. Both routes always in sync.
- Con: refactor cost for FS-09 is higher.

**Option B: redirect `/plagia-ai` → `/`**
- `app/plagia-ai/page.tsx` becomes a server component that calls `redirect('/')`.
- `app/page.tsx` is the full PlagiaAI implementation + marketing.
- Pro: simpler — one implementation.
- Con: loses the `/plagia-ai` URL as a canonical chat surface. External links still work (they redirect), but feels less clean.

**Decision: pick Option A.** Maintainability wins. The marketing section is the only difference between the two routes; everything else is shared.

### Metadata

`app/page.tsx` already has metadata (presumably). Update to:
```
title: "Plagiacheck — AI plagiarism checker, paraphraser, summarizer, and 12 more tools"
description: "One chat. 15 AI writing tools. Plagiarism detection, paraphrasing, summarization, AI detection, and more."
```

**Why keep "plagiarism checker" in the title:** existing organic traffic ranks for this phrase. Losing it would hurt SEO. The H1 in the rendered hero says "What can I help with today?" but search engines also weight `<title>`, `<meta>` description, and visible body content — the "One chat. Every tool." section explicitly lists "Plagiarism Checker" as one of the 15.

### Nav update (FS-09)

In `components/nav.tsx`:
- The "PlagiaAI" featured entry now links to `/` instead of `/plagia-ai`.
- Keep the "Plagiarism Checker" entry under Writing tools (added in FS-07) pointing at `/plagiarism-checker`.
- Optional: rename "PlagiaAI" nav entry to "Chat" or "PlagiaAI Home" to clarify it's the home — defer if there's no strong reason.

### `/all-tools` update (FS-09)

The featured PlagiaAI hero card on `/all-tools` should now link to `/` (not `/plagia-ai`). Update the `href`.

---

## Cross-cutting checklist (all three PRs)

### Restricted areas (untouched in any PR)
- `app/api/paymentstuff/**`
- `app/api/Redirect/**`
- `app/api/webhook/**`
- `app/api/discounts/**`
- Stripe `priceId` strings in `app/pricing/page.tsx`

### Files that probably need touching in at least one PR
- `app/page.tsx` (FS-09 only)
- `app/plagia-ai/page.tsx` (FS-08 main edit, FS-09 may turn into shell)
- `app/plagiarism-checker/page.tsx` + `content.tsx` (NEW, FS-07)
- `components/nav.tsx` (FS-07 adds plagiarism entry; FS-09 retargets PlagiaAI entry)
- `app/all-tools/page.tsx` (FS-07 adds plagiarism card; FS-09 retargets PlagiaAI hero)
- `app/history/page.tsx` (FS-07: plagiarism row → `/plagiarism-checker`)
- `app/sitemap.ts` (FS-07: add `/plagiarism-checker`)
- `components/plagia-ai/EmptyState.tsx` (NEW, FS-08)
- `components/plagia-ai/SuggestionChipBar.tsx` (NEW, FS-08)
- `components/plagia-ai/OneChatAllTools.tsx` (NEW, FS-09)
- `components/plagia-ai/PlagiaAiApp.tsx` (NEW if Option A chosen, FS-09)
- `components/TrustSection.tsx` (NEW if extraction needed, FS-09)

### Verification per PR
- `npx tsc --noEmit` clean.
- `npm run lint` clean (pre-existing warnings on `app/billing/page.tsx` and `app/image-to-text/page.tsx` are out of scope).
- Dev server on `PORT=3100+` (per the zombie-port lesson; increment by 10 per iteration).
- Smoke test the affected route returns 200 unauthenticated; for tool routes, smoke test the page renders the new UI.
- FS-09 specifically: confirm `/` renders the empty-state hero (not the old plagiarism UI), `/plagiarism-checker` renders the tool, `/plagia-ai` still works (either as redirect or shell).

### What loop iterations should NOT do
- Don't add tests (project doesn't have a test framework wired into this flow).
- Don't refactor neighboring tool pages.
- Don't change pricing/Stripe strings.
- Don't add new dependencies.
- Don't write comments in committed code unless something is genuinely non-obvious.

---

## Open decisions deferred to the loop

These are deliberately not pinned in this spec — leave them to the implementing iteration's judgment, document the choice in the PR + `learnings.md`:

1. **Where the auth check happens** on the new home. The current home doesn't gate the plagiarism input behind auth — guests can use it with trial tokens. The new home should match that pattern: guests can chat with PlagiaAI; tools that the AI dispatches still require sign-in for non-guest tokens.
2. **Whether to add a "skip to chat" anchor** for keyboard users when marketing sections are visible. Mark as a future FE item if punted.
3. **Whether `/plagia-ai` and `/` should differ on metadata** in Option A (probably yes — `/` is the marketing-aware variant, `/plagia-ai` is the bare chat).

---

## Out of scope (do not attempt in FS-07/08/09)

- Plagiarism-checker tool itself — its UI, prompt, model, scoring: untouched.
- Other tool pages (paraphraser, etc.) — untouched.
- Sidebar redesign — FS-05's sidebar is fine. Improvements go to FE-XX items.
- Token system, billing, auth flows — untouched.
- TrustSection stat verification (P1-35) — defer.
- FAQ content changes — defer.

---

## After FS-09 ships

The loop is then encouraged to generate new FE items addressing PlagiaAI follow-ups that surfaced during this redesign — e.g., suggested-prompt analytics, chip A/B testing, marketing-section copy iteration, etc. Per the run-scope rule in `RULES.md`, the loop stays on FS-* / FE-* items only.
