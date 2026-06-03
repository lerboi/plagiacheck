import type { PlagiaAiToolName } from "./types"

/**
 * Token-cost estimation + confirmation policy for PlagiaAI tool calls (FE-04).
 *
 * Used on both the server (to decide whether to gate a call behind a
 * confirmation) and the client (to render the cost preview). The cost constants
 * mirror `lib/server-tokens.ts` (IMAGE_TOKEN_COST + the ceil(len/6) text
 * formula) — duplicated intentionally so the client can estimate without
 * importing the server-only token module (which pulls in the Supabase client).
 */

/** Text-token estimate above which a call is gated behind a confirmation. */
export const TEXT_TOKEN_CONFIRM_THRESHOLD = 50

/** localStorage key for the "skip confirmations" user preference. */
export const SKIP_CONFIRMATIONS_STORAGE_KEY = "plagia-ai-skip-confirmations"

/** Image-token cost per tool (mirror of IMAGE_TOKEN_COST in server-tokens). */
const IMAGE_TOKEN_COST: Partial<Record<PlagiaAiToolName, number>> = {
  image_to_text: 1,
  generate_chart: 2,
  generate_infographic: 2,
  generate_thumbnail: 2,
}

function textCost(value: unknown): number {
  const s = typeof value === "string" ? value : ""
  return Math.ceil(s.length / 6)
}

export interface ToolCostEstimate {
  textTokens: number
  imageTokens: number
  needsConfirmation: boolean
}

export function estimateToolCost(
  name: PlagiaAiToolName,
  args: Record<string, unknown>
): ToolCostEstimate {
  const imageTokens = IMAGE_TOKEN_COST[name] ?? 0

  let textTokens = 0
  switch (name) {
    case "paraphrase":
    case "summarize":
    case "humanize":
    case "ai_detect":
    case "grammar":
    case "plagiarism_check":
      textTokens = textCost(args.text)
      break
    case "voice_to_essay":
    case "audio_summarize":
      textTokens = textCost(args.transcript)
      break
    default:
      textTokens = 0
  }

  return {
    textTokens,
    imageTokens,
    needsConfirmation: imageTokens > 0 || textTokens > TEXT_TOKEN_CONFIRM_THRESHOLD,
  }
}

/** Human-readable cost summary, e.g. "~120 text tokens" or "2 image tokens". */
export function formatCostLabel(
  textTokens: number,
  imageTokens: number
): string {
  const parts: string[] = []
  if (textTokens > 0) {
    parts.push(`~${textTokens} text token${textTokens === 1 ? "" : "s"}`)
  }
  if (imageTokens > 0) {
    parts.push(`${imageTokens} image token${imageTokens === 1 ? "" : "s"}`)
  }
  return parts.length ? parts.join(" + ") : "a few tokens"
}
