export type PlagiaAiRole = "user" | "assistant" | "system"

export interface PlagiaAiMessage {
  role: PlagiaAiRole
  content: string
}

export interface PlagiaAiRequestBody {
  messages: PlagiaAiMessage[]
}

export type PlagiaAiEvent =
  | { type: "delta"; content: string }
  | { type: "error"; message: string }
  | { type: "done" }

export const PLAGIA_AI_SUGGESTED_PROMPTS: string[] = [
  "Summarize this article in 3 bullet points: ",
  "Paraphrase this paragraph in a formal tone: ",
  "Generate a bar chart of quarterly sales for a small business",
  "Check the grammar of this text: ",
]
