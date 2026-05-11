---
name: plagiacheck-tool-ai-humanizer
description: How the AI Humanizer tool works — the page at /ai-humanizer, the tone and humanization-level controls, and the shared /api/ai-tools route with tool="humanize". Use when the user asks about humanizing AI text, the tone presets (casual/professional/academic/creative/friendly), the humanization slider, or wants to modify the humanizer page or prompt.
---

# AI Humanizer

Rewrites AI-sounding text into more natural human prose.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/ai-humanizer/page.tsx` | Tool page UI |
| `app/api/ai-tools/route.ts` | Shared route — `tool: "humanize"` branch |

## API contract

```
POST /api/ai-tools
{
  "text": "...",
  "tool": "humanize",
  "options": {
    "tone": "casual" | "professional" | "academic" | "creative" | "friendly",
    "level": <0-100>
  }
}
```

Returns `{ result: { humanizedText: "..." }, remainingTokens, tokensUsed }`.

Defaults if `options` is missing: `tone="casual"`, `level=50`.

## How tone × level interact

The system prompt (`humanize` in `route.ts`) instructs Mistral:
- **Tone** controls vocabulary and register (casual = contractions, academic = third person + hedging, etc.)
- **Level** controls structural rewriting depth — 0-20 is light edit, 81-100 is heavy rewrite with rhythm changes.
- If they conflict: tone wins for vocabulary, level wins for structure.

The prompt also bans common AI tells: identical openers, "First, X. Second, Y." structures, "In conclusion", "Delve into", em-dash overuse for definitions.

## Token cost

`Math.ceil(text.length / 6)` text tokens.

## Common edits

- Adding a new tone: extend the tone enum in the system prompt AND add a new `<SelectItem>` in the page. The server doesn't validate the tone string, so the prompt is the only enforcer.
- The level slider lives in the page; pass-through to `options.level`.
