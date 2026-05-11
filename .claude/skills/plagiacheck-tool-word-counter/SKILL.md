---
name: plagiacheck-tool-word-counter
description: How the Word Counter tool works — a free, client-only tool at /word-counter that does not call any API or consume tokens. Use when the user asks about word counting, character counting, reading time, the free tool, or anything related to /word-counter.
---

# Word Counter

A pure client-side tool. **FREE** — no auth, no tokens, no API calls.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/word-counter/page.tsx` | The entire tool — UI + logic |

## What it does

Computes, in real time as the user types:
- words (split on whitespace)
- characters (with and without spaces)
- sentences (split on `.!?`)
- paragraphs (split on blank lines)
- estimated reading time (words ÷ 200 wpm, rounded up)
- estimated speaking time (words ÷ 130 wpm, rounded up)

There is **no backend route** for this tool. Don't add one — it's intentionally free as a top-of-funnel offering.

## UI hooks

The page exposes Copy / Clear / Download (.txt) actions that operate on the textarea state. The `disabled={!text}` pattern is used everywhere — keep it consistent if you add new actions.

## Common edits

- This tool's "FREE" badge is set in `components/nav.tsx` via `isFree: true` on the Word Counter entry. Keep them in sync.
- If you want to gate this behind auth in the future, you'd need to add a token check, an API route, and update both the home page and nav.
