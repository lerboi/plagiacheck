"use client"
import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Brain, Download, Copy, Check, BarChart } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Progress } from "@/components/ui/progress"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { generateAIDetectorReport } from "@/lib/pdf-generator"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"
import { useLocale, useTranslations } from "next-intl"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"
import { localeTags } from "@/i18n/config"

interface SentenceAnalysis {
  text: string
  score: number
  type: "human" | "mixed" | "ai"
}

const FAQ_KEYS = ["accuracy", "breakdown", "interpret", "export", "cost", "falsePositives"] as const
const FEATURE_KEYS = ["sentence", "confidence", "pdf"] as const
const USE_CASE_KEYS = ["teachers", "editors", "students", "publishers", "researchers"] as const
const TIP_KEYS = ["length", "midRange", "humanize", "highlights"] as const
const SENTENCE_TYPES = ["human", "mixed", "ai"] as const

// Verdict strings the API returns (plus the page's own "Unknown" sentinel),
// mapped to their message keys. Other values are shown as-is.
const VERDICT_KEYS = {
  "Likely Human": "likelyHuman",
  "Possibly AI": "possiblyAi",
  "Likely AI": "likelyAi",
  Unknown: "unknown",
} as const

const isSentenceType = (type: string): type is (typeof SENTENCE_TYPES)[number] =>
  (SENTENCE_TYPES as readonly string[]).includes(type)

export default function AIDetector() {
  const t = useTranslations("AiDetector")
  const tPdf = useTranslations("PdfReport")
  const locale = useLocale()
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    score: number
    humanLikelihood: string
    analysis: string
    sentences: SentenceAnalysis[]
    analyzedText: string
  } | null>(null)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

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

  // Never leave the fake-progress interval running after unmount.
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const verdictLabel = (verdict: string) =>
    Object.prototype.hasOwnProperty.call(VERDICT_KEYS, verdict)
      ? t(`verdicts.${VERDICT_KEYS[verdict as keyof typeof VERDICT_KEYS]}`)
      : verdict

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  const handleDetect = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!text.trim()) return

    if (text.trim().length < 50) {
      toast({
        title: t("toasts.tooShortTitle"),
        description: t("toasts.tooShortDescription"),
        variant: "destructive",
      })
      return
    }

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setResult(null)
    setError(null)

    const analyzedText = text

    try {
      // Animate progress while waiting for API
      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 3))
      }, 100)

      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text: analyzedText, tool: "ai-detect" }),
      })

      if (response.status === 401) {
        router.push("/signin?next=/ai-detector")
        return
      }
      if (response.status === 402) {
        await syncWordBalance()
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("errors.analyzeFailed"))
      }

      setProgress(100)

      const aiResult = data.result
      const sentences: SentenceAnalysis[] = (aiResult.sentences || []).map((s: { text?: string; score?: number; type?: string }) => ({
        text: s.text || "",
        score: Math.max(0, Math.min(100, s.score || 0)),
        type: s.type || (s.score && s.score > 60 ? "ai" : s.score && s.score > 30 ? "mixed" : "human"),
      }))

      setResult({
        score: Math.max(0, Math.min(100, aiResult.overallScore || 0)),
        humanLikelihood: aiResult.verdict || "Unknown",
        analysis: aiResult.analysis || t("result.analysisComplete"),
        sentences,
        analyzedText,
      })

      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.completeTitle"),
        description: t("toasts.completeDescription", { verdict: verdictLabel(String(aiResult.verdict)) }),
        variant: "success",
      })
    } catch (err) {
      console.error("Error analyzing text:", err)
      const errorMessage = err instanceof Error
        ? apiError(err.message, t("errors.analyzeFailed"))
        : t("errors.analyzeFailedShort")
      setError(errorMessage)
      toast({
        title: t("toasts.errorTitle"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      setIsAnalyzing(false)
    }
  }

  const handleDownloadReport = () => {
    if (!result) return
    const opened = generateAIDetectorReport(
      {
        text: result.analyzedText,
        aiScore: result.score,
        humanLikelihood: verdictLabel(result.humanLikelihood),
        analysis: result.analysis,
        sentences: result.sentences,
        date: new Date(),
      },
      {
        localeTag: localeTags[locale],
        labels: {
          documentTitle: tPdf("aiDetector.documentTitle"),
          reportTitle: tPdf("aiDetector.reportTitle"),
          generatedOn: (date) => tPdf("common.generatedOn", { date }),
          scoreLabel: tPdf("aiDetector.scoreLabel"),
          words: tPdf("common.words"),
          characters: tPdf("common.characters"),
          verdict: tPdf("aiDetector.verdict"),
          analysisSummary: tPdf("aiDetector.analysisSummary"),
          sentenceBreakdown: tPdf("aiDetector.sentenceBreakdown"),
          sentenceTypes: {
            human: tPdf("aiDetector.sentenceTypes.human"),
            mixed: tPdf("aiDetector.sentenceTypes.mixed"),
            ai: tPdf("aiDetector.sentenceTypes.ai"),
          },
          sentenceScore: (score) => tPdf("aiDetector.sentenceScore", { score }),
          analyzedText: tPdf("common.analyzedText"),
          footer: tPdf("aiDetector.footer"),
        },
      }
    )
    if (opened) {
      toast({
        title: t("toasts.reportTitle"),
        description: t("toasts.reportDescription"),
        variant: "success",
      })
    } else {
      toast({
        title: t("toasts.popupTitle"),
        description: t("toasts.popupDescription"),
        variant: "destructive",
      })
    }
  }

  const buildResultText = (): string => {
    if (!result) return text
    const lines: string[] = []
    lines.push(t("copyText.title"))
    lines.push("===================")
    lines.push("")
    lines.push(t("copyText.verdict", { verdict: verdictLabel(result.humanLikelihood) }))
    lines.push(t("copyText.probability", { score: String(result.score) }))
    lines.push("")
    lines.push(t("copyText.summary"))
    lines.push(result.analysis)
    if (result.sentences.length > 0) {
      lines.push("")
      lines.push(t("copyText.breakdown"))
      result.sentences.forEach((s, i) => {
        // The API's type is untrusted; unknown values keep the original uppercase form.
        const rawType: string = s.type
        const type = isSentenceType(rawType) ? t(`copyText.types.${rawType}`) : rawType.toUpperCase()
        lines.push(t("copyText.sentence", { index: i + 1, type, score: String(s.score), text: String(s.text) }))
      })
    }
    return lines.join("\n")
  }

  const handleCopy = async () => {
    const payload = result ? buildResultText() : text
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      toast({
        title: t("toasts.copiedTitle"),
        description: result ? t("toasts.analysisCopied") : t("toasts.textCopied"),
        variant: "success",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: t("toasts.copyFailedTitle"), description: t("toasts.copyFailedDescription"), variant: "destructive" })
    }
  }

  const getSentenceColor = (type: string) => {
    switch (type) {
      case "ai":
        return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
      case "mixed":
        return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700"
      default:
        return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
    }
  }

  const getSentenceLabel = (type: string) => {
    switch (type) {
      case "ai":
        return { text: t("sentenceTypes.ai"), color: "text-red-600 bg-red-100 dark:bg-red-900/50" }
      case "mixed":
        return { text: t("sentenceTypes.mixed"), color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50" }
      default:
        return { text: t("sentenceTypes.human"), color: "text-green-600 bg-green-100 dark:bg-green-900/50" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Brain}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-purple-500/[0.07]"
        iconColor="text-purple-500"
        iconBg="bg-purple-500/10 border-purple-500/20"
        categoryColor="text-purple-600 dark:text-purple-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* LEFT — input area */}
        <div className="space-y-3">
          <Textarea
            aria-label={t("input.ariaLabel")}
            placeholder={t("input.placeholder")}
            className="min-h-[200px] resize-none rounded-xl border-border text-base md:text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-purple-500/30 focus-visible:ring-offset-0"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/ai-detector" />}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{t("input.chars", { count: text.length })}</span>
            <div className="flex items-center gap-2">
              {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t.rich("input.needTokens", {
                    count: calculateRequiredTokens(text),
                    link: (chunks) => <Link href="/pricing" className="underline font-medium">{chunks}</Link>,
                  })}
                </p>
              )}
              <Button
                onClick={handleDetect}
                disabled={isAnalyzing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium"
              >
                {isAnalyzing ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t("input.analyzing")}</> : <>{text.trim() ? t("input.detectWithCost", { count: calculateRequiredTokens(text) }) : t("input.detect")}</>}
              </Button>
            </div>
          </div>
          {isAnalyzing && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("input.progress")}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
        </div>

        {/* RIGHT — output panel */}
        <div className="space-y-3">
        {!result && (
          <div className="min-h-[280px] rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2">
            <Brain className="h-6 w-6 text-purple-500/40" />
            <p className="text-xs text-muted-foreground/40">{t("emptyResults")}</p>
          </div>
        )}
        {/* Score card — shown when result exists */}
        <ResultReveal show={!!result}>
          {result && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 flex items-center gap-6">
              {/* Circular SVG score */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="32" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke={result.score > 70 ? "#ef4444" : result.score > 40 ? "#f59e0b" : "#22c55e"}
                    strokeDasharray={`${(result.score / 100) * 201} 201`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none">{result.score}%</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">AI</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-base font-semibold leading-tight">
                    {result.humanLikelihood !== "Unknown"
                      ? verdictLabel(result.humanLikelihood)
                      : result.score > 70 ? t("result.likelyAi") : result.score > 40 ? t("result.possiblyAi") : t("result.likelyHuman")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.analysis}</p>
                </div>
                {/* Human vs AI bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium tabular-nums w-16">{t("result.humanPercent", { value: 100 - result.score })}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${result.score}%`,
                        marginLeft: `${100 - result.score}%`,
                        background: result.score > 70 ? "#ef4444" : result.score > 40 ? "#f59e0b" : "#22c55e"
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium tabular-nums w-12 text-right" style={{ color: result.score > 70 ? "#ef4444" : result.score > 40 ? "#f59e0b" : "#22c55e" }}>
                    {result.score}% AI
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy} disabled={isAnalyzing}>
                  {copied ? <><Check className="h-3 w-3" />{t("result.copied")}</> : <><Copy className="h-3 w-3" />{t("result.copy")}</>}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadReport} disabled={isAnalyzing}>
                  <Download className="h-3 w-3" />PDF
                </Button>
              </div>
            </div>

            {/* Sentence analysis */}
            {result.sentences && result.sentences.length > 0 && (
              <>
                <div className="border-t border-border px-5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("result.sentenceBreakdown")}</span>
                  <div className="flex gap-3">
                    {([
                      { type: "human", color: "bg-green-500" },
                      { type: "mixed", color: "bg-amber-500" },
                      { type: "ai", color: "bg-red-500" },
                    ] as const).map(({ type, color }) => (
                      <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        {t(`sentenceTypes.${type}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-1.5 max-h-[420px] overflow-y-auto">
                  {result.sentences.map((s, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 px-3 py-2.5 rounded-lg text-sm leading-relaxed ${
                        s.type === "human"
                          ? "bg-green-500/8 dark:bg-green-500/10"
                          : s.type === "ai"
                          ? "bg-red-500/8 dark:bg-red-500/10"
                          : "bg-amber-500/8 dark:bg-amber-500/10"
                      }`}
                    >
                      <div
                        className={`w-0.5 rounded-full shrink-0 self-stretch ${
                          s.type === "human" ? "bg-green-500" : s.type === "ai" ? "bg-red-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="flex-1">{s.text}</span>
                      <span className="ml-2 text-xs tabular-nums text-muted-foreground shrink-0">
                        {Math.round(s.score ?? 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </ResultReveal>
        </div>
        </div>
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURE_KEYS.map((key) => {
              const Icon = key === "sentence" ? Brain : key === "confidence" ? BarChart : Download
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold">{t(`features.${key}.title`)}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`features.${key}.description`)}</p>
                </div>
              )
            })}
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
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
                    <span className="text-purple-500 font-bold shrink-0">→</span>
                    {t(`tips.items.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={faqItems} />
    </div>
  )
}
