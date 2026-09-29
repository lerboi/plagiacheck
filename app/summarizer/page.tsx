"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, FileText, Copy, Check, Download, ListOrdered, AlignLeft, Sliders, Clock } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"
import { useTranslations } from "next-intl"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

interface SummaryResult {
  format: "paragraph" | "bullets"
  summary: string
  bulletPoints: string[]
}

const FAQ_KEYS = ["length", "format", "keeps", "limit", "cost"] as const

export default function Summarizer() {
  const t = useTranslations("Summarizer")
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [summaryLength, setSummaryLength] = useState(50)
  const [outputType, setOutputType] = useState("paragraph")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

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

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleSummarize = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setResult(null)
    setError(null)

    // Capture format at request time so toggling the tab mid-flight
    // doesn't cross the wires when the response arrives.
    const requestedFormat: "paragraph" | "bullets" = outputType === "bullets" ? "bullets" : "paragraph"
    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          text,
          tool: "summarize",
          options: { length: summaryLength, format: requestedFormat }
        }),
      })

      if (response.status === 401) {
        router.push("/signin?next=/summarizer")
        return
      }
      if (response.status === 402) {
        await syncWordBalance()
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("errors.failedText"))
      }

      if (requestedFormat === "paragraph") {
        setResult({
          format: "paragraph",
          summary: data.result.summary || "",
          bulletPoints: [],
        })
      } else {
        const bullets = Array.isArray(data.result.bulletPoints)
          ? data.result.bulletPoints.filter((p: unknown) => typeof p === "string" && p.trim().length > 0)
          : []
        setResult({ format: "bullets", summary: "", bulletPoints: bullets })
      }

      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.successTitle"),
        description: t("toasts.successDescription"),
        variant: "success",
      })
    } catch (err) {
      console.error("Error summarizing text:", err)
      const errorMessage = err instanceof Error ? apiError(err, t("errors.failed")) : t("errors.failed")
      setError(errorMessage)
      toast({
        title: t("toasts.errorTitle"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getResultText = () => {
    if (!result) return ""
    return result.format === "paragraph"
      ? result.summary
      : result.bulletPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")
  }

  const handleCopy = async () => {
    const textToCopy = getResultText()
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast({
        title: t("toasts.copiedTitle"),
        description: t("toasts.copiedDescription"),
        variant: "success",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: t("toasts.copyFailedTitle"),
        description: t("toasts.copyFailedDescription"),
        variant: "destructive",
      })
    }
  }

  const handleDownload = () => {
    const content = getResultText()
    if (!content) return
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "summary.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasOutput = !!result && (result.summary.length > 0 || result.bulletPoints.length > 0)

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const overCharLimit = text.length > 50000

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={FileText}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        iconColor="text-green-500"
        iconBg="bg-green-500/10 border-green-500/20"
        categoryColor="text-green-600 dark:text-green-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/summarizer" />}

        {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t.rich("needTokens", {
              required: calculateRequiredTokens(text),
              remaining: remainingWords,
              link: (chunks) => <Link href="/pricing" className="underline font-medium">{chunks}</Link>,
            })}
          </p>
        )}

        {overCharLimit && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("tooLong", { current: text.length.toLocaleString() })}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT — input */}
          <div className="space-y-3">
            {/* Controls above textarea */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-28">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{t("controls.length")}</span>
                    <span className="font-medium tabular-nums">{summaryLength}%</span>
                  </div>
                  <Slider
                    min={10}
                    max={90}
                    step={10}
                    value={[summaryLength]}
                    onValueChange={(value) => setSummaryLength(value[0])}
                    className="w-full"
                  />
                </div>
              </div>
              <Tabs value={outputType} onValueChange={setOutputType}>
                <TabsList className="h-8">
                  <TabsTrigger value="paragraph" className="text-xs h-7 px-2">
                    <AlignLeft className="h-3 w-3 mr-1" />
                    {t("controls.paragraph")}
                  </TabsTrigger>
                  <TabsTrigger value="bullets" className="text-xs h-7 px-2">
                    <ListOrdered className="h-3 w-3 mr-1" />
                    {t("controls.bullets")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Textarea
              aria-label={t("input.ariaLabel")}
              placeholder={t("input.placeholder")}
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-base md:text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-green-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("input.counts", { words: wordCount, chars: text.length })}</span>
              <Button
                onClick={handleSummarize}
                disabled={isProcessing || !text.trim() || overCharLimit || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t("input.processing")}</>
                ) : text.trim() ? (
                  t("input.submitWithCost", { count: calculateRequiredTokens(text) })
                ) : (
                  t("input.submit")
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — output */}
          <div className="space-y-3">
            <ResultReveal show={hasOutput}>
              <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg border border-border bg-card text-xs flex-wrap">
                {result && text.trim() && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {t.rich("output.compressed", {
                        percent: Math.round(
                          ((result.format === "bullets"
                            ? result.bulletPoints.join(" ").length
                            : result.summary.length) /
                            Math.max(text.length, 1)) *
                            100
                        ),
                        label: (chunks) => <span className="text-muted-foreground">{chunks}</span>,
                        value: (chunks) => <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{chunks}</span>,
                      })}
                    </div>
                    <span className="text-border">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {result.format === "bullets" ? t("output.pointCount", { count: result.bulletPoints.length }) : t("output.wordCount", { count: result.summary.split(/\s+/).filter(Boolean).length })}
                      </span>
                    </div>
                  </>
                )}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopy} disabled={isProcessing || !hasOutput}>
                    {copied ? <><Check className="h-3 w-3" />{t("output.copied")}</> : <><Copy className="h-3 w-3" />{t("output.copy")}</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload} disabled={isProcessing || !hasOutput}>
                    <Download className="h-3 w-3" />{t("output.save")}
                  </Button>
                </div>
              </div>
            </ResultReveal>
            {result && result.format === "bullets" && result.bulletPoints.length > 0 ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ul className="divide-y divide-border/50">
                  {result.bulletPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : result && result.summary ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm leading-[1.75] whitespace-pre-wrap min-h-[200px]">
                {result.summary}
              </div>
            ) : (
              <div className="min-h-[360px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/40">{isProcessing ? t("output.summarizing") : t("output.empty")}</p>
              </div>
            )}
          </div>
        </div>
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">{t("features.format.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.format.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">{t("features.length.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.length.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">{t("features.reading.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.reading.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("useCases.items.researchers")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("useCases.items.professionals")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("useCases.items.students")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("useCases.items.journalists")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t("useCases.items.anyone")}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("tips.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  {t("tips.items.bullets")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  {t("tips.items.length")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  {t("tips.items.headings")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  {t("tips.items.paraphraser")}
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={faqItems} />
    </div>
  )
}
