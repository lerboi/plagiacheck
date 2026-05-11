---
name: plagiacheck-tool-grammar-checker
description: How the Grammar Checker tool works — the page at /grammar-checker, the issue list with positions and types, and the shared /api/ai-tools route with tool="grammar". Use when the user asks about grammar checking, spell checking, the issue highlighting UI, the issue types (error/warning/suggestion), or wants to modify anything in the grammar checker.
---

# Grammar Checker

Identifies grammar, spelling, and punctuation issues and returns a fully corrected version.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/grammar-checker/page.tsx` | Tool page UI with inline highlighting |
| `app/api/ai-tools/route.ts` | Shared route — `tool: "grammar"` branch |

## API contract

```
POST /api/ai-tools
{
  "text": "...",
  "tool": "grammar"
}
```

Returns:

```json
{
  "result": {
    "correctedText": "the fully corrected text",
    "issues": [
      {
        "type": "error" | "warning" | "suggestion",
        "text": "the incorrect text",
        "replacement": "the corrected text",
        "message": "explanation",
        "startIndex": 0,
        "endIndex": 5
      }
    ]
  },
  "remainingTokens": <int>,
  "tokensUsed": <int>
}
```

## Token cost

`Math.ceil(text.length / 6)` text tokens.

## Issue types

The prompt distinguishes:
- **error** — clear-cut grammar/spelling/punctuation mistake
- **warning** — likely problem (style or ambiguous)
- **suggestion** — optional improvement

The page styles each type differently (red / amber / blue). Don't add a new type without updating both the prompt and the page styling.

## Position accuracy

The prompt insists `startIndex` / `endIndex` must be exact character positions in the original text — the page uses these for inline highlighting. If you change the prompt, validate that positions still match the original (Mistral has a tendency to drift on long inputs).

## Common edits

- The page has a "Replace All" / "Apply" interaction tied to the `replacement` field. If the issue array is empty, the UI just shows the corrected text as a clean diff.
