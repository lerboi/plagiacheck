"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Mic, Copy, Check, FileEdit, Square, Trash2, RefreshCw } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

export default function VoiceToEssay() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [essay, setEssay] = useState("")
  const [essayTitle, setEssayTitle] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const interimRef = useRef("")

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkSession()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth])

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) setIsSupported(false)
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setIsSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      let interimTranscript = ""
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " "
        } else {
          interimTranscript += result[0].transcript
        }
      }
      if (finalTranscript) {
        setRawTranscript((prev) => {
          const cleaned = prev.replace(interimRef.current, "").trim()
          interimRef.current = ""
          return (cleaned ? cleaned + " " : "") + finalTranscript.trim()
        })
      }
      interimRef.current = interimTranscript
    }

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start() } catch {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setError(null)

    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current
      recognitionRef.current = null
      ref.onend = null
      ref.stop()
    }
    setIsRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop() }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const calculateRequiredTokens = (text: string) => Math.ceil(text.length / 6)

  const handleConvert = async () => {
    if (!user) { setNeedsSignIn(true); return }
    setNeedsSignIn(false)
    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) { router.push("/pricing"); return }

    setIsProcessing(true)
    setEssay("")
    setEssayTitle("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/voice-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text: rawTranscript, tool: "voice-to-essay" }),
      })

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to convert to essay")

      setEssay(data.result.essay || rawTranscript)
      setEssayTitle(data.result.title || "")
      await decrementWords(requiredTokens)

      toast({
        title: "Essay Generated",
        description: `"${data.result.title}" — ${data.result.wordCount || 0} words, ${data.result.paragraphCount || 0} paragraphs`,
        variant: "success",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to convert"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    const fullText = essayTitle ? `${essayTitle}\n\n${essay}` : essay
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast({ title: "Copied!", description: "Essay copied to clipboard", variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    stopRecording()
    setRawTranscript("")
    setEssay("")
    setEssayTitle("")
    setDuration(0)
    setError(null)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={FileEdit}
        title="Voice to Essay"
        description="Speak your ideas out loud and let AI turn your voice notes into a well-structured, polished essay with proper paragraphs and transitions."
        category="Voice Tools"
        gradient="from-sky-500/[0.07]"
        iconColor="text-sky-500"
        iconBg="bg-sky-500/10 border-sky-500/20"
        categoryColor="text-sky-600 dark:text-sky-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {!isSupported && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-sm">Your browser does not support the Web Speech API.</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please use Chrome, Edge, or Safari.</p>
          </div>
        )}

        {/* Recording Card */}
        <Card className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isSupported}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 focus-visible:ring-red-300"
                  : "bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/30 focus-visible:ring-sky-300"
              } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <Square className="h-10 w-10 text-white fill-white" />
              ) : (
                <Mic className="h-10 w-10 text-white" />
              )}
              {isRecording && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                  <span className="absolute -inset-2 rounded-full border-2 border-red-400 animate-pulse opacity-40" />
                </>
              )}
            </button>

            <div className="text-center">
              {isRecording ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-500 flex items-center gap-2 justify-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Recording...
                  </p>
                  <p className="text-2xl font-mono font-bold">{formatDuration(duration)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {rawTranscript ? "Click to record more" : "Speak your essay ideas — the AI will structure it for you"}
                </p>
              )}
            </div>

            {rawTranscript && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{rawTranscript.split(/\s+/).filter(Boolean).length} words transcribed</span>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600 h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Voice Notes + Convert */}
        <Card className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Voice Notes
            </h3>
            <Textarea
              className="min-h-[140px] resize-none text-sm leading-relaxed"
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Record above or type your voice notes here..."
            />

            {needsSignIn && !user && <ToolSignInPrompt />}

            {!!user && rawTranscript.trim() && calculateRequiredTokens(rawTranscript) > remainingWords && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Need {calculateRequiredTokens(rawTranscript)} tokens — you have {remainingWords}.{" "}
                <Link href="/pricing" className="underline font-medium">Upgrade</Link>
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              className="h-9 px-5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
              onClick={handleConvert}
              disabled={isProcessing || !rawTranscript.trim() || (!!user && calculateRequiredTokens(rawTranscript) > remainingWords)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Essay...</>
              ) : (
                <><FileEdit className="mr-2 h-4 w-4" />Convert to Essay ({calculateRequiredTokens(rawTranscript)} tokens)</>
              )}
            </Button>
          </div>
        </Card>

        {/* Essay Output */}
        {essay && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Essay header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{essayTitle || "Generated Essay"}</h3>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{essay.split(/\s+/).filter(Boolean).length} words</span>
                  <span>·</span>
                  <span>{essay.split("\n").filter(p => p.trim()).length} paragraphs</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
                {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
              </Button>
            </div>
            {/* Essay body — proper prose formatting */}
            <div className="px-6 py-5 space-y-4 max-h-[480px] overflow-y-auto">
              {essay.split("\n").filter(p => p.trim()).map((para, i) => (
                <p key={i} className="text-sm leading-[1.8] text-foreground/90">{para}</p>
              ))}
            </div>
            {/* Quick actions */}
            <div className="px-5 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Use with:</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Plagiarism Check</Link>
                <Link href="/grammar-checker" className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">Grammar Check</Link>
                <Link href="/ai-humanizer" className="text-xs px-3 py-1.5 rounded-full border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">Humanize</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Voice-First Input</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Speak your ideas as you would in conversation — filler words are removed and your thoughts are organised into clear paragraphs.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Full Essay Structure</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The AI adds an introduction, body paragraphs with smooth transitions, and a conclusion — not just cleaned-up notes.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Editable Draft</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The essay is a starting point. Copy it into any editor and adjust the tone, add citations, or expand specific points.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Students who think better verbally than in writing
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Overcoming writer&apos;s block by speaking ideas aloud first
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Drafting blog posts or newsletters while commuting
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Turning brainstorm sessions into structured first drafts
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Non-native English speakers who speak better than they write
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  Speak in complete thoughts rather than single keywords — the AI restructures based on your sentence-level ideas.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  Mention the intended audience or formality level at the start: &apos;This is for a formal academic essay on...&apos;
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  Record a rough outline first, then record each point in more detail for longer essays.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  After converting, run the result through the Grammar Checker or AI Humanizer.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ />
    </div>
  )
}
