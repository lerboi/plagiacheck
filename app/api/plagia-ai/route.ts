import { Mistral } from "@mistralai/mistralai"
import { getUserFromRequest } from "@/lib/server-auth"
import { MISTRAL_TOOLS, summarizeArgs } from "@/lib/plagia-ai/tools"
import { dispatchTool } from "@/lib/plagia-ai/dispatcher"
import {
  PLAGIA_AI_TOOL_NAMES,
  type PlagiaAiMessage,
  type PlagiaAiRequestBody,
  type PlagiaAiToolName,
} from "@/lib/plagia-ai/types"

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest"

const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 12_000
const MAX_TOOL_ROUNDS = 5

const SYSTEM_PROMPT = `You are PlagiaAI, the conversational assistant for Plagiacheck — a writing-tools suite. You can invoke the following tools to do real work on the user's behalf:

- paraphrase: rewrite text in different words while preserving meaning (modes: standard, fluency, formal, simple, creative, academic)
- summarize: condense text into a shorter version (paragraph or bullets)
- humanize: rewrite AI-generated text to sound human (only when user says their text was AI-written)
- ai_detect: analyze whether a text was written by AI or human
- grammar: check and correct grammar/spelling/punctuation
- plagiarism_check: detect potentially plagiarized segments
- generate_infographic: turn source content into an SVG infographic (costs image tokens)
- generate_chart: generate an SVG chart/diagram from a natural-language description (costs image tokens)
- generate_thumbnail: generate a 1200x630 cover image with a title (costs image tokens)

How to decide:
1. If the user's request maps clearly to ONE tool, call it. Don't ask permission for cheap text-token tools — just run.
2. For image-token tools (infographic, chart, thumbnail), if the user has not already confirmed they want to spend image tokens in this conversation, ask a one-line confirming question before calling.
3. If the user provides text-to-be-processed without saying what to do with it, ASK what they want instead of guessing.
4. If the user asks something the tools can't do (e.g. "write a poem", "translate to French", "tell me a joke"), explain you're focused on Plagiacheck's tools and offer the closest match.
5. After a tool returns, summarize the result conversationally in 1-2 sentences — do NOT paste the full output, the UI already shows it. Then ask a short follow-up if relevant ("Want me to summarize that too?").

Style:
- Be concise. Default to under 80 words per response.
- Match the user's language.
- Never claim to have run a tool unless you actually invoked it via the function-calling system.
- If a tool fails, explain the failure briefly and offer to retry or try a different approach.`

function validateMessages(raw: unknown): PlagiaAiMessage[] | null {
  if (!raw || !Array.isArray(raw)) return null
  if (raw.length === 0 || raw.length > MAX_MESSAGES) return null

  const out: PlagiaAiMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== "object") return null
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if (role !== "user" && role !== "assistant") return null
    if (typeof content !== "string") return null
    if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) return null
    out.push({ role, content })
  }
  if (out[out.length - 1].role !== "user") return null
  return out
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    let text = ""
    for (const piece of content) {
      if (typeof piece === "string") {
        text += piece
      } else if (piece && typeof piece === "object" && "text" in piece) {
        const t = (piece as { text?: unknown }).text
        if (typeof t === "string") text += t
      }
    }
    return text
  }
  return ""
}

function isKnownToolName(name: string): name is PlagiaAiToolName {
  return (PLAGIA_AI_TOOL_NAMES as readonly string[]).includes(name)
}

function safeParseArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "object") return raw as Record<string, unknown>
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function sseEncoder() {
  const encoder = new TextEncoder()
  return (event: object) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || ""
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : ""

  const user = await getUserFromRequest(req)
  if (!user || !bearerToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: PlagiaAiRequestBody
  try {
    body = (await req.json()) as PlagiaAiRequestBody
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const validated = validateMessages(body?.messages)
  if (!validated) {
    return Response.json({ error: "Invalid messages payload" }, { status: 400 })
  }

  if (!mistralClient) {
    return Response.json({ error: "AI service not configured" }, { status: 500 })
  }

  const origin = new URL(req.url).origin
  const encode = sseEncoder()

  // Build the running message history we feed back to Mistral each round.
  // We use `any[]` because Mistral message types include both tool roles and
  // toolCalls fields that aren't in our public PlagiaAiMessage type.
  const conversation: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...validated.map((m) => ({ role: m.role, content: m.content })),
  ]

  const stream = new ReadableStream({
    async start(controller) {
      const close = () => {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const completion = await mistralClient.chat.complete({
            model: MISTRAL_MODEL,
            temperature: 0.4,
            messages: conversation,
            tools: MISTRAL_TOOLS as any,
            toolChoice: "auto",
          })

          const choice = completion.choices?.[0]
          const message = choice?.message
          if (!message) {
            controller.enqueue(encode({ type: "error", message: "No response from AI" }))
            break
          }

          const assistantText = extractText(message.content)
          const toolCalls = (message as { toolCalls?: any[] }).toolCalls || []

          if (assistantText.trim()) {
            controller.enqueue(encode({ type: "delta", content: assistantText }))
          }

          if (!toolCalls || toolCalls.length === 0) {
            break
          }

          conversation.push({
            role: "assistant",
            content: assistantText,
            toolCalls,
          })

          for (const call of toolCalls) {
            const callId: string = call.id || `call_${Math.random().toString(36).slice(2)}`
            const fnName: string = call.function?.name || ""
            const argsRaw = call.function?.arguments
            const args = safeParseArgs(argsRaw)

            if (!isKnownToolName(fnName)) {
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: false,
                  resultPreview: "",
                  error: `Unknown tool: ${fnName}`,
                })
              )
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: fnName,
                content: JSON.stringify({ ok: false, error: `Unknown tool ${fnName}` }),
              })
              continue
            }

            controller.enqueue(
              encode({
                type: "tool_call",
                id: callId,
                name: fnName,
                argsSummary: summarizeArgs(fnName, args),
              })
            )

            const outcome = await dispatchTool(fnName, args, { bearerToken, origin })

            if (outcome.ok) {
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: true,
                  resultPreview: outcome.resultPreview,
                  result: outcome.result,
                  remainingTextTokens: outcome.remainingTextTokens,
                  remainingImageTokens: outcome.remainingImageTokens,
                })
              )
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: fnName,
                content: JSON.stringify({
                  ok: true,
                  preview: outcome.resultPreview,
                  data: outcome.result,
                }),
              })
            } else {
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: false,
                  resultPreview: "",
                  error: outcome.error,
                })
              )
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: fnName,
                content: JSON.stringify({ ok: false, error: outcome.error }),
              })
            }
          }
        }

        controller.enqueue(encode({ type: "done" }))
      } catch (err) {
        console.error("PlagiaAI loop error:", err)
        controller.enqueue(
          encode({
            type: "error",
            message: "The AI service is temporarily unavailable. Please try again.",
          })
        )
      } finally {
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
