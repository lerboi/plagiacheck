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

/**
 * The English text of every fallback suggestion, keyed by a stable id. The
 * server sends the English text; the chat UI maps it back to its id (see
 * `getFollowupId`) to show the suggestion in the visitor's language.
 */
export const FOLLOWUP_TEXT = {
  checkItForGrammar: "Check it for grammar",
  makeItShorter: "Make it shorter",
  detectAiSignals: "Detect any AI signals",
  paraphraseSummaryFormally: "Paraphrase the summary more formally",
  chartFromPoints: "Make a chart from these points",
  paraphraseFormally: "Paraphrase it more formally",
  summarizeResult: "Summarize the result",
  humanizeFlagged: "Humanize the AI-flagged parts",
  paraphraseReduceAi: "Paraphrase to reduce AI tells",
  paraphraseFlagged: "Paraphrase the flagged passages",
  checkGrammar: "Check the grammar",
  infographicInstead: "Make an infographic instead",
  differentChartType: "Try a different chart type",
  chartFromThis: "Make a chart from this",
  summarizeSource: "Summarize the source text",
  differentTitle: "Try a different title",
  summarizeExtracted: "Summarize the extracted text",
  checkForPlagiarism: "Check it for plagiarism",
  paraphraseIt: "Paraphrase it",
  summarizeInBullets: "Summarize it in 3 bullets",
  paraphraseSummary: "Paraphrase the summary",
} as const

export type FollowupId = keyof typeof FOLLOWUP_TEXT

const FALLBACKS: Record<PlagiaAiToolName, FollowupId[]> = {
  paraphrase: [
    "checkItForGrammar",
    "makeItShorter",
    "detectAiSignals",
  ],
  summarize: [
    "paraphraseSummaryFormally",
    "chartFromPoints",
  ],
  humanize: [
    "checkItForGrammar",
    "detectAiSignals",
    "makeItShorter",
  ],
  grammar: [
    "paraphraseFormally",
    "summarizeResult",
  ],
  ai_detect: [
    "humanizeFlagged",
    "paraphraseReduceAi",
  ],
  plagiarism_check: [
    "paraphraseFlagged",
    "checkGrammar",
  ],
  generate_chart: [
    "infographicInstead",
    "differentChartType",
  ],
  generate_infographic: [
    "chartFromThis",
    "summarizeSource",
  ],
  generate_thumbnail: [
    "differentTitle",
    "infographicInstead",
  ],
  image_to_text: [
    "summarizeExtracted",
    "checkForPlagiarism",
    "paraphraseIt",
  ],
  voice_to_essay: [
    "checkGrammar",
    "summarizeInBullets",
    "paraphraseFormally",
  ],
  audio_summarize: [
    "paraphraseSummary",
    "makeItShorter",
  ],
}

/**
 * Return the fallback follow-ups for the given tool. Returns an empty
 * array if the tool name is unknown (defensive — shouldn't happen since
 * the type system constrains this).
 */
export function getFallbackFollowups(name: PlagiaAiToolName): string[] {
  return (FALLBACKS[name] ?? []).map((id) => FOLLOWUP_TEXT[id])
}

const FOLLOWUP_ID_BY_TEXT = new Map<string, FollowupId>(
  (Object.keys(FOLLOWUP_TEXT) as FollowupId[]).map((id) => [FOLLOWUP_TEXT[id], id]),
)

/**
 * The id of a fallback suggestion given its English text, or undefined for
 * any other text (e.g. suggestions the model wrote itself). Display only.
 */
export function getFollowupId(text: string): FollowupId | undefined {
  return FOLLOWUP_ID_BY_TEXT.get(text)
}
