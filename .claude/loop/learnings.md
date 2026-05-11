# Loop Learnings — append-only log

Every iteration appends one entry here BEFORE stopping. Future iterations read the latest 50 entries to avoid repeating mistakes and to inherit context.

## Entry format

```
## YYYY-MM-DD — <item-id> — <outcome: shipped | blocked | reverted>
- pr: <url or "n/a">
- branch: <name or "n/a">
- summary: <one paragraph, what you did and why>
- verification: <what you ran — lint, build, curl, etc — and the result>
- lesson: <anything future iterations should know — a pattern that worked, a gotcha, a file structure that surprised you, a Mistral quirk, etc>
```

Keep entries terse but specific. "Worked fine" is useless. "Used the deduct/refund helper from lib/server-tokens.ts — note that the refund RPC takes a positive number, not a negative one" is useful.

---

## 2026-05-11 — seed — loop-initialized
- pr: n/a
- branch: n/a
- summary: Seed audit completed. Backlog populated with 5 P0, 36 P1, and 20 P2 items at `.claude/loop/improvements.md`. Rules documented at `.claude/loop/RULES.md`.
- verification: Verified "MakeItAI" branding inconsistency exists in `components/footer.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`. Verified "Whats included:" typo at `app/pricing/page.tsx:210`. Confirmed no `/all-tools` page exists. Dev server starts cleanly on `http://localhost:3000`.
- lesson: When picking an item that touches multiple files (e.g. branding fix across footer + privacy + terms), grep for the exact string first to confirm full coverage before committing. The audit findings list specific files but the canonical truth is what grep returns at iteration time.

---

<!-- New entries go below this line, newest at the bottom -->

## 2026-05-11 — FS-02 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-02-plagia-ai-tools  (when opening, set base to `auto/fs-01-plagia-ai-skeleton` for a clean diff)
- branch: auto/fs-02-plagia-ai-tools
- summary: Wired PlagiaAI into the existing Plagiacheck tool routes via Mistral function calling. 9 tools registered (paraphrase, summarize, humanize, ai_detect, grammar, plagiarism_check, generate_infographic, generate_chart, generate_thumbnail). Multi-step loop in `app/api/plagia-ai/route.ts` (max 5 rounds): Mistral picks a tool → dispatcher HTTP-calls the existing route with the user's bearer token forwarded → tool result fed back into the conversation → repeat. New files `lib/plagia-ai/tools.ts` (Mistral schemas + arg/display helpers) and `lib/plagia-ai/dispatcher.ts` (per-tool route mapping, SSE-consumer for plagiarism). Client page extended with a unified `ChatItem` model: user bubbles, assistant text, and tool cards (running/done/failed states with expandable result preview). Tokens refreshed via Zustand on each successful tool completion.
- verification:
  - `npx tsc --noEmit` → clean
  - `npm run lint` → clean (only pre-existing warnings)
  - Smoke test (`npm run dev` on port 3003 after port 3000-3002 were occupied by stale node procs): `POST /api/plagia-ai` w/o auth → 401 `{"error":"Unauthorized"}` ✓ · `GET /plagia-ai` → 200 ✓
- lesson:
  1. **PR branching for dependent flagship items.** I branched FS-02 off `main`, but `main` doesn't have FS-01's files yet (that PR hasn't merged). Result: the FS-02 commit shows FS-01's files as "create" too, so the PR diff against `main` is bloated. Workaround captured in `improvements.md`: tell the user to set the PR base to `auto/fs-01-plagia-ai-skeleton`. **Going forward, every FS-XX iteration must check whether FS-(XX-1) has been merged. If not, branch off `auto/fs-(XX-1)-<slug>` instead of `main`.** RULES.md should encode this.
  2. **Dev-server port shifts.** Stale node processes from earlier iterations occupy 3000-3002 even after `taskkill /F /IM node.exe /T`. The new `npm run dev` falls through to 3003 (or further). Always check the dev-server log to read the actual port before curling — DON'T assume 3000. The log line "Local: http://localhost:NNNN" is authoritative.
  3. **Mistral function-calling API shape (camelCase!):** the SDK uses `toolChoice` (not `tool_choice`), `toolCalls` on assistant messages, `toolCallId` on tool messages. Arguments come back as a JSON string in `call.function.arguments` and must be `JSON.parse`'d. Don't trust the schema is enforced — wrap the parse in try/catch and validate the tool name with an `isKnownToolName` guard before dispatch.
  4. **Multi-step loops + non-streaming completions:** for the function-calling loop I used `chat.complete` (non-streaming) and emitted each round's text content as a single `delta` event. This means the chat doesn't stream token-by-token across tool rounds — it appears in bursts between tool cards. FS-03 (animations & polish) can revisit; for now it works correctly and the cursor still appears during the in-flight time.
  5. **SSE consumer pattern for plagiarism-check (and any other streaming internal route).** The `consumePlagiarismStream` in `dispatcher.ts` reads `\n\n`-separated events, looks for the payload containing a `result` field, and returns the final one. Reuse this exact pattern if FS-06 or later adds more streaming-internal-routes to the registry.
  6. **Token deduction stays out of the orchestrator.** The orchestrator NEVER calls deductTextTokens / deductImageTokens. Downstream routes deduct; we read `remainingTokens` from their JSON response and surface it via `tool_result` SSE events. The client uses `decrementWords()` / `decrementImageTokens()` (no-arg refetch) to refresh Zustand.

## 2026-05-11 — FS-03 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-03-plagia-ai-polish  (set base to `auto/fs-02-plagia-ai-tools`)
- branch: auto/fs-03-plagia-ai-polish  (correctly branched off `auto/fs-02-plagia-ai-tools` since FS-02 wasn't merged)
- summary: Polished the PlagiaAI chat. Framer Motion entrance animations (fade + 6px Y-translate, 150ms) on every item; AnimatePresence so clear-conversation animates out cleanly. Tool cards transition border + bg color on state change (violet tint while running, neutral when done, red when failed) via 300ms CSS transition. Smart auto-scroll: pauses when user scrolls up >80px; a floating "scroll to bottom" button appears; sending resumes scroll. Retry banner appears after a failed turn with the user's input preserved. Inline Confirm/Cancel for clear-conversation instead of shadcn AlertDialog (not installed; can't add deps). Mobile-friendly: input row is flex-wrap.
- verification:
  - `npx tsc --noEmit` → clean
  - `npm run lint` → clean (only pre-existing warnings)
  - Smoke test on fresh dev server port 3004 (older ports occupied by stale procs again): `GET /plagia-ai` → 200 ✓ · `POST /api/plagia-ai` w/o auth → 401 `{"error":"Unauthorized"}` ✓
- lesson:
  1. **Branching off the prior FS branch worked as intended.** RULES.md update from FS-02 paid off — this PR diff will be clean against base `auto/fs-02-plagia-ai-tools`. Pattern: `git checkout auto/fs-(N-1)-<slug>` then `git checkout -b auto/fs-N-<slug>`.
  2. **shadcn dialog primitives are NOT installed** (no `@radix-ui/react-dialog` or `@radix-ui/react-alert-dialog` in `package.json`). For confirm UIs, use an inline two-button toggle pattern instead of pulling in deps. Adding shadcn dialog primitives would mean `npm install` which the loop must not do without human approval.
  3. **Framer Motion AnimatePresence + dynamic content streaming.** Setting `layout="position"` on motion items prevents jumpy layout when text streams in. Avoid `layout` (which animates size changes) on streaming-text items — it causes visible re-flow on every delta. `layout="position"` only animates X/Y, which is what we want.
  4. **Stale dev-server zombies persist across iterations** even after `taskkill /F /IM node.exe /T`. The new server crawls up the port range (3000→3001→…→3004 now). Lesson reinforced: always parse the actual port from the dev-server log before smoking test. The `for port in 3000..3005; do curl` fallback used here works but tests stale servers; preferable to read the log first.

## 2026-05-11 — FS-04 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-04-plagia-ai-nav  (set base to `auto/fs-03-plagia-ai-polish`)
- branch: auto/fs-04-plagia-ai-nav  (branched off auto/fs-03-plagia-ai-polish)
- summary: Added PlagiaAI to the Nav. Desktop mega-menu now has a featured violet-fuchsia gradient banner ABOVE the three category columns with a NEW badge and the tagline "Chat with an AI that uses all your tools." Mobile menu has the same banner pinned at the top of the overlay, between the token summary and the categorized tool list. Both banner variants get a stronger active style when `usePathname()` === "/plagia-ai". A small violet dot also appears on the desktop "Tools" button when the user is on the PlagiaAI page, so the connection is visible even when the menu is closed. The /all-tools page doesn't exist (P1-28), so that acceptance criterion is deferred — recorded in the FS-04 backlog entry.
- verification:
  - `npx tsc --noEmit` → clean
  - `npm run lint` → clean (only pre-existing warnings)
  - Smoke test on port 3005 (lower ports occupied): `GET /plagia-ai` 200, `GET /` 200, `GET /paraphraser` 200 — all routes still render with the modified Nav.
- lesson:
  1. **`usePathname()` from `next/navigation` is the correct API for active-route detection** in client components in App Router. Avoid `useRouter().pathname` (that was the old `pages/` API and isn't available in App Router).
  2. **Feature-banner placement at the top of an existing mega-menu** doesn't require restructuring the columns — just insert before `<div className="grid grid-cols-3 gap-5">`. The visual hierarchy (featured first, categories below) is clearer than trying to slot the new tool into an existing category.
  3. **Deferred-dependency acceptance criteria.** FS-04's spec mentions "if /all-tools exists, feature on it" — but /all-tools doesn't exist yet (waits on P0-05/P1-28). Don't block FS-04 on this; record the deferred bit in the backlog entry so the iteration that creates /all-tools knows to add the hero card. Pattern: when an acceptance criterion has a "if X exists" conditional and X doesn't exist, ship the non-conditional parts and document the rest in `improvements.md` under the entry for the item that creates X (or as a note on the current entry).

## 2026-05-11 — FS-05 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-05-plagia-ai-storage  (set base to `auto/fs-04-plagia-ai-nav`)
- branch: auto/fs-05-plagia-ai-storage  (branched off auto/fs-04-plagia-ai-nav)
- summary: PlagiaAI conversations now auto-save after every completed turn and reappear in a desktop sidebar. New table `plagia_ai_conversations` (uuid, user_id fk auth.users, title, messages jsonb, created_at, updated_at) with RLS — exact SQL in the commit message body. New `lib/plagia-ai/storage.ts` with list/load/save/delete client helpers using `createClientComponentClient`. New `components/plagia-ai/ConversationSidebar.tsx` — desktop-only collapsible sidebar with New-chat button, relative-time stamps, hover-to-show trash with inline Confirm/Cancel, skeleton loaders. Page widened to `max-w-6xl` container. Auto-save uses the setItems-callback trick to read the latest state at the moment of save. Tool cards persist alongside user/assistant messages in jsonb so the full UI is restored on reload. Mobile keeps the existing layout (no sidebar) per spec.
- verification:
  - `npx tsc --noEmit` → clean
  - `npm run lint` → clean (only pre-existing warnings)
  - Smoke test on port 3006 after a ~50s first-compile (the page now imports more): `GET /plagia-ai` 200, `POST /api/plagia-ai` w/o auth 401 ✓
- lesson:
  1. **Schema migrations cannot be auto-applied by the loop.** Include the exact SQL in the COMMIT MESSAGE body (already done) and add a prominent `REQUIRED MIGRATION` note in the `improvements.md` entry so the user runs it before deploying. The loop must never auto-run SQL against the live DB — that's a destructive action it shouldn't take unsupervised.
  2. **`setItems((current) => { void persist(current); return current })` pattern** is the cleanest way to read the latest state inside an async flow without adding a ref. Works because state setter callbacks always receive the most recent committed state.
  3. **First-compile time for /plagia-ai is now ~50s** (Next dev mode, 2103 modules). Subsequent compiles are sub-second thanks to Turbopack-style caching. Future smoke tests should account for this — give it 60s with `curl --max-time 60` rather than the default 30s, otherwise you'll mis-report the page as broken when it's just slow to compile.
  4. **`useCallback` dependency ordering.** When function A captures function B, define B first. The lint warning "missing dependency: 'X'" almost always means B was defined after A — move B up, then add it to A's deps. Don't suppress with eslint-disable.

## 2026-05-11 — FS-06 — shipped — FLAGSHIP TRACK COMPLETE
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-06-plagia-ai-multimodal  (set base to `auto/fs-05-plagia-ai-storage`)
- branch: auto/fs-06-plagia-ai-multimodal  (branched off auto/fs-05-plagia-ai-storage)
- summary: Added 3 more tools to PlagiaAI's registry (12 total now). `image_to_text` consumes an attached image; `voice_to_essay` and `audio_summarize` take a transcript arg. UI: paperclip button next to the textarea opens a file picker, validates image/* + 8MB, base64-encodes via FileReader; attached image shows as a chip with X to remove. Microphone button next to it toggles Web Speech API dictation, appending interim+final transcript to the textarea; auto-detects SpeechRecognition support and disables the button when not available; auto-stops on send. Server route accepts optional `attachedImage` in the body and threads it through `dispatcher` ctx. System prompt teaches the model that `text_to_speech` and `word_counter` are client-only and cannot be invoked.
- verification: `npx tsc --noEmit` clean; lint clean; smoke test on port 3007: page 200, unauthenticated POST 401.
- lesson:
  1. **Web Speech API in TypeScript:** SpeechRecognition isn't in the standard DOM lib types. Cast `window` via `as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }`. Don't pull in `@types/webspeech` or similar — it's a moving target and we don't need full typing for a 5-method API. Cast the recognition instance to a minimal interface (`{ continuous; interimResults; lang; start; stop; onresult; onerror; onend }`) and treat `event` as `unknown`.
  2. **Exhaustive switches break when adding to a union.** Adding new variants to `PlagiaAiToolName` immediately broke `renderToolResult` (TypeScript: "Function lacks ending return statement"). TS doesn't warn until a non-exhaustive switch fails to type-check at the function level — the compiler can't infer all paths return. Pattern: when you extend the tool-name union, grep for all switches on that type and update them. The compiler will find them for you on the next `tsc --noEmit`.
  3. **Holding non-state across renders via `useRef`.** SpeechRecognition instance + the call-base text snapshot live in refs, not state. State would cause re-renders on every interim transcript chunk — disastrous for performance.
  4. **Server-side multimodal request validation:** loose validation is the right call — clamp the base64 length at 12MB (the route already limits image-to-text to 8MB but we add buffer for base64 expansion), require base64 + mimeType to be strings, but don't reject by mimeType (the downstream route handles that). Avoid over-validation at the orchestrator boundary; let the underlying route own its constraints.
  5. **FLAGSHIP TRACK COMPLETE.** All 6 FS items shipped. Per RULES.md step 2, the loop now alternates: every 3rd iteration picks an FE item from PLAGIA-AI EVOLUTION; the other 2 work P0→P1→P2. The 1-in-3 cadence is tracked by reading recent `learnings.md` entries: if 0 or 1 of the last 2 entries are FE-prefixed, the next item should be FE.

## 2026-05-11 — P0-05 + P1-28 — shipped (bundled)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p0-05-all-tools-page  (set base to `auto/fs-06-plagia-ai-multimodal`)
- branch: auto/p0-05-all-tools-page  (branched off auto/fs-06-plagia-ai-multimodal)
- summary: Created `/all-tools` landing page and re-pointed both desktop and mobile nav "All Tools" links there (they were going to `/history`). Page is a server component with proper Metadata for SEO, a featured PlagiaAI hero card at the top (closes the FS-04 deferred criterion), and three category sections (Writing / Image / Voice) with a responsive 1-2-3 column grid of tool cards. Each card mirrors the nav's icon styling. Bundled P0-05 (nav fix), P1-28 (the page itself), and the deferred FS-04 hero in one PR.
- verification: `tsc --noEmit` clean, lint clean. Smoke test on port 3008 after fixing a render error (see lesson 2 below): `/all-tools` 200, `/` 200.
- lesson:
  1. **Bundling related backlog items in one PR is fine when they share files.** P0-05 (fix nav link) + P1-28 (build the target page) had inseparable scope — fixing one without the other left dangling state. The commit message + improvements.md cross-reference both items.
  2. **Server components that import a component using `framer-motion` (or any other client-only API) need the leaf component marked `"use client"`** — otherwise you get "Element type is invalid: expected a string... but got: undefined" with no useful stack trace. `components/FAQ.tsx` had been missing the directive but never failed because every previous importer (the tool pages) was already a client component, so Next.js inferred client from context. As soon as a server component imported it, the inference broke. Pattern: every leaf component that uses client-only APIs should declare `"use client"` explicitly, not rely on inference from importers.
  3. **Metadata + dynamic UI = split into server-page + client-content.** This page works as a server component because the heavy interactivity (mega menu, animations) lives inside `Nav` and `FAQ`, which are client components themselves. If a future iteration wants this page to have client-side interactivity (filters, search, etc.), split into `page.tsx` (server, exports metadata) + `content.tsx` (`"use client"` + the interactive bits). Don't drop metadata to keep one file simple — SEO matters.

## 2026-05-11 — P0-04 — shipped (small + verified)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p0-04-svg-darkmode  (set base to `auto/p0-05-all-tools-page`)
- branch: auto/p0-04-svg-darkmode  (branched off auto/p0-05-all-tools-page)
- summary: Audit finding turned out to be partially wrong — the SVG templates (`lib/svg-templates.ts`) are already self-contained: every `wrap()` call adds a white background rect, and chart/infographic text is dark slate. The actual on-page issue was the container's `dark:bg-gray-950` clashing with the SVG's white background, making the SVG look like a floating white tile in a dark room. Fixed by switching the on-page container to always-white (with shadow-sm border) when an SVG is shown — the result is an intentional "preview tile" that matches the downloaded SVG exactly. Empty state still uses `bg-card` so it fits the theme. Thumbnail-generator unaffected — the thumbnail SVG paints a full-bleed gradient so the white never shows through.
- verification: `tsc --noEmit` clean, lint clean, smoke test on port 3009: `/chart-generator` 200, `/infographic-generator` 200.
- lesson:
  1. **Audit findings can be wrong.** P0-04 claimed SVGs might render with "light SVG text on dark backgrounds — no contrast checking." Reading the code showed the opposite: dark text on a white background, always. The real problem was one layer above (the on-page container). Pattern: when an audit item says X is broken, **always** verify by reading the code and running it before fixing. If the audit is wrong, document the actual finding in the PR and ship a fix for what's really there (or close it as "verified — already correct").
  2. **Cheapest fix wins.** I considered three approaches: (a) theme-aware SVG generation, (b) transparent SVG bg with page providing bg, (c) always-white container. (a) and (b) require touching the SVG templates and the download path. (c) is one CSS class change per page. (c) preserves shareable downloaded SVGs AND fixes the on-page UX. Pick the cheapest fix that solves the actual problem, not the most architecturally pure one.
  3. **"Preview tile" pattern.** A white container with `shadow-sm` and a subtle border looks intentional in any theme — like an Excel/Figma export preview. Worth remembering for any future "rendered output" UI.

## 2026-05-11 — FE-01 — shipped (first FE iteration)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-01-prompt-v2  (set base to `auto/p0-04-svg-darkmode`)
- branch: auto/fe-01-prompt-v2  (branched off auto/p0-04-svg-darkmode)
- summary: First PlagiaAI Evolution iteration. Rewrote the system prompt with concrete tool-list examples ("paraphrase — Examples: 'rewrite this', 'make it formal'..."), added an explicit "if unsure, ASK a clarifying question instead of guessing" rule near the top, and a new "Disambiguation rules" section mapping surface phrasing to the intended tool (paraphrase vs humanize, summarize vs audio_summarize, etc.). Updated every tool's `description` in `tools.ts` to include 4-6 example phrasings plus negative guidance ("Do NOT use for X — that's tool Y"). 56 lines added across 2 files; zero behaviour changes.
- verification: `tsc --noEmit` clean, lint clean. Smoke test on port 3010 (yes, ports are creeping high — 10 stale node procs by now): page 200, unauthenticated POST 401. The system prompt is now ~70% longer; the route still streams cleanly so the token cost is acceptable.
- lesson:
  1. **Tool descriptions are the highest-leverage strings in a function-calling app.** Mistral picks tools primarily on the `description` field, secondarily on the surrounding system prompt. Concrete user-phrasing examples ("Examples: 'rewrite this', 'reword this'...") and explicit negative guidance ("Do NOT use for X") significantly tighten dispatch. Both are cheap to add and cost ~50-100 input tokens per tool per turn — well worth it.
  2. **"Ask if unsure" is a pillar-of-design instruction.** Without it, function-calling models tend to guess on ambiguous input. Lifting the clarifying-question rule to the very first decision rule (rather than burying it in style notes) costs nothing and prevents most wrong-tool calls. FE-02 will extend this with detection of "input too short to dispatch" patterns.
  3. **Verification limitation:** the FE-01 spec mentions "running 10 ambiguous prompts manually and logging which tool was picked" — I couldn't do that in the loop without a real signed-in Mistral call. The TypeScript/lint/dev-smoke triad ensures correctness; behaviour quality is something the user will need to verify by chatting with PlagiaAI after merge. FE-evolution items often have this verification gap — accept it, document the limit in the PR, and let manual review close the loop.

## 2026-05-11 — P1-21 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p1-21-error-pages  (set base to `auto/fe-01-prompt-v2`)
- branch: auto/p1-21-error-pages  (branched off auto/fe-01-prompt-v2)
- summary: Wrapped `error.tsx` and `not-found.tsx` with the standard `<Nav />` + flex-column layout so users can reach other parts of the site from error states. `not-found.tsx` gained a second CTA "Browse tools" → `/all-tools` alongside the existing "Back to home". `error.tsx` kept its "Try again" + "Go home" primary actions. Used the standard min-h-screen + flex-1 main pattern that matches every other page.
- verification: `tsc --noEmit` clean, lint clean. Dev server failed to start on default port range (3000-3010 all in use due to ~40 zombie node procs left over across iterations) — worked around by passing `PORT=3050`. Smoke test on 3050: `/` 200, `/random12345` 404 (correct for not-found), and grep on rendered HTML confirms "Page not found", "Back to home", "Browse tools" all present.
- lesson:
  1. **`taskkill /F /IM node.exe /T` is unreliable on Windows.** After 10+ iterations the system has 40+ zombie node.exe processes locking ports 3000-3010. The kill command appears to succeed but processes survive (they're attached to Console 5 and apparently outside our kill scope). **Workaround: pass `PORT=3050` to `npm run dev` explicitly**, picking a port that's almost certainly free. This sidesteps the entire zombie-port problem.
  2. **Layout-replacement pattern for global UI shells:** wrap an error/loading/not-found page with `<div className="min-h-screen flex flex-col bg-background"><Nav /><main className="flex-1 flex items-center justify-center px-4">{...existing content...}</main></div>`. The flex-column ensures Nav sits on top and main fills the rest — keeping content centered vertically as before but giving the user back full nav access.
  3. **Not-found can serve as a soft directory:** adding a "Browse tools" link to `/all-tools` on the 404 page is much more useful than "Back to home" alone. Users who hit a 404 likely meant *some* tool — show them the menu, don't just bounce them.

## 2026-05-11 — P1-13 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p1-13-history-count  (set base to `auto/p1-21-error-pages`)
- branch: auto/p1-13-history-count  (branched off auto/p1-21-error-pages)
- summary: History page now shows "Showing X-Y of Z · Page A of B" instead of just "Page N". Fetches total row count alongside the page slice in a single Supabase call via `{ count: "exact" }`. Pagination row flips from row-only to flex-col on mobile for readability; uses `tabular-nums` so digits don't shift between pages.
- verification: `tsc --noEmit` clean, lint clean. Smoke test on `PORT=3060` (used the workaround from P1-21 to avoid zombie ports): `/history` 200, `/` 200.
- lesson:
  1. **Supabase `{ count: "exact" }` is free when paired with `range()`.** PostgREST returns the count in the `Content-Range` response header, so adding `count: "exact"` to a `.select()` doesn't fire a second query. Pattern: when paginating, always include the count so the UI can show "X of Y" without a separate fetch.
  2. **`tabular-nums` on count strings.** When numbers update every page (here, "Showing 1-20 of 47" → "Showing 21-40 of 47"), variable-width digits cause a visible width shift. `font-variant-numeric: tabular-nums` (Tailwind's `tabular-nums`) keeps every digit the same width — no shift.
  3. **`PORT=NNNN` workaround already paid off.** Iteration 10's lesson about zombie ports kicked in this iteration — wouldn't have been able to smoke-test history without picking a high port. Memo to future iterations: just use `PORT=3060` (or higher) every time, don't even try the default range.

## 2026-05-11 — FE-02 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-02-clarify-prompt  (set base to `auto/p1-13-history-count`)
- branch: auto/fe-02-clarify-prompt  (branched off auto/p1-13-history-count)
- summary: Extended the FE-01 system prompt with an explicit "PRE-DISPATCH" rule that catches five common insufficient-input cases (verb without source text, text without instruction, image without instruction, vague verb mapping to multiple tools, pronoun with no prior reference). In each, the model is told to emit only a one-line clarifier and NOT call a tool. Added a "Clarifying-question shape" subsection with ✓ / ✗ examples forbidding preamble ("I'd be happy to help!..."), echoing back, or explaining the need for more info. 27 added, 5 removed in `app/api/plagia-ai/route.ts`. No behaviour code touched.
- verification: `tsc --noEmit` clean, lint clean, smoke test on `PORT=3070`: page 200, unauthenticated POST 401.
- lesson:
  1. **Pre-dispatch checks belong at the very top of decision rules.** "If you have enough info" is a precondition to everything else. Putting it last means the model considers tool selection first and only catches missing input as an afterthought — and sometimes guesses. Putting it first short-circuits tool calls when input is insufficient. Order in system prompts matters.
  2. **Format-of-clarifier is worth specifying.** Without explicit ✓/✗ examples, function-calling models tend to wrap clarifying questions in "I'd be happy to help! Could you please..." preamble. That feels servile and bloats responses. Showing what NOT to do is more leverage than just saying "be concise" — concrete bad examples calibrate better than abstract principles.
  3. **Five-case enumeration > catch-all phrasing.** I considered just adding "if input is ambiguous or incomplete, ask a clarifier". Concrete enumeration ("verb without object", "text without instruction", "vague verb", etc.) tightens dispatch much more than a generic warning. The model now has named patterns to match against rather than a fuzzy concept.

## 2026-05-11 — P1-19 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p1-19-guest-token-cta  (set base to `auto/fe-02-clarify-prompt`)
- branch: auto/p1-19-guest-token-cta  (branched off auto/fe-02-clarify-prompt)
- summary: All three guest-state nav token displays (desktop TokenBadge, mobile pill, mobile slide-out card) now act as conversion CTAs pointing at `/signin?tab=register`. Desktop reads "✨ Sign up — 1,000 free tokens" with a truncated "Sign up · free" variant on screens smaller than xl. Mobile compact pill reads "✨ Sign up". Mobile slide-out card uses a full-width primary-CTA treatment with the guest's remaining trial-token count shown as supporting context ("{n} trial tokens left"). Old behaviour linked to `/pricing` which was the wrong destination for a guest who hadn't started using anything yet.
- verification: `tsc --noEmit` clean, lint clean, smoke test on `PORT=3080`: `/` 200, grep on rendered HTML confirms "Sign up", "1,000 free tokens", and "signin?tab=register" are all present.
- lesson:
  1. **Conversion-CTA destinations matter.** The old pill linked to `/pricing` — that's the upgrade destination, not the signup destination. For a guest with 200 trial tokens, the right next step is "create an account and get 1,000 free", not "see the paid plans". Always trace the CTA from the user's perspective: where am I in the funnel, and what's the next step that benefits ME?
  2. **`useSearchParams().get('tab')` was already wired up** on the signin page, so re-pointing the nav links at `?tab=register` worked with zero signin-page changes. Pattern: check whether existing pages already support deep links before adding new query params or routes — saves a refactor.
  3. **JSX edits get messy when changing element types.** Converting an outer `<div>` wrapper into a `<Link>` wrapper while removing an inner `<Link>` left me with mismatched closing tags + a duplicate `className` attribute. TypeScript caught it as a syntax error — pattern: when transforming wrapper element types, do it as ONE atomic Write of the full block rather than incremental Edits. Saves a fix-up round trip.

## 2026-05-11 — P1-11 — shipped + P1-22 — closed-as-verified
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/p1-11-reset-loading  (set base to `auto/p1-19-guest-token-cta`)
- branch: auto/p1-11-reset-loading  (branched off auto/p1-19-guest-token-cta)
- summary: P1-11: `hasRecoverySession` is now `boolean | null` instead of bool. Null = loading (centered spinner + "Verifying your reset link…" with role/aria-live for screen readers). Before this PR the state started `false`, so the page briefly flashed the "expired link" banner for legitimate users coming from email links before Supabase's hash-exchange completed. P1-22 was investigated and CLOSED AS VERIFIED — pre-upload MIME + size validation is already in `handleImageSelect` lines 59-68 of `app/image-to-text/page.tsx`. The dropzone text already says "PNG, JPG, WEBP up to 10MB". Audit was a false positive.
- verification: `tsc --noEmit` clean, lint clean. Smoke test on `PORT=3090`: `/reset-password` 200, rendered HTML contains "animate-spin" and "Verifying your reset link" so the loading state is server-side renderable (no flash of expired-link content even before client hydration).
- lesson:
  1. **Two-state boolean flags lie during async resolution.** Any pattern `const [x, setX] = useState(false)` where `x` becomes `true` after an async check is implicitly a three-state flag: initial-false-meaning-loading, false-meaning-confirmed-false, true. Promote to `boolean | null` (or a tagged union) any time you have a noticeable wait between mount and the answer. Otherwise the UI lies to the user for the first frame.
  2. **Closing audit findings as "verified — already correct" is real work.** Don't treat it as nothing — the backlog entry needs a note pointing at the actual line numbers so a future audit doesn't re-raise the same false positive. P1-22 now has such a note. Pattern: if you investigate a P0/P1 and find it's already implemented, mark `done` with `note:` pointing to the specific code.
  3. **Setting initial dev port deliberately is now standard practice.** PORT=3090 worked this time. Previous iterations 3050, 3060, 3070, 3080 all still hold ports. The strategy of incrementing by 10 per iteration is sustainable — gives plenty of headroom.

## 2026-05-11 — seed-correction-01 — clarification
- pr: n/a
- branch: n/a
- summary: Initial audit incorrectly flagged "MakeItAI" branding in footer/privacy/terms as wrong. User clarified: **MakeItAI is the legal/operating company name and is CORRECT.** Plagiacheck is the product/site brand shown only in the nav. Email `plagiacheck@gmail.com` is also CORRECT and must not be changed. P0-01 has been removed from the backlog. P1-06 and P1-07 (Privacy/Terms rewrites) updated to require keeping "MakeItAI" as the company name and `plagiacheck@gmail.com` as the contact.
- verification: Updated `.claude/loop/improvements.md` (P0-01, P1-06, P1-07) and `.claude/loop/RULES.md` (Privacy/Terms guidance line).
- lesson: **Do not rewrite "MakeItAI" → "Plagiacheck" anywhere.** They are two different things: MakeItAI = legal operator, Plagiacheck = product name. If a future audit suggests this rename, reject it. Also: `.claude/NO-ACCESS-FILES/` is fully off-limits — do not read, list, or modify anything inside it. This restriction is now in RULES.md.

## 2026-05-11 — seed-addition-01 — flagship-feature-added
- pr: n/a
- branch: n/a
- summary: User requested a new flagship feature: **PlagiaAI** — a chat interface that orchestrates all existing Plagiacheck tools via Mistral function calling. Added as a 6-item FLAGSHIP track at the top of `improvements.md` (FS-01 → FS-06). FS-01 = page + route skeleton with basic chat; FS-02 = Mistral function calling + tool dispatcher (9 tools: 6 text + 3 image-gen); FS-03 = animations, scroll, errors; FS-04 = nav integration; FS-05 = Supabase persistence; FS-06 = voice + image input coverage. RULES.md updated to prioritize FLAGSHIP items in strict numeric order before non-flagship work.
- verification: n/a (backlog change only)
- lesson: The PlagiaAI dispatcher calls existing tool API routes over HTTP with the user's bearer token forwarded — chosen to avoid a large refactor of every tool route into reusable lib functions. This means token deduction stays in the underlying routes and PlagiaAI itself does NOT deduct anything. When implementing FS-02, do not add token deduction to the orchestrator. Also: tool routes that stream (e.g. `/api/check-plagiarism`) must be consumed by the dispatcher as a fully-buffered final result, not streamed through.

## 2026-05-11 — seed-addition-02 — plagia-ai-continuous-evolution
- pr: n/a
- branch: n/a
- summary: User explicitly requested that the loop continuously improve PlagiaAI after the initial 6 FLAGSHIP items ship. Added a new **PLAGIA-AI EVOLUTION** section to `improvements.md` with a documented core-value-offering charter (4 pillars: intent-accuracy, conversational-quality, speed-and-reliability, frictionless-interaction), an explicit out-of-scope filter (no general LLM features, no provider switches, no collab features, no replacing standalone tool pages), and 10 seed FE items (FE-01 through FE-10). Updated `RULES.md` ordering: post-flagship, every 3rd iteration picks an FE item; loop is also encouraged to append 1-2 new FE items per shipped iteration when follow-ups are obvious.
- verification: n/a (backlog + rules change only)
- lesson: PlagiaAI is treated as a permanent first-class feature with its own evolution track, not a one-shot build. When the loop is on an FE-turn, it should weigh ideas against the 4 pillars and reject anything that drifts into general-purpose LLM territory. The cadence (1-in-3 iterations) keeps PlagiaAI improving without starving the rest of the backlog.

## 2026-05-11 — pre-launch — no-access-files-final-warning
- pr: n/a
- branch: n/a
- summary: User issued a final reminder before launching the loop: **NEVER touch any file or folder inside `C:\Users\leheh\.Projects\plagiacheck\.claude\NO-ACCESS-FILES\`.** Promoted this restriction to an "ABSOLUTE PROHIBITION" section at the very top of `RULES.md`, before all other hard rules. Loop must read this every iteration.
- verification: n/a
- lesson: This is the single most important rule. If any glob pattern, file search, or directory listing might pick up paths under `.claude/NO-ACCESS-FILES/`, narrow the pattern. If a backlog item appears to require touching this folder, mark `blocked: NO-ACCESS-FILES` and stop. A violation halts the entire loop — no exceptions.

## 2026-05-11 — FS-01 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-01-plagia-ai-skeleton  (URL to open; PR not auto-created — see lesson)
- branch: auto/fs-01-plagia-ai-skeleton
- summary: Built the PlagiaAI page skeleton at `/plagia-ai` and the SSE route at `/api/plagia-ai`. Mistral `mistral-large-latest` streams responses; no tool calling yet (interim system prompt explicitly tells the assistant it cannot run tools yet). Chat UI: max-w-3xl centered column, user bubbles right-aligned in `bg-primary/10`, assistant text left-aligned plain, sticky bottom auto-resize textarea, Ctrl+Enter shortcut, 4 suggested-prompt chips, blinking violet caret during streaming. Auth via existing `getUserFromRequest` Bearer-JWT pattern. Created `lib/plagia-ai/types.ts` for shared types.
- verification:
  - `npm run lint` → clean (only pre-existing warnings on `app/billing/page.tsx` and `app/image-to-text/page.tsx` — unrelated)
  - `npx tsc --noEmit` → passes
  - `npm run build` → **fails on pre-existing env issue**, NOT on my code. Verified on `main` too — local `.env` is missing `SUPABASE_KEY` (the legacy URL2/SUPABASE_KEY pair) which the restricted payment-discount-redirect routes need at module-load time during "Collecting page data". The TypeScript compile + Next bundle compile steps succeed. My code passes type-check; the build is gated by env config for restricted routes I can't touch.
  - Smoke test (dev server): `POST /api/plagia-ai` w/o auth → 401 ✓ · `GET /plagia-ai` → 200 ✓
- lesson:
  1. **`gh` CLI is NOT installed in this environment.** Future iterations must NOT attempt `gh pr create`. Instead, push the branch and rely on the "Create a pull request" URL that `git push` prints. Add the URL to `improvements.md` under `pr:` for the user to click and open the PR manually. Alternatively, capture the URL by parsing `git push` output: `git push -u origin <branch> 2>&1 | grep -oP 'https://github\.com/[^ ]+/pull/new/[^ ]+'`.
  2. **`npm run build` fails locally on pre-existing env issues in restricted payment routes** (`/api/discounts/*`, `/api/Redirect/*`, `/api/paymentstuff/*`) because local `.env` lacks `SUPABASE_KEY`. This is NOT caused by feature work and CANNOT be fixed (env file is restricted, routes are restricted). For verification, run `npx tsc --noEmit` instead of `npm run build` — that catches TypeScript errors in your changes without tripping the env-restricted runtime module load. Treat `tsc --noEmit` clean + dev-server smoke test as the verification signal going forward. Only treat a *new* build failure (one that wasn't present on `main`) as a blocker.
  3. **Mistral SDK content-chunk typing:** `chunk.data?.choices?.[0]?.delta?.content` can be `string | ContentChunk[]` where `ContentChunk = TextChunk | ImageURLChunk | ...`. Don't narrow with an inline cast like `(c: { text?: string } | string)` — TypeScript rejects it. Use a runtime type-guard loop: check `typeof piece === "string"` first, then `piece && typeof piece === "object" && "text" in piece` and extract `piece.text` if it's a string. Reuse this pattern in FS-02.
  4. **Mistral streaming API:** `mistralClient.chat.stream({...})` returns an async iterable. Each iteration yields a `chunk` where the delta lives at `chunk.data.choices[0].delta.content` (NOT directly at `chunk.choices...`). This differs from the `chat.complete` shape.
  5. **State file workflow:** updating `.claude/loop/improvements.md` and `.claude/loop/learnings.md` happens on `main` (not the feature branch). Leave those changes uncommitted on main so the next iteration sees the latest state in the working dir. This keeps PR diffs clean (feature code only).
