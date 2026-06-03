# PlagiaAI Continuous UI/UX Improvement Loop — Charter

This is the authoritative charter for the **continuous UI/UX improvement loop**
focused on the **PlagiaAI tool**. Read it in full at the start of every
iteration. It supersedes the older redesign-run scope in `RULES.md` for this
loop, but the **hard rules and restricted paths in `RULES.md` still apply**.

Trigger: the user runs the `/loop` command documented at the bottom of this file.

---

## Mission

Keep improving the **PlagiaAI tool** — design, user experience, and overall
functionality — one well-scoped, well-documented improvement per iteration,
forever. PlagiaAI is the chat-driven assistant that routes a user's plain-language
request to the right Plagiacheck tool. After the advanced line was adopted it
lives primarily at `/` (homepage) with the app in
`components/plagia-ai/PlagiaAiApp.tsx`; the standalone plagiarism checker is at
`/plagiarism-checker`.

## Baseline assumption

This loop runs **off `main`**, and assumes the advanced PlagiaAI line
(`auto/adopt-advanced-plagia-ai`) has already been merged. Sanity check at the
start of iteration 1: `components/plagia-ai/PlagiaAiApp.tsx` must exist on `main`.
If it does not, **stop and tell the user to merge the adoption PR first** — do not
build on the old simpler line.

## Improvement pillars (every item must serve at least one)

1. **Design quality** — visual polish, hierarchy, spacing, color, typography,
   motion, dark/light parity, empty/loading/error states, responsive layout.
2. **User experience** — clarity, discoverability, friction reduction, keyboard
   support, copy, onboarding, feedback/affordances, micro-interactions.
3. **Functionality & robustness** — fixing rough edges, edge-case handling,
   error recovery, state persistence, sensible defaults, small capability gaps.
4. **Accessibility** — semantics, ARIA, focus management, contrast, reduced-motion,
   screen-reader flow.
5. **Perceived performance** — streaming/skeleton/optimistic UI, avoiding jank,
   reducing layout shift.

Bias toward changes a user would notice and appreciate. Prefer several small,
high-confidence wins over one risky rewrite.

## Out of scope (reject — do not drift)

- Anything outside PlagiaAI and its directly-supporting surfaces
  (`components/plagia-ai/**`, `app/api/plagia-ai/**`, `lib/plagia-ai/**`,
  `app/page.tsx` PlagiaAI homepage, the chat input/sidebar/tool-card UI).
  Shared components (`nav`, `footer`, `ui/*`) may be touched **only** when the
  change is in service of a PlagiaAI improvement and doesn't regress other pages.
- New AI providers (Mistral only) or swapping the SVG-spec image pipeline.
- Multi-user collaboration / sharing / real-time presence.
- General-purpose LLM features unrelated to the Plagiacheck tools.
- Anything requiring a new npm dependency **without explicit user approval**
  (mark `blocked: needs-dep-approval` and move on).
- Any restricted path or pricing value (see RULES.md).

## Per-iteration workflow

1. **Read state** — this file, then `.claude/loop/learnings.md` (recent entries,
   watch for repeat mistakes), then `.claude/loop/improvements.md` (backlog).
2. **Pick ONE item** — the highest-value `todo` item in the **CONTINUOUS UI/UX**
   section of `improvements.md`. If none remain, **self-generate one** new
   high-value PlagiaAI UI/UX/functionality improvement that serves a pillar and
   passes the out-of-scope filter. Number it `UX-NN` (next free) and add it to
   that section before starting.
3. **Mark it `in-progress`** with today's date.
4. **Branch off `main`**: `git checkout main && git checkout -b auto/ux-<NN>-<slug>`.
   If the remote branch name collides, append `-2`, `-3` (never force-push).
5. **Implement** — match existing patterns (shadcn `components/ui/*`,
   Framer Motion for animation, the PlagiaAiApp structure, token deduct/refund in
   tool routes, `recordToolUse` best-effort). Keep the diff focused; don't refactor
   neighbouring code. Don't add features beyond the item's scope.
6. **Verify**
   - `npx tsc --noEmit` — must be clean.
   - `npx next lint --file <changed files>` — clean (the pre-existing warnings on
     `app/billing/page.tsx` and `app/image-to-text/page.tsx` are not yours).
   - Dev smoke on an explicit high port (`PORT=3200` and up — stale node procs
     lock low ports): start `PORT=32xx npm run dev`, wait for "Ready", then confirm
     `GET /` (PlagiaAI) → 200 and unauth `POST /api/plagia-ai` → 401. Smoke any
     other route you changed. `npm run build` fails locally on a pre-existing env
     issue in restricted payment routes — use `tsc --noEmit`, not `build`.
7. **Document thoroughly** (this is a hard requirement of this loop):
   - **PR body / commit body**: what changed, *why* (the UX rationale), a concise
     before → after, and the verification you ran. Written so the user can paste it
     into the PR.
   - **Code comments**: only where the intent is non-obvious. No emojis in code.
   - **`improvements.md`**: flip the item to `done`, add `branch:` and `pr:`.
   - **`learnings.md`**: append a dated entry (item id, outcome, PR link, and any
     reusable insight or gotcha).
8. **Commit specific files only** (never `git add -A`/`.`). Message:
   `plagia-ai: <summary> (UX-NN)` + blank line + body + `Refs:
   .claude/loop/improvements.md#UX-NN` + the `Co-Authored-By` trailer.
9. **Push** `auto/ux-<NN>-<slug>`; capture the `pull/new/...` URL into
   `improvements.md` (the `gh` CLI is not installed — the user opens the PR).
10. **Switch back to `main`** (`git checkout main`); leave `.claude/loop/*.md`
    edits uncommitted on `main` so the next iteration sees them.
11. **Schedule the next wakeup at 270s** (≈4.5 min — keeps the prompt cache warm
    and honours the user's 5-minute max gap). One improvement per iteration.

## Branching note

Each UX item branches off `main`. If the user reviews PRs without merging
immediately and a new item overlaps an unmerged branch's code regions, branch off
that latest unmerged branch instead and set the PR base to it (see the FE-04
learning about verifying branch bases). Otherwise branch off `main`.

## Documentation expectations (summary)

Every shipped iteration leaves: a reviewable PR with a rationale-rich
description, an `improvements.md` entry (done + pr + branch), and a `learnings.md`
entry. Nothing ships undocumented.

## Stop conditions

- A restricted-path violation was attempted → stop, log, surface to the user.
- `tsc`/`lint` keep failing after two reasonable attempts → revert, mark
  `blocked`, log, move on (don't halt the whole loop for one item).
- An item needs a new dependency, a runtime/visual check you can't perform, or a
  product decision the user must make → mark `blocked: <reason>` and move on.
- If you genuinely cannot identify any further worthwhile PlagiaAI UI/UX/
  functionality improvement, write a `learnings.md` entry saying so and stop
  (don't invent low-value churn just to keep going).

## The /loop command

```
/loop Continuously improve the PlagiaAI tool's UI/UX, design, and functionality. Follow .claude/loop/UIUX-LOOP.md exactly. Each iteration: read that charter + .claude/loop/learnings.md (recent) + .claude/loop/improvements.md; pick the next todo CONTINUOUS UI/UX item or self-generate ONE high-value PlagiaAI UI/UX/functionality improvement (number it UX-NN, add it to improvements.md); mark it in-progress; branch off main as auto/ux-<NN>-<slug>; implement it cleanly matching existing patterns; verify with npx tsc --noEmit, npx next lint on changed files, and a dev smoke test on PORT=3200+ (GET / -> 200, unauth POST /api/plagia-ai -> 401); document thoroughly (rationale-rich PR body, code comments only where non-obvious, flip the item to done with branch+pr in improvements.md, append a learnings.md entry); commit specific files only (never git add -A); push and capture the pull/new URL; switch back to main leaving loop docs uncommitted; then schedule the next wakeup at 270s. One improvement per iteration. Never touch .claude/NO-ACCESS-FILES, app/api/paymentstuff|Redirect|webhook|discounts, or any pricing value/priceId. Mistral only; no new npm deps without asking first.
```
