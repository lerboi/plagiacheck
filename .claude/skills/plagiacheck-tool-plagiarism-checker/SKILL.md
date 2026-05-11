---
name: plagiacheck-tool-plagiarism-checker
description: How the Plagiacheck plagiarism checker tool works end-to-end — the home page UI, the SSE streaming API, the Mistral prompt, the algorithmic fallback, and the token deduction flow. Use whenever the user asks about the plagiarism checker, the home page, `/api/check-plagiarism`, the streaming progress bar, plagiarism detection accuracy, or wants to modify any part of this tool.
---

# Plagiarism Checker

The flagship tool. Lives on the **home page** (`/`), not a dedicated route.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/page.tsx` | Home page UI, also hosts the checker card |
| `app/api/check-plagiarism/route.ts` | SSE streaming endpoint |
| `components/plagiarism-results.tsx` | Renders the plagiarism score + highlighted matches |

## How it works

1. User pastes text or uploads a `.txt` / `.md` file (the upload handler in `app/page.tsx` rejects other formats and tells the user to paste).
2. Page calls `POST /api/check-plagiarism` with the user's Supabase access token in the `Authorization: Bearer …` header (via `getAuthHeader()` from `lib/store.ts`).
3. Server validates the JWT (`getUserFromRequest`), atomically deducts text tokens (`deductTextTokens`), then opens a **Server-Sent Events** stream.
4. Stream emits `data: {progress: 0|30|70|80|100}` events as it works, then a final event with `{progress: 100, result, remainingTokens, tokensUsed}`.
5. Client smooths the progress bar with a creep-up effect — see the `useEffect` interval in `app/page.tsx` (~line 93). Don't remove that animation logic; it covers the gap while Mistral is thinking.
6. On any error the server refunds the deducted tokens and emits `{error: "..."}`.

## Token cost

`Math.ceil(text.length / 6)` text tokens. Same formula as every other text tool.

## The Mistral prompt

The system prompt (`ENHANCED_SYSTEM_PROMPT` in the route file) asks Mistral to return a strict JSON object:

```json
{
  "plagiarismPercentage": <0-100>,
  "matches": [
    { "text": "<exact substring>", "startIndex": <int>, "endIndex": <int>, "similarity": <0-100>, "reason": "..." }
  ]
}
```

Temperature is `0.1` for determinism. The route post-processes results: clamps numbers to `[0, 100]`, drops matches with invalid spans, and falls back to `{plagiarismPercentage: 0, matches: []}` if parsing fails.

## Algorithmic fallback

If Mistral throws, the route calls `detectPotentialPlagiarism(text)` — a naive frequency check that flags long words appearing more than 5 times. The score is capped at 25%. **Tokens are NOT refunded in this fallback path** because a result is still returned. If the AI failure is followed by a non-Mistral error, tokens are refunded via `safeRefund`.

## History logging

After the result is sent, `recordToolUse({ tool: 'plagiarism', ... })` writes to `tool_history` so it appears on `/history`. The output preview is `"<%>% plagiarism — N match(es)"`.

## Common edits & gotchas

- **Don't break the SSE format.** The client parses lines that start with `data: ` and split on `\n`. Maintain the `data: <json>\n\n` envelope.
- **Don't drop the algorithmic fallback** without the user's say-so — it's the safety net when Mistral is rate-limited or down.
- The home page also showcases all 9 user-facing tools in a tools grid (`tools` array in `app/page.tsx`). Editing the home page often means editing that grid too.
- Max input is 50,000 characters (`MAX_INPUT_LENGTH`).
