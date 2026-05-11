---
name: plagiacheck-tool-voice-to-essay
description: How the Voice to Essay tool works — the page at /voice-to-essay records voice via Web Speech API, then calls /api/voice-tools (tool="voice-to-essay") to rewrite the raw transcript into a structured essay. Browser-dependent. Use when the user asks about voice-to-essay, dictating essays, transforming spoken notes into writing, or wants to modify this tool.
---

# Voice to Essay

Lets users speak ideas freely, then converts the raw transcript into a well-structured essay (intro, body, conclusion).

**Status:** functional but **browser-dependent** — same Web Speech API caveats as Speech to Text.

## Files

| File | Role |
|------|------|
| `app/voice-to-essay/page.tsx` | Tool page — recording + essay viewer |
| `app/api/voice-tools/route.ts` | Shared route — `tool: "voice-to-essay"` branch |

## How it works

1. Web Speech API records and produces a raw transcript (same pattern as `plagiacheck-tool-speech-to-text`).
2. User clicks "Generate Essay" → page POSTs `{ text: transcript, tool: "voice-to-essay" }` to `/api/voice-tools`.
3. Server deducts text tokens, calls Mistral with the "essay writer" system prompt, returns structured JSON.

## API contract

```
POST /api/voice-tools
{
  "text": "<raw voice transcript>",
  "tool": "voice-to-essay"
}
```

Returns:

```json
{
  "result": {
    "essay": "<full structured essay>",
    "title": "<suggested title>",
    "wordCount": <int>,
    "paragraphCount": <int>
  },
  "remainingTokens": <int>,
  "tokensUsed": <int>
}
```

## Token cost

`Math.ceil(text.length / 6)` text tokens — based on the transcript length, not the essay output.

## Prompt rules

The system prompt asks Mistral to:
- Add a clear introduction, body paragraphs, and a conclusion.
- Fix grammar, punctuation, and speech recognition errors.
- Strip filler words (um/uh/like/you know).
- Preserve the speaker's ideas, arguments, and approximate formality.
- Format any spoken-out headings as actual headings.

## Browser caveats

Same as Speech to Text — Firefox unsupported, HTTPS required, quality varies. If recording fails, the user can paste a transcript directly into the textarea and skip the Web Speech API.
