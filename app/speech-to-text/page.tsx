"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mic, Copy, Check, Sparkles, Trash2, Square } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { FAQ } from "@/components/FAQ"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [cleanedText, setCleanedText] = useState("")
  const [isCleaning, setIsCleaning] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)
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
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

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
        console.error("Speech recognition error:", event.error)
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start()
        } catch {
          // Already started
        }
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

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleCleanUp = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsCleaning(true)
    setCleanedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ transcript: rawTranscript, action: "clean" }),
      })

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to clean transcript")
      }

      setCleanedText(data.result.cleanedText || rawTranscript)
      await decrementWords(requiredTokens)

      toast({
        title: "Transcript Cleaned",
        description: `${data.result.changes || 0} corrections made`,
        variant: "success",
      })
    } catch (err) {
      console.error("Cleanup error:", err)
      const msg = err instanceof Error ? err.message : "Failed to clean transcript"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsCleaning(false)
    }
  }

  const handleCopy = async (text: string, type: "raw" | "clean") => {
    await navigator.clipboard.writeText(text)
    if (type === "raw") {
      setCopiedRaw(true)
      setTimeout(() => setCopiedRaw(false), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    toast({ title: "Copied!", description: "Text copied to clipboard", variant: "success" })
  }

  const clearAll = () => {
    stopRecording()
    setRawTranscript("")
    setCleanedText("")
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
        icon={Mic}
        title="Speech to Text"
        description="Record your voice and get a real-time transcript. Use AI cleanup to remove filler words, fix punctuation, and format into clean readable text."
        category="Voice Tools"
        gradient="from-indigo-500/[0.07]"
        iconColor="text-indigo-500"
        iconBg="bg-indigo-500/10 border-indigo-500/20"
        categoryColor="text-indigo-600 dark:text-indigo-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {!isSupported && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-sm">
              Your browser does not support the Web Speech API.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Please use Chrome, Edge, or Safari for speech recognition.
            </p>
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
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 focus-visible:ring-indigo-300"
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
                  <p className="text-2xl font-mono font-bold">
                    {formatDuration(duration)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {rawTranscript ? "Click to record more" : "Click the microphone to start recording"}
                </p>
              )}
            </div>

            {rawTranscript && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{rawTranscript.split(/\s+/).filter(Boolean).length} words transcribed</span>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600 h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Raw Transcript */}
        {rawTranscript && (
          <>
            <Card className="rounded-xl border border-border bg-card p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Raw Transcript
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(rawTranscript, "raw")} className="h-8">
                    {copiedRaw ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiedRaw ? "Copied!" : "Copy"}
                  </Button>
                </div>

                <Textarea
                  className="min-h-[140px] resize-none text-sm leading-relaxed"
                  value={rawTranscript}
                  onChange={(e) => setRawTranscript(e.target.value)}
                  placeholder="Transcript appears here as you speak..."
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
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                  onClick={handleCleanUp}
                  disabled={isCleaning || !rawTranscript.trim() || (!!user && calculateRequiredTokens(rawTranscript) > remainingWords)}
                >
                  {isCleaning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cleaning Up...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />AI Clean Up ({calculateRequiredTokens(rawTranscript)} tokens)</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Cleaned Transcript */}
            {cleanedText && (
              <Card className="rounded-xl border border-border bg-card p-6">
                <div className="space-y-3">
                  {/* Stats bar */}
                  <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg border border-border bg-muted/40 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      Raw: <span className="font-medium text-foreground tabular-nums">{rawTranscript.split(/\s+/).filter(Boolean).length} words</span>
                    </span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      Cleaned: <span className="font-medium text-foreground tabular-nums">{cleanedText.split(/\s+/).filter(Boolean).length} words</span>
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleCopy(cleanedText, "clean")}>
                        <Copy className="h-3 w-3" />Copy cleaned
                      </Button>
                    </div>
                  </div>

                  {/* Styled document view */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium">Cleaned Transcript</span>
                    </div>
                    <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{cleanedText}</div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Use transcript with:</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        Plagiarism Check
                      </Link>
                      <Link href="/ai-detector" className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        AI Detector
                      </Link>
                      <Link href="/summarizer" className="text-xs px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        Summarize
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">Real-Time Transcription</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The browser transcribes your voice word by word as you speak — no upload, no waiting.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">AI Cleanup</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">A single click removes filler words (um, uh, like), fixes punctuation, capitalisation, and breaks the transcript into proper paragraphs.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">Instant Export</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Copy the raw or cleaned transcript and paste it directly into any tool — the Summarizer, Grammar Checker, or AI Detector.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Dictating emails, messages, or documents hands-free
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Transcribing interview recordings by playing audio aloud near the microphone
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Converting voice memos into editable text
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Students with accessibility needs who prefer speaking over typing
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  Capturing meeting notes in real time without a separate transcription service
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-indigo-500 font-bold shrink-0">→</span>
                  Use Chrome or Edge for the most accurate Web Speech API transcription.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-indigo-500 font-bold shrink-0">→</span>
                  Speak at a moderate pace — rushing causes the transcription to merge words incorrectly.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-indigo-500 font-bold shrink-0">→</span>
                  The AI cleanup costs tokens but produces significantly cleaner output for long recordings.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-indigo-500 font-bold shrink-0">→</span>
                  For interviews, pause between speakers so the transcript doesn&apos;t run together.
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
