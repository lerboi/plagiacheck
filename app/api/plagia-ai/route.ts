import { Mistral } from "@mistralai/mistralai"
import { createClient } from "@supabase/supabase-js"
import { getUserFromRequest } from "@/lib/server-auth"
import { MISTRAL_TOOLS, summarizeArgs } from "@/lib/plagia-ai/tools"
import { dispatchTool } from "@/lib/plagia-ai/dispatcher"
import { estimateToolCost } from "@/lib/plagia-ai/config"
import { buildPreferencesSystemMessage, loadPreferences } from "@/lib/plagia-ai/preferences"
import { getFallbackFollowups } from "@/lib/plagia-ai/followups"
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
/** FE-05: per-tool retry cap to avoid infinite-loop failures. 2 retries = 3 total attempts. */
const MAX_RETRIES_PER_TOOL = 2

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

1. **PRE-DISPATCH: do you have enough information?** Before calling ANY tool, verify:
   - **Did the user name an action without providing the source text?** Messages like "fix this", "summarize", "paraphrase that", "make it formal", "is this AI?", "check the grammar" — when there's no actual text in the message or any earlier user turn — mean you have a verb but no object. Do NOT call a tool. Reply with a one-line ask, e.g. "Sure — what text would you like me to fix?" or "Paste the text you'd like me to summarize."
   - **Did the user paste text without saying what to do?** A bare paragraph with no instruction. Do NOT call a tool. Reply with a one-line ask plus 2-3 likely options, e.g. "What would you like to do with this — paraphrase, summarize, check grammar, or check for plagiarism?"
   - **Did the user attach an image but not say what to do?** Reply: "Would you like me to extract the text from this image?" and wait for confirmation before calling image_to_text.
   - **Is the action vague and maps to multiple tools?** Messages like "make this better", "improve this", "polish this", "clean this up" — could mean paraphrase, grammar, or humanize. Ask which: "Do you want me to fix grammar errors, rewrite it for style, or make it sound more human?"
   - **Has the user used a pronoun ("this", "that", "it") with no prior text in the conversation?** Same as the first bullet — ask what text they mean.
   - In ALL these cases, **emit only the clarifying question — do not call a tool. Calling a tool with no/wrong input wastes the user's tokens.**

2. **If the user's request maps clearly to ONE tool, call it.** Don't ask permission for text-token tools — just run them. The user can always undo with "clear conversation".

3. **If you're unsure WHICH tool fits even though you have enough input, ASK a clarifying question instead of guessing.** A 1-line clarifier ("Do you want me to paraphrase that or just fix the grammar?") costs nothing.

4. **For image-token tools (infographic, chart, thumbnail, image_to_text):** if this is the first image-token tool call of the conversation, ask a one-line confirmation before calling — image tokens are a paid currency separate from text tokens.

5. **Disambiguation rules:**
   - "Rewrite", "reword", "rephrase" → paraphrase. NOT humanize.
   - "Sounds like AI", "make it human" → humanize.
   - "Make a chart / diagram / flowchart / graph" → generate_chart.
   - "Turn this into an infographic" → generate_infographic.
   - "Cover image / thumbnail / OG image" → generate_thumbnail.
   - "OCR / read this image / extract text" + image attached → image_to_text.
   - "Summarize this lecture / interview / meeting" (spoken-content cue) → audio_summarize.
   - "Summarize this article / paragraph / text" → summarize.

6. **If the user asks something the tools can't do** (write a poem, translate, tell a joke, generate raw images, code something), say so directly and offer the closest matching tool if any.

7. **After a tool returns**, summarize the result in 1-2 sentences. Do NOT paste the full output — the UI already shows it. Then offer a useful follow-up if obvious ("Want me to check it for grammar too?").

8. **Tool-call reasoning (transparency):** WHENEVER you are about to call a tool, your immediately-preceding assistant text MUST be exactly ONE short sentence (≤15 words) explaining why this tool fits the user's intent. The UI extracts this sentence and shows it as a caption inside the tool card. Examples:
   ✓ "Plagiarism checker fits — you want originality flags on a passage."
   ✓ "Switching to humanize since you said it sounds AI."
   ✗ "Sure, I'll run that for you now!" (no reason; useless caption)
   ✗ "Let me think about this... actually I'll use the paraphraser because it..." (too long, multi-sentence)
   If you have NO useful tool to call, do not invent a reason — emit a clarifying question instead per rule 1.

9. **Recover from tool failures.** When a tool returns \`ok: false\` with an error, DO NOT immediately surrender to the user. Read the error and decide:
   a) **Retry the SAME tool with different args.** Common case: arg validation ("text was empty", "transcript missing"), a transient network blip, or the tool rejected a malformed prompt. Adjust the args (re-include the user's source text, fix a wrong field, shorten an oversized payload) and call the same tool again with a fresh reasoning sentence.
   b) **Switch to a different tool** that fits the user's intent. Examples: if \`generate_chart\` fails with "could not parse data", consider \`generate_infographic\` for the same content. If \`audio_summarize\` fails, fall back to \`summarize\` on the same transcript.
   c) **Only after retry/switch attempts run out**, tell the user what failed in one short sentence and ask how to proceed.

   **Hard limit:** you have at most **2 retries per tool name** within a single user turn (so 3 total attempts of the same tool). After the second failure, the server refuses to dispatch that tool again and emits an error saying so — at which point you MUST stop retrying that tool, either switch to a different tool or tell the user. Don't waste the third attempt on the same broken call shape.

10. **Suggest 2–3 follow-up actions after a SUCCESSFUL tool result.** In your wrap-up turn (the assistant message that summarizes the tool result per rule 7), append a marker on its own line at the very END of your message:

    \`[[FOLLOWUPS: action one | action two | action three]]\`

    The UI extracts this marker, strips it from the visible text, and renders the actions as clickable chips. Clicking a chip sends that exact string as the user's next message — so phrase each suggestion as a natural follow-up the user might want.

    Rules:
    - **Only emit after a tool succeeded.** Never after a tool failure (the user is recovering) and never on a clarifying question (no result to follow up on yet).
    - **Exactly 2 or 3 suggestions.** Use the \`|\` pipe delimiter. Keep each ≤8 words.
    - **Make them concrete.** "Paraphrase the result formally" beats "Modify the text".
    - **Vary the tools.** If the tool was \`paraphrase\`, good follow-ups call \`grammar\`, \`humanize\`, \`summarize\`. Don't repeat the same tool unless an obvious refinement applies.
    - **Don't suggest tools requiring input the user hasn't provided** (e.g. no "Check this image" if no image is attached).
    - If no obvious follow-ups apply, OMIT the marker entirely — don't emit an empty \`[[FOLLOWUPS: ]]\`.

    Examples:
    ✓ \`The paraphrase keeps your meaning while sounding more formal. [[FOLLOWUPS: Check it for grammar | Make it shorter | Detect any AI signals]]\`
    ✓ \`3 grammar issues fixed. [[FOLLOWUPS: Paraphrase it more formally | Summarize in 3 bullets]]\`
    ✗ \`Here you go! [[FOLLOWUPS:]]\` (empty)
    ✗ \`[[FOLLOWUPS: Do something | Do another thing | Do one more]]\` (vague)

## Clarifying-question shape

When asking, keep it to ONE short sentence. Do NOT preamble ("I'd love to help! Could you please..."). Do NOT echo the user's message back. Do NOT explain why you need more info. Just ask, directly:

  ✓ "What text would you like me to summarize?"
  ✓ "Paste the paragraph and I'll fix the grammar."
  ✓ "Do you want me to rewrite that for tone, or just fix the typos?"
  ✗ "I'd be happy to help! Could you please provide the text you'd like me to summarize?"
  ✗ "Sure thing! To assist you with summarizing, I'll need the actual text first..."

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

/**
 * FE-10 — pull the `[[FOLLOWUPS: a | b | c]]` marker (if any) out of an
 * assistant wrap-up message. Returns the cleaned text plus a sanitised
 * array of suggestion strings.
 *
 * Robustness:
 *  - Tolerates 2 or 3 (or more) suggestions; trims to 4 max.
 *  - Each suggestion is trimmed and capped at 80 chars so a confused
 *    model can't blow up the UI with a paragraph-long chip.
 *  - Empty suggestions are filtered.
 *  - If the marker is malformed (no closing brackets), we leave the text
 *    untouched and return no suggestions — graceful degradation over
 *    showing the user a half-stripped marker.
 */
function extractFollowups(text: string): {
  cleaned: string
  suggestions: string[]
} {
  // Multiline match — model usually puts the marker on its own line.
  const match = text.match(/\[\[FOLLOWUPS:\s*([^\]]+?)\s*\]\]/)
  if (!match) return { cleaned: text, suggestions: [] }
  const inner = match[1] ?? ""
  const suggestions = inner
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.length > 80 ? s.slice(0, 77) + "…" : s))
    .slice(0, 4)
  if (suggestions.length === 0) {
    return { cleaned: text, suggestions: [] }
  }
  // Strip the marker (including any whitespace immediately around it) so the
  // visible assistant text reads cleanly.
  const cleaned = text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim()
  return { cleaned, suggestions }
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

  // FE-04 controls — cost-confirm bypass + direct-dispatch resume path.
  const skipCostConfirm = body?.skipCostConfirm === true
  const directDispatch = body?.directDispatch
  if (directDispatch && !isKnownToolName(directDispatch.toolName)) {
    return Response.json(
      { error: `Unknown tool in directDispatch: ${directDispatch.toolName}` },
      { status: 400 },
    )
  }

  // FE-09 — load the user's saved preferences and (if any are set) inject a
  // second system message right after the main prompt. Read-only access; the
  // helper degrades gracefully if the `plagia_ai_preferences` column doesn't
  // exist on user_profiles yet (one-time SQL the user runs separately).
  const prefsSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const userPrefs = await loadPreferences(prefsSupabase, user.id)
  const prefsSystemMessage = buildPreferencesSystemMessage(userPrefs)

  // Build the running message history we feed back to Mistral each round.
  // We use `any[]` because Mistral message types include both tool roles and
  // toolCalls fields that aren't in our public PlagiaAiMessage type.
  const conversation: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(prefsSystemMessage ? [{ role: "system", content: prefsSystemMessage }] : []),
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
        // FE-11 — name of the most recent tool that succeeded in this turn.
        // Used to look up a deterministic follow-up set when the model's
        // wrap-up didn't include a [[FOLLOWUPS:...]] marker.
        let lastSuccessfulToolName: PlagiaAiToolName | null = null

        // ─── directDispatch resume path (FE-04) ──────────────────────
        // The client has confirmed a previously-paused tool call. Dispatch
        // it directly here (no model round), then fall through to the
        // normal round loop so the model can generate the follow-up
        // summary based on the tool result.
        if (directDispatch) {
          const { toolName, args, callId, reason } = directDispatch
          if (isKnownToolName(toolName)) {
            controller.enqueue(
              encode({
                type: "tool_call",
                id: callId,
                name: toolName,
                argsSummary: summarizeArgs(toolName, args),
                ...(reason ? { reason } : {}),
              }),
            )

            const outcome = await dispatchTool(toolName, args, {
              bearerToken,
              origin,
              attachedImage,
              // FE-06: forward streaming-tool progress as tool_progress
              // SSE events so the UI can render a progress bar.
              onProgress: ({ progress, message }) => {
                controller.enqueue(
                  encode({
                    type: "tool_progress",
                    id: callId,
                    progress,
                    ...(message ? { message } : {}),
                  }),
                )
              },
            })

            // Synthesize an assistant→tool exchange in the conversation
            // history so the model can see the tool was actually run.
            const syntheticToolCall = [
              {
                id: callId,
                type: "function",
                function: {
                  name: toolName,
                  arguments: JSON.stringify(args),
                },
              },
            ]

            if (outcome.ok) {
              lastSuccessfulToolName = toolName
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: true,
                  resultPreview: outcome.resultPreview,
                  result: outcome.result,
                  remainingTextTokens: outcome.remainingTextTokens,
                  remainingImageTokens: outcome.remainingImageTokens,
                  tokensUsed: outcome.tokensUsed,
                }),
              )
              conversation.push({
                role: "assistant",
                content: reason || "",
                toolCalls: syntheticToolCall,
              })
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: toolName,
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
                }),
              )
              conversation.push({
                role: "assistant",
                content: reason || "",
                toolCalls: syntheticToolCall,
              })
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: toolName,
                content: JSON.stringify({ ok: false, error: outcome.error }),
              })
            }
          }
        }

        let paused = false
        // FE-05 — per-tool retry tracking. Counts consecutive FAILED attempts
        // of each tool name within this single request. A success resets the
        // counter for that tool. Once a tool has hit MAX_RETRIES_PER_TOOL
        // consecutive failures, the server refuses further dispatches of it
        // and surfaces that to the model so it switches tactic or apologizes.
        const failureCounts: Map<PlagiaAiToolName, number> = new Map()
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

          const rawAssistantText = extractText(message.content)
          const toolCalls = (message as { toolCalls?: any[] }).toolCalls || []
          const hasToolCalls = toolCalls.length > 0

          // FE-10 — parse out the [[FOLLOWUPS: a | b | c]] marker the model
          // appends to its wrap-up turn after a successful tool. We strip it
          // from the visible delta and emit a separate `suggestions` SSE
          // event. Only applies on no-tool-call turns (the wrap-up); when
          // there ARE tool calls, this text is the "Why this tool" reasoning
          // per rule 8 and would never include a followups marker.
          const { cleaned: assistantText, suggestions: followups } = hasToolCalls
            ? { cleaned: rawAssistantText, suggestions: [] as string[] }
            : extractFollowups(rawAssistantText)

          // When there are no tool calls, this assistant text IS the response
          // — stream it as a normal delta (with the followups marker already
          // stripped). When there ARE tool calls, the text is the "Why this
          // tool" reasoning (per rule 8) and gets attached to the tool card
          // as `reason` instead, so we DON'T emit it as a duplicate
          // assistant bubble.
          if (!hasToolCalls && assistantText.trim()) {
            controller.enqueue(encode({ type: "delta", content: assistantText }))
          }

          // FE-11 — if the model's wrap-up didn't include a [[FOLLOWUPS:...]]
          // marker AND a tool actually succeeded this turn, fall back to the
          // deterministic per-tool defaults from lib/plagia-ai/followups.ts.
          // The model's own marker still wins when present; this only fires
          // when the marker is absent — defensive parity for when rule 10
          // gets ignored.
          const effectiveFollowups =
            followups.length > 0
              ? followups
              : lastSuccessfulToolName
                ? getFallbackFollowups(lastSuccessfulToolName)
                : []

          if (!hasToolCalls && effectiveFollowups.length > 0) {
            controller.enqueue(
              encode({ type: "suggestions", suggestions: effectiveFollowups }),
            )
          }

          if (!hasToolCalls) {
            break
          }

          conversation.push({
            role: "assistant",
            content: assistantText,
            toolCalls,
          })

          // The assistant's text emitted in THIS turn (before the tool calls)
          // is the "Why this tool" reasoning per rule 8 of the system prompt.
          // Only attach it to the first tool call of the turn — subsequent
          // tool calls in the same response share the same upstream reasoning
          // and the UI doesn't need duplicate captions.
          const turnReason = assistantText.trim().split("\n")[0]?.trim() || ""
          let reasonAttached = false

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

            // FE-05 retry cap: refuse to dispatch this tool once it has
            // failed MAX_RETRIES_PER_TOOL times in this request. We still
            // emit a tool_call → tool_result pair so the conversation has a
            // proper turn the model can read; the result is a synthetic
            // error telling the model the cap was reached. Per system
            // prompt rule 9, the model must switch tactic or tell the user.
            if ((failureCounts.get(fnName) || 0) >= MAX_RETRIES_PER_TOOL) {
              controller.enqueue(
                encode({
                  type: "tool_call",
                  id: callId,
                  name: fnName,
                  argsSummary: summarizeArgs(fnName, args),
                  ...(reasonAttached || !turnReason ? {} : { reason: turnReason }),
                }),
              )
              reasonAttached = true
              const capMessage = `Refused — this tool has already failed ${MAX_RETRIES_PER_TOOL} times in this turn. Try a different tool or tell the user the operation could not complete.`
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: false,
                  resultPreview: "",
                  error: capMessage,
                }),
              )
              conversation.push({
                role: "tool",
                toolCallId: callId,
                name: fnName,
                content: JSON.stringify({ ok: false, error: capMessage }),
              })
              continue
            }

            // FE-04 cost-confirm gate: emit tool_call with pendingConfirm
            // payload INSTEAD of dispatching, then break out of every loop
            // so the client can render the confirm UI. The client will
            // resume via a directDispatch POST.
            const cost = estimateToolCost(fnName, args)
            if (!skipCostConfirm && cost.requiresConfirm) {
              controller.enqueue(
                encode({
                  type: "tool_call",
                  id: callId,
                  name: fnName,
                  argsSummary: summarizeArgs(fnName, args),
                  ...(reasonAttached || !turnReason ? {} : { reason: turnReason }),
                  pendingConfirm: {
                    estimatedTokens: cost.tokens,
                    currency: cost.currency,
                    args,
                  },
                }),
              )
              reasonAttached = true
              paused = true
              break
            }

            controller.enqueue(
              encode({
                type: "tool_call",
                id: callId,
                name: fnName,
                argsSummary: summarizeArgs(fnName, args),
                ...(reasonAttached || !turnReason ? {} : { reason: turnReason }),
              })
            )
            reasonAttached = true

            const outcome = await dispatchTool(fnName, args, {
              bearerToken,
              origin,
              attachedImage,
              // FE-06: forward streaming-tool progress as tool_progress
              // SSE events (only meaningful for plagiarism_check today).
              onProgress: ({ progress, message }) => {
                controller.enqueue(
                  encode({
                    type: "tool_progress",
                    id: callId,
                    progress,
                    ...(message ? { message } : {}),
                  }),
                )
              },
            })

            if (outcome.ok) {
              // FE-05 — success clears the retry counter for this tool so
              // future calls in the same turn start fresh.
              failureCounts.delete(fnName)
              // FE-11 — remember the most recent successful tool so the
              // followups fallback below can synthesize defaults if the
              // model's wrap-up omits the marker.
              lastSuccessfulToolName = fnName
              controller.enqueue(
                encode({
                  type: "tool_result",
                  id: callId,
                  ok: true,
                  resultPreview: outcome.resultPreview,
                  result: outcome.result,
                  remainingTextTokens: outcome.remainingTextTokens,
                  remainingImageTokens: outcome.remainingImageTokens,
                  tokensUsed: outcome.tokensUsed,
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
              // FE-05 — failure increments the counter; once it reaches
              // MAX_RETRIES_PER_TOOL the gate above will refuse further
              // dispatches in this request.
              failureCounts.set(fnName, (failureCounts.get(fnName) || 0) + 1)
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
          if (paused) break
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
