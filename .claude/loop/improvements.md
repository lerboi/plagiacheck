# Plagiacheck Improvement Backlog

Curated by the seed audit on 2026-05-11. Each item is independent and PR-sized.

**Status legend:** `todo` | `in-progress` | `done` | `blocked: <reason>`
**Priority:** `FLAGSHIP` = explicitly-requested feature track, work in order ▸ `P0` = broken functionality ▸ `P1` = clearly missing UX/copy ▸ `P2` = polish

The loop works top-down. Within FLAGSHIP items, follow the numeric order (FS-01 → FS-02 → …) since later items depend on earlier ones. Edit/reorder/delete freely before launching.

---

## FLAGSHIP — PlagiaAI (tool-orchestrating chatbot)

A new top-level tool at `/plagia-ai`. The user chats with an AI assistant; the assistant decides which of the existing 15 tools to invoke and returns results inline. Implemented with Mistral function calling. All token costs flow through existing tool routes — orchestration is free.

**Architecture summary (read before any FS item):**
- One new SSE route `app/api/plagia-ai/route.ts` runs a multi-step Mistral function-calling loop.
- Each existing Plagiacheck tool gets a Mistral tool definition (name, description, JSON schema for args).
- When Mistral emits a tool call, the route dispatches to the corresponding existing API handler by **calling it internally over HTTP with the user's bearer token forwarded** (cleanest separation; no need to refactor existing routes).
- The route streams `delta` (assistant text), `tool_call` (tool started), `tool_result` (tool finished), and `error` events to the client.
- Client at `app/plagia-ai/page.tsx` renders the chat thread: user bubbles (right), assistant text (left, no bubble), and full-width expandable tool cards for each invocation.
- Token deduction stays in the underlying tool routes — PlagiaAI itself does not deduct.

### FS-01 — PlagiaAI route skeleton + basic chat (no tool calling yet)
- **scope:** new-feature
- **status:** done (2026-05-11)
- **branch:** auto/fs-01-plagia-ai-skeleton
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-01-plagia-ai-skeleton (open this URL to file the PR — `gh` CLI not installed locally)
- **files:** `app/plagia-ai/page.tsx` (new), `app/api/plagia-ai/route.ts` (new), `lib/plagia-ai/types.ts` (new)
- **acceptance:**
  - Page at `/plagia-ai` follows tool-page skeleton (`Nav → ToolPageHeader → main → FAQ`).
  - Header subtitle: "Chat with PlagiaAI — your AI writing assistant".
  - Centered `max-w-3xl` chat column. Sticky bottom input (auto-resize textarea, Send button, hint "Ctrl+Enter to send").
  - Empty state: a single assistant greeting bubble + 4 suggested-prompt chips ("Summarize this article…", "Paraphrase this paragraph in a formal tone…", "Generate a bar chart of…", "Check the grammar of this text…"). Clicking a chip fills the textarea.
  - User messages render as right-aligned bubbles in `bg-primary/10`. Assistant messages render as plain text on the left, no bubble.
  - `POST /api/plagia-ai` accepts `{ messages: [{role, content}] }`, validates auth via `getUserFromRequest`, calls `mistral-large-latest` with the conversation history, and streams a single text response as SSE `delta` events ending with a `done` event. **No tool calls yet — that's FS-02.**
  - System prompt establishes the assistant's role: "You are PlagiaAI, a writing assistant. In the next iteration you'll gain access to the Plagiacheck tool suite. For now, you can chat about writing." (interim prompt, replaced in FS-02).
  - Client renders streamed deltas live with a blinking cursor at the end while streaming.
  - Lint + build pass.
- **out of scope:** Tool calling, conversation persistence, history sidebar.

### FS-02 — PlagiaAI tool registry + Mistral function calling
- **scope:** new-feature
- **status:** done (2026-05-11)
- **branch:** auto/fs-02-plagia-ai-tools
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-02-plagia-ai-tools (open this URL; **when filing, set the PR base to `auto/fs-01-plagia-ai-skeleton`** so GitHub shows only the FS-02 delta — this branch was created off `main`, so against `main` the diff includes FS-01 content)
- **files:** `lib/plagia-ai/tools.ts` (new), `lib/plagia-ai/dispatcher.ts` (new), `app/api/plagia-ai/route.ts` (extend), `lib/plagia-ai/types.ts` (extend), `app/plagia-ai/page.tsx` (extend)
- **acceptance:**
  - `lib/plagia-ai/tools.ts` exports a `MISTRAL_TOOLS` array — one entry per applicable existing tool, in Mistral function-calling schema (`{ type: "function", function: { name, description, parameters: JSONSchema } }`). Cover: paraphrase, summarize, humanize, ai-detect, grammar, plagiarism-check, generate-infographic, generate-chart, generate-thumbnail, image-to-text (skipped if no image input mechanism in v1 — see note), speech-to-text (skip in v1), text-to-speech (skip in v1), voice-to-essay (skip in v1), audio-summarize (skip in v1), word-counter (client-only — skip).
  - For v1, registered tools = the 6 text tools (paraphrase, summarize, humanize, ai-detect, grammar, plagiarism-check) + the 3 image-generation tools (infographic, chart, thumbnail). 9 total. Voice/image-input tools are deferred to FS-05+.
  - `lib/plagia-ai/dispatcher.ts` exports `dispatchTool(name, args, bearerToken): Promise<{ ok: true; result: any } | { ok: false; error: string }>`. Implementation: switch on `name`, build the appropriate fetch to `http://localhost:3000/api/...` (use `process.env.NEXT_PUBLIC_SITE_URL` or request origin in prod) with `Authorization: Bearer <token>` header, return the JSON result. For SSE-streaming routes (check-plagiarism), accumulate the final result internally and return it as a single object.
  - `app/api/plagia-ai/route.ts` updated to run a multi-step loop: (1) call Mistral with conversation + tool definitions; (2) if response contains tool calls, emit `tool_call` SSE event(s), dispatch each tool, emit `tool_result` SSE event(s) with the dispatcher result, append the tool result as a `tool` message to the conversation, and call Mistral again; (3) if response contains text, stream it as `delta` events. Hard cap: max 5 tool-call rounds per user turn.
  - System prompt rewritten: explains available tools, instructs the model to call tools when the user's request maps to one, and to summarize the result conversationally after a tool runs.
  - Token deduction is NOT done in the orchestrator — the underlying tool routes already deduct. After a tool runs, the response includes `remainingTokens`; emit it as part of the `tool_result` event so the client can update the Zustand store.
  - Client handles new event types: shows a placeholder tool card on `tool_call`, replaces it with the real result on `tool_result`. Tool card minimum has: tool name, args summary (e.g. "Mode: formal"), status badge (running/done/failed), expand-to-view-result toggle.
  - Lint + build pass. Smoke test: from the chat, type "Paraphrase this in a formal tone: The cat sat on the mat." Expect a tool card for Paraphraser, then an assistant message containing the paraphrased text.
- **gotchas to document in PR:**
  - The dispatcher hits routes by HTTP rather than direct function calls — this means dev server must be running for the chat to work locally. This is intentional for v1 (avoids a large refactor of every tool route into reusable lib functions). FS-06 can revisit if perf becomes an issue.
  - Mistral tool-call schemas must use proper JSON Schema; bad schemas cause silent dropped calls.

### FS-03 — PlagiaAI conversation polish (animations, scroll, errors)
- **scope:** ui
- **status:** done (2026-05-11)
- **branch:** auto/fs-03-plagia-ai-polish (branched off auto/fs-02-plagia-ai-tools)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-03-plagia-ai-polish (set PR base to `auto/fs-02-plagia-ai-tools` for clean diff)
- **note:** "Clear conversation" uses an inline Confirm/Cancel toggle instead of shadcn `AlertDialog` because the project doesn't have `@radix-ui/react-alert-dialog` installed and the loop must not add npm deps. Functionally equivalent (still confirms before destroying state).
- **files:** `app/plagia-ai/page.tsx`, possibly new `components/plagia-ai/*` files
- **acceptance:**
  - Framer Motion entrance animation on every new message (fade + slight Y translate, ~150ms).
  - Tool cards animate state transitions (running → done) with a subtle color/icon shift.
  - Auto-scroll to bottom on new content, but pause auto-scroll if user has scrolled up (resume on send).
  - Visible streaming indicator (blinking cursor `▍` at end of in-flight assistant message).
  - Error state for any failed tool call: red-tinted card with the error message + "Retry" button that re-sends just that tool call (or, if simpler for v1, a "Try again" button on the whole conversation that re-sends the last user message).
  - Network error / SSE drop: toast + recoverable state (input remains, user can resend).
  - "Clear conversation" button in the header (with shadcn `AlertDialog` confirm).
  - Empty state suggested prompts hidden once the conversation has at least one user message.
  - Mobile: textarea + send button collapse to single full-width bar; tool cards remain readable.
- **out of scope:** Persistence across page reloads.

### FS-04 — Add PlagiaAI to nav mega-menu + all-tools page
- **scope:** ui
- **status:** done (2026-05-11)
- **branch:** auto/fs-04-plagia-ai-nav (branched off auto/fs-03-plagia-ai-polish)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-04-plagia-ai-nav (set PR base to `auto/fs-03-plagia-ai-polish`)
- **note:** /all-tools page doesn't exist yet (P0-05 / P1-28 will create it). FS-04 shipped only the nav portion; the hero card on /all-tools is deferred to the iteration that lands P0-05 or P1-28 — add it there.
- **files:** `components/nav.tsx`, `app/all-tools/page.tsx` (if created in P0-05 / P1-28)
- **acceptance:**
  - PlagiaAI appears in the nav mega-menu, in a new top-of-menu position or in the Writing category (label and icon distinct from existing tools — e.g. a sparkle/chat icon).
  - One-line description in the menu: "Chat with an AI that uses all your tools".
  - If `/all-tools` page exists, PlagiaAI is featured in a hero card at the top of the page.
  - Active-route highlight works on `/plagia-ai`.

### FS-05 — PlagiaAI conversation persistence (Supabase)
- **scope:** new-feature
- **status:** done (2026-05-11)
- **branch:** auto/fs-05-plagia-ai-storage (branched off auto/fs-04-plagia-ai-nav)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-05-plagia-ai-storage (set PR base to `auto/fs-04-plagia-ai-nav`)
- **REQUIRED MIGRATION:** SQL is in the commit message body. User must run the `create table plagia_ai_conversations` + RLS policies in Supabase BEFORE merging or deploying, otherwise the chat will fail to save.
- **files:** new Supabase table `plagia_ai_conversations` (document SQL in PR description — do not run migrations; user runs them manually), `lib/plagia-ai/storage.ts` (new), `app/api/plagia-ai/route.ts` (extend), `app/plagia-ai/page.tsx` (extend)
- **acceptance:**
  - Supabase table schema: `id uuid pk`, `user_id uuid fk → auth.users`, `title text`, `messages jsonb`, `created_at timestamptz`, `updated_at timestamptz`. RLS: user can only read/write own rows.
  - Auto-save: after every completed assistant turn, save the full conversation. Title generated from the first user message (truncated to ~50 chars).
  - Sidebar (desktop only, collapsible) listing the user's recent conversations, newest first. Click loads it into the chat panel.
  - "New chat" button creates a fresh conversation.
  - Delete conversation: trash icon on hover in sidebar, with confirm.
  - Loading skeleton in sidebar while fetching.
  - **Do not** modify any existing table or RPC. This is a pure additive change.
  - PR description must include the exact SQL to run.

### FS-06 — PlagiaAI tool coverage expansion (voice + image input)
- **scope:** new-feature
- **status:** done (2026-05-11)
- **branch:** auto/fs-06-plagia-ai-multimodal (branched off auto/fs-05-plagia-ai-storage)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fs-06-plagia-ai-multimodal (set PR base to `auto/fs-05-plagia-ai-storage`)
- **note:** **ALL 6 FLAGSHIP ITEMS NOW COMPLETE.** From here, the loop alternates: every 3rd iteration picks an FE item from the PLAGIA-AI EVOLUTION section; the other 2 iterations work top-down through P0/P1/P2. See RULES.md step 2.
- **files:** `lib/plagia-ai/tools.ts`, `lib/plagia-ai/dispatcher.ts`, `app/plagia-ai/page.tsx`
- **acceptance:**
  - Add image-to-text to the tool registry. Add a paperclip/image-upload affordance in the chat input that lets the user attach an image; the message includes the image as base64. When the model decides to call image-to-text, the dispatcher uses the attached image.
  - Add voice tools (speech-to-text, voice-to-essay, audio-summarize) by giving the input a microphone button that streams the user's voice to the chat as text via Web Speech API. Document browser support inline.
  - text-to-speech and word-counter remain client-only and are NOT in the registry — but the assistant is taught (via system prompt) to mention them when relevant.
  - Lint + build pass. Smoke test each new tool path.
- **note:** If FS-05 has not landed, FS-06 can still proceed — they don't depend on each other.

---

## PLAGIA-AI EVOLUTION — ongoing, post-flagship

After FS-01 through FS-06 ship, PlagiaAI is **never considered done**. The loop continues to improve it on a recurring cadence (see RULES.md ordering — every 3rd iteration past flagship picks an FE item).

### PlagiaAI core value offering — DO NOT DRIFT

PlagiaAI exists for one reason: **let the user accomplish Plagiacheck tool work by chatting in plain language**. Every evolution must serve at least one of these four pillars:

1. **Intent accuracy** — the AI picks the right tool with the right arguments more often.
2. **Conversational quality** — the AI's text around tool calls is helpful, concise, and natural; it asks clarifying questions when it should.
3. **Speed and reliability** — fewer failed tool calls, faster turn-around, better error recovery, fewer dropped streams.
4. **Frictionless interaction** — input/output ergonomics, mobile parity, keyboard shortcuts, accessibility, multi-modal input.

**Out of scope for PlagiaAI evolution** (these are scope creep — reject them):
- General LLM features unrelated to Plagiacheck tools (no "research assistant", "code assistant", "image generator that bypasses our SVG templates").
- Multi-user collaboration, sharing, comments, real-time presence.
- Replacing existing tool pages (the standalone tool pages remain — PlagiaAI is additive, not a replacement).
- Switching AI providers (Mistral only — same rule as everywhere else).
- Anything that requires modifying restricted payment paths.

### Rules for the loop when picking / generating FE items

- The loop picks the highest-priority `todo` FE item available.
- After shipping any FE item OR any FS item, the loop is **encouraged to append 1-2 new FE ideas** to this section if the work surfaced obvious follow-ups (e.g. "while implementing FE-03 I noticed the assistant doesn't handle empty tool results — adding FE-08 for that"). New items must serve one of the four pillars above and pass the out-of-scope filter.
- New FE items get the next free `FE-NN` number and priority `P1` or `P2` (never `P0` — P0 is for genuine bugs in shipped behavior, not aspirational improvements).
- Hard cap: at most **3 new FE items per shipped iteration** to avoid backlog explosion.

### Seed list of FE items

### FE-01 — System prompt v2: better tool selection heuristics
- **scope:** ai-prompt
- **pillar:** intent-accuracy
- **status:** done (2026-05-11)
- **branch:** auto/fe-01-prompt-v2 (branched off auto/p0-04-svg-darkmode)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fe-01-prompt-v2 (set base to `auto/p0-04-svg-darkmode`)
- **files:** `app/api/plagia-ai/route.ts` (system prompt), `lib/plagia-ai/tools.ts` (tool descriptions)
- **acceptance:** Rewrite the system prompt and each tool description to include concrete one-line examples of when to call each tool ("Use `paraphrase` when the user wants the same idea in different words. Use `humanize` when the user wants AI-written text to sound more human"). Add an explicit "if you are unsure which tool to use, ask the user a clarifying question instead of guessing" instruction. Verify by running 10 ambiguous prompts manually and logging which tool was picked.

### FE-02 — Clarifying-question pattern when intent is ambiguous
- **scope:** ai-prompt
- **pillar:** intent-accuracy
- **status:** done (2026-05-11)
- **branch:** auto/fe-02-clarify-prompt (branched off auto/p1-13-history-count)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/fe-02-clarify-prompt (set base to `auto/p1-13-history-count`)
- **files:** `app/api/plagia-ai/route.ts`
- **acceptance:** When the user input is too short or ambiguous to dispatch (e.g. "fix this" with no text), the assistant asks a one-line clarifying question instead of calling a tool. Detection lives entirely in the system prompt — no special-case code. Smoke test: type "help" → assistant asks "What would you like help with? You can paste text to paraphrase, summarize, check, etc."

### FE-03 — Show tool reasoning inline (transparency)
- **scope:** ui
- **pillar:** conversational-quality
- **status:** todo
- **files:** `app/plagia-ai/page.tsx`, `app/api/plagia-ai/route.ts`
- **acceptance:** When the assistant decides to call a tool, the tool card includes a one-sentence "Why this tool" caption derived from the assistant's reasoning. Implement by prompting Mistral to emit a brief reason alongside the tool call (in the assistant's text immediately before the tool call). Render it as small muted text inside the tool card.

### FE-04 — Token-cost preview before expensive tool calls
- **scope:** ux
- **pillar:** frictionless-interaction
- **status:** todo
- **files:** `app/plagia-ai/page.tsx`, `lib/plagia-ai/tools.ts`
- **acceptance:** For any tool call whose estimated cost exceeds a threshold (e.g. >50 text tokens or any image-token tool), the tool card first shows "About to use ~X tokens" with a "Confirm" / "Cancel" button before dispatching. Threshold and confirmation logic configurable in `lib/plagia-ai/config.ts`. User can toggle this off in a settings menu (`localStorage` flag).

### FE-05 — Retry-with-feedback on failed tool calls
- **scope:** tool-fn
- **pillar:** speed-and-reliability
- **status:** todo
- **files:** `app/api/plagia-ai/route.ts`, `lib/plagia-ai/dispatcher.ts`
- **acceptance:** When a tool returns an error (4xx/5xx, validation failure, etc.), the orchestrator feeds the error back to Mistral as a `tool` message with the failure reason and asks the model to either (a) retry with different args, (b) try a different tool, or (c) tell the user. Hard cap: 2 retries per tool call (to avoid infinite loops). Verify by deliberately corrupting an arg (e.g. negative length) and observing the model recover.

### FE-06 — Streaming tool results when available
- **scope:** tool-fn
- **pillar:** speed-and-reliability
- **status:** todo
- **files:** `lib/plagia-ai/dispatcher.ts`, `app/api/plagia-ai/route.ts`, `app/plagia-ai/page.tsx`
- **acceptance:** For tools whose underlying route streams (currently only `/api/check-plagiarism`), the dispatcher streams intermediate progress events back to the client as `tool_progress` SSE events. The tool card shows a progress indicator instead of just "running…". Once the underlying stream completes, the dispatcher feeds the final aggregated result back to Mistral for the conversational wrap-up.

### FE-07 — Mobile polish pass on /plagia-ai
- **scope:** ui
- **pillar:** frictionless-interaction
- **status:** todo
- **files:** `app/plagia-ai/page.tsx`
- **acceptance:** Test at 360px, 414px, 768px. Sticky input doesn't get covered by mobile keyboard (use `visualViewport` API). Tool cards remain readable. Sidebar (if FS-05 shipped) collapses to a hamburger. No horizontal scroll. Tap targets >= 44px.

### FE-08 — Accessibility audit + ARIA roles for chat
- **scope:** a11y
- **pillar:** frictionless-interaction
- **status:** todo
- **files:** `app/plagia-ai/page.tsx`
- **acceptance:** Chat thread has `role="log" aria-live="polite"`. Each message has an appropriate label ("You said:", "Assistant said:"). Tool cards announce status changes. Keyboard-only flow: Tab through messages, Enter to expand tool cards, focus stays on input by default. Verify with a screenreader pass (axe or similar in browser devtools).

### FE-09 — Persistent personalization (user preferences)
- **scope:** new-feature
- **pillar:** intent-accuracy
- **status:** todo
- **files:** new column `plagia_ai_preferences` on `user_profiles` table (document SQL in PR), `app/plagia-ai/page.tsx`, `app/api/plagia-ai/route.ts`
- **acceptance:** Small settings panel in the chat (gear icon in header) lets the user save persistent preferences passed to the system prompt: default paraphrase mode, preferred tone for humanizer, summary length default, "always confirm before image-token spend", etc. Stored in Supabase per user. Pre-prompt the model with these on every turn. Don't bloat the system prompt — only include preferences the user has explicitly set.

### FE-10 — Suggested follow-up actions after each tool result
- **scope:** ux
- **pillar:** conversational-quality
- **status:** todo
- **files:** `app/plagia-ai/page.tsx`, `app/api/plagia-ai/route.ts`
- **acceptance:** After the assistant finishes its conversational wrap-up of a tool result, show 2-3 chip-style follow-up suggestions ("Paraphrase the result formally", "Check it for grammar", "Summarize it shorter"). Each chip, on click, becomes the next user message. The model generates these as a `suggestions` SSE event before `done`.

---

## P0 — broken or wrong

### P0-01 — [REMOVED] Branding is intentional
- **scope:** n/a
- **status:** done
- **note:** "MakeItAI" is the legal/operating company name and is CORRECT in footer, privacy, and terms. "Plagiacheck" is the product/site name shown in nav only. The email `plagiacheck@gmail.com` is also correct. **Do not change either.** Any future audit item proposing to change "MakeItAI" → "Plagiacheck" in copy should be rejected.

### P0-02 — Refund tokens on Mistral failure in `/api/check-plagiarism` stream
- **scope:** tool-fn
- **status:** todo
- **files:** `app/api/check-plagiarism/route.ts`
- **why:** Tokens deducted before stream starts; if Mistral errors mid-stream, tokens are not refunded. User loses tokens for a failed run.
- **acceptance:** Wrap the streaming body in try/catch; on any error after deduction, call the refund RPC for the deducted amount and emit a final SSE error event. Verify by code-reading the deduct/refund pattern in any of the `app/api/ai-tools/route.ts` handlers and mirroring it.

### P0-03 — Audit and unify refund-on-failure across all token-gated API routes
- **scope:** tool-fn
- **status:** todo
- **files:** `app/api/ai-tools/route.ts`, `app/api/check-plagiarism/route.ts`, `app/api/generate-image/route.ts`, `app/api/image-to-text/route.ts`, `app/api/speech-to-text/route.ts`, `app/api/voice-tools/route.ts`
- **why:** Per audit, refund handling is inconsistent across routes. Any route that deducts then throws between deduction and response must refund.
- **acceptance:** Each route has explicit refund call on every error path after deduction. Add a comment-free helper in `lib/server-tokens.ts` if it doesn't already exist. Lint + build pass.

### P0-04 — Verify `lib/svg-templates.ts` chart output is dark-mode safe
- **scope:** tool-fn
- **status:** done (2026-05-11)
- **branch:** auto/p0-04-svg-darkmode (branched off auto/p0-05-all-tools-page)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p0-04-svg-darkmode (set base to `auto/p0-05-all-tools-page`)
- **note:** Investigation found SVG templates are already self-contained (each `wrap()` adds a white background rect). The actual UX issue was the on-page container's `dark:bg-gray-950` clashing with the SVG's white background. Fixed by switching the container to always-white when an SVG is rendered (matches the downloaded file's appearance). Thumbnail-generator unaffected — its SVG covers the whole area with a gradient.
- **files:** `lib/svg-templates.ts`, `app/chart-generator/page.tsx`, `app/infographic-generator/page.tsx`, `app/thumbnail-generator/page.tsx`
- **why:** Site default theme is dark. If SVGs render with light text on transparent background inside a dark card, they're unreadable.
- **acceptance:** Each generated SVG either uses a self-contained background fill (so it's readable on any container) or the page wraps the SVG in a light background container. Spot-check by inserting a test JSON spec and rendering. Document choice in PR.

### P0-05 — `/history` "View All Tools" link goes to wrong place
- **scope:** fn
- **status:** done (2026-05-11) — bundled with P1-28 + closed deferred FS-04 hero
- **branch:** auto/p0-05-all-tools-page (branched off auto/fs-06-plagia-ai-multimodal)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p0-05-all-tools-page (set base to `auto/fs-06-plagia-ai-multimodal`)
- **files:** `components/nav.tsx`
- **why:** Per audit, the mega-menu's "View All Tools" links to `/history`, not a tools index. There is no `/all-tools` page in the repo.
- **acceptance:** Either (a) remove the link, OR (b) create a minimal `/all-tools/page.tsx` that lists all 15 tools by category and link to it. Pick (b) if the page would be useful; pick (a) if it's redundant with the mega-menu itself.

---

## P1 — clearly missing UX, copy, or feature

### P1-01 — Add `Ctrl+Enter` submit shortcut to all writing tool pages
- **scope:** ux
- **status:** todo
- **files:** `app/ai-detector/page.tsx`, `app/ai-humanizer/page.tsx`, `app/paraphraser/page.tsx`, `app/summarizer/page.tsx`, `app/grammar-checker/page.tsx`, `app/page.tsx`
- **acceptance:** Pressing Ctrl/Cmd+Enter in the textarea triggers the same handler as the submit button (when not disabled). Add a subtle hint near the button: "Ctrl+Enter to submit".

### P1-02 — Loading skeletons for tool result panes
- **scope:** ux
- **status:** todo
- **files:** all 15 `app/<tool>/page.tsx`
- **acceptance:** While a request is in flight, show a skeleton in the result area instead of just disabling the button. Use shadcn `Skeleton` component. One PR can cover all tools, OR split by category if it gets large.

### P1-03 — Error states with retry on tool failures
- **scope:** ux
- **status:** todo
- **files:** all 15 `app/<tool>/page.tsx`
- **acceptance:** When an API call fails, show an error card with the message and a "Try again" button that re-submits with the existing input. Replace any `alert()` or toast-only error handling.

### P1-04 — Copy-to-clipboard buttons on every text-output tool
- **scope:** new-feature
- **status:** todo
- **files:** ai-detector, ai-humanizer, paraphraser, summarizer, grammar-checker, speech-to-text, voice-to-essay, audio-summarizer, image-to-text page files
- **acceptance:** Each result has a copy button (icon + "Copy" label) with success state ("Copied!" for 2s). Use a shared `<CopyButton text={...} />` component placed in `components/ui/`.

### P1-05 — Download buttons for SVG outputs
- **scope:** new-feature
- **status:** todo
- **files:** `app/chart-generator/page.tsx`, `app/infographic-generator/page.tsx`, `app/thumbnail-generator/page.tsx`
- **acceptance:** "Download SVG" and "Download PNG" buttons (PNG via canvas rasterization in-browser). Filenames derived from the user input.

### P1-06 — Rewrite Privacy Policy for clarity + Stripe-readiness
- **scope:** copy
- **status:** todo
- **files:** `app/privacy/page.tsx`
- **acceptance:** Rewrite for clarity, plain language, complete coverage: what we collect, how we use it, third parties (Stripe, Supabase, Mistral), cookies, retention, user rights, contact, governing law. **Company/operator name MUST remain "MakeItAI"** (do not change to Plagiacheck). **Email MUST remain `plagiacheck@gmail.com`** (do not change). Product name is "Plagiacheck" — referring to the service/site as Plagiacheck is fine. Keep dark-mode styling consistent with rest of site.

### P1-07 — Rewrite Terms of Service for clarity + Stripe-readiness
- **scope:** copy
- **status:** todo
- **files:** `app/terms/page.tsx`
- **acceptance:** Rewrite covering: service description, accounts, acceptable use, payment + refund terms, token system explanation, IP, liability disclaimer, termination, governing law. **Company/operator name MUST remain "MakeItAI"** (do not change). **Email MUST remain `plagiacheck@gmail.com`** (do not change). The product is referred to as "Plagiacheck".

### P1-08 — Mobile responsive padding fix on Privacy + Terms
- **scope:** ui
- **status:** todo
- **files:** `app/privacy/page.tsx`, `app/terms/page.tsx`
- **acceptance:** Add `px-4 md:px-6` and `mx-auto` to main containers so content doesn't hit screen edges on mobile.

### P1-09 — Fix "Whats included:" typo on pricing
- **scope:** copy
- **status:** todo
- **files:** `app/pricing/page.tsx` (line ~210)
- **acceptance:** Change "Whats included:" to "What's included:". Do NOT change any prices or priceIds.

### P1-10 — Forgot password: client-side email validation
- **scope:** ux
- **status:** todo
- **files:** `app/forgot-password/page.tsx`
- **acceptance:** Validate email format before submit; show inline error.

### P1-11 — Reset password: loading state during session check
- **scope:** ux
- **status:** done (2026-05-11)
- **branch:** auto/p1-11-reset-loading (branched off auto/p1-19-guest-token-cta)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p1-11-reset-loading (set base to `auto/p1-19-guest-token-cta`)
- **files:** `app/reset-password/page.tsx`
- **acceptance:** Show a centered spinner while verifying the recovery session. No more blank page.

### P1-12 — Signin: header copy switches between tabs
- **scope:** ux
- **status:** todo
- **files:** `app/signin/page.tsx`
- **acceptance:** Sign-in tab: "Welcome back". Register tab: "Create your account". CTA button label also changes appropriately.

### P1-13 — History page: show total result count + total pages
- **scope:** ux
- **status:** done (2026-05-11)
- **branch:** auto/p1-13-history-count (branched off auto/p1-21-error-pages)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p1-13-history-count (set base to `auto/p1-21-error-pages`)
- **files:** `app/history/page.tsx`
- **acceptance:** Display "Showing 1-10 of 47" or similar near pagination. Show total page count next to Previous/Next.

### P1-14 — History page: persist search/filter state across pagination
- **scope:** fn
- **status:** todo
- **files:** `app/history/page.tsx`
- **acceptance:** Search term and tool filter persist in URL query params and survive page navigation.

### P1-15 — Speech-to-text: graceful fallback when browser doesn't support Web Speech API
- **scope:** ux
- **status:** todo
- **files:** `app/speech-to-text/page.tsx`, `app/voice-to-essay/page.tsx`, `app/audio-summarizer/page.tsx`
- **acceptance:** Detect lack of `webkitSpeechRecognition` and render a clear "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari." card instead of a non-functional UI.

### P1-16 — Speech-to-text: language selector
- **scope:** new-feature
- **status:** todo
- **files:** `app/speech-to-text/page.tsx`, `app/voice-to-essay/page.tsx`, `app/audio-summarizer/page.tsx`
- **acceptance:** Dropdown for at least 10 common languages (en-US, en-GB, es-ES, fr-FR, de-DE, it-IT, pt-BR, ja-JP, ko-KR, zh-CN). Persists in localStorage.

### P1-17 — Grammar checker: "Apply all fixes" button
- **scope:** new-feature
- **status:** todo
- **files:** `app/grammar-checker/page.tsx`
- **acceptance:** Single button that applies every suggested fix in order. Tracks applied state for undo.

### P1-18 — Grammar checker: severity icons (not color-alone)
- **scope:** ui
- **status:** todo
- **files:** `app/grammar-checker/page.tsx`
- **acceptance:** Each issue type also has a distinct icon (lucide-react): error = `AlertCircle`, warning = `AlertTriangle`, suggestion = `Lightbulb`. Color remains as secondary signal.

### P1-19 — Token badge in nav: clearer CTA for guests
- **scope:** ux
- **status:** done (2026-05-11)
- **branch:** auto/p1-19-guest-token-cta (branched off auto/fe-02-clarify-prompt)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p1-19-guest-token-cta (set base to `auto/fe-02-clarify-prompt`)
- **files:** `components/nav.tsx`
- **acceptance:** When `user === null`, the token badge area shows "Sign up — get 1000 free tokens" as a button-styled link to `/signin?tab=register` instead of just the count.

### P1-20 — `ToolSignInPrompt` preserves return URL
- **scope:** ux
- **status:** todo
- **files:** `components/ToolSignInPrompt.tsx` (or wherever the component lives — find via grep)
- **acceptance:** Sign-in link includes `?next=<current-pathname>`. `/signin` page reads `next` and redirects there post-auth.

### P1-21 — Global error.tsx and not-found.tsx include `<Nav />`
- **scope:** ui
- **status:** done (2026-05-11)
- **branch:** auto/p1-21-error-pages (branched off auto/fe-01-prompt-v2)
- **pr:** https://github.com/lerboi/plagiacheck/pull/new/auto/p1-21-error-pages (set base to `auto/fe-01-prompt-v2`)
- **files:** `app/error.tsx`, `app/not-found.tsx`
- **acceptance:** Both pages render the standard Nav so users can navigate away. "Go home" CTA on each.

### P1-22 — Image-to-text: pre-upload validation
- **scope:** ux
- **status:** done (2026-05-11) — verified already correct, no PR needed
- **files:** `app/image-to-text/page.tsx`
- **acceptance:** Validate file size (<10MB) and MIME type (image/*) before sending. Show inline error if invalid.
- **note:** Investigated and closed. `handleImageSelect` already validates MIME (`file.type.startsWith("image/")`) and size (`file.size > 10 * 1024 * 1024`) BEFORE upload, displaying inline errors via `setError`. The dropzone helper text already says "PNG, JPG, WEBP up to 10MB". Audit finding was a false positive — pre-upload validation has been in place. If a future audit re-raises this, point them at lines 59-68 of `app/image-to-text/page.tsx`.

### P1-23 — Plagiarism checker file upload: show max size up front
- **scope:** ui
- **status:** todo
- **files:** `app/page.tsx`
- **acceptance:** Helper text under the file input: "Max 5MB. .txt or .pdf supported."

### P1-24 — Plagiarism checker progress bar reflects real completion
- **scope:** ui
- **status:** todo
- **files:** `app/page.tsx`, optionally `app/api/check-plagiarism/route.ts`
- **acceptance:** Either (a) the route emits a `progress` SSE event the page reads, or (b) the page interpolates more accurately. Don't cap at 95%; reach 100% on the final event.

### P1-25 — AI humanizer + paraphraser: character count on result panel
- **scope:** ui
- **status:** todo
- **files:** `app/ai-humanizer/page.tsx`, `app/paraphraser/page.tsx`
- **acceptance:** Show character count alongside word count on both input and output panels.

### P1-26 — AI humanizer: tooltips on tone options
- **scope:** ux
- **status:** todo
- **files:** `app/ai-humanizer/page.tsx`
- **acceptance:** Each tone option has a tooltip describing when to use it (e.g. casual = "Conversational, contractions OK"; professional = "Business writing, no slang"). Use shadcn `Tooltip`.

### P1-27 — Paraphraser: explain the six modes
- **scope:** ux
- **status:** todo
- **files:** `app/paraphraser/page.tsx`
- **acceptance:** Tooltip or short caption under each mode chip describing what it does.

### P1-28 — All Tools landing page (`/all-tools`)
- **scope:** new-feature
- **status:** done (2026-05-11) — shipped with P0-05 in branch `auto/p0-05-all-tools-page`
- **files:** `app/all-tools/page.tsx` (new), `components/nav.tsx`
- **acceptance:** Category-grouped grid of all 15 tools with icon, name, one-line description, and link. Linked from nav mega-menu's "View all" link. SEO meta tags.

### P1-29 — Pricing Free plan button copy when logged in
- **scope:** ux
- **status:** todo
- **files:** `app/pricing/page.tsx`
- **acceptance:** When logged in, show "Your current plan" disabled style with a tooltip. When logged out, "Get Started Free" linking to `/signin?tab=register`. **Do not change any plan tiers, prices, or priceIds.**

### P1-30 — Audio summarizer: section toggles
- **scope:** new-feature
- **status:** todo
- **files:** `app/audio-summarizer/page.tsx`, `app/api/voice-tools/route.ts`
- **acceptance:** Checkboxes for "Include overview", "Include key points", "Include action items". Hide unchecked sections from output.

### P1-31 — Voice-to-essay: editable title
- **scope:** ux
- **status:** todo
- **files:** `app/voice-to-essay/page.tsx`
- **acceptance:** Click essay title to edit inline. Saved title appears in copied/downloaded output.

### P1-32 — Chart generator: example prompts
- **scope:** ux
- **status:** todo
- **files:** `app/chart-generator/page.tsx`
- **acceptance:** Three or four example prompt chips above the input ("Compare Q1-Q4 sales", "Project timeline for a 3-month launch", etc.) that populate the textarea when clicked.

### P1-33 — Thumbnail generator: subtitle field
- **scope:** new-feature
- **status:** todo
- **files:** `app/thumbnail-generator/page.tsx`, `app/api/generate-image/route.ts`, `lib/svg-templates.ts`
- **acceptance:** Optional subtitle input; passed through the JSON spec; rendered in the template.

### P1-34 — Infographic generator: example prompts
- **scope:** ux
- **status:** todo
- **files:** `app/infographic-generator/page.tsx`
- **acceptance:** Same pattern as P1-32 — 3-4 example chips.

### P1-35 — TrustSection stats: remove unverified claims OR add asterisk
- **scope:** copy
- **status:** todo
- **files:** `components/PricingPage/TrustSection.tsx`
- **acceptance:** If "10M+ Documents Checked" and "500+ Universities" can't be substantiated, replace with verifiable copy ("Trusted by writers, students, and professionals", etc.). If kept, add small-print disclaimer.

### P1-36 — FAQ "on the roadmap" answers: remove vague timelines
- **scope:** copy
- **status:** todo
- **files:** `components/FAQ.tsx`
- **acceptance:** Replace vague "on the roadmap" phrasing with either a concrete statement ("Currently we support pasting text directly; .docx/.pdf parsing is not yet available") or remove the answer.

---

## P2 — polish

### P2-01 — Apply Framer Motion page transitions
- **scope:** polish
- **status:** todo
- **files:** `app/layout.tsx` or a new `components/PageTransition.tsx`
- **acceptance:** Subtle fade+slide between routes. Use existing framer-motion install. Don't break SSR.

### P2-02 — Replace `alert()` with shadcn toasts site-wide
- **scope:** polish
- **status:** todo
- **files:** grep for `alert(` across `app/**` and `components/**`
- **acceptance:** Every `alert()` replaced with `toast()`. If `toast` infrastructure isn't set up, set it up using `sonner` (already in shadcn ecosystem).

### P2-03 — Tabular-nums and consistent sizing on nav token badges
- **scope:** polish
- **status:** todo
- **files:** `components/nav.tsx`
- **acceptance:** Text and image token counts use identical font-size, identical tabular-nums, with clearer labels ("Text" and "Image" instead of "tok" and "img").

### P2-04 — Pricing page: muted text contrast bump
- **scope:** polish
- **status:** todo
- **files:** `app/pricing/page.tsx`
- **acceptance:** Feature bullet text uses a stronger color than `text-muted-foreground` in light mode. Audit Tailwind tokens.

### P2-05 — History rows: expandable preview
- **scope:** polish
- **status:** todo
- **files:** `app/history/page.tsx`
- **acceptance:** Click row to expand and show full input/result. Or hover tooltip with full text.

### P2-06 — Word counter: customizable WPM
- **scope:** polish
- **status:** todo
- **files:** `app/word-counter/page.tsx`
- **acceptance:** Two small sliders or inputs for reading WPM (default 200) and speaking WPM (default 150). Persist in localStorage.

### P2-07 — Word counter: stopword list visibility
- **scope:** polish
- **status:** todo
- **files:** `app/word-counter/page.tsx`
- **acceptance:** "Showing top words (excluding common words like 'the', 'a', 'is')" caption near the frequency table.

### P2-08 — AI detector: PDF download filename feedback
- **scope:** polish
- **status:** todo
- **files:** `app/ai-detector/page.tsx`
- **acceptance:** Show toast "Downloaded ai-report-<timestamp>.pdf" on successful download.

### P2-09 — Tool inputs: max-length indicator
- **scope:** polish
- **status:** todo
- **files:** all tool page files with text input
- **acceptance:** Show "X / Y characters" near each textarea (whatever the tool's reasonable cap is — pick something sensible per tool).

### P2-10 — Profile dropdown: keyboard navigation
- **scope:** polish
- **status:** todo
- **files:** `components/Profile.tsx` (or actual filename)
- **acceptance:** Tab/Enter/Escape work correctly. Focus visible on each menu item.

### P2-11 — Footer: full audit pass
- **scope:** polish
- **status:** todo
- **files:** `components/footer.tsx`
- **acceptance:** Working links to /pricing, /privacy, /terms, /history, all-tools. Social links removed if dead. Copyright year is dynamic (`new Date().getFullYear()`).

### P2-12 — Custom plan slider: explain pricing formula
- **scope:** polish
- **status:** todo
- **files:** `components/PricingPage/CustomPlanSlider.tsx`
- **acceptance:** Small caption explaining "Cost = $X per Y words" so users see why the price is what it is. **Do not change the actual formula or any prices.**

### P2-13 — Signin sidebar: stronger value prop
- **scope:** polish
- **status:** todo
- **files:** `app/signin/page.tsx`
- **acceptance:** Replace generic tagline with "15 AI writing tools. 1000 free tokens to start." plus 3 bulleted highlights.

### P2-14 — Dark mode hover/focus states audit
- **scope:** polish
- **status:** todo
- **files:** `components/ui/button.tsx`, `components/ui/input.tsx`, others as needed
- **acceptance:** Verify hover/focus states are visible in dark mode. Add `dark:` variants where missing.

### P2-15 — Add `<meta>` descriptions to every page
- **scope:** polish
- **status:** todo
- **files:** every `app/<route>/page.tsx` or `app/<route>/layout.tsx`
- **acceptance:** Each page exports `metadata` with a unique title and description. Use Next.js Metadata API.

### P2-16 — Empty state on /history when user has no runs
- **scope:** polish
- **status:** todo
- **files:** `app/history/page.tsx`
- **acceptance:** When no runs exist, show an illustration/icon + "Try a tool" CTA linking to `/all-tools` or `/`.

### P2-17 — Empty state on /billing when user has no payments
- **scope:** polish
- **status:** todo
- **files:** `app/billing/page.tsx`
- **acceptance:** When `Payments` table is empty, show "No payments yet" with link to /pricing.

### P2-18 — Reset password: faster redirect after success
- **scope:** polish
- **status:** todo
- **files:** `app/reset-password/page.tsx`
- **acceptance:** Reduce 1500ms setTimeout to 700ms.

### P2-19 — Reset password: independent show/hide on confirm field
- **scope:** polish
- **status:** todo
- **files:** `app/reset-password/page.tsx`
- **acceptance:** New password and confirm password have independent eye-toggle state.

### P2-20 — Voice tools: paragraph/word count estimate during recording
- **scope:** polish
- **status:** todo
- **files:** `app/voice-to-essay/page.tsx`, `app/audio-summarizer/page.tsx`
- **acceptance:** Live word count from the interim transcript displayed while recording.

---

## Notes on items the loop must NOT do

- Never change `app/pricing/page.tsx` dollar amounts or `priceId` strings.
- Never modify anything under `app/api/paymentstuff/`, `app/api/Redirect/`, `app/api/webhook/`, `app/api/discounts/`.
- Never touch `.env*`.
- Never install new npm packages without leaving the item blocked for human approval.
