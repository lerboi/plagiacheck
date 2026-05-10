import { Mistral } from "@mistralai/mistralai"
import { getUserFromRequest } from "@/lib/server-auth"
import type { PlagiaAiMessage, PlagiaAiRequestBody } from "@/lib/plagia-ai/types"

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest"

const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 12_000

const SYSTEM_PROMPT = `You are PlagiaAI, the conversational assistant for Plagiacheck — a writing-tools suite.

In a future iteration you will gain the ability to directly invoke Plagiacheck's tools (paraphraser, summarizer, AI humanizer, AI detector, grammar checker, plagiarism checker, infographic generator, chart generator, thumbnail generator, and more). For now you cannot call those tools, but you can:

- Discuss the user's writing and give thoughtful, specific feedback.
- Explain which Plagiacheck tool is best suited to the user's request and suggest they try it from the nav menu.
- Help the user phrase their next prompt so the upcoming tool-orchestration release will work well for them.

Style:
- Be concise. Default to under 120 words per response unless the user asks for more.
- Use plain prose. Avoid bullet-spam — only use lists when a list is genuinely clearer.
- Never claim to have run a tool. If asked to "run the paraphraser", explain that you can't yet but recommend the standalone tool page.
- Match the user's language.`

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

function sseEncoder() {
  const encoder = new TextEncoder()
  return (event: object) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: PlagiaAiRequestBody
  try {
    body = (await req.json()) as PlagiaAiRequestBody
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const messages = validateMessages(body?.messages)
  if (!messages) {
    return Response.json({ error: "Invalid messages payload" }, { status: 400 })
  }

  if (!mistralClient) {
    return Response.json({ error: "AI service not configured" }, { status: 500 })
  }

  const encode = sseEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await mistralClient.chat.stream({
          model: MISTRAL_MODEL,
          temperature: 0.5,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        })

        for await (const chunk of result) {
          const delta = chunk.data?.choices?.[0]?.delta?.content
          if (!delta) continue
          let text = ""
          if (typeof delta === "string") {
            text = delta
          } else if (Array.isArray(delta)) {
            for (const piece of delta) {
              if (typeof piece === "string") {
                text += piece
              } else if (piece && typeof piece === "object" && "text" in piece) {
                const t = (piece as { text?: unknown }).text
                if (typeof t === "string") text += t
              }
            }
          }
          if (text) controller.enqueue(encode({ type: "delta", content: text }))
        }

        controller.enqueue(encode({ type: "done" }))
        controller.close()
      } catch (err) {
        console.error("PlagiaAI stream error:", err)
        controller.enqueue(
          encode({
            type: "error",
            message: "The AI service is temporarily unavailable. Please try again.",
          })
        )
        controller.close()
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
