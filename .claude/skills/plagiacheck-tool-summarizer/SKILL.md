---
name: plagiacheck-tool-summarizer
description: How the Summarizer tool works — the page at /summarizer, the length percentage slider, the paragraph-vs-bullets format toggle, and the shared /api/ai-tools route with tool="summarize". Use when the user asks about summarization, condensing text, the length controls, or wants to modify anything in the summarizer.
---

# Summarizer

Condenses text to a target length, in paragraph or bullet form.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/summarizer/page.tsx` | Tool page UI |
| `app/api/ai-tools/route.ts` | Shared route — `tool: "summarize"` branch |

## API contract

```
POST /api/ai-tools
{
  "text": "...",
  "tool": "summarize",
  "options": {
    "length": <int 1-100>,   // target length as % of original
    "format": "paragraph" | "bullets"
  }
}
```

Returns:

```json
{
  "result": {
    "summary": "<paragraph text or empty>",
    "bulletPoints": ["...", "..."]   // empty array when format=paragraph
  },
  "remainingTokens": <int>,
  "tokensUsed": <int>
}
```

Defaults: `length=50`, `format="paragraph"`.

## Length targeting (from the prompt)

- Target ≈ `(length% / 100) × original_word_count`, ±15% tolerance.
- Hard cap: never exceed 50% of original even if asked.
- Inputs <50 words always get 1-2 sentences regardless of percentage.
- For `format=bullets`: 3-7 distinct, complete sentences as separate strings.

## Token cost

`Math.ceil(text.length / 6)` text tokens. (Cost is based on **input** size, not the smaller summary.)

## Common edits

- Switching the default format or length: edit the page's `useState` initial values.
- Tightening the cap: change "Never exceed 50% of the original" in the system prompt.
