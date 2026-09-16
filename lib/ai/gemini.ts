import {
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Part,
} from "@google/genai"

import type {
  AiProvider,
  AiToolCall,
  AiTurn,
  GenerateOptions,
  GenerateWithToolsOptions,
  ToolsResult,
} from "./types"

/**
 * Google Gemini adapter.
 *
 * MODEL CHOICE — why Flash-Lite and not Flash. On the Gemini free tier the
 * full Flash models (gemini-3.8/3.7/3.6/3.5-flash) are capped at roughly 20
 * requests PER DAY per project, which is a development allowance rather than
 * something a live product can run on. The Lite line gets a far larger daily
 * allowance (order of 500/day, ~15 RPM), which is what makes free daily usage
 * viable here. Flash-Lite is also the right quality tier for this workload:
 * paraphrase, summarize, grammar and detection are short-context transforms,
 * not long-horizon reasoning.
 *
 * Google no longer publishes per-model free-tier quotas; the live numbers for
 * a given key are at https://aistudio.google.com/rate-limit. Model ids are
 * also retired on a schedule, so both the model and the vision model are
 * env-overridable — if a call starts failing with NOT_FOUND, set GEMINI_MODEL
 * rather than editing code.
 *
 * The API key is read from GEMINI_API_KEY, the name the official @google/genai
 * SDK looks for itself. (It also accepts GOOGLE_API_KEY, which takes priority
 * inside the SDK when both are set; we standardise on GEMINI_API_KEY to match
 * this repo's <PROVIDER>_API_KEY convention.)
 */
const DEFAULT_MODEL = "gemini-3.5-flash-lite"

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const client = apiKey ? new GoogleGenAI({ apiKey }) : null

/** Gemini does not issue ids for function calls; we synthesise stable ones. */
function synthesiseCallId(name: string, index: number): string {
  return `${name}_${index}`
}

/**
 * Translate our provider-neutral turns into Gemini `contents`.
 *
 * The shapes differ in two ways that matter:
 *  - Gemini has no "assistant" role; the model's role is "model".
 *  - Tool results are not their own role. They are a `functionResponse` part
 *    carried on a turn with role "user".
 */
function toContents(turns: AiTurn[]): Content[] {
  const contents: Content[] = []

  for (const turn of turns) {
    if (turn.role === "user") {
      contents.push({ role: "user", parts: [{ text: turn.content }] })
      continue
    }

    if (turn.role === "assistant") {
      const parts: Part[] = []
      if (turn.content) parts.push({ text: turn.content })
      for (const call of turn.toolCalls ?? []) {
        parts.push({ functionCall: { name: call.name, args: call.args } })
      }
      // A model turn with neither text nor calls would be rejected as empty.
      if (parts.length === 0) parts.push({ text: "" })
      contents.push({ role: "model", parts })
      continue
    }

    // turn.role === "tool"
    let response: Record<string, unknown>
    try {
      const parsed = JSON.parse(turn.content)
      // functionResponse.response must be an object, so wrap anything else.
      response =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { result: parsed }
    } catch {
      response = { result: turn.content }
    }
    contents.push({
      role: "user",
      parts: [{ functionResponse: { name: turn.name, response } }],
    })
  }

  return contents
}

/**
 * Pull the text out of a response.
 *
 * `response.text` is a getter that concatenates the visible text parts, and it
 * is undefined — not "" — when the prompt or the candidate was blocked, when
 * the model emitted only function calls, or when it hit the output ceiling
 * before producing visible text. Walk the parts as a fallback, then let the
 * caller decide: routes treat empty as a failure and refund the user's tokens.
 */
function readText(response: GenerateContentResponse): string {
  const direct = response.text
  if (typeof direct === "string" && direct.length > 0) return direct

  const parts = response.candidates?.[0]?.content?.parts ?? []
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
}

/**
 * Why a response came back with no text. Worth logging: a safety block and an
 * exhausted output budget need very different fixes, and both look identical
 * from the route.
 */
function emptyReason(response: GenerateContentResponse): string {
  const blocked = response.promptFeedback?.blockReason
  if (blocked) return `prompt blocked: ${blocked}`
  const finish = response.candidates?.[0]?.finishReason
  if (finish && finish !== "STOP") return `finishReason: ${finish}`
  return "no text in response"
}

function readToolCalls(response: GenerateContentResponse): AiToolCall[] {
  const calls = response.functionCalls ?? []
  return calls.map((call, index) => ({
    id: call.id || synthesiseCallId(call.name || "tool", index),
    name: call.name || "",
    args: (call.args ?? {}) as Record<string, unknown>,
  }))
}

/**
 * Turn an SDK error into something worth reading in the logs. Quota exhaustion
 * is the one every free-tier deployment hits, so name it explicitly instead of
 * letting it surface as a bare 429.
 */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/RESOURCE_EXHAUSTED|\b429\b|quota/i.test(message)) {
    return `Gemini quota exceeded (free-tier daily or per-minute limit): ${message}`
  }
  if (/NOT_FOUND|\b404\b/i.test(message)) {
    return `Gemini model "${MODEL}" not found — it may have been retired. Set GEMINI_MODEL to a current model id. (${message})`
  }
  return message
}

const MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL
/** OCR previously ran on a dedicated vision model, so keep that seam. */
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || MODEL

/**
 * Gemini 3.x models think before answering by default, and those thinking
 * tokens are billed and counted against maxOutputTokens — so a model can spend
 * its whole budget reasoning and return nothing visible. Every call here is a
 * short, well-specified transform (paraphrase, summarise, grammar, extract),
 * so thinking buys nothing and costs latency and free-tier quota. Keep it
 * minimal; the tool-calling loop is the one place a little reasoning helps.
 */
const CONFIG_BASE = { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }

/** Accept either raw base64 or a full data: URL; the SDK needs it raw. */
function stripDataUrlPrefix(base64: string): string {
  const comma = base64.indexOf(",")
  return base64.startsWith("data:") && comma !== -1 ? base64.slice(comma + 1) : base64
}

export const geminiProvider: AiProvider = {
  name: "gemini",
  model: MODEL,

  isConfigured() {
    return client !== null
  },

  async generate(options: GenerateOptions): Promise<string> {
    if (!client) throw new Error("GEMINI_API_KEY is not set")

    const parts: Part[] = [{ text: options.prompt }]
    if (options.image) {
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType,
          data: stripDataUrlPrefix(options.image.base64),
        },
      })
    }

    try {
      const response = await client.models.generateContent({
        model: options.image ? VISION_MODEL : MODEL,
        contents: [{ role: "user", parts }],
        config: {
          ...CONFIG_BASE,
          ...(options.system ? { systemInstruction: options.system } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxOutputTokens !== undefined
            ? { maxOutputTokens: options.maxOutputTokens }
            : {}),
          // Native JSON mode. Cheaper and far more reliable than asking for
          // JSON in the prompt and then stripping ``` fences off the reply.
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      })
      const text = readText(response)
      if (!text) console.error(`Gemini empty response — ${emptyReason(response)}`)
      return text
    } catch (error) {
      throw new Error(describeError(error))
    }
  },

  async generateWithTools(options: GenerateWithToolsOptions): Promise<ToolsResult> {
    if (!client) throw new Error("GEMINI_API_KEY is not set")

    const functionDeclarations: FunctionDeclaration[] = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      // parametersJsonSchema takes plain JSON Schema, so the existing tool
      // definitions carry over unchanged.
      parametersJsonSchema: tool.parameters,
    }))

    try {
      const response = await client.models.generateContent({
        model: MODEL,
        contents: toContents(options.turns),
        config: {
          ...(options.system ? { systemInstruction: options.system } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxOutputTokens !== undefined
            ? { maxOutputTokens: options.maxOutputTokens }
            : {}),
          tools: [{ functionDeclarations }],
        },
      })
      return { text: readText(response), toolCalls: readToolCalls(response) }
    } catch (error) {
      throw new Error(describeError(error))
    }
  },
}
