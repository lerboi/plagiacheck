"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Loader2, ImagePlus, Download, Copy, Maximize, Trash2 } from "lucide-react"
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

// `value` is sent to the API; the button label is looked up by it (`styles.<value>`).
const STYLES = [
  { value: "modern" },
  { value: "minimal" },
  { value: "bold" },
  { value: "gradient" },
] as const

const MAX_INPUT_CHARS = 2000


const FAQ_KEYS = ["size", "colors", "uses", "how", "cost"] as const
const USE_CASE_KEYS = ["blog", "youtube", "newsletter", "social", "preview"] as const
const TIP_KEYS = ["short", "styles", "customise", "variations"] as const

export default function ThumbnailGenerator() {
  const t = useTranslations("ThumbnailGenerator")
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [style, setStyle] = useState("modern")
  const [svgOutput, setSvgOutput] = useState("")
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
  // Style name inside a sentence (lowercase in English); unknown values are shown as-is.
  const styleName = (value: string) => {
    const match = STYLES.find((s) => s.value === value)
    return match ? t(`styleNames.${match.value}`) : value
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
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "thumbnail", options: { style } }),
      })

      if (response.status === 401) { router.push("/signin?next=/thumbnail-generator"); return }
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
      await syncImageBalance(data.remainingImageTokens)

      toast({
        title: t("toasts.generated.title"),
        description: t("toasts.generated.description", { style: styleName(String(data.result.style || style)) }),
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
    setError(null)
  }

  const handleDownload = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sanitizeFilename(text, "thumbnail")}.svg`
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
        icon={ImagePlus}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-violet-500/[0.07]"
        iconColor="text-violet-500"
        iconBg="bg-violet-500/10 border-violet-500/20"
        categoryColor="text-violet-600 dark:text-violet-400"
      />

      <section className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Input card */}
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

          <input
            type="text"
            placeholder={t("input.placeholder")}
            className="w-full h-11 px-3 text-base md:text-sm rounded-lg border border-border bg-transparent outline-none transition-colors focus:border-violet-500 dark:focus:border-violet-400"
            value={text}
            maxLength={MAX_INPUT_CHARS}
            onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_CHARS))}
          />

          {/* Style selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t("input.styleLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    style === s.value
                      ? "bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400"
                      : "border-border hover:border-violet-400"
                  }`}
                >
                  {t(`styles.${s.value}`)}
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

          {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/thumbnail-generator" />}

          <Button
            className="h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
            onClick={handleGenerate}
            disabled={isProcessing || !text.trim() || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("generating")}</>
            ) : (
              <><ImagePlus className="mr-2 h-4 w-4" />{t("generate", { cost: IMAGE_TOKEN_COST })}</>
            )}
          </Button>
        </div>

        {/* SVG Output */}
        <ResultReveal show={!!svgOutput}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("output.preview")}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}><Copy className="h-3 w-3" />{t("output.copySvg")}</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}><Download className="h-3 w-3" />{t("output.download")}</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-black" style={{ aspectRatio: "1200/630" }}>
              <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full h-full [&>svg]:w-full [&>svg]:h-auto" />
            </div>
          </div>
        </ResultReveal>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">{t("features.styles.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.styles.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Maximize className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">{t("features.format.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.format.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">{t("features.export.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.export.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
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
                    <span className="text-violet-500 font-bold shrink-0">→</span>
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
