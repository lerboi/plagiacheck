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

export interface PlagiaAiDirectDispatch {
  /** Tool to invoke directly, bypassing the model round. */
  toolName: PlagiaAiToolName
  /** Args to pass to the tool — same shape the model would have produced. */
  args: Record<string, unknown>
  /** The original tool-call id that was paused for confirmation. */
  callId: string
  /** The "Why this tool" caption captured at pause-time, replayed to the UI. */
  reason?: string
}

export interface PlagiaAiRequestBody {
  messages: PlagiaAiMessage[]
  attachedImage?: AttachedImage
  /**
   * When true, the server bypasses the FE-04 cost-confirmation gate and
   * dispatches expensive tools immediately. Set by the client when the user
   * has clicked "Don't ask again" — stored in localStorage.
   */
  skipCostConfirm?: boolean
  /**
   * When present, the server skips the model round and dispatches this exact
   * tool call directly. Used by the client after the user confirms a
   * previously-paused tool call from the FE-04 cost-confirmation gate.
   */
  directDispatch?: PlagiaAiDirectDispatch
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

export interface PlagiaAiToolPendingConfirm {
  /** Estimated tokens that will be charged. */
  estimatedTokens: number
  /** Which token currency. Image-token tools always require confirm. */
  currency: "text" | "image"
  /** Full args object — client echoes this back on confirm to dispatch directly. */
  args: Record<string, unknown>
}

export interface PlagiaAiToolCallEvent {
  type: "tool_call"
  id: string
  name: PlagiaAiToolName
  argsSummary: string
  reason?: string
  /**
   * When present, the server has NOT dispatched the tool — it's waiting for
   * the client to confirm via a `directDispatch` follow-up request. Absent
   * for tool calls that are already executing.
   */
  pendingConfirm?: PlagiaAiToolPendingConfirm
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
