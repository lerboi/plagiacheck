"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Mic, Copy, Check, FileEdit, Square, Trash2, RefreshCw, Download } from "lucide-react"
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
import { useLocale, useTranslations } from "next-intl"
import { localeTags } from "@/i18n/config"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

const FAQ_KEYS = ["how", "browsers", "edit", "oneGo", "cost"] as const
const USE_CASE_KEYS = ["verbalThinkers", "writersBlock", "commuting", "brainstorms", "nonNative"] as const
const TIP_KEYS = ["completeThoughts", "audience", "outline", "polish"] as const

export default function VoiceToEssay() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [essay, setEssay] = useState("")
  const [essayTitle, setEssayTitle] = useState("")
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
  const t = useTranslations("VoiceToEssay")
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
    if (!SpeechRecognition) setIsSupported(false)
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setIsSupported(false); return }

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

      if (["not-allowed", "audio-capture", "service-not-allowed"].includes(event.error)) {
        fatalError = true
        if (recognitionRef.current === recognition) recognitionRef.current = null
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
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
  }, [locale, t])

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

      if (requestId !== requestIdRef.current) return
      if (response.status === 401) { router.push("/signin?next=/voice-to-essay"); return }
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
      if (!response.ok) throw new Error(data.error || t("errors.convertFailed"))

      setEssay(data.result.essay || rawTranscript)
      setEssayTitle(data.result.title || "")
      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.generated"),
        description: t("toasts.generatedDescription", {
          title: String(data.result.title),
          words: String(data.result.wordCount || 0),
          paragraphs: String(data.result.paragraphCount || 0),
        }),
        variant: "success",
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      const msg = apiError(err, t("errors.convertFallback"))
      setError(msg)
      toast({ title: t("toasts.error"), description: msg, variant: "destructive" })
    } finally {
      if (requestId === requestIdRef.current) setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    const fullText = essayTitle ? `${essayTitle}\n\n${essay}` : essay
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      toast({ title: t("toasts.copied"), description: t("toasts.copiedDescription"), variant: "success" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: t("toasts.copyFailed"), description: t("toasts.copyFailedDescription"), variant: "destructive" })
    }
  }

  const handleDownload = () => {
    const fullText = essayTitle ? `${essayTitle}\n\n${essay}` : essay
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "essay.txt"
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
    setEssay("")
    setEssayTitle("")
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
        icon={FileEdit}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-sky-500/[0.07]"
        iconColor="text-sky-500"
        iconBg="bg-sky-500/10 border-sky-500/20"
        categoryColor="text-sky-600 dark:text-sky-400"
      />

      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {!isSupported && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-sm">{t("unsupported.title")}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{t("unsupported.hint")}</p>
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
                  <p className="text-2xl font-mono font-bold">{formatDuration(duration)}</p>
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
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isProcessing} className="text-red-500 hover:text-red-600 h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("recorder.clear")}
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
              {t("notes.title")}
            </h3>
            <Textarea
              className="min-h-[140px] resize-none text-base md:text-sm leading-relaxed"
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder={t("notes.placeholder")}
              aria-label={t("notes.ariaLabel")}
            />

            {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/voice-to-essay" />}

            {!!user && rawTranscript.trim() && calculateRequiredTokens(rawTranscript) > remainingWords && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t("notes.needTokens", { required: calculateRequiredTokens(rawTranscript), remaining: remainingWords })}{" "}
                <Link href="/pricing" className="underline font-medium">{t("notes.upgrade")}</Link>
              </p>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              className="h-9 px-5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
              onClick={handleConvert}
              disabled={isProcessing || !rawTranscript.trim() || (!!user && calculateRequiredTokens(rawTranscript) > remainingWords)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("notes.converting")}</>
              ) : (
                <><FileEdit className="mr-2 h-4 w-4" />{rawTranscript.trim() ? t("notes.convertWithCost", { count: calculateRequiredTokens(rawTranscript) }) : t("notes.convert")}</>
              )}
            </Button>
          </div>
        </Card>

        {/* Essay Output */}
        <ResultReveal show={!!essay}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Essay header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{essayTitle || t("essay.fallbackTitle")}</h3>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{t("essay.words", { count: essay.split(/\s+/).filter(Boolean).length })}</span>
                  <span>·</span>
                  <span>{t("essay.paragraphs", { count: essay.split("\n").filter(p => p.trim()).length })}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
                  {copied ? <><Check className="h-3 w-3" />{t("essay.copied")}</> : <><Copy className="h-3 w-3" />{t("essay.copy")}</>}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
                  <Download className="h-3 w-3" />{t("essay.download")}
                </Button>
              </div>
            </div>
            {/* Essay body — proper prose formatting */}
            <div className="px-6 py-5 space-y-4 max-h-[480px] overflow-y-auto">
              {essay.split("\n").filter(p => p.trim()).map((para, i) => (
                <p key={i} className="text-sm leading-[1.8] text-foreground/90">{para}</p>
              ))}
            </div>
            {/* Quick actions */}
            <div className="px-5 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">{t("essay.useWith")}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">{t("essay.plagiarism")}</Link>
                <Link href="/grammar-checker" className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">{t("essay.grammar")}</Link>
                <Link href="/ai-humanizer" className="text-xs px-3 py-1.5 rounded-full border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">{t("essay.humanize")}</Link>
              </div>
            </div>
          </div>
        </ResultReveal>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">{t("features.voiceFirst.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.voiceFirst.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">{t("features.structure.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.structure.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">{t("features.editable.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.editable.description")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
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
                    <span className="text-sky-500 font-bold shrink-0">→</span>
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
