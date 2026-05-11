---
name: plagiacheck-tool-image-to-text
description: How the Image to Text (OCR) tool works — the page at /image-to-text, base64 upload, the /api/image-to-text route powered by Mistral pixtral-12b, and the image-token cost. Use when the user asks about OCR, extracting text from images, the pixtral model, image uploads, or wants to modify anything in the image-to-text tool.
---

# Image to Text (OCR)

Extracts text from uploaded images. Handles printed, handwritten, and screenshot text.

**Status:** fully working — uses a real vision model.

## Files

| File | Role |
|------|------|
| `app/image-to-text/page.tsx` | Tool page UI with image preview and drag-drop |
| `app/api/image-to-text/route.ts` | API route — calls Mistral pixtral-12b-2409 |

## API contract

```
POST /api/image-to-text
{
  "imageBase64": "<base64-encoded image, no data: prefix>",
  "mimeType": "image/png" | "image/jpeg" | ...
}
```

The route reconstructs `data:${mimeType};base64,${imageBase64}` internally and passes it as an `image_url` content chunk to Mistral.

Returns:

```json
{
  "result": {
    "extractedText": "...",
    "confidence": "high" | "medium" | "low",
    "textType": "printed" | "handwritten" | "mixed" | "screenshot",
    "wordCount": <int>
  },
  "remainingImageTokens": <int>,
  "tokensUsed": 1
}
```

## Token cost

**1 image token per call** (`IMAGE_TOKEN_COST.imageToText` in `lib/server-tokens.ts`). This is **not** a text token — image tokens are tracked separately in the `PurchasedToken.imageTokens` column.

## Size cap

Server rejects payloads larger than ~8 MB of base64 (`8 * 1024 * 1024 * 1.4`, accounting for base64 inflation). On overrun the route returns 413.

## Model

`pixtral-12b-2409` — Mistral's multimodal model. The system prompt asks it to preserve formatting, read multi-column layouts left-to-right top-to-bottom, and return `"No text detected in this image."` if blank.

## Common edits

- To support new MIME types, just make sure the page passes the correct `mimeType` — the route already accepts any string and falls back to `image/png`.
- The result is stored in `tool_history` as `[image, <mime>, <KB>]` for the input preview (not the actual image).
