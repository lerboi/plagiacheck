/**
 * FE-12 — client-side Markdown export of a PlagiaAI conversation.
 *
 * Pure functions plus one download helper. No server round-trip — the
 * Blob + URL.createObjectURL dance lives entirely here so the chat
 * component just calls `downloadConversationMarkdown(items)` and gets a
 * .md file on disk.
 */

import type { PlagiaAiToolName } from "./types"

export interface ExportableUserMessage {
  kind: "user"
  content: string
}

export interface ExportableAssistantMessage {
  kind: "assistant"
  content: string
}

export interface ExportableToolMessage {
  kind: "tool"
  name: PlagiaAiToolName
  argsSummary: string
  status: "pending_confirm" | "running" | "done" | "failed"
  resultPreview?: string
  error?: string
}

export type ExportableMessage =
  | ExportableUserMessage
  | ExportableAssistantMessage
  | ExportableToolMessage

/**
 * `YYYY-MM-DD-HHMM` in local time. Used in the export filename so the
 * sort order on disk matches the user's clock.
 */
export function formatExportTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}-${m}-${d}-${hh}${mm}`
}

export function formatExportFilename(date: Date): string {
  return `plagia-ai-${formatExportTimestamp(date)}.md`
}

function renderHumanDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const TOOL_STATUS_LABELS: Record<ExportableToolMessage["status"], string> = {
  pending_confirm: "(awaiting confirmation)",
  running: "(in progress)",
  done: "",
  failed: "(failed)",
}

/**
 * The visible text of an export. Every field is optional and defaults to
 * the English wording, so callers that pass nothing get the same file.
 */
export interface ConversationExportLabels {
  /** Builds the H1 from the already-formatted date. */
  heading: (date: string) => string
  /** H2 above each user message. */
  you: string
  /** Body of a failed tool block that has no error message. */
  toolFailed: string
  /** Suffix shown for tool blocks without a result preview. */
  toolStatus: Record<ExportableToolMessage["status"], string>
  /** BCP 47 tag for the heading date; undefined uses the browser default. */
  dateLocale?: string
}

const DEFAULT_EXPORT_LABELS: ConversationExportLabels = {
  heading: (date) => `PlagiaAI conversation — ${date}`,
  you: "You",
  toolFailed: "Tool failed",
  toolStatus: TOOL_STATUS_LABELS,
  dateLocale: undefined,
}

export function conversationToMarkdown(
  messages: ExportableMessage[],
  now: Date = new Date(),
  labels: Partial<ConversationExportLabels> = {},
): string {
  const l: ConversationExportLabels = { ...DEFAULT_EXPORT_LABELS, ...labels }
  const lines: string[] = []
  lines.push(`# ${l.heading(renderHumanDate(now, l.dateLocale))}`)
  lines.push("")

  for (const m of messages) {
    if (m.kind === "user") {
      const trimmed = m.content.trim()
      if (!trimmed) continue
      lines.push(`## ${l.you}`)
      lines.push("")
      lines.push(trimmed)
      lines.push("")
    } else if (m.kind === "assistant") {
      const trimmed = m.content.trim()
      if (!trimmed) continue
      lines.push("## PlagiaAI")
      lines.push("")
      lines.push(trimmed)
      lines.push("")
    } else {
      lines.push("```tool " + m.name)
      lines.push(m.argsSummary)
      const body =
        m.status === "failed"
          ? m.error || l.toolFailed
          : m.resultPreview || l.toolStatus[m.status]
      if (body) lines.push(body)
      lines.push("```")
      lines.push("")
    }
  }

  return lines.join("\n")
}

/**
 * Trigger a browser download for the rendered Markdown. Safe to call
 * during a user-gesture event handler. Returns the generated filename
 * so the caller can toast it.
 */
export function downloadConversationMarkdown(
  messages: ExportableMessage[],
  now: Date = new Date(),
  labels: Partial<ConversationExportLabels> = {},
): string {
  const content = conversationToMarkdown(messages, now, labels)
  const filename = formatExportFilename(now)
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Free the object URL on the next tick so the browser has time to start
  // the download. Best-effort — older browsers may swallow this.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return filename
}
