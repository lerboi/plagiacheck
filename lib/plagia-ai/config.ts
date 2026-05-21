/**
 * Cost-preview configuration for PlagiaAI tool dispatch (FE-04).
 *
 * Before the server dispatches a tool call whose estimated cost exceeds these
 * thresholds, it emits a `tool_call` event with a `pendingConfirm` payload
 * instead of running the tool. The client renders a Confirm/Cancel UI and only
 * after explicit confirmation does the server actually run the tool.
 *
 * The user can disable confirmation entirely via the "Don't ask again" link
 * in the confirm card — that flips a `localStorage` flag which is forwarded
 * as `skipCostConfirm: true` on subsequent requests.
 */

import type { PlagiaAiToolName } from "./types"

/**
 * Minimum estimated text-token cost (chars/6) before a TEXT-token tool call
 * requires confirmation. Above this, the tool card prompts before dispatching.
 *
 * Tuned for the common case: a few sentences of paraphrasing / grammar /
 * summarize are cheap and don't need a confirmation, but pasting a 300-word
 * article (~300 tokens) clearly costs real money and the user should opt in.
 */
export const TEXT_TOKEN_CONFIRM_THRESHOLD = 50

/**
 * Image-token-currency tools. Image tokens are a paid currency separate from
 * the free text-token allowance, so EVERY call to one of these requires
 * confirmation regardless of size (unless the user has opted out).
 */
export const IMAGE_TOOLS: ReadonlySet<PlagiaAiToolName> = new Set([
  "generate_chart",
  "generate_infographic",
  "generate_thumbnail",
  "image_to_text",
])

/**
 * Map of tool name → the args-field that carries the user's input text.
 * Tools not in this map don't have a text input (image tools), so their
 * cost is computed as a fixed image-token charge.
 */
const TEXT_ARG_FIELD: Partial<Record<PlagiaAiToolName, string>> = {
  paraphrase: "text",
  summarize: "text",
  humanize: "text",
  grammar: "text",
  ai_detect: "text",
  plagiarism_check: "text",
  voice_to_essay: "transcript",
  audio_summarize: "transcript",
  generate_infographic: "source_text",
}

export interface ToolCostEstimate {
  tokens: number
  currency: "text" | "image"
  requiresConfirm: boolean
}

/**
 * Estimate the cost of a tool call. Returns the same shape regardless of
 * tool type so the caller can render uniformly.
 *
 * The cost is an ESTIMATE — the server's actual token deduction lives in
 * the underlying tool route and may differ slightly (e.g. when the tool
 * shapes its input before charging). The number here is what the user
 * sees in the confirm dialog; the truth is what the server eventually
 * charges. Both use the same Math.ceil(length/6) formula for text tokens.
 */
export function estimateToolCost(
  name: PlagiaAiToolName,
  args: Record<string, unknown>,
): ToolCostEstimate {
  if (IMAGE_TOOLS.has(name)) {
    // Image tools all cost 1 image token per call. The token system handles
    // the deduction server-side; here we just signal the currency to the UI
    // so it can show "~1 image token" in the confirm dialog.
    return { tokens: 1, currency: "image", requiresConfirm: true }
  }

  const field = TEXT_ARG_FIELD[name]
  const text = field ? String(args[field] ?? "") : ""
  const tokens = Math.ceil(text.length / 6)

  return {
    tokens,
    currency: "text",
    requiresConfirm: tokens > TEXT_TOKEN_CONFIRM_THRESHOLD,
  }
}
