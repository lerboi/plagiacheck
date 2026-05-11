---
name: plagiacheck-tool-chart-generator
description: How the Chart Generator tool works — the page at /chart-generator and the /api/generate-image route that asks Mistral for a structured JSON spec, then builds the SVG deterministically via lib/svg-templates.ts. Supports bar, line, pie, flowchart, mindmap, timeline, and comparison. Use when the user asks about chart generation, diagrams, flowcharts, mind maps, or wants to modify the chart tool, the SVG templates, or the JSON schema the LLM returns.
---

# Chart Generator

Produces clean, predictable SVG charts from a free-text description.

**Status:** fully working. **Architecture:** the LLM emits a structured JSON SPEC (no SVG markup). The route validates the spec and renders the SVG deterministically from `lib/svg-templates.ts`. This means output quality doesn't depend on the LLM getting SVG positioning right — it just has to extract content.

## Files

| File | Role |
|------|------|
| `app/chart-generator/page.tsx` | Tool page UI |
| `app/api/generate-image/route.ts` | Shared route — `tool: "chart"` branch; validates spec and dispatches to template |
| `lib/svg-templates.ts` | `buildChartSvg(spec)` + per-chart-type render functions |

## Supported chart types

| `chartType` | Best for | Spec shape |
|-------------|----------|------------|
| `bar` | Numeric comparison across discrete categories | `{ data: [{name, value}] }` (≤ 12) |
| `line` | Values over an ordered sequence | `{ data: [{name, value}] }` (≤ 24) |
| `pie` | Parts of a whole | `{ data: [{name, value}] }` (≤ 8 slices) |
| `flowchart` | Linear sequence of steps | `{ nodes: [{label}] }` (≤ 10) |
| `mindmap` | One central concept, several branches | `{ center, branches: string[] }` (≤ 8 branches) |
| `timeline` | Ordered events with dates | `{ events: [{date, label}] }` (≤ 6) |
| `comparison` | Side-by-side comparison | `{ items: string[] (≤4), rows: [{attribute, values: string[]}] (≤8) }` |

## API contract

```
POST /api/generate-image
{
  "text": "<description of data or concept>",
  "tool": "chart",
  "options": { "chartType": "bar" | "line" | "pie" | "flowchart" | "mindmap" | "timeline" | "comparison" | "auto-detect" }
}
```

Returns:

```json
{
  "result": {
    "svg": "<svg>...</svg>",
    "chartType": "bar",
    "title": "...",
    "description": "..."
  },
  "remainingImageTokens": <int>,
  "tokensUsed": 2
}
```

## Token cost

**2 image tokens per call** (`IMAGE_TOKEN_COST.chart`).

## How `auto-detect` works

If `options.chartType === "auto-detect"`, the route lets the LLM pick the best `chartType`. If a specific type is requested, the route honours it — the LLM must produce a spec matching that type.

## Adding a new chart type

1. Add the new union member to `ChartSpec` in `lib/svg-templates.ts`.
2. Write a `renderXxxChart` function and add a case to `buildChartSvg`.
3. Add the new type to `SUPPORTED_CHART_TYPES` in `app/api/generate-image/route.ts`.
4. Update `CHART_PROMPT` in the route to describe the new schema for the LLM.
5. Add the new type to `validateChartSpec`.
6. Add the new type to the page's `CHART_TYPES` array if you want it user-selectable.

## Common edits

- **Tweak palette:** edit `BASE_PALETTE` in `lib/svg-templates.ts`.
- **Larger charts:** every render function takes optional `width`/`height`. Override in `buildChartSvg` if needed.
- **Y-axis tick count:** `yTicks` constant inside `renderBarChart` / `renderLineChart`.
