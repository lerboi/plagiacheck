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

function renderHumanDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
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

export function conversationToMarkdown(
  messages: ExportableMessage[],
  now: Date = new Date(),
): string {
  const lines: string[] = []
  lines.push(`# PlagiaAI conversation — ${renderHumanDate(now)}`)
  lines.push("")

  for (const m of messages) {
    if (m.kind === "user") {
      const trimmed = m.content.trim()
      if (!trimmed) continue
      lines.push("## You")
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
          ? m.error || "Tool failed"
          : m.resultPreview || TOOL_STATUS_LABELS[m.status]
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
): string {
  const content = conversationToMarkdown(messages, now)
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
