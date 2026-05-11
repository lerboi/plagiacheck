---
name: plagiacheck-tool-thumbnail-generator
description: How the Thumbnail Generator works — the page at /thumbnail-generator and the /api/generate-image route that asks Mistral for a JSON spec (title, subtitle, palette, vibe), then renders a deterministic 1200x630 SVG cover via lib/svg-templates.ts. Use when the user asks about thumbnail generation, OG/cover images, the palette logic, the layout, or wants to modify the template.
---

# Thumbnail Generator

Creates a 1200×630 cover/OG image for a given title or topic.

**Status:** fully working. **Architecture:** the LLM picks colours and a punchy headline (JSON spec). The route renders the actual SVG via `renderThumbnail()` in `lib/svg-templates.ts` — typography, layout, and decorative shapes are deterministic.

## Files

| File | Role |
|------|------|
| `app/thumbnail-generator/page.tsx` | Tool page UI (title input + style selector + preview) |
| `app/api/generate-image/route.ts` | Shared route — `tool: "thumbnail"` branch |
| `lib/svg-templates.ts` | `renderThumbnail(spec)` + `ThumbnailSpec` type |

## Spec shape

```ts
type ThumbnailSpec = {
  title: string                                  // ≤ 120 chars; auto-wrapped to 1-3 lines
  subtitle?: string                              // optional kicker, ≤ 80 chars
  palette?: {
    from?: string    // gradient start (hex) — defaults to #0ea5e9
    to?: string      // gradient end (hex)   — defaults to #6366f1
    text?: string    // foreground (hex)     — defaults to #ffffff
    accent?: string  // accent shapes (hex)  — defaults to #fbbf24
  }
  vibe?: string                                  // ONE-WORD label (TECH, NATURE, BUSINESS, FOOD, …)
}
```

The route's `sanitizePalette` enforces hex format and falls back to defaults for any invalid colour.

## Layout (deterministic)

- **Background:** linear gradient from `palette.from` (top-left) to `palette.to` (bottom-right).
- **Decorative shapes:** semi-transparent accent circles in the corners + a rotated square in the top-right.
- **Title:** left-aligned, 64-88px depending on line count (1 line = biggest, 3 lines = smallest), max 3 lines.
- **Accent strip:** a small coloured bar above the title for visual rhythm.
- **Subtitle:** below the title, 22px, 85% opacity.
- **Vibe / brand mark:** uppercase, letter-spaced, bottom-left.

Output is exactly 1200×630 — the standard OG image / Twitter card size.

## API contract

```
POST /api/generate-image
{
  "text": "<title or topic>",
  "tool": "thumbnail",
  "options": { "style": "modern" | "minimal" | "bold" | "gradient" }
}
```

Returns:

```json
{
  "result": {
    "svg": "<svg>...</svg>",
    "title": "...",
    "style": "modern"
  },
  "remainingImageTokens": <int>,
  "tokensUsed": 2
}
```

## Token cost

**2 image tokens per call** (`IMAGE_TOKEN_COST.thumbnail`).

## How `style` influences output

`options.style` is passed into the LLM prompt and steers the palette choice:
- **modern** (default) — saturated tech-style gradient
- **minimal** — near-monochrome
- **bold** — high-contrast saturated colours
- **gradient** — emphasis on a strong gradient

Style does NOT change the layout — only the palette the LLM chooses.

## Common edits

- **Change layout / typography:** edit `renderThumbnail` in `lib/svg-templates.ts`. All sizing constants (title sizes, padding, decorative shape positions) live inside that function.
- **Add a new style preset:** add the value to `STYLES` in `app/thumbnail-generator/page.tsx` AND mention it in the `THUMBNAIL_PROMPT` palette-guidance section.
- **Brand-lock the colour:** override `sanitizePalette` to ignore the LLM's `from`/`to` and force corporate colours.
- **Add icons:** extend `ThumbnailSpec` with an `iconHint` field, ask the LLM for a lucide icon name, then inline the SVG path in `renderThumbnail`.
