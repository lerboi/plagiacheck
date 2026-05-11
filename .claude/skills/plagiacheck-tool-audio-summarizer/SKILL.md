---
name: plagiacheck-tool-audio-summarizer
description: How the Audio Summarizer tool works — the page at /audio-summarizer records via Web Speech API, then calls /api/voice-tools (tool="audio-summarize") to extract overview, key points, action items, and content type from a transcript. Browser-dependent. Use when the user asks about audio summarization, summarizing lectures/meetings/podcasts, or wants to modify this tool.
---

# Audio Summarizer

Records or accepts a pasted transcript, then produces a structured summary tailored to the content type (lecture, interview, meeting, podcast, speech).

**Status:** functional but **browser-dependent** — same Web Speech API caveats as the other voice tools.

## Files

| File | Role |
|------|------|
| `app/audio-summarizer/page.tsx` | Tool page — recording + summary viewer |
| `app/api/voice-tools/route.ts` | Shared route — `tool: "audio-summarize"` branch |

## API contract

```
POST /api/voice-tools
{
  "text": "<transcript>",
  "tool": "audio-summarize"
}
```

Returns:

```json
{
  "result": {
    "title": "...",
    "overview": "1-2 sentence overview",
    "keyPoints": ["point 1", "point 2", "point 3"],
    "detailedSummary": "...",
    "contentType": "lecture" | "interview" | "meeting" | "podcast" | "speech" | "other",
    "actionItems": ["..."]
  },
  "remainingTokens": <int>,
  "tokensUsed": <int>
}
```

## Token cost

`Math.ceil(text.length / 6)` text tokens.

## Prompt rules

The system prompt instructs Mistral to:
- Identify content type and tailor the summary (meetings get action items + decisions; interviews get Q&A pairs; lectures get key concepts/definitions).
- Aim for ~20-30% of the original length.
- Strip filler words and repetition.
- Preserve named entities, numbers, dates, and important quotes.

## Browser caveats

Same as the other voice tools. Users can also paste a transcript directly without recording.

## Common edits

- The page renders all four sections (overview, key points, action items, detailed summary). Hide unused sections (e.g. action items for podcasts) by checking `result.contentType` if you want a cleaner UI.
