"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Wand2, Copy, Check, Download, ArrowLeftRight, BarChart, Sliders } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const FAQ_KEYS = ["tones", "level", "detectors", "verify", "meaning", "cost"] as const

// Tone values are sent to the API as-is; only their labels are translated.
const TONE_IDS = ["casual", "professional", "academic", "creative", "friendly", "persuasive"] as const

export default function AIHumanizer() {
  const t = useTranslations("AiHumanizer")
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [humanizedText, setHumanizedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [humanizationLevel, setHumanizationLevel] = useState(50)
  const [tone, setTone] = useState("casual")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "stacked">("split")
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

  const handleHumanize = async () => {
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
    setHumanizedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          text,
          tool: "humanize",
          options: { tone, level: humanizationLevel }
        }),
      })

      if (response.status === 401) {
        router.push("/signin?next=/ai-humanizer")
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

      setHumanizedText(data.result.humanizedText || text)
      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.successTitle"),
        description: t("toasts.successDescription"),
        variant: "success",
      })
    } catch (err) {
      console.error("Error humanizing text:", err)
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

  const handleCopy = async () => {
    if (!humanizedText) return
    try {
      await navigator.clipboard.writeText(humanizedText)
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
    if (!humanizedText) return
    const blob = new Blob([humanizedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "humanized.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const tones = TONE_IDS.map((id) => ({
    value: id,
    label: t(`tones.${id}.label`),
    desc: t(`tones.${id}.desc`),
  }))

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  // Jaccard distance over word multisets — robust to insertions/deletions
  // (the previous positional index diff inflated wildly on length changes).
  const getChangedWords = () => {
    if (!text || !humanizedText) return { original: 0, output: 0, percentage: 0 }
    const tokenize = (s: string) =>
      s.toLowerCase().split(/\s+/).filter(Boolean)

    const orig = tokenize(text)
    const out = tokenize(humanizedText)
    if (orig.length === 0 || out.length === 0) {
      return { original: orig.length, output: out.length, percentage: 0 }
    }

    const counts = new Map<string, number>()
    orig.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1))
    let shared = 0
    out.forEach((w) => {
      const c = counts.get(w) || 0
      if (c > 0) {
        shared++
        counts.set(w, c - 1)
      }
    })

    const union = orig.length + out.length - shared
    const distance = union > 0 ? 1 - shared / union : 0
    return {
      original: orig.length,
      output: out.length,
      percentage: Math.round(distance * 100),
    }
  }

  const changes = getChangedWords()

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Wand2}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        iconColor="text-pink-500"
        iconBg="bg-pink-500/10 border-pink-500/20"
        categoryColor="text-pink-600 dark:text-pink-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/ai-humanizer" />}

        {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t.rich("needTokens", {
              required: calculateRequiredTokens(text),
              remaining: remainingWords,
              link: (chunks) => <Link href="/pricing" className="underline font-medium">{chunks}</Link>,
            })}
          </p>
        )}

        {text.length > 50000 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("tooLong", { current: text.length.toLocaleString() })}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">{t("controls.level")}</Label>
            <div className="w-28">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t("controls.humanizationLevel")}</span>
                <span className="font-medium tabular-nums">{humanizationLevel}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[humanizationLevel]}
                onValueChange={(value) => setHumanizationLevel(value[0])}
                className="w-full"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {humanizationLevel < 34 ? t("controls.light") : humanizationLevel < 67 ? t("controls.medium") : t("controls.heavy")}
            </span>
          </div>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder={t("controls.selectTone")} />
            </SelectTrigger>
            <SelectContent>
              {tones.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === "split" ? "default" : "ghost"}
              size="sm"
              aria-pressed={viewMode === "split"}
              onClick={() => setViewMode("split")}
              className="h-7 text-xs px-2"
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              {t("controls.sideBySide")}
            </Button>
            <Button
              variant={viewMode === "stacked" ? "default" : "ghost"}
              size="sm"
              aria-pressed={viewMode === "stacked"}
              onClick={() => setViewMode("stacked")}
              className="h-7 text-xs px-2"
            >
              {t("controls.stacked")}
            </Button>
          </div>
        </div>

        <div className={viewMode === "split" ? "grid lg:grid-cols-2 gap-4" : "space-y-4"}>
          {/* LEFT — input */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs font-medium text-muted-foreground">{t("input.label")}</span>
            </div>
            <Textarea
              aria-label={t("input.ariaLabel")}
              placeholder={t("input.placeholder")}
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-base md:text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-pink-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("input.charCount", { count: text.length })}</span>
              <Button
                onClick={handleHumanize}
                disabled={isProcessing || !text.trim() || text.length > 50000 || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium shadow-none"
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
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-muted-foreground">{t("output.label")}</span>
            </div>
            <ResultReveal show={!!humanizedText}>
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-border bg-card text-xs flex-wrap gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{t("output.wordsChanged")}</span>
                  <span className="font-semibold text-pink-600 dark:text-pink-400">{changes.percentage}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{t("output.original")}</span>
                  <span className="font-semibold tabular-nums">{t("output.wordCount", { count: text.split(/\s+/).filter(Boolean).length })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{t("output.result")}</span>
                  <span className="font-semibold tabular-nums">{t("output.wordCount", { count: humanizedText.split(/\s+/).filter(Boolean).length })}</span>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy} disabled={isProcessing || !humanizedText}>
                    {copied ? <><Check className="h-3 w-3" />{t("output.copied")}</> : <><Copy className="h-3 w-3" />{t("output.copy")}</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload} disabled={isProcessing || !humanizedText}>
                    <Download className="h-3 w-3" />{t("output.download")}
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => setViewMode(viewMode === "split" ? "stacked" : "split")}
                  >
                    {viewMode === "split" ? t("output.stack") : t("output.split")}
                  </Button>
                </div>
              </div>
            </ResultReveal>
            <div className="min-h-[320px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {humanizedText || <span className="text-muted-foreground/40">{t("output.empty")}</span>}
            </div>
          </div>
        </div>
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">{t("features.tones.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.tones.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">{t("features.level.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.level.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">{t("features.changes.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.changes.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  {t("useCases.items.emails")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  {t("useCases.items.students")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  {t("useCases.items.creators")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  {t("useCases.items.marketers")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  {t("useCases.items.anyone")}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("tips.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  {t("tips.items.level")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  {t("tips.items.tone")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  {t("tips.items.detector")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  {t("tips.items.retry")}
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
