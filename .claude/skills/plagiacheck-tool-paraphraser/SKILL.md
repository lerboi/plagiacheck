---
name: plagiacheck-tool-paraphraser
description: How the Paraphraser tool works — the page at /paraphraser, the six modes (standard, fluency, formal, simple, creative, academic), and the shared /api/ai-tools route with tool="paraphrase". Use when the user asks about paraphrasing, rewording, the rewrite modes, or wants to modify anything about the paraphraser.
---

# Paraphraser

Rewrites text in one of six styles while preserving meaning.

**Status:** fully working.

## Files

| File | Role |
|------|------|
| `app/paraphraser/page.tsx` | Tool page UI with mode pills |
| `app/api/ai-tools/route.ts` | Shared route — `tool: "paraphrase"` branch |

## API contract

```
POST /api/ai-tools
{
  "text": "...",
  "tool": "paraphrase",
  "options": { "mode": "standard" | "fluency" | "formal" | "simple" | "creative" | "academic" }
}
```

Returns `{ result: { paraphrasedText: "..." }, remainingTokens, tokensUsed }`. Default mode is `standard`.

## Mode behavior (from the system prompt)

- **standard** — balanced; restructure + ~40% synonym swap.
- **fluency** — readability-first; shorter, smoother sentences.
- **formal** — elevated register, no contractions, subordinate clauses.
- **creative** — aggressive lexical variation, evocative phrasing, paragraph-level reorgs allowed.
- **academic** — passive voice OK, hedged claims, no first person.
- **simple** — sentences ≤15 words, ~B1 reading level, plain vocab.

The prompt enforces: no synonym-only swaps with same word order, ±20% length unless mode dictates otherwise (simple may be longer), output language must match input.

## Token cost

`Math.ceil(text.length / 6)` text tokens.

## UI

Mode is selected via pill buttons (no `Select` dropdown). The page also shows word count delta (input → output) above the result panel after a rewrite.

## Common edits

- Adding a new mode: extend the prompt's mode list AND add a new pill in the page's `[{value, label}]` array.
- The mode value is passed through to the prompt verbatim — no server-side validation.
