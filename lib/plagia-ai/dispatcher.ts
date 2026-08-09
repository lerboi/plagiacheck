import type { AttachedImage, PlagiaAiToolName } from "./types"

export interface DispatchSuccess {
  ok: true
  result: Record<string, unknown>
  remainingTextTokens?: number
  remainingImageTokens?: number
  /** FE-23 — actual cost of this single dispatch in the same currency as
   *  remainingTextTokens / remainingImageTokens (whichever is set). All
   *  underlying tool routes return `tokensUsed: cost` in their JSON, so
   *  we just pass it through. */
  tokensUsed?: number
  resultPreview: string
}

export interface DispatchFailure {
  ok: false
  error: string
}

export type DispatchOutcome = DispatchSuccess | DispatchFailure

interface DispatchCtx {
  bearerToken: string
  origin: string
  attachedImage?: AttachedImage
  /**
   * FE-06: when set, the dispatcher forwards intermediate progress updates
   * from streaming tool routes here. The caller (the /api/plagia-ai route
   * stream handler) typically pipes these into outbound `tool_progress`
   * SSE events. Non-streaming tools never invoke this; absence is fine.
   */
  onProgress?: (update: { progress: number; message?: string }) => void
}

function buildJsonRequest(body: unknown, ctx: DispatchCtx) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.bearerToken}`,
    },
    body: JSON.stringify(body),
  }
}

function previewText(value: unknown, max = 280): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed
}

async function callJsonRoute(
  url: string,
  body: unknown,
  ctx: DispatchCtx
): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const res = await fetch(url, buildJsonRequest(body, ctx))
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: res.ok, data, status: res.status }
  } catch (err) {
    return {
      ok: false,
      data: { error: err instanceof Error ? err.message : "Network error" },
      status: 0,
    }
  }
}

/**
 * Consume an SSE response body, returning the last parsed JSON event that
 * contains a `result` field. Used for /api/check-plagiarism which streams
 * progress updates and a final result event.
 */
async function consumePlagiarismStream(
  url: string,
  body: unknown,
  ctx: DispatchCtx
): Promise<{ ok: boolean; data: any; status: number }> {
  let res: Response
  try {
    res = await fetch(url, buildJsonRequest(body, ctx))
  } catch (err) {
    return {
      ok: false,
      data: { error: err instanceof Error ? err.message : "Network error" },
      status: 0,
    }
  }

  if (!res.ok || !res.body) {
    let errData: any = null
    try {
      errData = await res.json()
    } catch {
      errData = null
    }
    return { ok: false, data: errData || {}, status: res.status }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let lastPayload: any = null
  let streamError: string | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sepIndex
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)
      const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json) continue
      try {
        const payload = JSON.parse(json)
        if (payload.error) streamError = String(payload.error)
        if (payload.result) lastPayload = payload
        // FE-06: forward progress to the caller's pipe-out. The
        // /api/check-plagiarism route emits `progress` numbers as it
        // streams; we surface them as `tool_progress` SSE events.
        if (
          typeof payload.progress === "number" &&
          ctx.onProgress &&
          !payload.result // skip the final event — it carries progress=100 but the UI is about to transition to "done"
        ) {
          ctx.onProgress({
            progress: payload.progress,
            message: typeof payload.message === "string" ? payload.message : undefined,
          })
        }
      } catch {
        // ignore malformed events
      }
    }
  }

  if (streamError) {
    return { ok: false, data: { error: streamError }, status: 500 }
  }
  if (!lastPayload) {
    return { ok: false, data: { error: "No result from plagiarism check" }, status: 500 }
  }
  return { ok: true, data: lastPayload, status: 200 }
}

export async function dispatchTool(
  name: PlagiaAiToolName,
  args: Record<string, unknown>,
  ctx: DispatchCtx
): Promise<DispatchOutcome> {
  switch (name) {
    case "paraphrase": {
      const r = await callJsonRoute(`${ctx.origin}/api/ai-tools`, {
        text: args.text,
        tool: "paraphrase",
        options: { mode: args.mode || "standard" },
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Paraphraser failed (${r.status})` }
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: previewText(r.data.result?.paraphrasedText),
      }
    }
    case "summarize": {
      const r = await callJsonRoute(`${ctx.origin}/api/ai-tools`, {
        text: args.text,
        tool: "summarize",
        options: {
          length: args.length_percent ?? 30,
          format: args.format || "paragraph",
        },
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Summarizer failed (${r.status})` }
      const summary = r.data.result?.summary
      const bullets: string[] = Array.isArray(r.data.result?.bulletPoints)
        ? r.data.result.bulletPoints
        : []
      const preview = summary || (bullets.length ? bullets.map((b) => `• ${b}`).join("\n") : "")
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: previewText(preview),
      }
    }
    case "humanize": {
      const r = await callJsonRoute(`${ctx.origin}/api/ai-tools`, {
        text: args.text,
        tool: "humanize",
        options: { tone: args.tone || "casual", level: args.level ?? 50 },
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Humanizer failed (${r.status})` }
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: previewText(r.data.result?.humanizedText),
      }
    }
    case "ai_detect": {
      const r = await callJsonRoute(`${ctx.origin}/api/ai-tools`, {
        text: args.text,
        tool: "ai-detect",
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `AI Detector failed (${r.status})` }
      const verdict = r.data.result?.verdict
      const score = r.data.result?.overallScore
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: verdict ? `${verdict} — ${score}% AI` : "Analysis complete",
      }
    }
    case "grammar": {
      const r = await callJsonRoute(`${ctx.origin}/api/ai-tools`, {
        text: args.text,
        tool: "grammar",
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Grammar checker failed (${r.status})` }
      const issueCount = Array.isArray(r.data.result?.issues) ? r.data.result.issues.length : 0
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `${issueCount} issue${issueCount === 1 ? "" : "s"} found`,
      }
    }
    case "plagiarism_check": {
      const r = await consumePlagiarismStream(`${ctx.origin}/api/check-plagiarism`, {
        text: args.text,
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Plagiarism check failed (${r.status})` }
      const pct = r.data.result?.plagiarismPercentage ?? 0
      const matches = Array.isArray(r.data.result?.matches) ? r.data.result.matches.length : 0
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `${Math.round(pct)}% plagiarism · ${matches} match${matches === 1 ? "" : "es"}`,
      }
    }
    case "generate_infographic": {
      const r = await callJsonRoute(`${ctx.origin}/api/generate-image`, {
        text: args.source_text,
        tool: "infographic",
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Infographic generator failed (${r.status})` }
      return {
        ok: true,
        result: r.data,
        remainingImageTokens: r.data.remainingImageTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `Infographic: ${r.data.result?.title || "Untitled"}`,
      }
    }
    case "generate_chart": {
      const r = await callJsonRoute(`${ctx.origin}/api/generate-image`, {
        text: args.description,
        tool: "chart",
        options: { chartType: args.chart_type || "auto-detect" },
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Chart generator failed (${r.status})` }
      return {
        ok: true,
        result: r.data,
        remainingImageTokens: r.data.remainingImageTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `Chart (${r.data.result?.chartType || "auto"}): ${r.data.result?.title || "Untitled"}`,
      }
    }
    case "image_to_text": {
      if (!ctx.attachedImage?.base64) {
        return {
          ok: false,
          error: "No image attached. Ask the user to attach an image before extracting text.",
        }
      }
      const r = await callJsonRoute(`${ctx.origin}/api/image-to-text`, {
        imageBase64: ctx.attachedImage.base64,
        mimeType: ctx.attachedImage.mimeType,
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Image to Text failed (${r.status})` }
      const extracted = r.data.result?.extractedText
      const confidence = r.data.result?.confidence
      return {
        ok: true,
        result: r.data,
        remainingImageTokens: r.data.remainingImageTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: extracted
          ? `Extracted ${(extracted as string).length} chars${confidence ? ` (${confidence} confidence)` : ""}`
          : "No text extracted",
      }
    }
    case "voice_to_essay": {
      const r = await callJsonRoute(`${ctx.origin}/api/voice-tools`, {
        text: args.transcript,
        tool: "voice-to-essay",
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Voice to Essay failed (${r.status})` }
      const title = r.data.result?.title || "Essay"
      const wordCount = r.data.result?.wordCount
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: typeof wordCount === "number" ? `${title} · ${wordCount} words` : String(title),
      }
    }
    case "audio_summarize": {
      const r = await callJsonRoute(`${ctx.origin}/api/voice-tools`, {
        text: args.transcript,
        tool: "audio-summarize",
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Audio Summarizer failed (${r.status})` }
      const title = r.data.result?.title || "Summary"
      const points = Array.isArray(r.data.result?.keyPoints) ? r.data.result.keyPoints.length : 0
      return {
        ok: true,
        result: r.data,
        remainingTextTokens: r.data.remainingTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `${title} · ${points} key point${points === 1 ? "" : "s"}`,
      }
    }
    case "generate_thumbnail": {
      const r = await callJsonRoute(`${ctx.origin}/api/generate-image`, {
        text: args.title,
        tool: "thumbnail",
        options: { style: args.style || "modern" },
      }, ctx)
      if (!r.ok) return { ok: false, error: r.data?.error || `Thumbnail generator failed (${r.status})` }
      return {
        ok: true,
        result: r.data,
        remainingImageTokens: r.data.remainingImageTokens,
        tokensUsed: r.data.tokensUsed,
        resultPreview: `Thumbnail: ${r.data.result?.title || "Untitled"}`,
      }
    }
  }
}
