"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Nav } from "@/components/nav"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Send, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { getAuthHeader } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import {
  PLAGIA_AI_SUGGESTED_PROMPTS,
  type PlagiaAiEvent,
  type PlagiaAiMessage,
} from "@/lib/plagia-ai/types"

const GREETING =
  "Hi — I'm PlagiaAI. Tell me what you're working on and I'll help you figure out which Plagiacheck tool fits, or just chat about your writing. Tool orchestration is coming in the next release."

export default function PlagiaAiPage() {
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<PlagiaAiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const { toast } = useToast()

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
  }, [messages, streamingText])

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

    const userMessage: PlagiaAiMessage = { role: "user", content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setStreaming(true)
    setStreamingText("")

    let accumulated = ""
    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/plagia-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (response.status === 401) {
        setNeedsSignIn(true)
        setStreaming(false)
        setMessages(messages)
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
            accumulated += event.content
            setStreamingText(accumulated)
          } else if (event.type === "error") {
            throw new Error(event.message)
          } else if (event.type === "done") {
            // handled after loop exits
          }
        }
      }

      if (accumulated.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ])
      }
      setStreamingText("")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong."
      toast({
        title: "PlagiaAI error",
        description: message,
        variant: "destructive",
      })
      setStreamingText("")
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  const conversationStarted = messages.length > 0 || streaming || !!streamingText

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <ToolPageHeader
        icon={Sparkles}
        title="PlagiaAI"
        description="Chat with PlagiaAI — your AI writing assistant. Soon, it'll run every Plagiacheck tool for you with a single message."
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

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-primary/10 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start">
                  <div className="max-w-[85%] text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              )
            )}

            {(streaming || streamingText) && (
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block ml-0.5 w-1.5 h-3.5 bg-violet-500/70 align-[-2px] animate-pulse" />
                </div>
              </div>
            )}
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
