export type PlagiaAiRole = "user" | "assistant" | "system" | "tool"

export interface PlagiaAiMessage {
  role: "user" | "assistant"
  content: string
}

export interface AttachedImage {
  /** Base64-encoded image bytes (no `data:` prefix). */
  base64: string
  /** MIME type, e.g. `image/png`. */
  mimeType: string
  /** Original filename, for display. Optional. */
  name?: string
}

/** A tool call the user has confirmed after a token-cost preview (FE-04). */
export interface ConfirmedToolCall {
  id: string
  name: PlagiaAiToolName
  args: Record<string, unknown>
}

export interface PlagiaAiRequestBody {
  messages: PlagiaAiMessage[]
  attachedImage?: AttachedImage
  /** Set on the resume request after the user confirms a gated tool call. */
  confirmedTool?: ConfirmedToolCall
  /** When true, skip the cost-confirmation gate (user preference). */
  skipConfirmations?: boolean
}

export const PLAGIA_AI_TOOL_NAMES = [
  "paraphrase",
  "summarize",
  "humanize",
  "ai_detect",
  "grammar",
  "plagiarism_check",
  "generate_infographic",
  "generate_chart",
  "generate_thumbnail",
  "image_to_text",
  "voice_to_essay",
  "audio_summarize",
] as const

export type PlagiaAiToolName = (typeof PLAGIA_AI_TOOL_NAMES)[number]

export interface PlagiaAiToolCallEvent {
  type: "tool_call"
  id: string
  name: PlagiaAiToolName
  argsSummary: string
  /** One-sentence "why this tool" justification, surfaced in the tool card. */
  reason?: string
}

export interface PlagiaAiToolResultEvent {
  type: "tool_result"
  id: string
  ok: boolean
  resultPreview: string
  result?: unknown
  remainingTextTokens?: number
  remainingImageTokens?: number
  error?: string
}

/**
 * Emitted instead of `tool_call` when a tool's estimated cost crosses the
 * confirmation threshold (FE-04). The client shows a Confirm/Cancel card; on
 * confirm it resends the turn with `confirmedTool` set.
 */
export interface PlagiaAiToolPendingEvent {
  type: "tool_pending"
  id: string
  name: PlagiaAiToolName
  argsSummary: string
  reason?: string
  estimatedTextTokens: number
  estimatedImageTokens: number
  /** The exact args the model produced, echoed back on confirmation. */
  args: Record<string, unknown>
}

export type PlagiaAiEvent =
  | { type: "delta"; content: string }
  | PlagiaAiToolCallEvent
  | PlagiaAiToolPendingEvent
  | PlagiaAiToolResultEvent
  | { type: "error"; message: string }
  | { type: "done" }

export const PLAGIA_AI_SUGGESTED_PROMPTS: string[] = [
  "Summarize this article in 3 bullet points: ",
  "Paraphrase this paragraph in a formal tone: ",
  "Generate a bar chart of quarterly sales for a small business",
  "Check the grammar of this text: ",
]
