"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Nav } from "@/components/nav"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { getAuthHeader, useTokenStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import {
  PLAGIA_AI_SUGGESTED_PROMPTS,
  type PlagiaAiEvent,
  type PlagiaAiMessage,
  type PlagiaAiToolName,
} from "@/lib/plagia-ai/types"
import { toolDisplayName } from "@/lib/plagia-ai/tools"

const GREETING =
  "Hi — I'm PlagiaAI. Tell me what you'd like to do and I'll use the right tool: paraphrase, summarize, humanize, check grammar, detect AI, find plagiarism, generate charts, infographics, or thumbnails."

type ChatItem =
  | { kind: "user"; id: string; content: string }
  | { kind: "assistant"; id: string; content: string }
  | {
      kind: "tool"
      id: string
      name: PlagiaAiToolName
      argsSummary: string
      status: "running" | "done" | "failed"
      resultPreview?: string
      error?: string
      result?: unknown
    }

function genId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function PlagiaAiPage() {
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const [input, setInput] = useState("")
  const [items, setItems] = useState<ChatItem[]>([])
  const [streaming, setStreaming] = useState(false)
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  const { toast } = useToast()
  const { decrementWords, decrementImageTokens } = useTokenStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      setAuthChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [items])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const appendItem = (item: ChatItem) => {
    setItems((prev) => [...prev, item])
  }

  const updateItem = (id: string, updater: (prev: ChatItem) => ChatItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? updater(it) : it)))
  }

  const conversationHistoryForServer = (current: ChatItem[]): PlagiaAiMessage[] => {
    // Only user/assistant text turns are sent back; tool cards are internal UI.
    return current
      .filter(
        (it): it is Extract<ChatItem, { kind: "user" | "assistant" }> =>
          it.kind === "user" || it.kind === "assistant"
      )
      .map((it) => ({ role: it.kind, content: it.content }))
  }

  const handleSend = async () => {
    if (streaming) return
    const text = input.trim()
    if (!text) return

    if (!authChecked) return
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    const userItem: ChatItem = { kind: "user", id: genId(), content: text }
    const nextItems: ChatItem[] = [...items, userItem]
    setItems(nextItems)
    setInput("")
    setStreaming(true)
    setPendingAssistantId(null)

    let currentAssistantId: string | null = null
    let currentAssistantText = ""

    const flushAssistant = () => {
      if (currentAssistantId && currentAssistantText.trim()) {
        const idToFreeze = currentAssistantId
        const textToFreeze = currentAssistantText
        setItems((prev) =>
          prev.map((it) =>
            it.id === idToFreeze && it.kind === "assistant"
              ? { ...it, content: textToFreeze }
              : it
          )
        )
      }
      currentAssistantId = null
      currentAssistantText = ""
    }

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/plagia-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ messages: conversationHistoryForServer(nextItems) }),
      })

      if (response.status === 401) {
        setNeedsSignIn(true)
        setStreaming(false)
        setItems(items) // rollback
        return
      }

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "")
        throw new Error(errText || `Request failed (${response.status})`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let sepIndex
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex + 2)
          const dataLine = rawEvent
            .split("\n")
            .find((line) => line.startsWith("data:"))
          if (!dataLine) continue
          const payload = dataLine.slice(5).trim()
          if (!payload) continue
          let event: PlagiaAiEvent
          try {
            event = JSON.parse(payload) as PlagiaAiEvent
          } catch {
            continue
          }

          if (event.type === "delta") {
            if (!currentAssistantId) {
              currentAssistantId = genId()
              currentAssistantText = event.content
              const newId = currentAssistantId
              setPendingAssistantId(newId)
              appendItem({ kind: "assistant", id: newId, content: currentAssistantText })
            } else {
              currentAssistantText += event.content
              const idToUpdate = currentAssistantId
              updateItem(idToUpdate, (prev) =>
                prev.kind === "assistant"
                  ? { ...prev, content: currentAssistantText }
                  : prev
              )
            }
          } else if (event.type === "tool_call") {
            flushAssistant()
            setPendingAssistantId(null)
            appendItem({
              kind: "tool",
              id: event.id,
              name: event.name,
              argsSummary: event.argsSummary,
              status: "running",
            })
          } else if (event.type === "tool_result") {
            updateItem(event.id, (prev) =>
              prev.kind === "tool"
                ? {
                    ...prev,
                    status: event.ok ? "done" : "failed",
                    resultPreview: event.resultPreview,
                    error: event.error,
                    result: event.result,
                  }
                : prev
            )
            if (event.ok) {
              if (event.remainingTextTokens !== undefined) {
                void decrementWords()
              }
              if (event.remainingImageTokens !== undefined) {
                void decrementImageTokens()
              }
            }
          } else if (event.type === "error") {
            throw new Error(event.message)
          } else if (event.type === "done") {
            flushAssistant()
          }
        }
      }

      flushAssistant()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong."
      toast({
        title: "PlagiaAI error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setStreaming(false)
      setPendingAssistantId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  const conversationStarted = items.length > 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <ToolPageHeader
        icon={Sparkles}
        title="PlagiaAI"
        description="Chat with PlagiaAI — your AI writing assistant. Tell it what you want and it runs the right Plagiacheck tool for you."
        category="AI Assistant"
        iconColor="text-violet-500"
        iconBg="bg-violet-500/10 border-violet-500/20"
        categoryColor="text-violet-600 dark:text-violet-400"
      />

      <section className="flex-1 flex flex-col">
        <div className="container max-w-3xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
          {needsSignIn && !user && (
            <div className="mb-4">
              <ToolSignInPrompt />
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/30 p-5 space-y-5 min-h-[480px]"
          >
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] text-sm leading-relaxed text-foreground">
                {GREETING}
              </div>
            </div>

            {!conversationStarted && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2.5">
                  Try one of these:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLAGIA_AI_SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSuggestedPrompt(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-violet-400/40 hover:text-foreground transition-colors"
                    >
                      {p.length > 60 ? `${p.slice(0, 57)}...` : p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {items.map((it) => {
              if (it.kind === "user") {
                return (
                  <div key={it.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-primary/10 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {it.content}
                    </div>
                  </div>
                )
              }
              if (it.kind === "assistant") {
                const isStreamingThis = streaming && it.id === pendingAssistantId
                return (
                  <div key={it.id} className="flex flex-col items-start">
                    <div className="max-w-[85%] text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {it.content}
                      {isStreamingThis && (
                        <span className="inline-block ml-0.5 w-1.5 h-3.5 bg-violet-500/70 align-[-2px] animate-pulse" />
                      )}
                    </div>
                  </div>
                )
              }
              // tool card
              const isExpanded = !!expandedTools[it.id]
              const resultText = renderToolResult(it)
              return (
                <div
                  key={it.id}
                  className={`rounded-xl border px-4 py-3 text-sm space-y-2 ${
                    it.status === "failed"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border bg-card/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                      <Wrench className="h-3.5 w-3.5" />
                      <span className="font-medium">{toolDisplayName(it.name)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {it.argsSummary}
                    </span>
                    <ToolStatusBadge status={it.status} />
                  </div>
                  {it.status !== "running" && (
                    <div className="flex items-start gap-2 text-xs">
                      <button
                        onClick={() => toggleToolExpand(it.id)}
                        className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        {it.status === "failed" ? (
                          <span className="text-red-600 dark:text-red-400">
                            {it.error || "Tool failed"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {it.resultPreview || "Completed"}
                          </span>
                        )}
                        {isExpanded && resultText && (
                          <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-foreground bg-background/50 rounded-md p-3 border border-border max-h-[320px] overflow-y-auto">
                            {resultText}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 sticky bottom-4">
            <div className="rounded-xl border border-border bg-background shadow-sm">
              <Textarea
                ref={textareaRef}
                placeholder="Ask PlagiaAI anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Ctrl+Enter to send
                </span>
                <Button
                  onClick={handleSend}
                  disabled={streaming || !input.trim()}
                  className="h-8 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium shadow-none"
                >
                  {streaming ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Thinking
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}

function ToolStatusBadge({ status }: { status: "running" | "done" | "failed" }) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </span>
    )
  }
  if (status === "done") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Done
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Failed
    </span>
  )
}

function renderToolResult(
  it: Extract<ChatItem, { kind: "tool" }>
): string | null {
  if (it.status === "failed") return it.error || null
  const r = it.result as { result?: any } | undefined
  if (!r || !r.result) return it.resultPreview || null

  const data = r.result
  switch (it.name) {
    case "paraphrase":
      return data.paraphrasedText || null
    case "summarize":
      if (data.summary) return data.summary
      if (Array.isArray(data.bulletPoints))
        return data.bulletPoints.map((b: string) => `• ${b}`).join("\n")
      return null
    case "humanize":
      return data.humanizedText || null
    case "ai_detect":
      return data.analysis
        ? `${data.verdict} (${data.overallScore}% AI)\n\n${data.analysis}`
        : null
    case "grammar":
      return data.correctedText || null
    case "plagiarism_check": {
      const matches = Array.isArray(data.matches) ? data.matches : []
      const parts = [`${Math.round(data.plagiarismPercentage ?? 0)}% plagiarism detected`]
      if (matches.length) {
        parts.push(
          ...matches
            .slice(0, 5)
            .map(
              (m: any) =>
                `• ${m.text || "match"}${typeof m.similarity === "number" ? ` (${Math.round(m.similarity)}%)` : ""}`
            )
        )
      }
      return parts.join("\n")
    }
    case "generate_infographic":
    case "generate_chart":
    case "generate_thumbnail":
      return typeof data.svg === "string"
        ? `SVG output (${data.svg.length} chars). View in the standalone tool to render.`
        : null
  }
}
