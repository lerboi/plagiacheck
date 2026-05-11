---
name: plagiacheck-tool-ai-detector
description: How the AI Detector tool works — the page at /ai-detector, the shared /api/ai-tools route with tool="ai-detect", the sentence-by-sentence scoring schema, and the PDF report export. Use when the user asks about AI detection, GPT detection, the verdict logic, the per-sentence scoring, or wants to change anything on the AI detector page.
---

# AI Detector

Detects whether text is AI-generated, with a per-sentence breakdown and an overall verdict.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/ai-detector/page.tsx` | Tool page UI, calls `/api/ai-tools` |
| `app/api/ai-tools/route.ts` | Shared route — `tool: "ai-detect"` branch |
| `lib/pdf-generator.ts` | `generateAIDetectorReport()` for the "Download Report" button |

## API contract

```
POST /api/ai-tools
{
  "text": "...",
  "tool": "ai-detect"
}
```

Returns:

```json
{
  "result": {
    "overallScore": <0-100>,
    "verdict": "Likely Human" | "Possibly AI" | "Likely AI",
    "analysis": "...",
    "sentences": [
      { "text": "...", "score": <0-100>, "type": "human" | "mixed" | "ai" }
    ]
  },
  "remainingTokens": <int>,
  "tokensUsed": <int>
}
```

The system prompt (in `route.ts`) tells Mistral to be calibrated: casual writing with typos should score low; formulaic polished text should score higher. The model is instructed to return EXACT sentence text from the input so the UI can highlight passages.

## Token cost

`Math.ceil(text.length / 6)` text tokens.

## UI behavior

- Verdict badge color is driven by the `type` field per sentence.
- The "Download Report" button packages the verdict into a PDF via `generateAIDetectorReport`.
- Insufficient tokens → `router.push("/pricing")`. Not signed in → shows `<ToolSignInPrompt />`.

## Common edits

- To tweak detection sensitivity, edit the `ai-detect` system prompt in `app/api/ai-tools/route.ts`. Don't change the JSON schema unless you also update the page UI and `lib/pdf-generator.ts`.
- The verdict thresholds (`Likely Human`/`Possibly AI`/`Likely AI`) are decided by Mistral, not by the client. If you want hard cutoffs, do it on the server side after `extractJSON`.
