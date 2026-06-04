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

## 2026-05-24 — LOOP SESSION COMPLETE
- session: 2026-05-24 (started during the hand-fix, ran ~14 iterations end-to-end)
- shipped: FE-11, FE-12, FE-13, FE-14, FE-15, FE-16, FE-17, FE-18, FE-19, FE-20, FE-21, FE-22, FE-23, FE-24 (14 items) + the hand-fix bundle that preceded the loop. All on stacked branches off `auto/fix-home-viewport-fill` → `auto/fe-N-*`. Final stack tip: `auto/fe-24-pin-conversation`. None merged to main yet — that's the user's call.
- blocked: 0.
- backlog state at stop: zero todo items remain. Self-generating FE items has dried up — the remaining ideas (multi-pin reorder, voice playback in chat, real-time collab, light-mode polish pass) are either out-of-scope per the PlagiaAI charter or polish-on-polish.
- meta-pattern recap:
  1. **Stacked-branch chain off the hand-fix lets the loop ship anything without waiting on PR merges.** Each iteration branches from the previous one's tip. The full chain back to main is one logical merge when the user is ready (`auto/fe-24-pin-conversation` → `auto/fix-home-viewport-fill` → `main` would land all 14+ PRs in dependency order).
  2. **`sendMessage({ baseItems })` was the foundational refactor that unlocked FE-18 (edit) AND FE-19 (regenerate).** Both rewind the conversation to an earlier point and re-run; both needed an explicit override to defeat closure staleness. Pattern: any "send" function tied to a list-state closure should accept the list as an optional override.
  3. **MotionConfig at the root + motion-safe: variants on Tailwind transforms = comprehensive reduce-motion compliance in one PR.** Without MotionConfig you'd need useReducedMotion() in 16 files. With it, every motion.* below the provider behaves correctly. Pair with `motion-safe:` on each transform-bearing class chain (hover:scale-, hover:-translate-, active:scale-) for CSS-side coverage.
  4. **`<ResultReveal>` is a reusable building block for any conditional-results UI.** Originally created for tool pages (FE-14), then extended to 9 more tool pages (FE-16). The pattern (one client wrapper with show: boolean + useReducedMotion gate) generalizes beyond tool pages — any "this content appears when X is true" surface should consider it.
  5. **Sidebar evolution went: collapse → drawer → active indicator → filter → rename → pin (FE-13, 17, 20, 24).** Each iteration added a small ChatGPT-parity capability. The ConversationList internal component absorbed three new state slots (renamingId, renameDraft, plus inferred from filter) without bloating. Lesson: extracting an internal component early made each subsequent feature a 30-line patch instead of a 100-line rewrite.
  6. **Closure-of-loop discipline mattered.** Appended 1 FE item per shipped iteration (capped at 2 by RULES). When the natural follow-ups dried up, stopped. The 14-item session lifespan was emergent, not pre-planned.
- next-session pointers:
  - The user must run the FE-09 SQL (`plagia_ai_preferences`) + FE-24 SQL (`pinned` column) in Supabase. Both documented in their PR descriptions.
  - FE-11's followups.ts helper is wired but unverified against a live model that omits the marker. Worth a manual smoke test in the next session.
  - If the user wants a NEXT round of work after merging the stack, three obvious candidates: multi-conversation export (zip), voice playback of assistant text (TTS integration), conversation folder organization. None added to the backlog yet — wait for the user to direct.

## 2026-05-24 — FE-24 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-24-pin-conversation
- branch: auto/fe-24-pin-conversation (stacked on auto/fe-23-token-cost)
- sql-required-one-time: `ALTER TABLE plagia_ai_conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;` (idempotent — safe to re-run). UI degrades gracefully until the user runs it: rows just sort by updated_at like before and the Pin button no-ops with a clear toast.
- summary: ChatGPT-style conversation pinning. Storage: `StoredConversationSummary` gains optional `pinned?: boolean`; `listConversations` tries `select(... pinned)` ordered by `pinned DESC, updated_at DESC`, then falls back to the pre-migration query if Supabase errors on the missing column. New `setConversationPinned(id, pinned: boolean): Promise<boolean>` PATCHes the column + bumps updated_at. PlagiaAiApp wires `handleTogglePinConversation(id, pinned)` that calls the storage helper, toasts a migration-pointer on failure, and refetches the list on success so the new sort lands. Sidebar: third hover-revealed icon (`Pin` from lucide) between Rename and Delete; when `c.pinned` is true the icon stays VISIBLE (not hover-revealed), uses violet color, and fills (`fill-current`) so the pinned state reads at a glance. Visual separator between pinned and unpinned rows: pre-compute the first-unpinned index outside the map, then apply `border-t border-border mt-1.5 pt-1.5` to that one row. Both inline and drawer variants get the same flow via the shared ConversationList.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean after one iteration: the Supabase typed query inferred a strict shape for the primary select (with `pinned`) that didn't accept the retry's shape (without `pinned`). Fixed by storing the rows as `unknown` and asserting to the union type at return. Belt-and-suspenders: the runtime fallback works regardless of TS inference.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs the migration to actually pin in production. Without it the pre-migration path still works — list sorts by updated_at, pin clicks toast the migration message.
- lesson:
  1. **Try-then-fallback for an optional column is cleaner than feature-detection.** Considered probing the schema with a separate query before the main select. Rejected — it doubles round-trips on every list call. Try the new query, catch the error, retry with the old shape. Cost: one extra round-trip ONLY on the pre-migration error path, zero overhead post-migration.
  2. **Supabase strict typing on selects can fight refactors.** The primary select with `pinned` infers a row type that includes `pinned`. The retry select without `pinned` infers a different row type. Assigning one to a `let` declared with the first type fails. Two clean options: (a) widen via `unknown` + final `as` cast, (b) use `any` for the intermediate variable. Picked (a) because it's explicit — the cast at return makes the type-narrowing intent visible.
  3. **Pin button "stays visible when pinned, hover-revealed when not"** is the right asymmetric pattern. Rename and Delete are uniformly hover-revealed because they're rare actions. Pin's STATE is information — the user needs to see at a glance which rows are pinned. So the icon needs to render unconditionally for pinned rows. The styling distinction (violet + fill) reinforces the active state without needing a separate label.
  4. **CSS border on a row is cheaper than emitting a separator element.** Considered inserting a divider element between pinned and unpinned, but AnimatePresence wants direct keyed children — a stray div risks breaking the row enter/exit animations. Applying `border-t mt-1.5 pt-1.5` to the FIRST unpinned row achieves the same visual gap with zero extra DOM nodes and zero animation interference.
  5. **`aria-pressed` on a toggle button is the right ARIA pattern.** Pin is a stateful toggle (pinned/not), not just an action. `aria-pressed={!!c.pinned}` tells screen readers the current state alongside the action label. Convention: any button that toggles a persistent state should use `aria-pressed` + a label that reflects what the click WILL do ("Pin" / "Unpin") rather than what the state IS.

## 2026-05-24 — FE-23 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-23-token-cost
- branch: auto/fe-23-token-cost (stacked on auto/fe-22-copy-assistant)
- summary: Per-run token cost footnote on done tool cards. Surprise: every underlying tool route ALREADY returns `tokensUsed: cost` in its JSON response (ai-tools, check-plagiarism, speech-to-text, image-to-text, voice-tools, generate-image — all of them). So no migration, no orchestrator-side pre-balance lookup; just plumb the value through. Dispatcher: extended DispatchSuccess with `tokensUsed?: number` and used `replace_all` twice (text + image currency variants) to add the field to all 12 return sites. SSE: PlagiaAiToolResultEvent gained `tokensUsed?: number`. Server route emits it from `outcome.tokensUsed`. Client ChatItem.tool gained `tokensUsed?: number` + `tokensCurrency?: "text" | "image"`. tool_result handler infers the currency from whichever remaining-tokens field came back (mutually exclusive per the dispatcher contract). Render: small `text-[11px] text-muted-foreground/70 tabular-nums` footnote below the result-preview line on done cards. Singular/plural-aware ("1 text token" vs "12 text tokens"). Failed cards skip the footnote (refund/no-deduct).
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs a live PlagiaAI dispatch to confirm the footnote renders. Mental model: paraphrase 50 chars → ai-tools returns `tokensUsed: 9` → tool card shows "Used 9 text tokens".
- lesson:
  1. **Read the existing API response shape before designing the data flow.** Initially planned to do a pre-balance snapshot + delta on the orchestrator (or client), then discovered every tool route already returns the cost. Plumbing a known value through is 10x cheaper than computing one — and more accurate (you don't have to guess what the tool charged). Lesson: when extending an existing data flow, grep the producer side first.
  2. **`replace_all` on stable substring patterns is the right batch-edit tool.** The dispatcher had 12 return sites where I wanted to add the same field. Two `replace_all` calls (one for text-currency, one for image-currency) covered all 12. Surgical alternatives would have been 12 separate Edit calls. The pattern needed enough specificity to not match unrelated lines — `remainingTextTokens: r.data.remainingTokens,` is unique to the success-return path.
  3. **"Currency mutually exclusive" is an implicit contract worth documenting.** The dispatcher returns either remainingTextTokens OR remainingImageTokens but never both — a tool is either text-billed or image-billed. The new code at tool_result depends on this: it infers currency from whichever is set. Added a code comment so future iterations don't accidentally set both and break the inference. Real-world incidents from violated implicit contracts are a known footgun.
  4. **`tokensUsed > 0` guard in the render hides zero-cost runs.** Some tools (the deferred-cost ones, or future free tools) might return `tokensUsed: 0`. The footnote shouldn't say "Used 0 tokens" — that's not informative. Guarding on `> 0` makes the footnote opt-in via meaningful cost. The same guard naturally also skips runs where the field is missing (older clients or fallback paths).
  5. **`text-[11px] text-muted-foreground/70` is the right footnote weight.** Smaller than the result-preview text (text-xs), more muted than muted-foreground itself. Reads as "additional context, not primary info". Pattern: any "tertiary" inline data on a card should drop both font-size and opacity by one step relative to the secondary content above it.

## 2026-05-24 — FE-22 — shipped + FE-22/FE-23 appended
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-22-copy-assistant
- branch: auto/fe-22-copy-assistant (stacked on auto/fe-21-inline-svg)
- summary: Hover-revealed Copy button on every assistant text bubble. Same visual pattern as the FE-18 pencil — `-top-1.5 -right-1.5` floating circle, `h-6 w-6 rounded-full bg-background border border-border shadow-sm`, `opacity-0 group-hover:opacity-100`. Hidden while the bubble is streaming (`isStreamingThis`) AND when content is empty. Click calls `navigator.clipboard.writeText(it.content)` inside a try/catch, then toasts success or "Couldn't copy" (browser blocked it — happens inside iframes). The handler is `useCallback`-stable on `[toast]`.
- appended-to-backlog: FE-22 (shipped this iteration — copy-to-clipboard on assistant bubbles) and FE-23 (per-run token cost footnote on done tool cards — still todo for the next iteration). Both serve the four-pillar charter — FE-22 is frictionless-interaction, FE-23 is conversational-quality/transparency.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: navigator.clipboard requires a secure context (HTTPS or localhost) so localhost dev works; production via vercel.app HTTPS works. Mental test: click button → toast appears → paste somewhere else → original text.
- lesson:
  1. **`group relative` + absolute-positioned hover-revealed button is now the established pattern.** First introduced in FE-18 (pencil on user bubble), then FE-13 (delete on sidebar row), now FE-22 (copy on assistant bubble). Pattern: parent gets `group relative`, the action button gets `absolute -top-1.5 -right-1.5 ... opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity`. Reusable, three lines of utility classes. Worth a small `<HoverActionButton>` extract if more surfaces adopt it.
  2. **Clipboard API needs the try/catch even though TypeScript thinks it returns void.** `navigator.clipboard.writeText` throws synchronously OR rejects asynchronously depending on browser + context. Wrapping the await in try/catch covers both. The "Couldn't copy" toast is rare but real — iframes, browsers without clipboard permission, ancient Safari.
  3. **`isStreamingThis` + `it.content.trim()` together prevent a flicker.** Without these gates, the Copy button would appear briefly during streaming as soon as the bubble had any content, then disappear when the cursor caught up, then re-appear when streaming ends. Gating on `!isStreamingThis && it.content.trim()` keeps it out of view until the bubble is settled.
  4. **`useCallback([toast])` is enough; don't depend on items / content.** The handler takes `text` as a parameter, so it doesn't close over per-bubble state. Including `items` or `content` in the deps would cause unnecessary re-creates on every render. Pattern: prefer pass-through parameters over closing over component state when stable handlers are important.

## 2026-05-24 — FE-21 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-21-inline-svg
- branch: auto/fe-21-inline-svg (stacked on auto/fe-20-rename-conversation)
- summary: Inline SVG rendering for chart / infographic / thumbnail tool cards. New `components/plagia-ai/InlineSvgPreview.tsx` takes `svg: string` + `toolName: PlagiaAiToolName` and renders the SVG inside a white-background container (always white regardless of theme, to match the downloaded file appearance) with a "Download SVG" link button below. Fade-in via framer-motion `opacity: 0 → 1` (250ms); `useReducedMotion()` short-circuits via empty motion props. SR-only label "(Chart|Infographic|Thumbnail) output" precedes the SVG so screen readers don't read the markup. Wiring: new `getInlineSvg(it)` helper at the bottom of PlagiaAiApp returns the SVG string or null; the tool-card render slots `<InlineSvgPreview svg={inlineSvg} toolName={it.name} />` between the running/progress block and the done/failed expandable preview. Download mechanism reuses the FE-12 Blob + URL.createObjectURL + synthesized `<a download>` pattern with a `setTimeout(revoke)` on the next tick.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs a real PlagiaAI chart dispatch to confirm the SVG renders correctly. The lib/svg-templates.ts output is already self-contained (P0-04 confirmed each `wrap()` adds a white background rect) so the inline render shouldn't pose new layout issues. dangerouslySetInnerHTML risk is acceptable here because the SVG source is OUR template — not user-controlled.
- lesson:
  1. **`dangerouslySetInnerHTML` for self-generated SVG is appropriate; for user input it isn't.** This SVG comes from `lib/svg-templates.ts` which we author. The Mistral LLM only emits a JSON SPEC (title, palette, etc.); the actual SVG markup is built deterministically by our code. So the XSS risk is the same as any other server-rendered template. Documenting this distinction in a code comment is worthwhile because future iterations might be tempted to inline user-pasted SVG, which would be unsafe.
  2. **White background regardless of theme matches the downloaded file.** Earlier P0-04 audit found that `dark:bg-gray-950` on the chart/infographic tool-page containers clashed with the SVG's white bg. The fix was always-white. Same applies here — inline preview ALWAYS uses `bg-white` so what the user sees in the chat is what they'll get when they download.
  3. **The IIFE `(() => { ... })()` wrapper for inline conditional rendering reads cleaner than nested ternaries** when you need to compute a value and check it before rendering. Here: `getInlineSvg(it)` returns `string | null`, and we want to render only when non-null. `{(() => { const svg = getInlineSvg(it); return svg ? <Preview svg={svg} /> : null })()}` avoids both the double-call of `getInlineSvg(it) && <Preview svg={getInlineSvg(it)!} />` and the type-narrowing pain of a non-null assertion.
  4. **`PlagiaAiToolName` constrains the helper to known tools.** The InlineSvgPreview props type for `toolName` uses the same union as the rest of the chat code. Partial<Record<...>> for the lookup tables (TOOL_LABELS, FILENAME_BASE) means future tools added to the union without an entry here will get sensible fallbacks ("Output", "plagia-ai") rather than crashing or showing `undefined`.
  5. **Opacity-only entrance under reduce-motion is still appropriate.** WCAG 2.3.3 covers vestibular-triggering motion (large translations, parallax) — fades are explicitly fine. So the InlineSvgPreview's opacity fade keeps running even when MotionConfig suppresses transforms globally. Pattern: when adding new motion, ask "is this transform-based or opacity-based?" — opacity is safe under reduce-motion; transforms must be gated.

## 2026-05-24 — FE-20 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-20-rename-conversation
- branch: auto/fe-20-rename-conversation (stacked on auto/fe-19-regenerate)
- summary: User-renameable conversation titles. Storage: new `renameConversation(id, newTitle)` in `lib/plagia-ai/storage.ts` — a pure UPDATE on `plagia_ai_conversations.title` + `updated_at` bump. Trims whitespace + clamps to `TITLE_MAX_CHARS` (60) server-side. Returns boolean for the UI to act on. UI: ConversationSidebar's row gets a third state alongside (normal | confirming-delete): renaming. When `renamingId === c.id`, the row renders an autofocused `<input type="text">` instead of the title button. Enter commits, Escape cancels, blur commits, empty draft keeps the editor open with a red border. The row's action area now shows TWO hover-revealed icons (Pencil for rename, Trash2 for delete) wrapped in a small flex container. Both inline and drawer variants share the same flow because filter state + rename state both live in `ConversationList`. Parent `PlagiaAiApp` provides `handleRenameConversation(id, newTitle)` which calls the storage helper, toasts on failure, and refetches the list on success so the sidebar shows the new title without a manual reload.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs a real Supabase row to confirm the UPDATE writes correctly. Mental model: click pencil → input appears with current title → type new → Enter → row briefly shows new title (from refetch) → input dismounts.
- lesson:
  1. **Refetch the list, don't optimistically update.** Considered locally setting `conversations[i].title = newTitle` to skip the network round-trip. Rejected because Supabase RLS might silently reject the UPDATE (e.g. row belongs to another user — shouldn't happen but defensive). Refetching ensures the UI never diverges from the database. Cost is one extra round-trip per rename — negligible on this surface.
  2. **`onBlur` commits + Escape cancels + Enter commits is the right keyboard contract for inline rename.** Users expect "click away = save" in this idiom (file explorers, Notion, Linear). Wrapping the same `commitRename` in both Enter and onBlur means one path. Escape gets its own handler that just clears the editing state without calling the API.
  3. **Visual error state via border-color, not toast, for "empty title".** A toast on every empty-string submit would be noisy. The input border flips red when `renameDraft.trim() === ""`. The commit handler short-circuits before hitting Supabase. Pattern: validation feedback should be co-located with the input that triggered it; toasts are for transient errors that aren't visible at the input.
  4. **maxLength on the input mirrors the server-side clamp.** Storage helper does `.slice(0, TITLE_MAX_CHARS)`. The input gets `maxLength={60}` so the user can't type more than the database will store. Belt-and-suspenders: even if the input attribute is bypassed (devtools edit), the server still trims.
  5. **TWO hover-revealed icons demand a container.** Originally `<button delete /> <button rename />` would stack at different opacity-transition timings. Wrapping both in `<div className="flex items-center mr-1">` makes them rise/fall as one unit. Cosmetic but noticeably smoother.

## 2026-05-24 — FE-19 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-19-regenerate
- branch: auto/fe-19-regenerate (stacked on auto/fe-18-edit-message)
- summary: ChatGPT-style "Regenerate" button under the most recent assistant text bubble. Pre-compute `lastAssistantId` once before the items.map (cheap; items is short). Inside the assistant render branch, `isLastAssistant = it.id === lastAssistantId`. Show the button only when `isLastAssistant && !streaming && !editingMessageId && it.content.trim()`. Click: walk back from end of `items` to find last assistant, then walk back to the immediately preceding user message; truncate items to drop the user message and everything after; call `sendMessage(userTurn.content, { baseItems: truncated })`. This rewinds to just before the user→assistant pair (and any intervening tool calls) and re-runs the same prompt for a different answer. Button uses `RotateCcw` icon (same as the existing error-retry banner — consistent visual vocabulary).
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs a real chat with multiple turns to confirm. Mental model: after a wrap-up, button appears below the latest assistant bubble; clicking re-runs the model. While streaming the button hides (good). After streaming completes it re-appears.
- lesson:
  1. **Pre-compute "is last X" once, not per-item in the map.** Doing `items.slice().reverse().find(...)` inside each map iteration is O(N²) on large lists. Pre-computing `lastAssistantId` before the map is O(N) total. For chat threads this rarely matters but the pattern scales better when the list gets long. Worth doing by default.
  2. **`sendMessage` with `{ baseItems: truncated }` is the FE-18 refactor paying dividends.** Same pattern as edit-and-resend, just a different truncation index. The override prevents the closure-staleness race that would otherwise lose the truncate. FE-18 and FE-19 are conceptually different (edit vs re-roll) but share the underlying mechanism: "rewind history, append a new user turn, let the server run from there".
  3. **Tool calls are not a separate edge case for regenerate — they're implicit.** The spec mentioned "treat the whole turn (user → tool[s] → assistant) as the unit". My truncate logic just walks back to the preceding USER message — everything between (tool cards, assistant reasoning text) gets dropped automatically because they're all AFTER the user turn. No special-case code needed. The slice index does all the work.
  4. **Disable the button while editing is in flight.** If the user opens the edit-message editor (FE-18) AND the Regenerate button is visible, clicking Regenerate while the editor is open would create confusing state. Gating on `!editingMessageId` removes the conflict cleanly.
  5. **Visual vocabulary: RotateCcw for "redo this".** Existing error-retry banner uses the same icon. Consistent: any "re-run this thing" surface across the app uses RotateCcw. Future regenerate-on-cost-failure (or similar) should reuse the icon.

## 2026-05-24 — FE-18 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-18-edit-message
- branch: auto/fe-18-edit-message (stacked on auto/fe-17-sidebar-filter)
- summary: ChatGPT-style edit-and-resend on user bubbles. Hover state on a user bubble reveals a small pencil button (top-right corner, `-top-1.5 -right-1.5`, `opacity-0 group-hover:opacity-100`). Click → bubble morphs into an inline editor: Textarea + Cancel + "Save and resend" buttons. Save: truncate `items` to drop everything AT and AFTER the edited message, then call `sendMessage(editedText, { baseItems: truncated })`. Keyboard: Escape cancels, Ctrl/Cmd+Enter saves. Save button is disabled when text is empty, unchanged, or `streaming`. Editing state (`editingMessageId`, `editingDraft`) is cleared on conversation switch, Clear, and New chat to prevent stale editor state across surface changes.
- key refactor: `sendMessage` gained an `opts.baseItems?: ChatItem[]` parameter. Without it, the truncate-then-resend flow races React's state batching — `setItems(truncated)` doesn't flush before `sendMessage` reads `items` from its closure, so the truncate is lost and the new message appends to the pre-edit history. `baseItems` lets the caller hand sendMessage the exact starting point. Default behavior (`baseItems ?? items`) preserves every existing call site.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: needs a real chat with multiple turns to confirm the truncate-and-resend behavior. Mental model says yes: click pencil on message #3 of 5 → 1, 2, edit-textarea visible; click save → 1, 2, new message #3' appears + assistant response streams. Messages 4 and 5 are gone (expected).
- lesson:
  1. **`sendMessage` had a hidden coupling to `items` from closure.** Originally `const nextItems = [...items, newMsg]`. Refactoring to `[...base, newMsg]` where `base = opts.baseItems ?? items` lets the caller short-circuit closure-staleness. Pattern: any send-style function that reads "the current list" from closure should accept an optional override for callers who need to start from a different list. Cheaper than a ref-based workaround.
  2. **`requestAnimationFrame` for post-mount focus + cursor-positioning.** When the textarea is conditionally rendered (mounted only when `editingMessageId === it.id`), calling `el.focus()` synchronously won't work — the element doesn't exist yet. `requestAnimationFrame(() => { el.focus(); el.setSelectionRange(...) })` runs on the next paint when React has flushed the new DOM. Same pattern is already used in `handleSuggestedPrompt` for the textarea — repeating it here for consistency.
  3. **Pencil placement: `-top-1.5 -right-1.5` outside the bubble corner.** Putting the pencil inline inside the bubble would shift content or compete with text. Floating it OUTSIDE via negative top/right keeps the bubble body unchanged and signals "this acts on the whole bubble". The `h-6 w-6 rounded-full bg-background border` styling makes it look like a small floating action button. ChatGPT uses a similar pattern.
  4. **Disable Save when text is empty OR unchanged.** Edge cases the user will hit: blanking the text by mistake, or opening the editor and clicking Save without typing. Both should no-op. Easy guard: `editingDraft.trim() === userContent` covers the unchanged case; `!editingDraft.trim()` covers the empty case. Both gate the button's `disabled` attribute.
  5. **Clear editing state on EVERY surface-change.** New chat, Clear conversation, Select different conversation — all three blow away the items array. If `editingMessageId` survives, the editor would render against a missing ID OR, worse, hijack a different conversation's message ID. Trivial bug, easy to forget. Resetting alongside the other state cleanups is the right pattern.

## 2026-05-24 — FE-17 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-17-sidebar-filter
- branch: auto/fe-17-sidebar-filter (stacked on auto/fe-16-result-reveal-rest)
- summary: Client-side substring filter for the conversation sidebar. ConversationSidebar gains a `filterQuery` state + a `<input type="search">` slot above the conversation list. Visible only when `conversations.length >= FILTER_MIN_CONVERSATIONS` (= 6) — small lists don't need filtering. Filter is case-insensitive substring on `c.title`. Both variants (inline desktop sidebar, mobile drawer) share the input — the state lives at the outer component so they can't drift. ConversationList signature got two new props (`isFiltered`, `onClearFilter`) so its empty-state branch can distinguish "no conversations yet" from "no matches for the current filter". Filtered empty state shows "No matches" + a violet "Clear filter" button that resets the query.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: Need a real account with 6+ saved conversations to see the input render. Mental test against the threshold logic: at 5 conversations the input stays hidden; at 6 it appears; with a non-matching query the "No matches" branch fires.
- lesson:
  1. **Filter state at the OUTER component, not the list.** Tempted to put the input + state inside ConversationList. Bad: both inline and drawer variants render the list separately, so the input would either need to be duplicated OR the variants would have separate filter state (worst — switching modes would lose the query). Putting state at the outer component means the filter is "owned by the sidebar instance" and applies regardless of how it's rendered.
  2. **Threshold-gated filter UI is the better pattern than always-show.** A filter input for 3 conversations is visual noise — it's faster to just scan. `FILTER_MIN_CONVERSATIONS = 6` reflects a reasonable point where scanning becomes annoying. ChatGPT does the same thing (their search appears as the list gets long). Constant-named threshold makes it tweakable later.
  3. **Empty-state context is a prop, not a guess.** ConversationList's empty state previously assumed `conversations.length === 0` = "no saved yet". With filtering, the array can be empty because nothing matches — different UX. Adding `isFiltered` as an explicit prop lets the component render the right state without re-deriving from outer state.
  4. **`<input type="search">` gives the user the clear-X for free** in most browsers — they get a small clear button at the right edge of the field when there's content. Combined with our custom "Clear filter" link in the empty state, two ways to clear. Pattern: prefer `type="search"` over `type="text"` for anything that filters.
  5. **`focus:ring-1` is the cheap focus indicator** to match the rest of the site. Tailwind's default `focus:ring` is 3px which is heavy for a small input. 1px reads cleaner.

## 2026-05-24 — FE-16 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-16-result-reveal-rest
- appended-to-backlog: FE-17 (sidebar conversation filter — frictionless-interaction) and FE-18 (edit a previous user message — conversational-quality). Both serve the four-pillar charter and are obvious ChatGPT-style gaps surfaced by the FE-13 sidebar polish + the broader UX consistency pass.
- branch: auto/fe-16-result-reveal-rest (stacked on auto/fe-15-reduce-motion-audit)
- summary: Extended `<ResultReveal>` (created in FE-14) to the remaining 9 tool pages so every tool now has a consistent reveal animation when its result lands. Per page:
  - ai-humanizer: wrapped the words-changed + actions toolbar.
  - chart-generator: wrapped the metadata strip (chart-type pill + title + actions). Required switching `chartInfo.X` → `chartInfo?.X` inside the wrapper since the TS narrower no longer reaches inside.
  - image-to-text: wrapped the confidence + word-count + copy toolbar.
  - infographic-generator: wrapped the title + SVG/download actions strip.
  - thumbnail-generator: wrapped the entire preview block (header chip + SVG aspect-ratio frame). Container has its own border/bg, so no layout shift when reveal fires.
  - voice-to-essay: wrapped the entire Essay Output card (header + body + action chips). Larger reveal but the card has min-height implicitly via content; acceptable.
  - audio-summarizer: wrapped the Summary Output card. Required adding an inner `{summary && (...)}` narrower to satisfy TS for the ~10 `summary.X` accesses inside.
  - speech-to-text: wrapped the Cleaned Transcript card.
  - plagiarism-checker: replaced the inline `<motion.div initial animate>` with `<ResultReveal show={isChecking || !!result}>`. The motion.div was ungated for reduce-motion and used `y: 16` (larger than ResultReveal's default y: 6) — the swap makes it consistent + respects MotionConfig.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean (after fixing two TS-narrowing cases: optional-chaining on chart-generator's `chartInfo`, and adding the inner `{summary && ...}` guard on audio-summarizer).
  - `npm run lint` clean (pre-existing billing + image-to-text warnings only).
  - Behavior verification gap: needs a real-browser pass to confirm each reveal feels right against each tool's specific output shape. Mental model says yes; the wrapper is opacity + small Y, so even on larger result blocks (voice-to-essay, audio-summarizer) the motion stays subtle.
- lesson:
  1. **AnimatePresence breaks TypeScript narrowing on the wrapped children.** Patterns like `{result && (<div>{result.foo}</div>)}` give TS the narrowing inside `{}`. After `<ResultReveal show={!!result}>{<div>{result.foo}</div>}</ResultReveal>`, TS sees the children as a normal subtree where `result` could still be null. Two fixes:
     - Optional chaining (`result?.foo`) — cheap if the inner has a handful of accesses.
     - Inner runtime guard (`{result && (<div>...</div>)}`) — better when there are many accesses (chart-generator had 6 references; audio-summarizer had ~10).
     Use whichever is fewer source-line edits. Avoid non-null assertion (`result!.foo`) — masks bugs if the runtime narrowing in the parent ever loosens.
  2. **Swapping inline `motion.div` for `<ResultReveal>` is the right consolidation.** The plagiarism-checker had its own `motion.div initial animate transition` predating FE-14. Replacing it with `<ResultReveal>` (a) makes the entrance consistent with the other 12 tools, (b) gets `prefers-reduced-motion` gating for free via the wrapper's `useReducedMotion()` + MotionConfig, and (c) removes 4 lines of motion-prop boilerplate. Any future inline motion.div on a result panel is now a code smell — convert to ResultReveal.
  3. **Smoke-test surface: pick 3 with distinct shapes.** Not all 9 tool pages have the same render. ai-humanizer is a horizontal stat strip; chart-generator is a chip + SVG; voice-to-essay wraps a whole card. Verifying behavior on one variant doesn't transfer to the others. Manual test list: paraphraser (FE-14 baseline), thumbnail-generator (image SVG, distinct from text), audio-summarizer (largest block, motion most visible). Document this in the PR description.
  4. **Bulk-apply iterations: read all targets first, then edit.** Tried to be efficient by surveying each file's result-render pattern in one grep pass before opening any edit. Caught the chart-generator chartInfo-narrowing issue mentally but it still tripped tsc; the audio-summarizer narrower-needed issue was a surprise. Future bulk-apply iterations should pre-check whether the wrapped content uses ANY refs to the truthy-checked variable — those are the narrowing-loss spots.

## 2026-05-24 — FE-15 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-15-reduce-motion-audit
- branch: auto/fe-15-reduce-motion-audit (stacked on auto/fe-14-tool-motion)
- summary: Reduce-motion compliance audit + hardening. Two structural fixes
  cover the whole site:
  1. **framer-motion gating** — new `components/motion-provider.tsx`
     exports a thin `"use client"` MotionProvider wrapping
     `<MotionConfig reducedMotion="user">`. Mounted in `app/layout.tsx`
     between ThemeProvider and the children. Every `<motion.*>` below
     this point automatically suppresses transform / scale / position
     animations when `prefers-reduced-motion: reduce` is set (opacity
     still animates — non-vestibular). This eliminates the need to
     retrofit `useReducedMotion()` into each of the 16 motion-using
     files individually.
  2. **Tailwind transform-on-state gating** — every `hover:scale-*`,
     `hover:-translate-*`, `group-hover:scale-*`,
     `group-hover:translate-*`, and the shadcn Button's
     `active:scale-[0.97]` got a `motion-safe:` prefix so the transform
     only applies when the user has NOT set reduce-motion. 13 class
     instances fixed across 5 files: nav.tsx, ui/button.tsx,
     plagia-ai/OneChatAllTools.tsx, plagia-ai/SuggestionChipBar.tsx,
     all-tools/page.tsx, pricing/page.tsx.
  Verified: grep "hover:scale-|hover:-translate-|group-hover:scale-|group-hover:translate-|active:scale-" minus "motion-safe:" minus the disabled-state override returns ZERO ungated transforms.
  Already-compliant surfaces (untouched): app/globals.css `button:active` has its own `@media (prefers-reduced-motion: reduce)` override; tool-page-header.tsx + ResultReveal.tsx both use `useReducedMotion()` (added in FE-14).
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification gap: a real-browser test with OS reduce-motion enabled would confirm framer-motion's MotionConfig actually suppresses the transforms — confirmed by reading the framer-motion docs (`reducedMotion="user"` automatically reads window.matchMedia("(prefers-reduced-motion: reduce)")).
- file-by-file outcome:
  - components/motion-provider.tsx — NEW, mounts MotionConfig.
  - app/layout.tsx — mounts MotionProvider below ThemeProvider.
  - components/nav.tsx — 2 group-hover transforms gated.
  - components/ui/button.tsx — active:scale gated.
  - components/plagia-ai/OneChatAllTools.tsx — 1 group-hover:scale gated.
  - components/plagia-ai/SuggestionChipBar.tsx — 2 hover translates gated.
  - app/all-tools/page.tsx — 1 hover-translate, 1 group-hover-scale gated.
  - app/pricing/page.tsx — 1 hover-scale, 3 group-hover-scale gated.
  - All 16 framer-motion-using files (FAQ, FeatureShowcase, etc.) — NOT modified individually; covered globally by the new MotionConfig.
- lesson:
  1. **`<MotionConfig reducedMotion="user">` is the silver-bullet pattern.** Single mount in the root layout covers every `<motion.*>` in the tree. Without it, you'd need `useReducedMotion()` + ternary motion props in every component — 16 separate edits, each a small risk for inconsistency. MotionConfig is provider-pattern; framer-motion does the per-component check internally. The only files that still need explicit `useReducedMotion()` are ones doing custom transition math NOT covered by motion props (none in this repo yet).
  2. **MotionConfig must live in a "use client" component.** App Router server layouts can't import framer-motion directly. The pattern: wrap MotionConfig in a tiny client component (12 lines) and import that. Keeps the root layout server-rendered.
  3. **Tailwind's `motion-safe:` variant is the cheapest way to gate CSS transforms.** `motion-safe:hover:scale-110` resolves to `@media (prefers-reduced-motion: no-preference) { ...hover styles }`. Existing Tailwind variant — zero new CSS, zero new media queries to write. Applies the entire chained variant (hover + scale-110) only when motion is preferred. Use this for ANY transform-bearing class chain; don't reach for the `motion-reduce:` inverse unless you specifically need to set a fallback value.
  4. **Already-compliant surfaces deserve a one-line note in the audit.** Two surfaces were already correct: the global `button:active` rule in globals.css (explicit `@media` override) and tool-page-header + ResultReveal (use `useReducedMotion()` directly). Mentioning them in the lesson keeps future audits from re-touching them.
  5. **Opacity is NOT motion in the WCAG sense.** WCAG 2.3.3 only applies to non-essential motion that can trigger vestibular disorders — fades and color changes are fine. framer-motion's MotionConfig honors this: it suppresses transform / scale / position but lets opacity continue. So entrance fades still play under reduce-motion. Correct behavior; don't try to also strip the fades.

## 2026-05-24 — FE-14 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-14-tool-motion
- branch: auto/fe-14-tool-motion (stacked on auto/fe-13-sidebar-polish)
- summary: Two new motion surfaces + applied to 4 representative tool pages.
  1. `components/tool-page-header.tsx` — wrapped its root in `motion.div` with `{opacity:0, y:8} → {opacity:1, y:0}` (300ms ease-out). `useReducedMotion()` from framer-motion short-circuits the motion props to `{}` under `prefers-reduced-motion: reduce`, so reduced-motion users see the header instantly with zero translate.
  2. `components/plagia-ai/ResultReveal.tsx` (NEW) — small client wrapper that takes `show: boolean` + `children` and renders the children inside an `AnimatePresence mode="wait"` keyed by `"result"` with `{opacity:0, y:6} → {opacity:1, y:0}` (250ms). Also `useReducedMotion()` gated.
  3. Applied to 4 representative tool pages: paraphraser, summarizer, ai-detector, grammar-checker. The wrapper goes around the conditional toolbar/chip block that mounts when a result exists — the main result container (which has `min-h-*` to reserve space) stays as-is, so no layout shift.
  - Remaining 9 tool pages tracked as the new FE-16 backlog item.
- appended-to-backlog: FE-16 — extend ResultReveal to the 9 remaining tool pages (humanizer, plagiarism-checker, image-to-text, chart-generator, infographic-generator, thumbnail-generator, voice-to-essay, audio-summarizer, speech-to-text).
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing billing + image-to-text warnings only).
  - Behavior verification gap: motion looks right in mental model; would benefit from a real-browser pass to confirm the 250ms reveal vs the 300ms header entrance reads as polished, not staggered.
- lesson:
  1. **`useReducedMotion()` short-circuits cleanly via empty motion props.** Pattern: `const props = prefersReducedMotion ? {} : { initial, animate, transition }`. Then spread `{...props}` on `<motion.div>`. Empty object means framer-motion uses neither initial nor animate — the element just renders in its final styled state. Cheaper than gating with `if/else` rendering paths and survives mid-tree mounts gracefully.
  2. **A shared `ResultReveal` wrapper beats per-page `motion.div` inlines.** Without it, every tool page would need three import lines (`motion`, `AnimatePresence`, `useReducedMotion`) plus six lines of motion props per result block. The wrapper exports a 1-line API (`<ResultReveal show={cond}>...</ResultReveal>`) and centralizes the timing constants. Future tweaks (faster, slower, easing change) happen in one place.
  3. **The conditional toolbar is the right thing to animate — not the container.** Most tool pages structure their result panel as: a conditional toolbar (mounts on result existence) + a main container (always mounted, `min-h-*` reserves space). Animating the toolbar gives the user a clear "the result arrived" signal without layout shift. Animating the entire container would either cause shift OR require pre-mounting an empty motion.div with reserved height, which is more code.
  4. **`mode="wait"` is the safer AnimatePresence default for single-child reveals.** Even when there's only one conditional child, mode="wait" prevents transient double-mounts during state changes (e.g. result A → result B). Default popLayout briefly stacks both during transition.
  5. **Ship the wrapper + N representative applications, file follow-up for the rest.** When an item touches "every tool page", shipping all 13 in one iteration risks bloat. Spec-justified scope: wrapper + 2-3 demonstrations. The extension to the rest gets its own backlog entry (FE-16). Keeps iterations focused without blocking the user on a 13-page diff.

## 2026-05-24 — FE-13 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-13-sidebar-polish
- branch: auto/fe-13-sidebar-polish (stacked on auto/fe-12-export)
- summary: Four sidebar/chat polish improvements bundled per spec.
  (a) Active conversation row gets a 2px violet left-edge indicator (`absolute left-0 top-1 bottom-1 w-[2px] bg-violet-500 rounded-r-sm`) on top of the existing `bg-accent`. Reads at-a-glance even in long lists.
  (b) Per-row entrance: extracted `ConversationList` internal component, wrapped its row mapping in `AnimatePresence initial={false}` with motion.div rows using `layout="position"` + `{opacity:0, y:-4} → {opacity:1, y:0}` (200ms ease-out). New conversations (after saveConversation) animate in; deletes animate out. The OUTER AnimatePresence (for collapse list-fade) stays at the wrapper level; they don't fight because they target disjoint elements.
  (c) Chat-thread cross-fade on conversation switch: wrapped the empty-state/scroll-area branches in `AnimatePresence mode="wait"` + a single motion.div keyed by `conversationStarted ? (conversationId ?? "active") : "empty"`. 150ms opacity. `mode="wait"` is critical because the chat scroll-area mounts a new `ref={scrollRef}` element — overlapping the old + new during transition would let the scroll-tracker bind the wrong DOM node.
  (d) Mobile drawer: ConversationSidebar got a `variant: "inline" | "drawer"` prop. Inline = existing desktop behavior (`hidden lg:flex`, width-transition collapse). Drawer = always-expanded body with an X close button, no `hidden lg:flex`. PlagiaAiApp adds `mobileSidebarOpen` state, a `lg:hidden` hamburger button in the chat header, and an AnimatePresence-wrapped drawer using `translateX(-100%) → 0` (200ms) + a fading backdrop. Drawer closes on backdrop tap, on Escape (keydown listener registered only while open), and after row tap (handleSelectConversation + handleNewChat both set `mobileSidebarOpen = false`). `role="dialog" aria-modal="true"` for screen readers.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing billing + image-to-text warnings only).
  - Behavior verification gap: drawer slide-in + active indicator look right in mental model; need a real mobile viewport to confirm the drawer width (280px max-w-[85vw]) feels right vs 90vw.
- lesson:
  1. **Nested AnimatePresences are fine when they target disjoint DOM trees.** Two layered Presences in the sidebar: outer fades the WHOLE list on collapse; inner animates individual row enter/exit. They never compete because the outer animates its child (the list wrapper) and the inner animates the row siblings inside that wrapper. The classic "fighting Presences" bug only happens when both target the SAME element via different mechanisms. Disjoint trees = safe.
  2. **`mode="wait"` is mandatory when the element being cross-faded carries a ref the parent relies on.** The chat scroll-area has `ref={scrollRef}` used by auto-scroll. With default `mode="popLayout"`, two scroll-area DOM nodes briefly co-exist — the ref binds to whichever React assigns last. That causes auto-scroll to jump to the old (exiting) element for a frame. `mode="wait"` serializes the transition so refs are stable. Pattern: cross-fade only with `mode="wait"` whenever the wrapped element has stateful descendant behavior (refs, focus, scroll position).
  3. **Drawer as separate variant beats prop-controlled outer wrapper.** Considered passing `forceVisible` / `className` overrides to make ConversationSidebar render either inline or drawer based on parent context. Picked `variant: "inline" | "drawer"` instead. Reasoning: the inline mode owns collapse logic; the drawer mode is always expanded. Squashing both into one render path forced a half-dozen ternaries and made the inline outer `<aside>` lie about itself. Branching at the top of the component keeps each mode self-describing.
  4. **Hamburger placement: chat header beats nav.** Considered putting the conversations toggle in the nav bar. Chat header is better because the action is scoped to the PlagiaAI surface — putting it in the nav implies it works on tool pages too, which it doesn't. Convention: surface-local actions live in the surface header; site-wide actions live in the nav.
  5. **Escape-key listener registered ONLY while drawer is open.** A long-lived window-level keydown listener catches every Escape across the page (closing menus that may not exist). Gating the listener on `mobileSidebarOpen` with the useEffect's dependency array means it's installed when the drawer opens and torn down when it closes. Cheap, zero side effects elsewhere.

## 2026-05-24 — FE-12 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-12-export
- branch: auto/fe-12-export (stacked on auto/fix-home-viewport-fill)
- summary: Markdown export of the current conversation. New `lib/plagia-ai/export.ts` ships three pure helpers (`formatExportTimestamp`, `formatExportFilename`, `conversationToMarkdown`) plus the impure `downloadConversationMarkdown` that builds a Blob + clicks a synthesized `<a download>`. Filename format: `plagia-ai-YYYY-MM-DD-HHMM.md` (local time). Body format: H1 with the human date, then per-turn `## You` / `## PlagiaAI` H2s separated by blank lines, tool turns rendered as fenced \`\`\`tool <name> blocks containing `<argsSummary>` line and either `<resultPreview>` (done) or `<error>` (failed) or a `(in progress)` / `(awaiting confirmation)` status label. Empty assistant text is skipped (matches the on-screen render). `PlagiaAiApp.tsx` adds a Download-icon Export button in the chat header, placed between the Settings button and the Clear flow, only visible when `conversationStarted && !confirmingClear`. Disabled while streaming. On click, maps the local `ChatItem[]` to the export's `ExportableMessage[]` (strips IDs / progress / pendingConfirm / result — none of those belong in a static Markdown artifact), calls `downloadConversationMarkdown`, then toasts the filename.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing billing + image-to-text warnings only).
  - Behavior verification gap: a live download triggers in a real browser; the Blob/URL.createObjectURL path is exercised every click. Mental smoke-test only — no test framework wired into this repo.
- lesson:
  1. **Decouple the export shape from the component's local discriminated union.** `PlagiaAiApp.tsx` has its own `ChatItem` union with progress / pendingConfirm / IDs that don't belong in a static artifact. Instead of importing `ChatItem` from the component into the lib (which would create a backwards dependency), I declared a thin `ExportableMessage` in the lib with just the fields the renderer needs. The component does a one-screen mapping at the call site. Cheaper than refactoring the chat union into a shared module, and the lib stays pure (no React, no component knowledge).
  2. **Return the filename from `downloadConversationMarkdown` so the caller can toast it.** The download is impure but the helper is a thin shim, not a UX surface — it doesn't know if a toast system exists. Returning the filename lets the caller decide whether to surface it. Pattern: side-effect functions that produce a piece of state worth reporting should return that state, not just `void`.
  3. **`setTimeout(() => URL.revokeObjectURL(url), 0)` is the canonical cleanup.** Revoking synchronously after `.click()` cancels the download in some browsers because the URL is still in use. The tick delay gives the browser time to start the download, and the URL is freed shortly after.
  4. **The chat header button order matters.** Settings → Export → Clear reads left-to-right as "configure → save your work → destructive action". Putting Export between Preferences and the Clear flow naturally gates the destructive action with the save option, even though they're separate flows. ChatGPT does the same thing (history download next to delete-all in the data controls).
  5. **`!confirmingClear` gating on Export prevents visual collision.** The confirming-clear state replaces the Clear button with a "Clear this conversation? Cancel / Confirm clear" row that already takes the right-hand width. Showing Export in parallel would push the row off-screen on narrow viewports. Easy to miss when adding adjacent buttons.

## 2026-05-24 — FE-11 — shipped (bundled into the hand-fix branch)
- pr: bundled — see the 2026-05-24 hand-fix commit
- branch: same as the hand-fix branch
- summary: Wired the existing `lib/plagia-ai/followups.ts` helper into `app/api/plagia-ai/route.ts`. Added `lastSuccessfulToolName: PlagiaAiToolName | null` declared at the top of the stream `try` block so it's visible to both the directDispatch path (FE-04 resume) and the normal round loop. Set it to `outcome.ok ? toolName : same` in both success branches (directDispatch line ~370, normal round line ~609). At the suggestions-emit site (~line 469), compute `effectiveFollowups = model.followups.length ? model.followups : lastSuccessfulToolName ? getFallbackFollowups(lastSuccessfulToolName) : []` and emit using that. The model's own marker still wins — only the absent-marker case triggers the fallback. Verified by `tsc --noEmit` clean.
- NO-ACCESS-FILES audit: clean.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
- lesson: **Scope a "last successful" tracker at the broadest `try` block, not inside the round loop.** I originally declared `lastSuccessfulToolName` inside the round-loop scope, but the directDispatch path runs BEFORE that scope opens, so it couldn't share the state. Lifting the declaration to the top of the stream `try` fixed it cleanly. Pattern: any state that needs to span "pre-loop setup + loop body" lives at the `try`-scope level.

## 2026-05-24 — out-of-loop hand-fix — UI polish + ChatGPT layout
- pr: n/a (user-named branch, started as `auto/fix-home-viewport-fill`, expanded mid-session)
- branch: same
- status: shipped to working tree (user reviews + commits manually before resuming the loop)
- summary: User paused after FE-10 to fix two complaints by hand:
  1. PlagiaAI page layout — sidebar didn't fit, chat felt off-center because the chat row was wrapped in `container max-w-6xl mx-auto`, then `max-w-7xl` + a hand-added "mirror spacer" — both wrong. The ChatGPT-correct pattern is no max-width on the chat row at all; sidebar sits flush against the viewport edge and the chat column gets its OWN `max-w-3xl mx-auto` internally. The visual asymmetry (chat sits right of viewport center when sidebar is open) is intentional and matches ChatGPT — DO NOT compensate.
  2. Buttons across the site had no click feedback and most surfaces had no motion. Added a global `@layer base` rule in `app/globals.css` so every native `<button>` and `[role="button"]` gets `active:scale(0.97)` press feedback. Updated the shadcn `Button` to include `transform` in its transition list so the press is smooth (not snap). Added framer-motion entrance + scroll-reveal to OneChatAllTools, HowItWorks, TrustSignals, SuggestionChipBar, EmptyState. Added a smooth width transition to the conversation sidebar collapse. Added a mobile-menu open/close motion to the nav.
- files touched (working tree, not committed):
  - `app/globals.css` — global button press-feedback rule (`@layer base button:active`).
  - `components/ui/button.tsx` — added `active:scale-[0.97]` + transform to transition list + `disabled:active:scale-100` override.
  - `components/plagia-ai/PlagiaAiApp.tsx` — chat row no longer wrapped in any `max-w-*` container; chat column has its own `max-w-3xl mx-auto px-4 py-6` inside. Removed the mirror-spacer hack.
  - `components/plagia-ai/ConversationSidebar.tsx` — full rewrite to use width-transition (`w-14` collapsed, `w-[260px]` expanded) + AnimatePresence for the conversation list. Cleaner internal spacing (no more `pr-3 mr-1` artefacts).
  - `components/plagia-ai/SuggestionChipBar.tsx` — staggered entrance + `hover:-translate-y-0.5`.
  - `components/plagia-ai/EmptyState.tsx` — soft mount entrance.
  - `components/plagia-ai/OneChatAllTools.tsx` — scroll-reveal columns + hover lift + tool-icon transition.
  - `components/plagia-ai/MarketingReveal.tsx` (NEW) — shared `whileInView` wrapper so the homepage marketing sections can stay server-rendered.
  - `app/page.tsx` — homepage `HowItWorks` and `TrustSignals` blocks now use `MarketingReveal`.
  - `app/all-tools/page.tsx` — tool cards get hover lift (`hover:-translate-y-0.5`) + scoped transition (color + border + transform).
  - `components/nav.tsx` — mobile-menu open/close wrapped in `AnimatePresence` with backdrop fade + drawer slide.
  - `components/footer.tsx` — link hover gets `transition-colors` + `hover:underline`.
- new docs:
  - `.claude/loop/UI-POLISH-SPEC.md` — layout rules + four motion patterns (press, hover-lift, scroll-reveal, mount entrance) + the "no decoration without a pillar" filter.
  - `improvements.md` — appended FE-13 (sidebar deep polish: active indicator, conversation switch animation, mobile drawer), FE-14 (tool-page motion pass: ToolPageHeader entrance + result reveal), FE-15 (reduce-motion audit).
- NO-ACCESS-FILES audit: clean. No file under `.claude/NO-ACCESS-FILES/` was read, listed, or modified.
- verification:
  - `npx tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only on `app/billing/page.tsx` and `app/image-to-text/page.tsx`).
  - No build run (per the standard env-key issue with the restricted payment routes).
- lessons for future iterations:
  1. **`container max-w-*` is the wrong wrapper for any layout that contains a sidebar.** It centers the whole row, which means the sidebar gets pushed inside the centered box and looks broken. ChatGPT, Linear, Notion, Slack — none of them constrain their sidebar inside a centered container. Sidebar gets the full left edge; the chat/main content gets its OWN internal `max-w-*` and `mx-auto`. If you find yourself adding a "mirror spacer" to "fix" alignment, you've already taken a wrong turn — back out the max-width wrapper instead.
  2. **The chat column WILL sit right of viewport center when the sidebar is open. That's correct.** Resist the urge to compensate. The eye reads "sidebar + content" as a complete layout; an empty right gutter to "balance" the sidebar reads as wasted space.
  3. **`button:not(:disabled):active { transform: scale(0.97) }` in `@layer base` is the cheapest possible site-wide press-feedback affordance.** Tailwind's `transition-colors` utility on individual buttons doesn't fight it — the press still happens (snap-in if no transition-transform, smooth if there is). 60ms in, ~150ms out (the global base rule sets the out-transition). On surfaces where smooth is critical (shadcn Button), include `transform` in the transition-property list explicitly.
  4. **`MarketingReveal` is worth its weight.** It's a 12-line component but it lets the homepage stay a server component while individual marketing cards get scroll-reveal motion. Without it, the whole page becomes `"use client"`, which loses RSC benefits. Pattern worth repeating for any future server-page marketing surface.
  5. **`100svh` not `100vh`** for sticky-layout heights on mobile. The `s` in `svh` = small viewport height = accounts for iOS Safari URL bar. Using `100vh` overshoots when the URL bar is visible. Already applied at `section min-h-[calc(100svh-3.5rem)]`.
  6. **JSX div balance is the #1 source of `tsc` errors when restructuring layouts.** I had to add 1 extra `</div>` after introducing a new content wrapper. When restructuring, always count opening and closing tags by indentation before saving — TS17008 errors are mostly off-by-one balance problems. Worth keeping a comment marker like `{/* close chat row */}` near the bottom of complex JSX.
  7. **The loop is paused, not done.** All seed FE items shipped (FE-01..FE-10). FE-11 was started by the previous iteration (the `followups.ts` file is committed in the working tree) but not finished — the route.ts integration is still pending. FE-12 is `todo`. Three new items (FE-13/14/15) were appended by THIS hand session. Next loop iteration: pick FE-11 (resume), then top-down through FE-12, FE-13, FE-14, FE-15 per RULES.md.

## 2026-05-22 — FE-10 — shipped — last seed FE item closed
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-10-followups  (stacked on FE-09)
- branch: auto/fe-10-followups
- summary: Follow-up suggestion chips after every successful tool wrap-up. Pattern: model appends a `[[FOLLOWUPS: a | b | c]]` marker to its wrap-up message (per new system-prompt rule 10 with concrete ✓/✗ examples). Server's `extractFollowups` helper regex-matches the marker, splits on `|`, trims/clamps each, and removes the marker from the visible text BEFORE emitting the delta. New `PlagiaAiSuggestionsEvent` SSE type carries the parsed array. Client state `followupSuggestions` (string[]) populates on receipt; chips render below the chat thread when `!streaming && followupSuggestions.length > 0`. Clicking a chip clears the array immediately (debounces against double-click), then calls `sendMessage(suggestion)`. Cleared on new send / Clear conversation / New chat so stale chips never linger.
- appended-to-backlog: FE-11 (server-side follow-up fallback when model omits the marker — defensive: deterministic mapping from tool name to default suggestions) and FE-12 (Markdown export of the conversation — common chat UX gap).
- NO-ACCESS audit on this iteration's diff: clean.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean.
  - `npm run lint` clean.
  - Behavior verification gap: needs a real Mistral chat to confirm the model emits the marker per rule 10. The server's parse + strip is exercised even without a live call (regex tested in head).
- lesson:
  1. **Magic-string markers in assistant text are a legitimate pattern for "structured data alongside prose" when you control both sides of the pipe.** Function calling would have been overkill for "the model tags 3 strings"; emitting JSON in a fenced code block would have leaked into the UI. Plain magic strings (`[[FOLLOWUPS: ...]]`) parsed server-side give you structured data with zero protocol overhead. The downside is the model might forget to emit (hence FE-11 fallback).
  2. **Parse-and-strip BEFORE emitting the delta is critical** — otherwise the user sees the marker in the chat for an instant. Since this route uses `chat.complete` (not streaming), the full text is available server-side before any delta is sent, so the strip is straightforward. If we ever switch to `chat.stream`, this becomes harder and we'd need buffered detection.
  3. **The "clear chips on send" rule prevents stale suggestion bugs.** Without it, suggestions from turn N would still be clickable while the user is typing turn N+1, leading to confused behavior. Pattern: anything that summarizes a single turn must be cleared at the start of the next turn.
  4. **PlagiaAI continuous-evolution duty is now active and meaningful.** All 10 seed FE items shipped. Per RULES.md, every shipped iteration should append 1–2 new FE items if obvious follow-ups surfaced. FE-11 emerged directly from FE-10 (defensive fallback for when the model forgets); FE-12 is a quality-of-life follow-up that the four-pillar charter has been waiting for (frictionless-interaction). The loop now sustains itself off these append-as-you-ship items.

## 2026-05-22 — FE-09 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-09-preferences  (stacked on FE-08)
- branch: auto/fe-09-preferences
- sql-required-one-time: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plagia_ai_preferences JSONB DEFAULT '{}'::jsonb;`
- summary: Persistent per-user PlagiaAI preferences stored as a JSONB column on `user_profiles`. New `lib/plagia-ai/preferences.ts` exports `PlagiaAiPreferences` (paraphraseMode, humanizerTone, summaryLengthPercent, alwaysConfirmImageSpend), `sanitizePreferences`, `loadPreferences`, `savePreferences`, and `buildPreferencesSystemMessage`. Server route fetches the user's preferences on every request and, if any keys are set, prepends a second `{ role: "system" }` message right after the main SYSTEM_PROMPT — only the explicitly-set keys appear in the prompt addendum (per spec: "Don't bloat the system prompt"). Client adds a `⚙ Preferences` button in the chat header (always visible when signed-in; was conditional on conversation-started). Click opens an inline `<PreferencesPanel />` with form controls: paraphrase mode select, humanizer tone select, summary length range slider, and an "always confirm image spend" checkbox. Save persists via Supabase; failure (e.g. missing column) toasts the user with a pointer to run the migration.
- NO-ACCESS audit on this iteration's diff: clean.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean. Hit a Block-scoped-variable error initially because I put the FE-09 useEffect+save handler ABOVE `const { toast } = useToast()` — fixed by moving just the effect + handler block below the toast declaration while keeping the state declarations near the other state block.
  - `npm run lint` clean.
- lesson:
  1. **Hook ordering matters for closure-captured values.** I declared the FE-09 state alongside other state blocks (clean visual grouping) but tried to call `useCallback` referencing `toast` BEFORE `const { toast } = useToast()`. Even though both are inside the same component function, TypeScript flags this as a temporal-dead-zone (TDZ) violation: `Block-scoped variable 'toast' used before its declaration`. Fix: split the FE-09 setup — state declarations stay grouped with other state at the top of the component, but the `useEffect` and `useCallback` that reference `toast` move below the `useToast()` line. The split actually reads cleaner — "state up top, effects/handlers down below" is a familiar React pattern.
  2. **JSONB column + sanitize-on-read-and-write is the right shape for evolving preferences.** A separate column per preference would require a migration for every new key. JSONB + `sanitizePreferences` lets the file's type definition be the schema. Sanitize on BOTH load AND save: load defends against old / stale rows; save defends against callers passing arbitrary keys.
  3. **Graceful-degradation when a column doesn't exist yet.** Both load and save are wrapped in try/catch and return `EMPTY_PREFERENCES` / `false`. The UI uses the return value to show a toast that explicitly tells the user to run the migration. The route doesn't crash — it just skips the preferences system message. Pattern: any new optional Supabase column should be read defensively until the migration is widely deployed.
  4. **"Don't bloat the system prompt" = build-the-message-only-if-set pattern.** `buildPreferencesSystemMessage` returns `null` when nothing is set, and the route uses `...(prefsSystemMessage ? [{ role: "system", content: prefsSystemMessage }] : [])` so an empty preferences object doesn't waste any tokens on an empty addendum. Important for cost — every system message persists across every Mistral round in the loop.
  5. **Inline panel beats modal when content is short.** A modal would have required focus-trap management, escape-key handler, dimming backdrop, etc. The inline panel slides open under the chat header, takes ~150px of vertical space, and doesn't interrupt the chat scroll. For a small form (4 controls + Save/Reset), inline > modal almost always.
  6. **SQL migrations in commit body (not in repo) for non-restricted schema changes.** Per the project conventions, schema SQL goes in the PR body so the user can copy-paste it. Tested approach: include the exact `ALTER TABLE ... IF NOT EXISTS` so the user can rerun the SQL safely (idempotent).

## 2026-05-22 — FE-08 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-08-a11y  (stacked on FE-07)
- branch: auto/fe-08-a11y
- summary: ARIA semantics for the PlagiaAI chat surface. The scroll container now declares `role="log" aria-live="polite" aria-atomic="false" aria-label="PlagiaAI conversation"` so new messages get announced politely as they're appended. User/assistant bubbles (including the always-on GREETING) carry `<span className="sr-only">You said:</span>` / `Assistant said:` prefixes so screen-reader pronunciation has sender context. Tool-card motion.div gets `role="status"` with a dynamically-computed `aria-label` that reads e.g. "Plagiarism Checker tool: running." → "…done. 12% plagiarism · 3 matches"; transitions land inside the parent aria-live region so each status flip is announced. The expand chevron gains `aria-expanded={isExpanded}` plus tightened labels and explicit `type="button"`. The textarea has `aria-label="Ask PlagiaAI"` + `aria-describedby="plagia-ai-keyboard-hint"` pointing at the existing "Ctrl+Enter to send" span (now id'd). Streaming-cursor blinker gets `aria-hidden="true"` so it's not vocalized.
- NO-ACCESS audit on this iteration's diff: clean (single source file edited; no harness or restricted paths touched).
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Manual a11y test recipe in commit body — Chrome devtools Accessibility tab confirms role=log/aria-live=polite on the scroll container; tab through messages to verify focus order; VoiceOver/NVDA reads "You said: … / Assistant said: … / Plagiarism Checker tool: running.".
- lesson:
  1. **`role="log"` is the right container for an append-only chat thread.** ARIA Authoring Practices recommends `role="log"` (not `feed` or just `region`) for chronological message logs where the user mostly reads, only the latest is the "live" part, and order matters. Pair with `aria-live="polite"` to announce new messages without interrupting whatever the user is currently doing (vs. `assertive` which barges in).
  2. **`aria-atomic="false"` is critical for chat live regions.** Default `aria-atomic="true"` would cause the screen reader to re-read the ENTIRE chat history on every new message. Setting it to false means only the appended content is announced. Easy to miss, big UX impact.
  3. **Sender prefix via `<span className="sr-only">You said: </span>` is the cheapest way to add screen-reader context without affecting sighted users.** Pure CSS class — no role, no ARIA — works for any internationalization (the prefix string is just text). Apply consistently to every message variant; here that's user / assistant / greeting / tool labels.
  4. **`role="status"` + dynamic `aria-label` is how you announce status TRANSITIONS, not just initial state.** Because the parent is `aria-live="polite"`, when the tool card's `aria-label` changes from "Plagiarism Checker tool: running." to "…done.", the screen reader announces the new label. The role="status" itself is also a live region (implicitly polite) so it works even outside a live-region container.
  5. **`aria-describedby` works even when the target is visually hidden.** The "Ctrl+Enter to send" hint is `hidden sm:inline` (hidden on mobile via display:none). Screen readers still pick up `aria-describedby` references — `display:none` content is read via described-by relationships. Mobile users get the keyboard cue audibly, even though the visual hint is suppressed. Good defensive pattern: any non-redundant visual hint should be referenced via aria-describedby from the relevant input.

## 2026-05-22 — FE-07 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-07-mobile-polish  (stacked on FE-06)
- branch: auto/fe-07-mobile-polish
- summary: Three mobile-targeted polish edits in `components/plagia-ai/PlagiaAiApp.tsx`: (1) `keyboardInset` state hooked to `window.visualViewport.resize/scroll`, computed as `innerHeight - vv.height - vv.offsetTop`; sticky input wrapper switched from `bottom-4` class to inline `bottom: ${16 + keyboardInset}px` so it rises above the on-screen keyboard. (2) `sidebarCollapsed` defaults to true on `window.innerWidth < 1024` via client-only useEffect (initial state stays `false` to match SSR; flips on mount). (3) Tap targets bumped to h-10 (40px) on mobile / h-9 (36px) on desktop for attach, mic, and Send buttons — was h-8 (32px). Plus `break-words` added to user and assistant message bubbles so URL-style unbreakable tokens can't trigger horizontal scroll.
- NO-ACCESS-FILES audit reaffirmed at user's request: ran the strict-prefix check across all 8 of this session's commits + the merge commit + the uncommitted state files. Zero hits on `.claude/NO-ACCESS-FILES/` in any commit's name list or diff content.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Manual mobile recipe in commit message: Chrome devtools mobile profile, focus textarea, observe input lift above simulated keyboard.
- lesson:
  1. **Hydration-safe responsive state pattern:** initialize state to a value that matches SSR output (e.g. `sidebarCollapsed = false`), then update in a client-only useEffect based on `window.innerWidth`. NEVER read `window.innerWidth` in the initial useState callback — that throws on SSR. NEVER skip the useState default and just use `useEffect(() => setX(window.innerWidth < 1024))` — there's a flash of wrong content. The match-SSR-then-flip pattern avoids both pitfalls.
  2. **`window.visualViewport` is the right API for keyboard handling on iOS/Android.** Computing `innerHeight - vv.height - vv.offsetTop` gives the on-screen-keyboard intrusion in CSS pixels. `vv.offsetTop` is critical — without subtracting it, pinch-zoom panning is misread as a keyboard open event. Subscribe to BOTH `resize` and `scroll` on `vv` since some browsers fire only one of them when the keyboard opens.
  3. **Style-prop dynamic positioning beats CSS class swap for sticky elements.** Switching between `bottom-4` and `bottom-[80px]` requires Tailwind to compile both classes; dynamic insets in inline `style={{ bottom: ... }}` are arbitrary numbers without tailwind config gymnastics. Use the inline-style escape hatch when the value is genuinely runtime-derived.
  4. **`h-10 sm:h-9` is the "mobile-bigger" responsive pattern.** Tailwind's mobile-first defaults mean the unprefixed value applies on mobile and `sm:`/`md:`/`lg:` override on larger viewports. Writing `h-10 sm:h-9` reads as "40px on phone, 36px on tablet+". Lower-bound tap targets to 40px on mobile (close to Apple's 44pt without making the row feel chunky). On desktop the 36px size is fine since cursor precision is higher.
  5. **`break-words` on message bubbles is cheap insurance against horizontal-scroll bugs.** Long unbreakable tokens (URLs, base64 fragments the user might paste) would otherwise blow past `max-w-[85%]` and trigger horizontal scroll. Always pair `whitespace-pre-wrap` with `break-words` for user-generated content bubbles.
  6. **The NO-ACCESS audit script is now a tested artifact.** Running `git show --name-only $sha | grep "NO-ACCESS"` across every commit, plus a diff-content grep, plus an uncommitted-tree check, takes ~3 seconds and catches violations a single misplaced `git add .` would otherwise introduce. Worth keeping as a checklist item before pushing any future iteration.

## 2026-05-22 — FE-06 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-06-streaming-tool-results  (stacked on FE-05)
- branch: auto/fe-06-streaming-tool-results
- summary: Forwarded streaming-tool progress to the PlagiaAI tool card. New `PlagiaAiToolProgressEvent { type, id, progress, message? }` added to the SSE event union. Dispatcher's `DispatchCtx` gained optional `onProgress: ({ progress, message }) => void`; `consumePlagiarismStream` invokes it on each intermediate event with `progress` set (and skips when `result` is present — the final 100% event is irrelevant since the UI transitions to "done" anyway). Server route passes an `onProgress` callback to both `dispatchTool` call sites (normal round + FE-04 directDispatch resume); the callback enqueues a `tool_progress` SSE event with the current callId. Client ChatItem.tool gains optional `progress?: number` and `progressMessage?: string`. New event handler clamps to [0, 100] and updates the matching tool item. Tool card render adds a new branch for `status === "running" && progress !== undefined`: thin 1px violet bar + the progress message (or "Working…") on the left and rounded percentage on the right.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean.
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior verification: dispatch plagiarism_check via PlagiaAI; bar should advance ~10% → ~50% → ~90% as the underlying `/api/check-plagiarism` SSE stream progresses. The pattern is already battle-tested by the original plagiarism page so confidence is high.
- lesson:
  1. **Optional callbacks on the dispatch context are cleaner than function-overload signatures.** Putting `onProgress` on `DispatchCtx` (rather than as a 4th param on `dispatchTool`) means non-streaming tools just ignore it and call sites that don't care don't pollute their context. The streaming tool case (one out of 12) reads `ctx.onProgress?.(...)` without ceremony.
  2. **Skipping the final progress=100 event is intentional, not a bug.** The underlying `/api/check-plagiarism` route emits one final event that has BOTH `progress: 100` AND `result: {...}`. Forwarding the 100% as a `tool_progress` event then immediately flipping to `tool_result` would cause a redundant repaint (100% bar → done badge). Skip when `payload.result` is present; the done state is the better signal.
  3. **Two call sites need the same callback (FE-04 directDispatch path AND the normal round path).** Easy to forget when adding a new ctx field. Always grep for every `dispatchTool(` call site after extending `DispatchCtx` — there's no compile-time enforcement since the field is optional.
  4. **Progress bars with `transition-all duration-200 ease-out` look professional even on jumpy data.** The underlying SSE may step from 28% → 78% in one event (per the plagiarism page's ceiling logic); the CSS transition smooths the jump into a ~200ms animated fill rather than a hard cut.
  5. **`role="progressbar" aria-valuenow aria-valuemin aria-valuemax` is the minimum accessible markup.** Screen readers announce progress. Worth adding even for transient UI — costs three attributes, makes the chat accessible-by-default.

## 2026-05-22 — FE-05 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-05-retry-feedback  (stacked on FE-04)
- branch: auto/fe-05-retry-feedback (branched off auto/fe-04-cost-preview because both touch app/api/plagia-ai/route.ts)
- summary: Per-tool retry cap (MAX_RETRIES_PER_TOOL = 2, so 3 total attempts) plus new system-prompt rule 9 with concrete failure-recovery guidance. Server route: a per-request `Map<PlagiaAiToolName, number> failureCounts` tracks CONSECUTIVE failures of each tool name. Gate inserted at the top of the dispatch path: if the counter is at cap, skip dispatch and emit a synthetic tool_call + tool_result(ok:false, error:"Refused — this tool has already failed N times in this turn. Try a different tool or tell the user..."). Success branch resets the counter for that tool (intermittent failures recover gracefully); failure branch increments. The existing pattern of pushing the tool result JSON (including error message) into conversation history already feeds the failure detail back to Mistral — FE-05 doesn't change that, just caps the loop. System-prompt rule 9 spells out three recovery paths (retry same tool with cleaner args / switch tool / apologize to user) and explicitly warns about the hard cap.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean (after rm -rf .next, same routine as prior iterations).
  - `npm run lint` clean (pre-existing warnings only).
  - Behaviour verification gap remains — need a real Mistral call to see whether the model actually picks recovery path (a)/(b)/(c) based on the error message. Quick smoke recipe: pass a negative `length` or empty `text` and observe the model's retry behavior.
- lesson:
  1. **CONSECUTIVE-failure counters are better than cumulative-failure counters for retry caps.** If the user asks for two unrelated paraphrases and the first fails but the second succeeds, the second succeeding SHOULD reset the counter so a third unrelated paraphrase later in the same turn isn't blocked. `failureCounts.delete(fnName)` on success enforces this.
  2. **Synthetic refusal responses are cleaner than just skipping.** When the cap is hit, emitting a fake tool_call + tool_result pair gives the model a proper conversation turn to react to — much better than silently dropping the call and leaving the model wondering why nothing happened. The synthetic error message also tells the model EXACTLY what happened (server refused; switch tactic).
  3. **System-prompt rules that name concrete recovery patterns work better than vague guidance.** Rule 9's a/b/c structure (retry-same / switch-tool / apologize) gives the model a decision tree to follow. Without the structure, function-calling models tend to either re-call the same tool unchanged or immediately surrender — both bad. Concrete recovery patterns + the hard-cap warning anchor the model's strategy.
  4. **Stacking FE branches on each other is the right call when they touch the same file.** FE-04 added the directDispatch handler and cost-confirm gate; FE-05 adds the retry gate; both edit the same dispatch path inside `app/api/plagia-ai/route.ts`. Stacking means each PR's diff is the net delta of that feature; if I branched off main, FE-05 would conflict with FE-04 at merge time. Pattern going forward for FE-* items that touch the route: stack on whichever sibling is the most recent.

## 2026-05-22 — FE-04 — shipped (loop resumed after 11-day pause)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-04-cost-preview  (set base appropriately — local main has FS-07/08/09 + FE-03 merged but origin still behind)
- branch: auto/fe-04-cost-preview (branched off local main)
- summary: Cost-confirmation gate before any expensive tool dispatch. New `lib/plagia-ai/config.ts` exports `TEXT_TOKEN_CONFIRM_THRESHOLD=50`, `IMAGE_TOOLS` set, and `estimateToolCost(name, args)` returning `{ tokens, currency, requiresConfirm }`. Server route: BEFORE each `dispatchTool()` call, runs the estimate; if `requiresConfirm && !skipCostConfirm`, emits a `tool_call` event WITH a new optional `pendingConfirm: { estimatedTokens, currency, args }` payload (instead of dispatching), sets a `paused` flag to break out of both the inner tool loop and the outer round loop, sends `done`, closes stream. Client: tool ChatItem `status` union gains `"pending_confirm"` plus an optional `pendingConfirm` field carrying the args needed to resume; `sendMessage` accepts `opts.directDispatch`; the tool_call handler now MORPHS existing items with the same callId rather than appending duplicates (card flips pending_confirm → running → done in place). When `tool_call` event has no `pendingConfirm`, the card transitions to running; when it has one, the card stays pending and renders amber-tinted "About to use ~X text/image tokens" + Confirm / Cancel / Don't ask again. "Don't ask again" sets `localStorage["plagia-ai-skip-cost-confirm"] = "true"` AND confirms the pending tool in one click. Confirm sends a new POST with `directDispatch: { toolName, args, callId, reason }`; server handles directDispatch BEFORE the round loop by emitting tool_call → dispatching → emitting tool_result → synthesizing the assistant+tool messages into conversation history, then entering the normal round loop to let the model generate the follow-up summary.
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean (after `rm -rf .next` to clear stale type cache — same trick as FS-08/09).
  - `npm run lint` clean for new code; pre-existing warnings on `app/billing/page.tsx` and `app/image-to-text/page.tsx` remain.
  - Behavior quality (does the gate fire on the right tools at the right threshold? Does the model regenerate clean summaries after directDispatch?) needs a real Mistral call — same gap as FE-01/02/03.
- lesson:
  1. **For "pause execution and resume later" flows in SSE-driven UIs, the cleanest pattern is: server emits the partial state then closes; client renders the pause UI; on confirm, client sends a NEW request with a `directDispatch` payload that includes the args needed to skip the model round and dispatch directly.** This avoids server-side memory and keeps the request/response model stateless. The cost is the client has to know the args and echo them back — but the server already gave them in the `pendingConfirm.args` field, so this is one round-trip.
  2. **Morphing an existing item by callId is much better than appending a new one when state transitions through phases.** In the client, the tool_call handler now does `findIndex(it => it.id === event.id)`. If found and existing, update in place (status flip pending_confirm → running). If not found, append. This makes the card transition smooth and avoids duplicate cards across the confirm flow.
  3. **`directDispatch` needs to synthesize a fake `{ role: "assistant", toolCalls: [...] }` + `{ role: "tool", content: ... }` pair in the conversation history** before letting the model run, otherwise the model has no context for the summary follow-up. The synthetic toolCalls entry must mirror Mistral's shape: `{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }` — that's what the model would have emitted naturally, so the model treats the next round as a normal "follow-up after a tool result" turn.
  4. **`...(condition ? { field: value } : {})` for optional fields in JSON-serialized events is a recurring pattern in this codebase** — already used for `reason` in FE-03, now also for `pendingConfirm`. Keeps the wire shape clean: absent vs present, no null/undefined sentinels.
  5. **Localstorage flags should be read inside useEffect, not in the initial useState callback, to avoid SSR hydration mismatches.** Pattern: `const [flag, setFlag] = useState(false)` then `useEffect(() => { setFlag(localStorage.getItem("...") === "true") }, [])`. Server renders with default false, client reads localStorage on mount and updates. No hydration warning.
  6. **`node_modules` keeps vanishing between iterations.** Pattern documented in FS-08 still applies — first Bash of every iteration should be `[ -d node_modules ] || npm install --prefer-offline --no-audit --no-fund` so we don't waste a round-trip discovering it's missing. The lock file is preserved so cached installs are ~6s.

## 2026-05-11 — FE-03 — shipped — loop paused by user
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fe-03-tool-reasoning  (set base to `auto/fs-09-home-swap` until merged, then main)
- branch: auto/fe-03-tool-reasoning (branched off auto/fs-09-home-swap because the chat code lives in `components/plagia-ai/PlagiaAiApp.tsx` after FS-09's extraction)
- summary: PlagiaAI tool cards now show a one-sentence italic muted "Why this tool" caption. Three coordinated edits: (1) `lib/plagia-ai/types.ts` — `PlagiaAiToolCallEvent` gains `reason?: string`. (2) `app/api/plagia-ai/route.ts` — new rule 8 in SYSTEM_PROMPT instructs the model to emit ≤15 words of reasoning immediately before each tool call, with ✓/✗ examples. In the streaming loop, the assistant text in the same Mistral round as the tool_calls is captured as `turnReason` (first non-empty trimmed line) and attached as `reason` to the FIRST tool_call event in the round (subsequent calls share the reasoning, no duplicate captions). Critically, when there are tool_calls, the assistant text is NO LONGER emitted as a `delta` event — otherwise the same sentence would show up as both an assistant bubble AND a tool card caption. When there are no tool_calls, the assistant text streams normally (unchanged path). (3) `components/plagia-ai/PlagiaAiApp.tsx` — `ChatItem.tool` gains `reason?: string`; the tool_call handler stores it; the tool card renders `<p className="text-xs text-muted-foreground italic leading-relaxed">{it.reason}</p>` below the tool name + argsSummary row when present. Conversation storage round-trips unchanged (JSON optional field).
- verification:
  - `./node_modules/.bin/tsc --noEmit` clean (after `rm -rf .next`).
  - `npm run lint` clean (pre-existing warnings only).
  - Behavior gap: I can't verify the model actually emits a short reasoning sentence without a real Mistral call. Same gap documented in FE-01 (system-prompt-only changes are testable only via manual chat).
- lesson:
  1. **Suppress duplicate emission when re-routing assistant text into a UI affordance.** If you're going to render the assistant's pre-tool-call sentence as a tool card caption, you MUST also stop emitting that same text as a delta — otherwise it shows up twice. Easy to miss because the existing code didn't differentiate "text that's the response" from "text that's pre-tool reasoning." The fix: gate the delta emission on `!hasToolCalls` since by rule, the model's text in a tool-call turn is *only* reasoning.
  2. **Optional fields round-trip through JSON storage with zero migration cost.** Persisted ChatItems from before FE-03 simply have `reason === undefined`; the `{it.reason && ...}` conditional means old tool cards just don't show a caption. No schema bump needed, no storage code change needed. The pattern keeps adding small structured-data fields cheap.
  3. **System-prompt rules with concrete ✓ / ✗ examples land much harder than pure prose.** The new rule 8 includes "Plagiarism checker fits — you want originality flags on a passage." as a ✓ and "Sure, I'll run that for you now!" as a ✗. Function-calling models calibrate against examples better than against abstract criteria. Cost: ~80 input tokens per turn, well worth it.
  4. **`...(condition ? {} : { field: value })` spread pattern** is the cleanest way to conditionally include an optional field in a JSON-serialized SSE event. Avoids null/undefined sentinel values that pollute the wire shape. The receiving side just sees the field absent vs. present — type definition with `?:` handles both.
  5. **Loop stopped at user request after this iteration.** Backlog state: FS-07/08/09 all on pushed branches awaiting merge; FE-03 pushed; FE-04 through FE-10 remain `todo`. No ScheduleWakeup queued — the next time the user wants to resume, they invoke `/loop ...` and the next iteration will pick FE-04 (token-cost preview before expensive tool calls).

## 2026-05-11 — FS-09 — shipped — FLAGSHIP redesign track COMPLETE
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-09-home-swap  (PR includes FS-07 + FS-08 + FS-09 because neither predecessor had merged when FS-09 was implemented)
- branch: auto/fs-09-home-swap (branched off auto/fs-08-plagia-ai-redesign; merged in auto/fs-07-plagiarism-route)
- summary: Closed out the redesign-and-swap track. Created `components/plagia-ai/PlagiaAiApp.tsx` (extracted from the old `app/plagia-ai/page.tsx` verbatim minus the ToolPageHeader). PlagiaAiApp takes an optional `marketingFooter?: ReactNode` prop; when supplied AND `!conversationStarted`, marketingFooter renders in place of the default FAQ. `app/plagia-ai/page.tsx` is now a 7-line shell that renders `<PlagiaAiApp />` (no marketing). `app/page.tsx` is now a SERVER component that exports new metadata (title preserves "plagiarism checker" for SEO continuity) and renders `<PlagiaAiApp marketingFooter={...} />`. The marketing footer is `<OneChatAllTools />` (a 3-column grid of all 15 tools) + inline `<HowItWorks />` (3 steps) + inline `<TrustSignals />` (3 pills) + `<FAQ />`. Internal links: nav "PlagiaAI" featured entry now points at `/`; `/all-tools` featured hero card also points at `/`. The nav active-route highlight matches `/` OR `/plagia-ai` so the badge stays lit on either chat surface.
- mid-iteration user feedback: user asked to remove the "ugly PlagiaAI title with description and icon". That was the `ToolPageHeader` rendered inside the old `/plagia-ai/page.tsx`. Removed it from PlagiaAiApp entirely (not gated behind a prop — gone on both routes). The spec's "header prop" pattern was abandoned in favor of always-minimal layout: every route that renders PlagiaAiApp gets just Nav + chat.
- verification:
  - `./node_modules/.bin/tsc --noEmit` → clean (after `rm -rf .next` to clear stale type cache — same `.next/types` cross-branch footgun from FS-08).
  - `npm run lint` → clean for new code; only pre-existing warnings on `app/billing/page.tsx` + `app/image-to-text/page.tsx` remain.
  - `PORT=3120 npm run dev` → all three affected routes returned **200** (first time real 200s in this session — env vars were apparently picked up this run). Grepped rendered HTML: `/` shows "What can I help with today?", "One chat. 15 tools", "One chat. Every tool", "How it works", "Plagiarism Checker" (all expected markers). `/plagia-ai` shows the hero but NOT the marketing markers (correct — focused chat mode).
- lesson:
  1. **`cp <src> <dst>` then Edit is the cheapest way to extract a 1087-line file.** Don't try to recreate it via Write — copy first, then make minimal edits to the new file. The Edit tool's surgical-replace semantics work great on the copy.
  2. **When the predecessor PR hasn't merged, stack the dependent branch on top + merge the OTHER predecessor in.** Pattern: `git checkout <last-predecessor-branch> && git checkout -b <new-branch> && git merge <other-predecessor-branch>`. The merge here was clean because FS-07 and FS-08 touched disjoint files. If they conflicted, this would surface conflicts at the right time (during FS-09's branch creation, not at the user's merge time).
  3. **`marketingFooter` prop pattern for "the home is a tool-page-plus-marketing".** PlagiaAiApp is the same component on both `/` and `/plagia-ai`. The only difference is whether marketing renders below the input — controlled by a single optional ReactNode prop. Both routes share state semantics, message rendering, sidebar, auth — only the footer differs. Future home/tool dual-routes can use the same pattern.
  4. **Mid-iteration user feedback is fine if it sharpens scope, not if it expands it.** User asked to remove ToolPageHeader. That's a focused cut, fits inside FS-09, makes the diff cleaner (one less prop). I integrated it without deferring to a follow-up FE item. Pattern: small simplifications that ride along with the current PR's surface area = accept. New features mid-iteration = defer to next item.
  5. **CURRENT RUN SCOPE in RULES.md auto-restricts future iterations.** With FS-07/08/09 all shipped, the next iteration falls through to FE items (FE-03 → FE-10). The "every 3rd iteration" cadence was suspended for this run, so the loop will work FE items continuously until the user lifts the scope. Worth checking the run-scope section at the start of each FE iteration to confirm we're still bounded.

## 2026-05-11 — FS-08 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-08-plagia-ai-redesign  (set base to `main`)
- branch: auto/fs-08-plagia-ai-redesign (branched off `main` — independent of FS-07)
- summary: Replaced the FS-01 "Try one of these:" 4-chip pill list inside the chat scroll area with a centered ChatGPT-style empty-state hero (H2 "What can I help with today?" + sub "One chat. 15 tools.") plus a 6-chip `SuggestionChipBar` (5 tool starters + 1 "See all tools" outline link). Chips prefill the textarea via `setSelectionRange` inside a `requestAnimationFrame` so the cursor lands at the end after React flushes the new value. When `items.length > 0` the scroll thread renders exactly as before (greeting bubble + AnimatePresence message list). The scroll-to-bottom floating button is left as a sibling of the ternary — its existing `showScrollToBottom` guard keeps it hidden in empty state. Two new components: `components/plagia-ai/EmptyState.tsx` (presentational shell taking children) and `SuggestionChipBar.tsx` (the chip row).
- verification:
  - `./node_modules/.bin/tsc --noEmit` → clean, but only after `rm -rf .next` to clear stale type-cache from the FS-07 iteration's dev server (the cache had references to `app/plagiarism-checker/page.tsx` which doesn't exist on this branch).
  - `npm run lint` → clean for new code; pre-existing warnings on `app/billing/page.tsx` + `app/image-to-text/page.tsx` remain.
  - `PORT=3110 npm run dev` → `/plagia-ai` compiled in 287ms (2129 modules). All routes 500 at request time on the documented local-env Supabase-key gap.
- lesson:
  1. **`node_modules` does NOT persist across loop iterations** in this sandbox. Every fresh iteration needs `npm install` before `tsc`/`lint`. Pattern going forward: first Bash call of any iteration should be `[ -d node_modules ] || npm install --prefer-offline --no-audit --no-fund` so we don't waste a round-trip discovering it's missing. The lock file is preserved so installs are fast-ish (~30s for cached deps).
  2. **`.next/types/` is a footgun across branches**. When iteration N's dev server runs, Next generates `.next/types/app/<route>/page.ts` referencing source files that exist on iteration N's branch. Iteration N+1 (on a different branch where that source doesn't exist) will see those types and `tsc` will fail with `Cannot find module '../../../../app/<route>/page.js'`. **Always `rm -rf .next` after switching branches OR before running tsc.** Better: add `.next` to a per-iteration cleanup checklist.
  3. **Two-h1 trap on tool pages.** `ToolPageHeader` emits an `<h1>` for the page title. Any "hero greeting" you add inside the page content should be `<h2>` (or unmarked, just styled), never another `<h1>`. The spec said h1 — wrong, didn't account for the existing pattern. Going forward: every tool page already has one h1 from `ToolPageHeader`; treat in-page heroes as h2 by default.
  4. **JSX ternary placement matters.** When wrapping a single element in `{cond ? (...) : (...)}`, the `)}` must close right after that element's closing tag — not after later siblings. I got this wrong on the first try, putting `)}` after the floating scroll-to-bottom button (a sibling), which made tsc fail with `error TS1381: Unexpected token`. Easy fix once you see it; faster catch if you re-read the diff with the conditional in mind. The clean structure: `<wrapper>{cond ? <A/> : <B/>}<sibling/></wrapper>` — not `<wrapper>{cond ? <A/> : <B/><sibling/>}</wrapper>`.
  5. **Prefill-cursor pattern.** `setInput(value)` is a React setState — the textarea's DOM `.value` doesn't update synchronously. Calling `setSelectionRange()` on the next line operates on the OLD value, so the cursor lands at the wrong position. Wrap the focus+selection call in `requestAnimationFrame` to let React flush first. Wrap the `setSelectionRange` itself in `try/catch` in case the textarea is briefly out of the DOM.

## 2026-05-11 — FS-07 — shipped (first iteration of the redesign-and-swap run)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/fs-07-plagiarism-route  (set base to `main` — independent of FS-08/09)
- branch: auto/fs-07-plagiarism-route (branched off `main` — FS-06 and prior all merged)
- summary: First iteration after the loop was un-paused. Created `app/plagiarism-checker/` as a server `page.tsx` (exports metadata) + client `content.tsx` split, lifting the plagiarism tool JSX out of `app/page.tsx` verbatim (input, drop-zone, error/token/sign-in banners, PlagiarismResults). The marketing JSX from the current home (hero with trust badge + headline + CTA buttons + trust pills, the 9-tool showcase, the "How it works" 3-step, the features grid, the bottom CTA gradient card) is deliberately NOT copied — those reappear under FS-09 as PlagiaAI-centric sections. Updated the three internal-link spots: `components/nav.tsx` Writing-tools entry, `app/all-tools/page.tsx` Writing grid card, `app/history/page.tsx` `TOOL_META.plagiarism.href`. Sign-in `next=` inside the tool now points at `/plagiarism-checker`. `app/page.tsx` is untouched — FS-09's job; plagiarism is intentionally reachable at both `/` and `/plagiarism-checker` until then.
- verification:
  - `npx tsc --noEmit` → clean (had to install `node_modules` first; this checkout had none).
  - `npm run lint` → clean for new code; only the pre-existing warnings on `app/billing/page.tsx` and `app/image-to-text/page.tsx` remain.
  - `PORT=3100 npm run dev` → `/plagiarism-checker` compiled in 289ms (2084 modules). All routes including the untouched `/` and the existing `/plagia-ai` return 500 at request time on the documented local-env Supabase-key gap (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing). Compile-time is the meaningful signal — verified my new route compiles cleanly.
- lesson:
  1. **`npx tsc --noEmit` does NOT resolve to the project's TypeScript** when `node_modules` is missing — npx pulls down the unrelated `tsc@2.0.4` package and prints a "not the tsc you're looking for" banner. The correct command after `npm install` is `./node_modules/.bin/tsc --noEmit` (no `npx` needed since it's installed locally). Save the fingerprint — if `tsc` appears to succeed with zero output before any compile time has passed, you got the wrong tsc.
  2. **The local-env 500 is universal across all client pages, not just my new route.** When the smoke test shows every route 500ing including `/` (which I never touched), that's strong evidence the failure is local-env-related, not introduced by me. The compile-time Next.js output (`✓ Compiled /plagiarism-checker in 289ms`) is the actual signal that the route exists and the bundle assembled. Document this distinction in the PR body to head off reviewer confusion.
  3. **The "server page + client content" split is mandatory** when you want `export const metadata` on a route whose UI requires hooks. `app/all-tools/page.tsx` doesn't need this split (no hooks, just JSX), but `/plagiarism-checker` does — useState, useEffect, Supabase auth hooks, toast hook, etc. Pattern: copy the entire client body into `./content.tsx` with `"use client"`, then make `page.tsx` a thin server import that exports metadata and renders `<Content />`.
  4. **Macro-pattern: when extracting a tool from app/page.tsx, only the tool body moves.** Hero copy, marketing pills, feature grids, CTAs, the "how it works" section — none of that belongs on a focused tool page. The right test: does the JSX produce text/buttons that exist for the user to USE the tool? Keep. Does it exist to convince someone to USE the tool? Drop.
  5. **Branch lineage:** FS-06 and everything before it has merged to main per `git log` — so FS-07 branches off `main` directly. Future iterations should `git log main --oneline | grep -E "FS-0[678]"` before branching to confirm whether predecessors are merged.

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

---

# CONTINUOUS UI/UX LOOP — log (governed by `.claude/loop/UIUX-LOOP.md`)

## 2026-06-04 — loop-started — baseline confirmed
- summary: User adopted the advanced PlagiaAI line (FS-07..09 + FE-03..24) — merged to `main` (tip `fc5e017`, includes the UI/UX-loop charter + seeded UX-01..05 backlog). Started the continuous UI/UX loop. Baseline check passed: `components/plagia-ai/PlagiaAiApp.tsx` is on `main`, so PlagiaAI is the homepage `/` and the loop builds on the advanced line.
- lesson: The earlier session's fresh FE-03/04/11 PRs (`auto/fe-03-tool-reasoning-2`, `auto/fe-04-token-cost-preview`, `auto/fe-11-markdown-rendering`) are SUPERSEDED by the adopted advanced line and should be closed. ~20 `auto/fe-*` orphan intermediates can be deleted.

## 2026-06-04 — UX-01 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-01-empty-state-clarity  (base `main`)
- branch: auto/ux-01-empty-state-clarity  (off `main`)
- summary: Clarified the PlagiaAI homepage empty state for first-time visitors. Now that `/` IS the chat, the empty state is the first impression; it previously read like a generic chatbot ("What can I help with today?" / "One chat. 15 tools.") without saying what to type or that it runs real tools. Added an eyebrow badge ("One chat · 15 tools" + violet sparkle) for visual hierarchy and at-a-glance value, and replaced the tagline with action+outcome subcopy: "Describe a task or paste your text — PlagiaAI picks the right writing tool, runs it, and shows the result." Single file: `components/plagia-ai/EmptyState.tsx` (+13/-3). Suggestion chips (children) untouched.
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3200 — `GET /` 200, unauth `POST /api/plagia-ai` 401, new copy renders server-side.
- lesson:
  1. **The empty state is now top-of-funnel.** Since FS-09 made PlagiaAI the homepage, empty-state copy is a marketing surface, not just a chat placeholder — it must answer "what is this / what do I type / what happens" for someone who arrived cold. Bias future PlagiaAI copy toward concrete outcomes over clever taglines.
  2. **Empty-state composition:** `EmptyState` (headline/subcopy) wraps `SuggestionChipBar` (passed as children) in `PlagiaAiApp.tsx` (~line 1299). To change chips, edit `SuggestionChipBar.tsx`; to change the framing copy, edit `EmptyState.tsx`. The homepage marketing section below the fold is `OneChatAllTools.tsx`.
  3. **Verify rendered copy server-side** with `curl / | grep` — confirms the empty state isn't gated behind client-only hydration (it isn't; it renders in SSR HTML).

## 2026-06-04 — UX-02 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-02-tool-card-status-pills  (base `main`)
- branch: auto/ux-02-tool-card-status-pills  (off `main`)
- summary: Made tool-card status badges scannable. `ToolStatusBadge` in `PlagiaAiApp.tsx` was bare colored text+icon; redesigned as tinted rounded-full pills (amber Confirm / violet Running / emerald Done / red Failed) at /10 backgrounds with explicit dark-mode foregrounds and `shrink-0`. Swapped the Confirm icon from CheckCircle2 (identical to Done's checkmark) to Coins so "this will cost tokens" reads distinctly. Behaviour, card tint, layout, handlers all unchanged. 1 file, +14/-8.
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3201 — `GET /` 200, unauth `POST /api/plagia-ai` 401.
- lesson:
  1. **The whole PlagiaAI chat UI lives in one big component:** `components/plagia-ai/PlagiaAiApp.tsx` (~2100 lines). Tool-card render ~line 1462; `ToolStatusBadge` ~line 1974; `renderToolResult`/`getInlineSvg` helpers below it. Status enum here is `"pending_confirm" | "running" | "done" | "failed"` (note `pending_confirm`, not `pending`). The card already has FE-06 progress bar, FE-21 inline SVG, FE-23 cost footnote — read the full card before adding to it.
  2. **Pill pattern for statuses:** `inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium` + `bg-{color}-500/10 text-{color}-700 dark:text-{color}-400`. Reuse for any future status chip; the /10 tint + 700/400 fg pair reads well in both themes.
  3. **Distinct icons per state matter:** two states sharing CheckCircle2 (Confirm + Done) hurt scannability more than the missing background did. When polishing status systems, check for icon collisions, not just color.

## 2026-06-04 — UX-03 — shipped (+ appended UX-06)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-03-composer-focus-ring  (base `main`)
- branch: auto/ux-03-composer-focus-ring  (off `main`)
- summary: Added a visible focus state to the PlagiaAI chat composer. The `Textarea` sets `focus-visible:ring-0` (suppresses its own ring) and the wrapping `div` had no focus styling, so clicking into the primary input gave zero visual feedback. Added `focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/30 transition-colors` to the wrapper. 1 file, +4/-1. Appended follow-up UX-06 (same fix for the inline edit-message textarea).
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3202 — `GET /` 200, unauth `POST /api/plagia-ai` 401.
- lesson:
  1. **When a component zeroes its own focus ring, the focus state must move to the wrapper.** `focus-within:` on the container is the clean fix — pattern: `focus-within:border-<accent>/50 focus-within:ring-2 focus-within:ring-<accent>/30`. Grep the codebase for other `focus-visible:ring-0` / `focus:outline-none` to find more invisible-focus spots (the edit-message textarea is one → UX-06).
  2. **Small but high-value beats large but risky.** A 4-line focus-affordance fix is a legitimate iteration — it closes a genuine a11y/ergonomics gap users hit every message. Don't pad iterations; ship the real fix and move on.
  3. **FE-07 already did mobile reach** (10x10 tap targets on attach/mic, h-10 Send on mobile). Check prior FE work before "improving" something that's already handled — the input bar's mobile ergonomics were done; focus visibility was the actual open gap.

## 2026-06-04 — UX-04 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-04-typing-indicator  (base `main`)
- branch: auto/ux-04-typing-indicator  (off `main`)
- summary: Added an in-thread typing indicator (3 staggered bouncing dots) for the latency gap between sending a message and the first streamed delta/tool card — previously the thread showed only the user bubble with no feedback. Renders inside the existing AnimatePresence when `streaming && items[last].kind === "user"`, so it vanishes the moment any assistant content or tool card is appended (no overlap with the streaming caret or running tool card). Reduced-motion safe + `role="status"`/sr-only label. 1 file, +24.
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3203 — `GET /` 200, unauth `POST /api/plagia-ai` 401.
- lesson:
  1. **Audit ALL wait states before picking one** — most were already covered (sidebar skeletons FS-05/FE-13, tool progress FE-06, streaming caret). The single uncovered gap was send→first-token. Map the existing coverage first so the iteration targets the real hole, not a solved one.
  2. **"Last item is the user turn" is a clean derived trigger** for the pre-response wait — no new state needed. The event handlers append an assistant or tool item on the first event, which flips the condition off automatically.
  3. **Staggered dots via negative animation-delay** (`[animation-delay:-0.3s]` / `-0.15s` + `motion-safe:animate-bounce`) gives an out-of-phase typing animation with zero JS and respects reduced motion.

## 2026-06-04 — UX-05 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-05-keyboard-scrollable-transcript  (base `main`)
- branch: auto/ux-05-keyboard-scrollable-transcript  (off `main`)
- summary: Accessibility — FE-08 already did roles/labels/live-region, so audited for the remaining gap: the `role="log"` transcript was scrollable but had no `tabIndex`, so keyboard-only users couldn't focus/scroll it (WCAG 2.1.1). Added `tabIndex={0}` + a `focus-visible` violet ring (2.4.7). 1 file, +5/-1.
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3204 — `GET /` 200 (no SWC compile error), unauth `POST /api/plagia-ai` 401.
- lesson:
  1. **TSX permits `//` and `/* */` comments BETWEEN JSX attributes** — both tsc and Next/SWC compile them fine (verified: `/` returned 200). Useful for annotating a single attribute's intent inline without a separate block.
  2. **When a prior pass (FE-08) already did the obvious a11y work, audit for the specific WCAG criteria it likely missed** — keyboard operability of custom scroll regions (2.1.1) is a common miss even when roles/labels are perfect. Scrollable `overflow-y-auto` containers need `tabIndex={0}` + a visible focus ring.
  3. **Seeded UX-01..UX-05 are now all done.** Next: UX-06 (edit-message focus parity, appended during UX-03), then self-generate. The loop should keep auditing the PlagiaAiApp surface (contrast of /70 muted text, focus management on async completion, sidebar keyboard nav) for the next items.

## 2026-06-04 — UX-06 — shipped (+ appended UX-07, UX-08)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-06-edit-message-focus  (base `main`)
- branch: auto/ux-06-edit-message-focus  (off `main`)
- summary: Parity follow-up to UX-03 — added a `focus-within:` ring (primary palette, matching the edit box's existing border-primary/30 theming) to the inline edit-message wrapper, which had the same invisible-focus gap (Textarea sets focus-visible:ring-0). Edit box's keyboard handling + aria + Save/Cancel were already done. 1 file, +5/-1. Seeded backlog now fully cleared; appended UX-07 (contrast audit of /70 muted text) and UX-08 (focus return to composer after a turn) from audit notes.
- verification: `tsc --noEmit` clean; `next lint` (file) clean; dev smoke on PORT=3205 — `GET /` 200, unauth `POST /api/plagia-ai` 401.
- lesson:
  1. **The `focus-visible:ring-0` + focus-within-on-wrapper pattern recurs** anywhere a shadcn Textarea/Input is wrapped in a styled container (main composer UX-03, edit box UX-06). When adding the wrapper ring, match the wrapper's existing palette (violet for the composer, `primary` for the edit box) rather than forcing one accent — keeps each surface cohesive.
  2. **Loop is self-sustaining now:** seeded items done; appended UX-07/UX-08 to keep direction. Cap is 2 new items per shipped iteration — respected. Keep generating from concrete audit findings (measured contrast, observed focus loss), not speculative churn.

## 2026-06-04 — UX-07 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-07-footnote-contrast  (base `main`)
- branch: auto/ux-07-footnote-contrast  (off `main`)
- summary: Measured-contrast fix. The FE-23 cost footnote used `text-muted-foreground/70` (11px) — computed 2.68:1 (light) / 4.23:1 (dark) against the done-card bg; both fail WCAG AA (4.5). Changed to full `text-muted-foreground` → 4.63 / 7.76, passes, same quiet look. Only sub-AA case found on the chat surface. 1 char-class change.
- verification: contrast computed via a node script from the globals.css HSL tokens; `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3206 — `/` 200, unauth POST 401.
- lesson:
  1. **`muted-foreground` IS the AA floor in this theme** — light 4.63:1, dark 7.76:1 on card. Therefore ANY `text-muted-foreground/NN` with NN<100 drops below AA. Rule of thumb for this codebase: never put an opacity modifier on `text-muted-foreground` for real content text; use full opacity (or `text-foreground/XX` which has huge headroom).
  2. **Contrast math recipe** (reusable): HSL→sRGB, blend fg over bg at the class alpha, then WCAG ratio `(L1+.05)/(L2+.05)`. Dark theme here has `card == background == 240 10% 3.9%`, so `bg-card/NN` resolves to the background — simplifies the bg for any dark-mode contrast check. Light: card/60 over bg(95%) ≈ 98%.
  3. **globals.css token locations:** light tokens ~lines 7-23, dark ~45-61. `--muted-foreground` light `240 3.8% 46.1%`, dark `240 5% 64.9%`.

## 2026-06-04 — UX-08 — shipped (+ appended UX-09, UX-10)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-08-focus-return-composer  (base `main`)
- branch: auto/ux-08-focus-return-composer  (off `main`)
- summary: Return focus to the composer textarea when a turn completes (in the shared sendMessage `finally`, covering normal + confirm/directDispatch). Desktop-only (`pointer: fine`), and only if focus is on the composer (textarea or Send button via new `sendButtonRef`) or nowhere — so it never steals focus from a tool card/sidebar and never re-opens the mobile keyboard. 1 file, +23. Appended UX-09 (Stop-generating/abort) and UX-10 (sidebar keyboard nav).
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3207 — `/` 200, unauth POST 401.
- lesson:
  1. **!! IMPORTANT — the UX-* PRs are stacking UNMERGED on `main`.** Every UX branch is cut from `fc5e017` and the user hasn't merged any yet. They auto-merge ONLY where their PlagiaAiApp.tsx regions don't overlap (so far: ToolStatusBadge / composer-wrapper / typing-indicator / transcript / edit-box / footnote / finally+SendButton are all distinct → clean). **Before each iteration, if your change would touch a region another open UX branch already changed (esp. the composer wrapper = UX-03, the tool-card body, ToolStatusBadge), branch off that branch and set the PR base to it — or pick a non-overlapping implementation.** UX-08 deliberately used `sendButtonRef` instead of a `data-` attr on the composer wrapper to dodge the UX-03 overlap.
  2. **Focus-return pattern:** gate on `window.matchMedia("(pointer: fine)")` to keep it desktop-only, and only refocus when `document.activeElement` is the textarea, the Send button (keep a ref), or `body` — this captures Ctrl+Enter (textarea) and click-Send (button) while never stealing an intentional focus elsewhere.
  3. **shadcn `Button` forwards refs** to the underlying `<button>` (it's `React.forwardRef` + Slot). `ref={someButtonRef}` typed as `HTMLButtonElement` type-checks with no extra work.

## 2026-06-04 — UX-09 — shipped (chained off UX-08)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-09-stop-generating  (**PR base = auto/ux-08-focus-return-composer**)
- branch: auto/ux-09-stop-generating  (off auto/ux-08, NOT main — shares Send button + sendMessage)
- summary: Stop-generating. Per-turn AbortController in `abortRef`, fetch gets its `signal`; the Send button becomes an enabled "Stop" (filled `Square` icon, aria-label) while `streaming`, wired to `handleStop` → abort(). The catch checks `abortController.signal.aborted` and finalizes cleanly (flush partial assistant text, no error toast / no retry). `finally` nulls abortRef. Works for normal + confirm/directDispatch turns (one sendMessage). 1 file, +35/-13.
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3208 — `/` 200, unauth POST 401. (Actual mid-stream abort behaviour needs a signed-in chat to fully exercise — flagged.)
- lesson:
  1. **First chained UX branch.** Because UX-09 edits the same regions as the unmerged UX-08 (Send button, sendMessage), it was cut FROM auto/ux-08 (confirmed `grep sendButtonRef` = present before starting) and its PR base is auto/ux-08. Merge order for the user: UX-08 → UX-09. This is the documented "branch off the latest unmerged branch you overlap" rule in action.
  2. **Abort detection:** check `controller.signal.aborted` in the catch rather than `err.name === "AbortError"` — more robust across fetch/reader rejection shapes. Put `abortRef.current = null` in `finally` so a stale controller never lingers.
  3. **One button, two modes** beats two buttons: keep `ref={sendButtonRef}` stable and swap `onClick`/`disabled`/label on `streaming` — keeps UX-08's focus-return ref valid and avoids layout shift.
  4. **Token caveat to remember:** aborting only stops client consumption; any tool already dispatched server-side this turn has already deducted. Don't imply Stop refunds.

## 2026-06-04 — UX-10 — shipped (+ appended UX-11, UX-12)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-10-sidebar-a11y  (base `main`)
- branch: auto/ux-10-sidebar-a11y  (off `main` — ConversationSidebar.tsx, untouched by other open branches)
- summary: Sidebar a11y. Rows were already buttons with focus-visible action reveal; the gaps were no programmatic active state and no visible focus on the row select button. Added `aria-current="true"` on the active row, a `focus-visible:ring` (violet/40, rounded), and `type="button"`. 1 file, +6/-1. Appended UX-11 (suggestion-chip focus/mobile, clean file) and UX-12 (role=list semantics, off UX-10).
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3209 — `/` 200, unauth POST 401.
- lesson:
  1. **Decorative active indicators need a programmatic twin.** The active row had a violet bar + bg but both are visual (`aria-hidden`); `aria-current` is what AT reads. Whenever you style a "current/selected" state, add `aria-current` (or `aria-selected`/`aria-pressed` as fits) alongside the visual.
  2. **To slow the unmerged-stack growth, prefer next items on files no open branch touches** — clean components here: `SuggestionChipBar.tsx`, `OneChatAllTools.tsx`, `MarketingReveal.tsx`, `ResultReveal.tsx`, `InlineSvgPreview.tsx`, `EmptyState.tsx`(UX-01), and `ConversationSidebar.tsx`(UX-10). `PlagiaAiApp.tsx` now has ~8 unmerged branches touching distinct regions — keep new PlagiaAiApp edits to clearly-separate regions or chain off the relevant branch.
  3. **10 UX iterations shipped (UX-01..10).** Stack is large and unmerged; flagged to the user to merge. Loop remains productive — keep generating from measured/observed gaps, prefer clean files.

## 2026-06-04 — UX-11 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-11-suggestion-chip-focus  (base `main`)
- branch: auto/ux-11-suggestion-chip-focus  (off `main` — SuggestionChipBar.tsx, clean)
- summary: Added on-brand `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40` to the empty-state suggestion chips and the "See all tools" link (they previously fell back to the UA outline). Tap targets/wrap already fine. 1 file, +2/-2.
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3210 — `/` 200, unauth POST 401.
- lesson:
  1. **Standard PlagiaAI focus ring = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40`** (use `/30` on larger surfaces like the transcript/composer). Now applied consistently across composer (UX-03), transcript (UX-05), edit box (UX-06, primary palette), sidebar rows (UX-10), and chips (UX-11). Reuse this token for any new interactive element.
  2. **Clean-file iterations keep the stack conflict-free** — UX-11 on SuggestionChipBar.tsx (untouched elsewhere) merges independently. Continue mining the clean components (OneChatAllTools, MarketingReveal, ResultReveal, InlineSvgPreview) before returning to the heavily-stacked PlagiaAiApp.tsx.

## 2026-06-04 — UX-12 — shipped (chained off UX-10; appended UX-13, UX-14)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-12-sidebar-list-semantics  (**PR base = auto/ux-10-sidebar-a11y**)
- branch: auto/ux-12-sidebar-list-semantics  (off auto/ux-10 — UX-10 not merged; verified via `git show origin/main:...ConversationSidebar.tsx | grep aria-current` = 0)
- summary: Sidebar list semantics — role="list" + aria-label on the row container, role="listitem" per row, loading skeletons wrapped in an aria-hidden div (kept out of the list + decorative). Empty-state hint only renders with zero rows, so the list holds only listitems when populated. Both inline + drawer modes (shared ConversationList). 1 file, +11/-3.
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3211 — `/` 200, unauth POST 401.
- lesson:
  1. **Verify merge status of the base before chaining** — `git show origin/main:<file> | grep <marker>` is a quick way to tell if a prior branch's change reached main. UX-10 hadn't → UX-12 chained off it (base auto/ux-10). Merge order for user: UX-10 → UX-12.
  2. **role="list" needs only listitem children** — wrap transient/decorative siblings (loading skeletons) in `aria-hidden`, and ensure the empty-state is mutually exclusive with rows (it is here). Then the list is clean exactly when it matters.
  3. Appended UX-13 (homepage tool grid → links, clean OneChatAllTools.tsx) + UX-14 (InlineSvgPreview a11y, clean file). Keep favoring clean files; ~12 UX PRs now open/unmerged.

## 2026-06-04 — UX-13 — shipped
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-13-tool-grid-links  (base `main`)
- branch: auto/ux-13-tool-grid-links  (off `main` — OneChatAllTools.tsx, clean)
- summary: Homepage "Every tool" grid items were inert `<li>` text; made each a next/link `<Link>` to its standalone page. Added a verified `href` to all 15 tools (checked each `app/<route>/page.tsx` exists before linking — none guessed), keyboard-focusable with the standard focus ring + hover bg. 1 file, +28/-21.
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3212 — `/` 200, `/paraphraser` (a link target) 200, unauth POST 401, hrefs present in homepage HTML.
- lesson:
  1. **Verify route targets before linking** — `for r in ...; do test -f app/$r/page.tsx; done` confirmed all 15 routes exist (incl. the relocated `/plagiarism-checker`). Never hand-write hrefs from memory; the charter's "leave inert if uncertain" rule means a quick existence check first.
  2. **Functionality (not just polish) is in scope** — turning a static list into navigable links is a real UX win that fits the loop. Mix functionality items in with the a11y/visual ones.
  3. 13 UX PRs shipped; next UX-14 (InlineSvgPreview a11y, clean file). Stack still unmerged — keep mining clean files.

## 2026-06-04 — UX-14 — shipped (+ appended UX-15, UX-16)
- pr: https://github.com/lerboi/plagiacheck/pull/new/auto/ux-14-svg-preview-a11y  (base `main`)
- branch: auto/ux-14-svg-preview-a11y  (off `main` — InlineSvgPreview.tsx, clean)
- summary: Gave the inline-rendered SVG (dangerouslySetInnerHTML) `role="img"` + `aria-label="<label> output"`, replacing a loose sr-only span. AT now names it once and ignores the raw inner `<text>` nodes. Download button already a11y-complete. 1 file, +7/-4.
- verification: `tsc --noEmit` clean; `next lint` clean; dev smoke PORT=3213 — `/` 200, unauth POST 401.
- lesson:
  1. **Rendered-SVG-blob a11y pattern:** for `dangerouslySetInnerHTML` SVG, put `role="img"` + `aria-label` on the WRAPPER — that names it once and stops AT from traversing the inner chart text. Better than a sibling sr-only span (which doesn't suppress the inner traversal).
  2. 14 UX PRs shipped. Remaining clean files: `MarketingReveal.tsx` (UX-15), `ResultReveal.tsx` (UX-16). After those, the clean-file pool is mostly exhausted — future iterations will need to chain off the relevant unmerged PlagiaAiApp.tsx branch per the overlap rule, OR (better) wait for the user to merge the stack. If clean high-value work runs out and the stack is unmerged, consider pausing with a note rather than forcing low-value churn (per UIUX-LOOP stop conditions).

## 2026-06-04 — UX-15 — verified, no change (no PR)
- pr: n/a — closed as verified
- summary: Audited MarketingReveal.tsx. It's a generic opacity+y scroll-reveal wrapper; the global `MotionConfig reducedMotion="user"` (MotionProvider, app/layout.tsx:41-45, FE-15) already suppresses its `y`-translate for reduced-motion users (opacity-only remains). It renders no icons/headings itself, so aria-hidden/heading concerns belong to the children in app/page.tsx, not here. Nothing to fix.
- lesson:
  1. **Closing as verified is a valid loop outcome** — don't manufacture a diff when the audit finds the code already correct (mirrors the prior run's P1-22). Document WHY (here: global MotionConfig covers it) so a future audit doesn't re-open it. No branch/PR.
  2. **The whole app is under `MotionConfig reducedMotion="user"`** — any framer-motion transform (x/y/scale/rotate) is auto-disabled for reduced-motion users app-wide; only opacity runs. So new motion components don't each need manual reduced-motion gating for transforms (but `motion-safe:` is still needed for CSS-class animations like `animate-bounce`, which MotionConfig doesn't touch — see UX-04).
  3. **Runway: clean-file pool nearly dry.** After UX-16 (ResultReveal), if no clean high-value PlagiaAI UI/UX work remains and the 14-PR stack is still unmerged, PAUSE per UIUX-LOOP stop conditions with a summary rather than chaining deep stacks or doing low-value churn.

## 2026-06-04 — UX-16 — verified, no change (no PR) — LOOP PAUSED
- pr: n/a — closed as verified
- summary: ResultReveal.tsx (FE-14) already handles reduced motion explicitly (useReducedMotion → empty motionProps) plus the global MotionConfig; plain wrapper, no roles, no focus trap. Nothing to change.
- **LOOP PAUSED (self-decided, per UIUX-LOOP stop conditions).** Reason: the clean-file pool (files no open UX branch touches) is exhausted — UX-15 and UX-16 both verified-no-change, and SuggestionChipBar/OneChatAllTools/InlineSvgPreview/EmptyState are already done. Remaining surfaces (PlagiaAiApp.tsx, ConversationSidebar.tsx) have multiple UNMERGED open branches; further work there would require deep branch chains, and the ~14-PR stack is still unmerged. Per the charter, pausing beats forcing low-value churn.
- **State of the run:** Shipped UX-01..UX-14 (14 PRs, all off main / chained where noted) + UX-15, UX-16 verified-no-change. All `tsc`/`lint`/dev-smoke clean. Categories covered: copy/clarity, visual polish, focus/keyboard a11y, list semantics, perceived-perf (typing indicator), functionality (focus-return, stop-generating, tool-grid links), contrast, SVG a11y.
- **To resume productively:** merge the open UX PRs (UX-09→base UX-08; UX-12→base UX-10; rest→main) so `main` carries them, then re-run `/loop`. With a fresh consolidated main, future iterations branch cleanly off main again and can tackle deeper PlagiaAiApp.tsx work (e.g. role=list semantics already wanted, command palette / "/" shortcut, error-state polish, message virtualization) without conflicts.
- lesson: **Know when to pause.** A continuous loop's value drops sharply once it must either churn low-value diffs or build fragile deep branch stacks on unmerged work. Pausing with a clear "how to resume" note is the correct, honest outcome — not a failure. The loop resumes the moment the user merges + re-runs /loop.
