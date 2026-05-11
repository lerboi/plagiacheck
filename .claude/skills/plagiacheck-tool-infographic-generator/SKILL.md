---
name: plagiacheck-tool-infographic-generator
description: How the Infographic Generator works — the page at /infographic-generator and the /api/generate-image route that asks Mistral for a structured JSON spec (title, intro, stats, sections, conclusion), then renders the infographic deterministically via lib/svg-templates.ts. Use when the user asks about infographic generation, the spec schema, the layout, or wants to modify the templates or the LLM prompt.
---

# Infographic Generator

Turns an article or text block into a structured vertical infographic.

**Status:** fully working. **Architecture:** the LLM emits a JSON SPEC (title, intro, stats, sections, conclusion). The route validates the spec and `renderInfographic()` builds the SVG deterministically.

## Files

| File | Role |
|------|------|
| `app/infographic-generator/page.tsx` | Tool page UI (text input + SVG preview) |
| `app/api/generate-image/route.ts` | Shared route — `tool: "infographic"` branch |
| `lib/svg-templates.ts` | `renderInfographic(spec)` + `InfographicSpec` type |

## Spec shape

```ts
type InfographicSpec = {
  title: string                                // ≤ 80 chars
  intro?: string                               // 1-3 sentence overview, ≤ 280 chars
  stats?: { label: string; value: string }[]   // 0-4 punchy stats; value ≤ 12 chars (e.g. "82%", "12M")
  sections?: { heading: string; body: string }[]  // 3-5 sections; body ≤ 280 chars
  conclusion?: string                          // 1-2 sentence takeaway, ≤ 240 chars
}
```

The route's validator clamps lengths and array sizes to these limits, so the LLM can be sloppy and still produce valid output.

## Layout (deterministic)

1. **Header band** — solid colour, title in 26px bold, white.
2. **Intro paragraph** — wrapped to ~80 chars, max 4 lines.
3. **Stats row** — up to 4 cards side-by-side. Big number (32px) + small label.
4. **Numbered sections** — each with a coloured circle bullet + heading + 4-line body. Light separator between sections.
5. **Conclusion band** — soft tinted box centred at the bottom.

The whole infographic is 800px wide; height is computed from the content (typically 800-1400px tall).

## API contract

```
POST /api/generate-image
{
  "text": "<source article / text>",
  "tool": "infographic"
}
```

Returns:

```json
{
  "result": {
    "svg": "<svg>...</svg>",
    "title": "...",
    "pointCount": 4
  },
  "remainingImageTokens": <int>,
  "tokensUsed": 2
}
```

## Token cost

**2 image tokens per call** (`IMAGE_TOKEN_COST.infographic`).

## Common edits

- **Adjust layout proportions:** edit `renderInfographic` in `lib/svg-templates.ts`. Header height, padding, stat-card height are all named constants near the top of the function.
- **Different palette:** the function uses `BASE_PALETTE[i % BASE_PALETTE.length]` per section. Reorder or replace that array to change the colour rotation.
- **Different prompt rules:** edit `INFOGRAPHIC_PROMPT` in `app/api/generate-image/route.ts`. The validator enforces structure regardless, so prompt edits shape the *content quality* (e.g. "always extract concrete numbers"), not the output format.
- **Add a new section type (e.g. quote):** extend `InfographicSpec`, add rendering in `renderInfographic`, and update the prompt + validator.
