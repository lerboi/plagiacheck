import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type ToolHistoryTool =
  | "plagiarism"
  | "ai-detect"
  | "humanize"
  | "paraphrase"
  | "summarize"
  | "grammar"
  | "audio-summarize"
  | "voice-to-essay"
  | "speech-to-text"
  | "image-to-text"
  | "chart"
  | "infographic"
  | "thumbnail"

interface RecordToolUseInput {
  userId: string
  tool: ToolHistoryTool
  input: string
  output?: string
  metadata?: Record<string, unknown>
  tokensUsed: number
}

const PREVIEW_MAX = 600

function preview(s: string | undefined): string | null {
  if (!s) return null
  const trimmed = s.trim()
  if (trimmed.length === 0) return ""
  return trimmed.length > PREVIEW_MAX
    ? trimmed.substring(0, PREVIEW_MAX) + "…"
    : trimmed
}

/**
 * Best-effort write to tool_history. Errors are logged but never thrown —
 * a missing history row should not fail the user's tool call.
 */
export async function recordToolUse(input: RecordToolUseInput): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.from("tool_history").insert({
      user_id: input.userId,
      tool: input.tool,
      input_preview: preview(input.input) ?? "",
      output_preview: preview(input.output),
      metadata: input.metadata ?? {},
      tokens_used: input.tokensUsed,
    })
    if (error) {
      console.error("recordToolUse insert error:", error.message)
    }
  } catch (err) {
    console.error("recordToolUse threw:", err)
  }
}
