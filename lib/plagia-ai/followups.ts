/**
 * FE-11 — server-side fallback follow-up suggestions.
 *
 * The model is asked (per system-prompt rule 10) to append a
 * `[[FOLLOWUPS: a | b | c]]` marker after every successful tool wrap-up.
 * When it forgets, the server falls back to these deterministic defaults
 * keyed by the tool that succeeded most recently in the turn. The user
 * still gets useful next-actions even if rule 10 didn't fire.
 *
 * Guidelines for picking defaults:
 *  - Vary the destination tool — most suggestions should NOT re-call the
 *    same tool. The point of follow-ups is "now that you have output X,
 *    what else might you want to do with it?".
 *  - Phrase each suggestion as a natural user utterance the model can
 *    route — clicking the chip sends the string verbatim as the next
 *    user message, so it has to be plain English.
 *  - Cap at ≤8 words per suggestion (matches the rule-10 spec).
 *  - 2–3 per tool — same shape the model would emit.
 */

import type { PlagiaAiToolName } from "./types"

const FALLBACKS: Record<PlagiaAiToolName, string[]> = {
  paraphrase: [
    "Check it for grammar",
    "Make it shorter",
    "Detect any AI signals",
  ],
  summarize: [
    "Paraphrase the summary more formally",
    "Make a chart from these points",
  ],
  humanize: [
    "Check it for grammar",
    "Detect any AI signals",
    "Make it shorter",
  ],
  grammar: [
    "Paraphrase it more formally",
    "Summarize the result",
  ],
  ai_detect: [
    "Humanize the AI-flagged parts",
    "Paraphrase to reduce AI tells",
  ],
  plagiarism_check: [
    "Paraphrase the flagged passages",
    "Check the grammar",
  ],
  generate_chart: [
    "Make an infographic instead",
    "Try a different chart type",
  ],
  generate_infographic: [
    "Make a chart from this",
    "Summarize the source text",
  ],
  generate_thumbnail: [
    "Try a different title",
    "Make an infographic instead",
  ],
  image_to_text: [
    "Summarize the extracted text",
    "Check it for plagiarism",
    "Paraphrase it",
  ],
  voice_to_essay: [
    "Check the grammar",
    "Summarize it in 3 bullets",
    "Paraphrase it more formally",
  ],
  audio_summarize: [
    "Paraphrase the summary",
    "Make it shorter",
  ],
}

/**
 * Return the fallback follow-ups for the given tool. Returns an empty
 * array if the tool name is unknown (defensive — shouldn't happen since
 * the type system constrains this).
 */
export function getFallbackFollowups(name: PlagiaAiToolName): string[] {
  return FALLBACKS[name] ?? []
}
