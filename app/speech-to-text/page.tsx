"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mic, Copy, Check, Sparkles, Trash2, Square, Download } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { FAQ } from "@/components/FAQ"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"
import { useLocale, useTranslations } from "next-intl"
import { localeTags } from "@/i18n/config"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

const FAQ_KEYS = ["browsers", "microphone", "free", "cleanup", "upload"] as const
const USE_CASE_KEYS = ["dictation", "interviews", "memos", "accessibility", "meetings"] as const
const TIP_KEYS = ["browser", "pace", "cleanup", "speakers"] as const

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [cleanedText, setCleanedText] = useState("")
  const [isCleaning, setIsCleaning] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)
  const { toast } = useToast()
  const t = useTranslations("SpeechToText")
  const locale = useLocale()
  const apiError = useApiErrorMessage()

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
    recognition.lang = localeTags[locale]

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
      console.error("Speech recognition error:", event.error)

      if (["not-allowed", "audio-capture", "service-not-allowed"].includes(event.error)) {
        fatalError = true
        if (recognitionRef.current === recognition) recognitionRef.current = null
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setIsRecording(false)
        setError(
          event.error === "not-allowed"
            ? t("errors.micDenied")
            : event.error === "audio-capture"
              ? t("errors.noMic")
              : t("errors.unavailable")
        )
      } else {
        setError(t("errors.recognition", { error: String(event.error) }))
      }
    }

    recognition.onend = () => {
      if (!fatalError && recognitionRef.current === recognition) {
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
  }, [locale, t])

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
      toast({
        title: t("toasts.notEnoughTokens"),
        description: t("toasts.needTokensRedirect", { required: requiredTokens, remaining: remainingWords }),
        variant: "destructive",
      })
      await syncWordBalance()
      router.push("/pricing")
      return
    }

    const requestId = ++requestIdRef.current
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

      if (requestId !== requestIdRef.current) return
      if (response.status === 401) { router.push("/signin?next=/speech-to-text"); return }
      if (response.status === 402) {
        toast({
          title: t("toasts.notEnoughTokens"),
          description: t("toasts.outOfTokens"),
          variant: "destructive",
        })
        await syncWordBalance()
        router.push("/pricing")
        return
      }
      const data = await response.json()
      if (requestId !== requestIdRef.current) return

      if (!response.ok) {
        throw new Error(data.error || t("errors.cleanFailed"))
      }

      setCleanedText(data.result.cleanedText || rawTranscript)
      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.cleaned"),
        description: t("toasts.correctionsMade", { count: String(data.result.changes || 0) }),
        variant: "success",
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      console.error("Cleanup error:", err)
      const msg = apiError(err, t("errors.cleanFailed"))
      setError(msg)
      toast({ title: t("toasts.error"), description: msg, variant: "destructive" })
    } finally {
      if (requestId === requestIdRef.current) setIsCleaning(false)
    }
  }

  const handleCopy = async (text: string, type: "raw" | "clean") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "raw") {
        setCopiedRaw(true)
        setTimeout(() => setCopiedRaw(false), 2000)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      toast({ title: t("toasts.copied"), description: t("toasts.copiedDescription"), variant: "success" })
    } catch {
      toast({ title: t("toasts.copyFailed"), description: t("toasts.copyFailedDescription"), variant: "destructive" })
    }
  }

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
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
    setCleanedText("")
    setDuration(0)
    setError(null)
    setIsCleaning(false)
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
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-indigo-500/[0.07]"
        iconColor="text-indigo-500"
        iconBg="bg-indigo-500/10 border-indigo-500/20"
        categoryColor="text-indigo-600 dark:text-indigo-400"
      />

      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {!isSupported && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-sm">
              {t("unsupported.title")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {t("unsupported.hint")}
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
              aria-label={isRecording ? t("recorder.stop") : t("recorder.start")}
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
                    {t("recorder.recording")}
                  </p>
                  <p className="text-2xl font-mono font-bold">
                    {formatDuration(duration)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {rawTranscript ? t("recorder.recordMore") : t("recorder.idle")}
                </p>
              )}
            </div>

            {rawTranscript && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t("recorder.wordsTranscribed", { count: rawTranscript.split(/\s+/).filter(Boolean).length })}</span>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isCleaning} className="text-red-500 hover:text-red-600 h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t("recorder.clear")}
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
                    {t("raw.title")}
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(rawTranscript, "raw")} className="h-8">
                      {copiedRaw ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedRaw ? t("raw.copied") : t("raw.copy")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(rawTranscript, "raw-transcript.txt")} className="h-8">
                      <Download className="h-4 w-4 mr-1" />
                      {t("raw.download")}
                    </Button>
                  </div>
                </div>

                <Textarea
                  className="min-h-[140px] resize-none text-base md:text-sm leading-relaxed"
                  value={rawTranscript}
                  onChange={(e) => setRawTranscript(e.target.value)}
                  placeholder={t("raw.placeholder")}
                  aria-label={t("raw.ariaLabel")}
                />

                {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/speech-to-text" />}

                {!!user && rawTranscript.trim() && calculateRequiredTokens(rawTranscript) > remainingWords && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t("raw.needTokens", { required: calculateRequiredTokens(rawTranscript), remaining: remainingWords })}{" "}
                    <Link href="/pricing" className="underline font-medium">{t("raw.upgrade")}</Link>
                  </p>
                )}

                {error && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
                )}

                <Button
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                  onClick={handleCleanUp}
                  disabled={isCleaning || !rawTranscript.trim() || (!!user && calculateRequiredTokens(rawTranscript) > remainingWords)}
                >
                  {isCleaning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("raw.cleaning")}</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />{rawTranscript.trim() ? t("raw.cleanWithCost", { count: calculateRequiredTokens(rawTranscript) }) : t("raw.clean")}</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Cleaned Transcript */}
            <ResultReveal show={!!cleanedText}>
              <Card className="rounded-xl border border-border bg-card p-6">
                <div className="space-y-3">
                  {/* Stats bar */}
                  <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg border border-border bg-muted/40 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {t("cleaned.raw")} <span className="font-medium text-foreground tabular-nums">{t("cleaned.words", { count: rawTranscript.split(/\s+/).filter(Boolean).length })}</span>
                    </span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {t("cleaned.cleaned")} <span className="font-medium text-foreground tabular-nums">{t("cleaned.words", { count: cleanedText.split(/\s+/).filter(Boolean).length })}</span>
                    </span>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleCopy(cleanedText, "clean")}>
                        <Copy className="h-3 w-3" />{t("cleaned.copy")}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => handleDownload(cleanedText, "cleaned-transcript.txt")}>
                        <Download className="h-3 w-3" />{t("cleaned.download")}
                      </Button>
                    </div>
                  </div>

                  {/* Styled document view */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium">{t("cleaned.title")}</span>
                    </div>
                    <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{cleanedText}</div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">{t("cleaned.useWith")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        {t("cleaned.plagiarism")}
                      </Link>
                      <Link href="/ai-detector" className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        {t("cleaned.aiDetector")}
                      </Link>
                      <Link href="/summarizer" className="text-xs px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        {t("cleaned.summarize")}
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </ResultReveal>
          </>
        )}

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">{t("features.realtime.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.realtime.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">{t("features.cleanup.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.cleanup.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold">{t("features.export.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.export.description")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    {t(`useCases.items.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("tips.title")}</h3>
              <ul className="space-y-2.5">
                {TIP_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="text-indigo-500 font-bold shrink-0">→</span>
                    {t(`tips.items.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={FAQ_KEYS.map((key) => ({ question: t(`faq.${key}.question`), answer: t(`faq.${key}.answer`) }))} />
    </div>
  )
}
