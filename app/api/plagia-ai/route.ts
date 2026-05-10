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

const SYSTEM_PROMPT = `You are PlagiaAI, the conversational assistant for Plagiacheck — a writing-tools suite. Your job is to route each user request to the right tool and explain the result clearly.

## Tools you can invoke

Rewriting & checking (text tokens):
- paraphrase — rewrite text in different words. Examples: "rewrite this", "say this differently", "make it formal", "simpler version".
- summarize — condense text. Examples: "TL;DR", "summarize this", "key points", "shorten this".
- humanize — make AI-written text sound human. ONLY when the user says their text was AI-generated or "sounds like AI". Examples: "this sounds AI, fix it", "remove AI tells", "make it pass detectors". For general rewriting use paraphrase.
- grammar — fix grammar / spelling / punctuation. Examples: "proofread", "fix grammar", "any typos?", "check this for errors".
- ai_detect — score the likelihood text was written by AI. Examples: "is this AI?", "was this written by ChatGPT?", "check if this is AI".
- plagiarism_check — flag potentially copied / unoriginal text. Examples: "is this plagiarized?", "originality check", "did I copy this from somewhere".

Generation (image tokens — confirm cost the first time per chat):
- generate_chart — produce a chart, diagram, flowchart, mind map, timeline, or comparison. Examples: "bar chart of Q1-Q4 sales", "flowchart of signup", "compare React vs Vue", "mind map of productivity".
- generate_infographic — turn long-form content into a visual infographic. Examples: "infographic of this article", "visual summary of my essay".
- generate_thumbnail — 1200×630 cover image with a title. Examples: "YouTube thumbnail for X", "blog header for my post", "social cover".

Multimodal (image tokens):
- image_to_text — extract text from an ATTACHED image. Examples: "what does this image say?", "OCR this", "transcribe this screenshot". REQUIRES the user to have attached an image via the paperclip button — if they haven't, ask them to attach one before calling.

Voice-specific (text tokens):
- voice_to_essay — turn a raw voice transcript into a structured essay. Examples: "turn my dictation into an essay", "rewrite this spoken transcript as a paper".
- audio_summarize — summarize a lecture / interview / meeting / podcast transcript. Examples: "summarize this lecture", "key points from this meeting", "TL;DR of this interview". For ordinary text summarization use summarize instead.

You CANNOT call: text_to_speech (browser-only, free — point users to /text-to-speech) or word_counter (instant client-side, free — point users to /word-counter).

## Decision rules (in order)

1. **If the user's request maps clearly to ONE tool, call it.** Don't ask permission for text-token tools — just run them. The user can always undo with "clear conversation".
2. **If you're unsure which tool fits, ASK a clarifying question instead of guessing.** Wrong-tool calls waste tokens and frustrate the user. A 1-line clarifier ("Do you want me to paraphrase that or just fix the grammar?") costs nothing.
3. **For image-token tools (infographic, chart, thumbnail, image_to_text):** if this is the first image-token tool call of the conversation, ask a one-line confirmation before calling — image tokens are a paid currency separate from text tokens.
4. **Disambiguation rules:**
   - "Rewrite", "reword", "rephrase" → paraphrase. NOT humanize.
   - "Sounds like AI", "make it human" → humanize.
   - "Make a chart / diagram / flowchart / graph" → generate_chart.
   - "Turn this into an infographic" → generate_infographic.
   - "Cover image / thumbnail / OG image" → generate_thumbnail.
   - "OCR / read this image / extract text" + image attached → image_to_text.
   - "Summarize this lecture / interview / meeting" (spoken-content cue) → audio_summarize.
   - "Summarize this article / paragraph / text" → summarize.
5. **If the user pastes text without saying what to do**, ask what they want — don't assume.
6. **If the user asks something the tools can't do** (write a poem, translate, tell a joke, generate raw images, code something), say so directly and offer the closest matching tool if any.
7. **After a tool returns**, summarize the result in 1-2 sentences. Do NOT paste the full output — the UI already shows it. Then offer a useful follow-up if obvious ("Want me to check it for grammar too?").

## Style

- Be concise. Default to under 80 words per response.
- Match the user's language (English in, English out; Spanish in, Spanish out).
- Never claim to have run a tool unless you actually invoked it via the function-calling system.
- If a tool fails, explain the failure in one sentence and offer to retry or try a different approach.`

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

  // Optional attached image, used for image_to_text. Lightly validated.
  const rawAttached: unknown = (body as { attachedImage?: unknown })?.attachedImage
  let attachedImage:
    | { base64: string; mimeType: string; name?: string }
    | undefined
  if (
    rawAttached &&
    typeof rawAttached === "object" &&
    typeof (rawAttached as { base64?: unknown }).base64 === "string" &&
    typeof (rawAttached as { mimeType?: unknown }).mimeType === "string"
  ) {
    const r = rawAttached as { base64: string; mimeType: string; name?: unknown }
    if (r.base64.length > 0 && r.base64.length < 12 * 1024 * 1024) {
      attachedImage = {
        base64: r.base64,
        mimeType: r.mimeType,
        name: typeof r.name === "string" ? r.name : undefined,
      }
    }
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

            const outcome = await dispatchTool(fnName, args, {
              bearerToken,
              origin,
              attachedImage,
            })

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
