"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Mic, Copy, Check, FileAudio, Square, Trash2, ListChecks, Layers, Download } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"

const FAQ_ITEMS = [
  {
    question: "What is the audio summarizer for?",
    answer:
      "Recording lectures, meetings, or spoken notes and getting a structured summary instead of a wall of transcript. It is useful whenever listening back to a recording would take too long.",
  },
  {
    question: "What does the summary include?",
    answer:
      "An overview, the key points, and any action items detected in the conversation, plus a guess at the content type (lecture, meeting, and so on).",
  },
  {
    question: "Which browsers are supported?",
    answer:
      "Chrome, Edge, and Safari. Transcription uses the browser's Web Speech API, which Firefox does not support, and you must grant microphone permission.",
  },
  {
    question: "Can I summarize an existing audio file?",
    answer:
      "Not directly — the tool transcribes live microphone audio. Playing a recording out loud near your mic can work, but expect lower transcription accuracy.",
  },
  {
    question: "What does it cost?",
    answer:
      "Recording and transcription are free since they happen in your browser. The AI summary costs text tokens based on transcript length, roughly 1 token per 6 characters.",
  },
]

export default function AudioSummarizer() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [summary, setSummary] = useState<{
    title?: string
    overview?: string
    keyPoints?: string[]
    detailedSummary?: string
    contentType?: string
    actionItems?: string[]
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef("")
  const requestIdRef = useRef(0)

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

    // Capture whatever is currently in the textarea (including manual edits)
    // as the finalized base for this recording session.
    setRawTranscript((cur) => {
      finalTranscriptRef.current = cur.trim()
      return cur
    })

    let fatalError = false

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const segment = result[0].transcript.trim()
          if (segment) {
            finalTranscriptRef.current = (finalTranscriptRef.current ? finalTranscriptRef.current + " " : "") + segment
          }
        } else {
          interimTranscript += result[0].transcript
        }
      }
      const interim = interimTranscript.trim()
      const finalized = finalTranscriptRef.current
      setRawTranscript(interim ? (finalized ? finalized + " " + interim : interim) : finalized)
    }

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return

      if (["not-allowed", "audio-capture", "service-not-allowed"].includes(event.error)) {
        fatalError = true
        if (recognitionRef.current === recognition) recognitionRef.current = null
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setIsRecording(false)
        setError(
          event.error === "not-allowed"
            ? "Microphone access was denied. Please allow microphone access in your browser and try again."
            : event.error === "audio-capture"
              ? "No microphone was found. Please check your audio input device and try again."
              : "Speech recognition is not available in this browser. Please try Chrome or Edge."
        )
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (!fatalError && recognitionRef.current === recognition) {
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

  const handleSummarize = async () => {
    if (!user) { setNeedsSignIn(true); return }
    setNeedsSignIn(false)
    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) {
      toast({
        title: "Not enough tokens",
        description: `Summarizing this needs ${requiredTokens} tokens but you have ${remainingWords}. Redirecting to pricing.`,
        variant: "destructive",
      })
      await syncWordBalance()
      router.push("/pricing")
      return
    }

    const requestId = ++requestIdRef.current
    setIsProcessing(true)
    setSummary(null)
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/voice-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text: rawTranscript, tool: "audio-summarize" }),
      })

      if (requestId !== requestIdRef.current) return
      if (response.status === 401) { router.push("/signin?next=/audio-summarizer"); return }
      if (response.status === 402) {
        toast({
          title: "Not enough tokens",
          description: "You have run out of tokens for this summary. Redirecting to pricing.",
          variant: "destructive",
        })
        await syncWordBalance()
        router.push("/pricing")
        return
      }
      const data = await response.json()
      if (requestId !== requestIdRef.current) return
      if (!response.ok) throw new Error(data.error || "Failed to summarize")

      setSummary(data.result)
      await syncWordBalance(data.remainingTokens)

      toast({
        title: "Audio Summarized",
        description: `${data.result.contentType || "Content"} summarized with ${data.result.keyPoints?.length || 0} key points`,
        variant: "success",
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      const msg = err instanceof Error ? err.message : "Failed to summarize"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      if (requestId === requestIdRef.current) setIsProcessing(false)
    }
  }

  const buildSummaryText = () => {
    if (!summary) return ""
    return [
      summary.title && `# ${summary.title}`,
      summary.overview && `\n${summary.overview}`,
      summary.keyPoints?.length && `\n## Key Points\n${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      summary.detailedSummary && `\n## Detailed Summary\n${summary.detailedSummary}`,
      summary.actionItems?.length && `\n## Action Items\n${summary.actionItems.map((a) => `- ${a}`).join("\n")}`,
    ].filter(Boolean).join("\n")
  }

  const handleCopy = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(buildSummaryText())
      setCopied(true)
      toast({ title: "Copied!", description: "Summary copied to clipboard", variant: "success" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", description: "Could not access the clipboard. Please copy manually.", variant: "destructive" })
    }
  }

  const handleDownload = () => {
    if (!summary) return
    const blob = new Blob([buildSummaryText()], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "audio-summary.txt"
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const clearAll = () => {
    stopRecording()
    requestIdRef.current++
    finalTranscriptRef.current = ""
    setRawTranscript("")
    setSummary(null)
    setDuration(0)
    setError(null)
    setIsProcessing(false)
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
        icon={FileAudio}
        title="Audio Summarizer"
        description="Record meetings, lectures, or podcasts and get a structured summary with key points, content type detection, and action items."
        category="Voice Tools"
        gradient="from-orange-500/[0.07]"
        iconColor="text-orange-500"
        iconBg="bg-orange-500/10 border-orange-500/20"
        categoryColor="text-orange-600 dark:text-orange-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
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
                  : "bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/30 focus-visible:ring-orange-300"
              } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <Square className="h-10 w-10 text-white fill-white" /> : <Mic className="h-10 w-10 text-white" />}
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
                  {rawTranscript ? "Click to record more" : "Record a lecture, meeting, or podcast to summarize"}
                </p>
              )}
            </div>

            {rawTranscript && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{rawTranscript.split(/\s+/).filter(Boolean).length} words transcribed</span>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isProcessing} className="text-red-500 hover:text-red-600 h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Transcript */}
        <Card className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              Transcript
            </h3>
            <Textarea
              className="min-h-[140px] resize-none text-sm leading-relaxed"
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Record audio above or paste a transcript here..."
              aria-label="Audio transcript"
            />

            {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/audio-summarizer" />}

            {!!user && rawTranscript.trim() && calculateRequiredTokens(rawTranscript) > remainingWords && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Need {calculateRequiredTokens(rawTranscript)} tokens — you have {remainingWords}.{" "}
                <Link href="/pricing" className="underline font-medium">Upgrade</Link>
              </p>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              className="h-9 px-5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium"
              onClick={handleSummarize}
              disabled={isProcessing || !rawTranscript.trim() || (!!user && calculateRequiredTokens(rawTranscript) > remainingWords)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Summarizing...</>
              ) : (
                <><FileAudio className="mr-2 h-4 w-4" />Summarize{rawTranscript.trim() ? ` (${calculateRequiredTokens(rawTranscript)} tokens)` : ""}</>
              )}
            </Button>
          </div>
        </Card>

        {/* Summary Output */}
        <ResultReveal show={!!summary}>
          {summary && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold leading-tight">{summary.title || "Summary"}</h3>
                {summary.contentType && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium capitalize">
                    {summary.contentType}
                  </span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
                  {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
                  <Download className="h-3 w-3" />Download .txt
                </Button>
              </div>
            </div>

            {/* Overview */}
            {summary.overview && (
              <div className="px-5 py-4 border-b border-border/60 bg-orange-500/5">
                <p className="text-sm leading-relaxed text-foreground/90">{summary.overview}</p>
              </div>
            )}

            {/* Key Points */}
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div className="px-5 py-4 border-b border-border/60">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Points</p>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Summary */}
            {summary.detailedSummary && (
              <div className="px-5 py-4 border-b border-border/60">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Detailed Summary</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary.detailedSummary}</p>
              </div>
            )}

            {/* Action Items */}
            {summary.actionItems && summary.actionItems.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Action Items</p>
                <ul className="space-y-2">
                  {summary.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" />
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          )}
        </ResultReveal>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileAudio className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Live Recording + Paste</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Record directly from your microphone or paste an existing transcript from any source — meeting notes, podcast apps, or video captions.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Structured Output</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Results are broken into a title, overview, numbered key points, a detailed summary, and a checklist of action items.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Content Type Detection</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Automatically identifies whether the audio was a lecture, interview, meeting, podcast, or speech and tailors the summary accordingly.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Weekly team meetings and standups
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  University lectures and class recordings
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Podcast episodes and long-form interviews
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Customer calls and sales demos
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Conference talks and webinar recordings
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Speak clearly and at normal pace — the browser speech API performs best in quiet environments.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  For pasted transcripts, include speaker names if available — the AI uses them to structure the summary better.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  The action items section works best when the recording includes explicit decisions or assignments.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Summarise recordings under 30 minutes for the most focused output.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={FAQ_ITEMS} />
    </div>
  )
}
