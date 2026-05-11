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

export interface PlagiaAiRequestBody {
  messages: PlagiaAiMessage[]
  attachedImage?: AttachedImage
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

export type PlagiaAiEvent =
  | { type: "delta"; content: string }
  | PlagiaAiToolCallEvent
  | PlagiaAiToolResultEvent
  | { type: "error"; message: string }
  | { type: "done" }

export const PLAGIA_AI_SUGGESTED_PROMPTS: string[] = [
  "Summarize this article in 3 bullet points: ",
  "Paraphrase this paragraph in a formal tone: ",
  "Generate a bar chart of quarterly sales for a small business",
  "Check the grammar of this text: ",
]
