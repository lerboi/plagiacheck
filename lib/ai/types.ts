/**
 * Provider-neutral AI types.
 *
 * The tool routes talk to these shapes, never to a vendor SDK, so swapping the
 * provider is a matter of writing one more adapter and changing what
 * `lib/ai/index.ts` exports — no route changes.
 */

/** A tool the model may ask us to run, in plain JSON Schema. */
export interface AiToolDef {
  name: string
  description: string
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>
}

/** A tool invocation the model asked for. */
export interface AiToolCall {
  /** Correlates the call with its result. Synthesised when a provider (such as Gemini) does not supply one. */
  id: string
  name: string
  args: Record<string, unknown>
}

/**
 * One turn of a tool-using conversation. Deliberately close to the OpenAI /
 * Mistral shape because that is what the PlagiaAI loop already speaks; the
 * Gemini adapter translates it into `contents` parts.
 */
export type AiTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: AiToolCall[] }
  | { role: "tool"; callId: string; name: string; content: string }

export interface GenerateOptions {
  /** System instruction. */
  system?: string
  /** The user message. */
  prompt: string
  temperature?: number
  maxOutputTokens?: number
  /**
   * Ask the provider for strict JSON. Every tool route here parses the reply as
   * JSON, so this is normally true — it removes the markdown code fences models
   * otherwise wrap JSON in.
   */
  json?: boolean
  /** Inline image for vision calls (OCR). */
  image?: { base64: string; mimeType: string }
}

export interface GenerateWithToolsOptions {
  system?: string
  turns: AiTurn[]
  tools: AiToolDef[]
  temperature?: number
  maxOutputTokens?: number
}

export interface ToolsResult {
  text: string
  toolCalls: AiToolCall[]
}

export interface AiProvider {
  /** Provider name, for logs and error messages. */
  readonly name: string
  /** The model id in use, for logs. */
  readonly model: string
  /** False when the API key env var is unset — routes 500 with "AI service not configured". */
  isConfigured(): boolean
  /** Single-shot generation. Throws on API failure so callers can refund tokens. */
  generate(options: GenerateOptions): Promise<string>
  /** One round of a tool-calling conversation. */
  generateWithTools(options: GenerateWithToolsOptions): Promise<ToolsResult>
}
