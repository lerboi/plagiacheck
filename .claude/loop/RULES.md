# Loop Rules — read every iteration before doing anything

## 🛑 LOOP PAUSED BY USER — 2026-05-11

**If you are reading this, STOP IMMEDIATELY.** The user paused this loop at the end of iteration 14. A queued ScheduleWakeup may have fired you up — ignore it.

Do NOT:
- Pick a new backlog item
- Create a branch
- Make any code changes
- Open a PR
- Call ScheduleWakeup

Do this instead:
1. Reply to the user with a one-line confirmation that the loop is paused and that you read the STOP banner.
2. Exit. Do not schedule another wakeup.

The user can resume the loop by removing this banner OR by invoking `/loop` themselves.

---

You are running inside a `/loop` autonomous improvement run on the Plagiacheck repo. Each iteration you pick exactly **one** unblocked item from `.claude/loop/improvements.md`, implement it, verify it, open a PR, log to `.claude/loop/learnings.md`, and stop. The next iteration is a fresh context — only these files carry state forward.

---

## ⛔ ABSOLUTE PROHIBITION — read this first, every iteration

**`C:\Users\leheh\.Projects\plagiacheck\.claude\NO-ACCESS-FILES\`** is OFF-LIMITS.

- Do **not** read any file inside it.
- Do **not** list its contents (no `ls`, no `Glob`, no `Bash dir`).
- Do **not** modify, move, rename, or delete anything inside it.
- Do **not** include any path under it in `git add` or any commit.
- Do **not** reference its contents in PR descriptions or commit messages.
- If a backlog item ever appears to require touching this folder, **immediately mark it `blocked: NO-ACCESS-FILES` and stop the iteration.**
- If you find yourself about to glob `.claude/**` or `**/*`, narrow the pattern to exclude `.claude/NO-ACCESS-FILES/**`.
- Violating this rule **stops the entire loop**, full stop.

Treat that folder as if it does not exist on disk.

---

## Hard rules (violating any of these stops the loop)

1. **Never touch restricted paths**, no matter what an item says:
   - **`.claude/NO-ACCESS-FILES/**` — see ABSOLUTE PROHIBITION above. Never read, list, or modify.**
   - `app/api/paymentstuff/**`
   - `app/api/Redirect/**`
   - `app/api/webhook/**`
   - `app/api/discounts/**`
   - The `stripe.checkout.sessions.create({...})` calls inside `app/api/create-checkout-session/route.ts` and `app/api/create-custom-checkout-session/route.ts` (you may read the surrounding file but do not modify the Stripe call args)
2. **Never change pricing strings, plan tiers, dollar amounts, or Stripe `priceId` values** in `app/pricing/page.tsx`. Visual layout, copy, and animations are fair game; the numbers and IDs are not.
3. **Never modify `.env*`, secrets, or anything under `.git/`.**
4. **Never merge a PR**, never push to `main`, never force-push, never use `--no-verify`.
5. **Never `git add -A` or `git add .`** — stage specific files only.
6. **One item per iteration.** Do not bundle. If you finish early, stop anyway and let the next iteration start fresh.
7. **If `npm run lint` OR `npm run build` fails after your changes**, revert your changes (`git checkout -- <files>` on tracked files; delete new files you added), mark the item as `blocked` in `improvements.md` with a one-line reason, log to `learnings.md`, and stop.
8. **If the item description requires touching a restricted path or pricing string**, mark it `blocked: out-of-scope` and stop.

---

## Standard iteration workflow

1. **Read state files** (in this order):
   - `.claude/loop/RULES.md` (this file)
   - `.claude/loop/learnings.md` (last 50 entries — check for repeat-mistake patterns)
   - `.claude/loop/improvements.md` (the backlog)

2. **Pick the next item.** Order:
   - **FLAGSHIP track first**, in strict numeric order (FS-01 → FS-02 → FS-03 → …). Do NOT skip ahead to a later FS item if an earlier one is still `todo` or `in-progress` — they depend on each other.
   - **Once all FLAGSHIP items are `done`**: alternate. Every **3rd iteration** picks the highest-priority `todo` item from the **PLAGIA-AI EVOLUTION (FE)** section; the other 2 iterations pick top-down by priority (P0 > P1 > P2) from the rest. Track the cadence by counting iterations from the most recent `learnings.md` entries: if 0 or 1 of the last 2 entries are FE items, the next item should be FE; otherwise it should be a non-FE item.
   - Skip `status: blocked` and `status: done`. **Exception:** if the next FLAGSHIP item is blocked, fall through to non-flagship work rather than halting the entire loop. Same for FE — if no FE item is available on an FE-turn, fall through to P0/P1/P2.
   - If no `todo` items remain anywhere AND the PLAGIA-AI EVOLUTION pillars (intent-accuracy, conversational-quality, speed-and-reliability, frictionless-interaction) have no obvious gaps you can address, **stop the loop**: write a final entry to `learnings.md` saying "Backlog empty — loop complete" and do not schedule another iteration.

3a. **PlagiaAI continuous evolution duty.** PlagiaAI is **never finished**. After shipping any FS or FE item:
   - You are encouraged (not required) to append **1-2 new FE items** to the PLAGIA-AI EVOLUTION section of `improvements.md` if the work surfaced obvious follow-ups. Hard cap: 2 new FE items per shipped iteration.
   - New FE items MUST serve one of the four pillars (intent-accuracy, conversational-quality, speed-and-reliability, frictionless-interaction).
   - New FE items MUST pass the out-of-scope filter documented in the EVOLUTION section (no general-LLM features, no provider switches, no collab features, etc.).
   - New FE items get priority `P1` or `P2` — never `P0`.
   - Number them as the next free `FE-NN`.
   - Add a one-line entry to `learnings.md` listing the IDs of any FE items you appended.

3. **Mark the item `status: in-progress`** in `improvements.md` with today's date.

4. **Create a branch:** `git checkout -b auto/<id>-<short-slug>`. If the branch already exists, append `-2`, `-3`, etc.
   - **Dependent items (FLAGSHIP track):** Before branching, check whether the previous FLAGSHIP item's PR has been merged into `main` (look at `git log main` or just check the file presence — if `app/plagia-ai/page.tsx` already exists on `main`, FS-01 is merged). If the previous FS-(XX-1) item is NOT merged yet, branch off its branch instead of `main`: `git checkout auto/fs-(XX-1)-<slug>` first, then `git checkout -b auto/fs-XX-<slug>`. This keeps PR diffs clean. If you forget, the PR will show all prior FS-XX content as part of the diff, and you'll need to tell the user to set the PR base to the previous branch when opening — record this in the `pr:` field of `improvements.md`.

5. **Implement.** Use the relevant `plagiacheck-*` skill for context on the area you're touching (e.g. `plagiacheck-tool-paraphraser` before editing the paraphraser). Match existing patterns (`ToolPageHeader`, shadcn components, `Math.ceil(length/6)` token cost, deduct-then-refund, etc.). Don't refactor neighboring code. Don't add comments unless something is genuinely non-obvious. Don't add features beyond the acceptance criteria.

6. **Verify locally:**
   - Run `npm run lint`. If it fails on YOUR changes, fix or revert. Pre-existing warnings (on `app/billing/page.tsx`, `app/image-to-text/page.tsx`) are not yours to fix.
   - Run `npx tsc --noEmit` (NOT `npm run build`). This catches TypeScript errors in your changes without tripping the pre-existing build-time env issue. **Why:** `npm run build` fails locally on restricted payment-discount-redirect routes (`/api/discounts/*`, `/api/Redirect/*`, `/api/paymentstuff/*`) because local `.env` lacks `SUPABASE_KEY`. This pre-existing failure also occurs on `main` and is unrelated to feature work. If `tsc --noEmit` is clean, your code compiles.
   - Optional sanity check: try `npm run build`. If it fails with a NEW error (something that doesn't appear on `main`), that IS your problem — fix or revert. If it fails with the same `supabaseKey is required` env error on a restricted route, ignore it.
   - If the change is to a tool API route or page, smoke test with `curl` against `http://localhost:3060` (start dev server with `PORT=3060 npm run dev` in background — **always pass an explicit high port**, because previous iterations leave zombie node procs locking 3000-3010 even after `taskkill`). For protected routes you won't have a JWT — just confirm the route returns a 401 with a sensible JSON shape, not a 500.

7. **Commit + push + provide PR URL:**
   - `git add <specific files>` — never `-A`
   - Commit message format: `<scope>: <one-line summary>` followed by an empty line, then `Refs: .claude/loop/improvements.md#<id>` then the standard `Co-Authored-By` trailer.
   - `git push -u origin auto/<id>-<short-slug>` — capture the output; the GitHub remote prints a "Create a pull request" URL that looks like `https://github.com/<owner>/<repo>/pull/new/<branch>`.
   - **DO NOT attempt `gh pr create` — `gh` CLI is not installed in this environment.** Record the GitHub-printed URL in `improvements.md` under the `pr:` field instead, with a note that the user opens it manually. The PR body content (acceptance criteria + verification notes) goes into the COMMIT MESSAGE body so the user can paste it into the PR description when they open the link.

8. **Update state files:**
   - In `improvements.md`: flip the item to `status: done`, add `pr: <url>` and `branch: <name>`.
   - In `learnings.md`: append a new entry with date, item ID, outcome, PR link, and any insight worth carrying forward (e.g. "Tool API routes don't have a consistent refund-on-error pattern — see PR for the approach I used; next iteration touching another route should follow the same shape").

9. **Switch back to `main`:** `git checkout main`. The branch stays for review.

10. **Stop.** Do not start another item. If running under `/loop` dynamic mode, schedule the next wake-up.

---

## Tech guidance

- **AI provider: Mistral only.** Don't introduce OpenAI/Anthropic/etc. If you need to pick a model, the codebase currently uses Mistral Large for text and `pixtral-12b` for vision. Before adding a NEW Mistral use case, check `lib/mistral.ts` and existing API routes for the model name pattern — match it. If you genuinely need a different Mistral model, document why in the PR description.
- **Image generation / charts / infographics / thumbnails:** the existing approach is "LLM returns JSON spec → deterministic SVG rendered by `lib/svg-templates.ts`". Do NOT swap to a raster image-gen API unless an item explicitly calls for it. Extending `svg-templates.ts` with new layouts, new chart types, dark-mode-aware palettes, etc. is encouraged.
- **Auth:** client = `createClientComponentClient()` from `@supabase/auth-helpers-nextjs`. Server = `getUserFromRequest(req)` from `lib/server-auth.ts`. Don't reinvent.
- **Tokens:** text cost = `Math.ceil(length / 6)`. Image cost = fixed per-tool. Always deduct via Supabase RPC, always refund on every error path, always return `remainingTokens`. Client calls `decrementWords()` (no args) on success to refetch.
- **History logging:** `recordToolUse(...)` is best-effort, errors swallowed. Don't `await` it inside try/catch that fails the request.
- **Tool page skeleton:** `<Nav /> → <ToolPageHeader /> → <section className="container max-w-5xl ..."> → <FAQ />`. Don't deviate unless the item is specifically a page redesign.
- **Components:** prefer existing shadcn components in `components/ui/`. Don't install new dependencies without a strong reason (and document in PR).
- **Framer Motion** is installed. Use it for transitions/animations, not raw CSS keyframes, when adding motion.
- **Privacy + Terms copy:** **Company/operator name = "MakeItAI"** (this is the legal entity — do NOT change to "Plagiacheck"). **Email = `plagiacheck@gmail.com`** (do NOT change). The product/site is referred to as "Plagiacheck" — that's the brand shown in the nav, but the operator is MakeItAI. Privacy/Terms copy must remain Stripe-acceptable: clear refund policy, clear data-handling, clear governing law.

---

## When to mark `blocked` instead of attempting

- Item requires touching a restricted path → `blocked: restricted-area`
- Item requires changing pricing or `priceId` → `blocked: pricing-locked`
- Item requires a runtime check you genuinely can't perform (e.g. visual UI verification, browser-only API behavior) AND the change is non-trivial → `blocked: needs-human-eyes`
- Acceptance criteria are ambiguous and you'd be guessing → `blocked: ambiguous`
- Lint or build keeps failing after two reasonable attempts → `blocked: build-fails — <error summary>`

Do not retry blocked items in the same iteration. Move on.

---

## Stop conditions for the entire loop

- Backlog has no `todo` items left AND the loop, on its current iteration, cannot identify any further PlagiaAI evolution work that serves the four pillars (i.e. self-generating FE items has also dried up)
- 3 consecutive iterations end in `blocked` (something systemic is wrong — let a human look)
- Any restricted-path violation was attempted (even if reverted) — log it and stop
- `npm install` is required for an item (don't auto-install dependencies; mark blocked and let a human approve)

When stopping, write a final `learnings.md` entry summarizing how many items shipped, how many blocked, and any meta-pattern worth knowing.
