---
name: plagiacheck-history
description: How tool usage is logged in Plagiacheck — the tool_history Supabase table, the recordToolUse helper in lib/server-history.ts, the ToolHistoryTool union, and how /history paginates and filters runs. Use when the user asks about tool history, the /history page, logging, run records, the input/output preview length, or wants to add a new tool to the history dropdown.
---

# Plagiacheck History

Every successful tool run is logged to the `tool_history` table for the `/history` page.

## Files

| File | Role |
|------|------|
| `lib/server-history.ts` | `recordToolUse()` helper + `ToolHistoryTool` union type |
| `app/history/page.tsx` | History dashboard with search + filter + pagination |
| `tool_history` table | Postgres storage |

## The `recordToolUse` helper

Called from every tool's API route after success:

```ts
import { recordToolUse } from "@/lib/server-history"

await recordToolUse({
  userId: user.id,
  tool: "humanize",          // must match ToolHistoryTool union
  input: text,                // truncated to PREVIEW_MAX (600 chars)
  output: someStringOrUndef,  // truncated, or null if undefined
  metadata: options ?? {},   // tool-specific options
  tokensUsed: cost,
})
```

This is **best-effort** — errors are caught and logged but never re-thrown. A history-write failure should never break the user's tool call.

Both `input` and `output` are truncated to **600 chars** with a trailing `…` if longer.

## The `ToolHistoryTool` union

```ts
type ToolHistoryTool =
  | "plagiarism"
  | "ai-detect"
  | "humanize"
  | "paraphrase"
  | "summarize"
  | "grammar"
  | "audio-summarize"
  | "voice-to-essay"
  | "speech-to-text"
  | "image-to-text"
  | "chart"
  | "infographic"
  | "thumbnail"
```

When you add a new tool, add its slug to this union. Tools NOT in the union (e.g. `text-to-speech`, `word-counter`) are intentionally not logged because they don't hit the server.

## The `tool_history` table schema

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | FK |
| `tool` | text | Slug from the union |
| `input_preview` | text | First 600 chars |
| `output_preview` | text | First 600 chars or null |
| `metadata` | jsonb | Tool options (mode, tone, level, etc.) |
| `tokens_used` | int | |
| `created_at` | timestamptz | Default `now()` |

## The /history page

`app/history/page.tsx` features:
- Search bar — filters on `input_preview` and `output_preview` (server-side ilike).
- Tool filter dropdown — values match the `ToolHistoryTool` union.
- Pagination — page-size constant in the page; uses Supabase `range()`.
- Each row expands to show full preview + metadata + tokens used.

The "All Tools" filter option is the default (no filter applied).

## Common edits

- **Adding a tool to history:** add to `ToolHistoryTool`, call `recordToolUse` in its route, add a label to the `<Select>` in `/history`.
- **Increasing the preview length:** edit `PREVIEW_MAX` in `lib/server-history.ts`. There is no need to re-truncate existing rows — the column is plain text.
- **Adding a metadata field:** the `metadata` column is jsonb, so just include the new field in the call. The page renders `metadata` as a small object dump under the row.
