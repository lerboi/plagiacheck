"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, PieChart, Download, Copy, Sparkles, Trash2 } from "lucide-react"
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
import { sanitizeFilename } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

// `value` is sent to the API; the button label is looked up by it (`chartTypes.<value>`).
const CHART_TYPES = [
  { value: "auto-detect" },
  { value: "bar" },
  { value: "line" },
  { value: "pie" },
  { value: "flowchart" },
  { value: "mindmap" },
  { value: "timeline" },
  { value: "comparison" },
] as const

// chartType values the API can return; anything else is shown as-is.
const RESULT_CHART_TYPES = ["bar", "line", "pie", "flowchart", "mindmap", "timeline", "comparison"] as const

const MAX_INPUT_CHARS = 2000


const FAQ_KEYS = ["types", "how", "input", "download", "cost"] as const
const USE_CASE_KEYS = ["business", "processes", "concepts", "comparison", "timeline"] as const
const TIP_KEYS = ["numbers", "steps", "autoDetect", "edit"] as const

export default function ChartGenerator() {
  const t = useTranslations("ChartGenerator")
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [chartType, setChartType] = useState("auto-detect")
  const [svgOutput, setSvgOutput] = useState("")
  const [chartInfo, setChartInfo] = useState<{ chartType?: string; title?: string; description?: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remainingImageTokens, syncImageBalance } = useTokenStore()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const generationRef = useRef(0)

  const IMAGE_TOKEN_COST = 2

  const faqItems = FAQ_KEYS.map((k) => ({ question: t(`faq.${k}.question`), answer: t(`faq.${k}.answer`) }))
  const chartTypeName = (value: unknown) => {
    const type = String(value)
    const match = RESULT_CHART_TYPES.find((ct) => ct === type)
    return match ? t(`resultTypes.${match}`) : type
  }

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

  const handleGenerate = async () => {
    if (!user) { setNeedsSignIn(true); return }
    setNeedsSignIn(false)
    if (!text.trim()) return

    if (IMAGE_TOKEN_COST > remainingImageTokens) {
      toast({ title: t("toasts.notEnoughTokens.title"), description: t("toasts.notEnoughTokens.description"), variant: "destructive" })
      router.push("/pricing")
      return
    }

    const generation = ++generationRef.current
    setIsProcessing(true)
    setSvgOutput("")
    setChartInfo(null)
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "chart", options: { chartType } }),
      })

      if (response.status === 401) { router.push("/signin?next=/chart-generator"); return }
      if (response.status === 402) {
        toast({ title: t("toasts.notEnoughTokens.title"), description: t("toasts.notEnoughTokens.description"), variant: "destructive" })
        await syncImageBalance()
        router.push("/pricing")
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t("errors.failed"))
      if (generation !== generationRef.current) return

      setSvgOutput(data.result.svg || "")
      setChartInfo({
        chartType: data.result.chartType,
        title: data.result.title,
        description: data.result.description,
      })
      await syncImageBalance(data.remainingImageTokens)

      toast({
        title: t("toasts.generated.title"),
        description: t("toasts.generated.description", {
          type: chartTypeName(data.result.chartType),
          title: String(data.result.title),
        }),
        variant: "success",
      })
    } catch (err) {
      if (generation !== generationRef.current) return
      const msg = apiError(err, t("errors.generic"))
      setError(msg)
      toast({ title: t("toasts.error"), description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    generationRef.current++
    setText("")
    setSvgOutput("")
    setChartInfo(null)
    setError(null)
  }

  const handleDownload = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sanitizeFilename(chartInfo?.title, "chart")}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
    toast({ title: t("toasts.downloaded.title"), description: t("toasts.downloaded.description"), variant: "success" })
  }

  const handleCopySvg = async () => {
    if (!svgOutput) return
    try {
      await navigator.clipboard.writeText(svgOutput)
      toast({ title: t("toasts.copied.title"), description: t("toasts.copied.description"), variant: "success" })
    } catch {
      toast({ title: t("toasts.copyFailed.title"), description: t("toasts.copyFailed.description"), variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={PieChart}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-teal-500/[0.07]"
        iconColor="text-teal-500"
        iconBg="bg-teal-500/10 border-teal-500/20"
        categoryColor="text-teal-600 dark:text-teal-400"
      />

      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Input */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("input.label")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{text.length}/{MAX_INPUT_CHARS}</span>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={isProcessing} className="h-7 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t("input.clear")}
                </Button>
              </div>
            </div>

            <Textarea
              placeholder={t("input.placeholder")}
              className="min-h-[200px] resize-none text-base md:text-sm leading-relaxed"
              value={text}
              maxLength={MAX_INPUT_CHARS}
              onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_CHARS))}
            />

            {/* Chart type selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t("input.chartTypeLabel")}</label>
              <div className="flex flex-wrap gap-2">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      chartType === ct.value
                        ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-border hover:border-teal-400"
                    }`}
                  >
                    {t(`chartTypes.${ct.value}`)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {!!user && IMAGE_TOKEN_COST > remainingImageTokens && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t.rich("needTokens", {
                  cost: IMAGE_TOKEN_COST,
                  balance: remainingImageTokens,
                  link: (chunks) => <Link href="/pricing" className="underline font-medium">{chunks}</Link>,
                })}
              </p>
            )}

            {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/chart-generator" />}

            <Button
              className="h-9 px-5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"
              onClick={handleGenerate}
              disabled={isProcessing || !text.trim() || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("generating")}</>
              ) : (
                <><PieChart className="mr-2 h-4 w-4" />{t("generate", { cost: IMAGE_TOKEN_COST })}</>
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <span className="text-sm font-medium">{t("output.label")}</span>

            {/* Metadata strip + SVG container */}
            <ResultReveal show={!!(svgOutput && chartInfo)}>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border border-b-0 border-border bg-card text-xs">
                {chartInfo?.chartType && (
                  <span className="px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium capitalize">{chartTypeName(chartInfo.chartType)}</span>
                )}
                {chartInfo?.title && <span className="font-medium text-foreground">{chartInfo.title}</span>}
                {chartInfo?.description && <span className="text-muted-foreground hidden sm:inline">{chartInfo.description}</span>}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}>
                    <Copy className="h-3 w-3" />{t("output.copySvg")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}>
                    <Download className="h-3 w-3" />{t("output.download")}
                  </Button>
                </div>
              </div>
            </ResultReveal>
            <div className={`overflow-hidden p-4 ${svgOutput && chartInfo ? "rounded-b-xl border border-border" : "rounded-xl border border-border"} ${svgOutput ? "bg-white shadow-sm" : "bg-card dark:bg-card min-h-[280px] flex items-center justify-center"}`}>
              {svgOutput
                ? <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full [&>svg]:w-full [&>svg]:h-auto" />
                : <div className="text-center text-muted-foreground/40"><PieChart className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-xs">{t("output.empty")}</p></div>
              }
            </div>
          </div>
        </div>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">{t("features.detection.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.detection.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">{t("features.export.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.export.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">{t("features.language.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.language.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    {t(`useCases.items.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("tips.title")}</h3>
              <ul className="space-y-2.5">
                {TIP_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="text-teal-500 font-bold shrink-0">→</span>
                    {t(`tips.items.${k}`)}
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
