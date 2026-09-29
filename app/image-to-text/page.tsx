"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Loader2, ImageIcon, Upload, Copy, Check, Trash2, Shield } from "lucide-react"
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
import { ScanText } from "lucide-react"
import { useTranslations } from "next-intl"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

const FAQ_KEYS = ["formats", "handwriting", "how", "cost", "storage"] as const
const USE_CASE_KEYS = ["notes", "screenshots", "receipts", "archive", "research"] as const
const TIP_KEYS = ["lighting", "handwriting", "resolution", "grammar"] as const

// Values the API returns for these fields; anything else is shown as-is.
const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const
const TEXT_TYPES = ["printed", "handwritten", "mixed", "screenshot", "unknown"] as const

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value)
}

export default function ImageToText() {
  const t = useTranslations("ImageToText")
  const apiError = useApiErrorMessage()
  // handleImageSelect also runs from the paste listener that is registered once,
  // so it reads the translator through a ref to follow language switches.
  const tRef = useRef(t)
  tRef.current = t
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("image/png")
  const [extractedText, setExtractedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [confidence, setConfidence] = useState<string | null>(null)
  const [textType, setTextType] = useState<string | null>(null)
  const { remainingImageTokens, syncImageBalance, fetchImageTokens } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const generationRef = useRef(0)

  const faqItems = FAQ_KEYS.map((k) => ({ question: t(`faq.${k}.question`), answer: t(`faq.${k}.answer`) }))
  const confidenceLabel = (level: string) =>
    isOneOf(CONFIDENCE_LEVELS, level) ? t(`output.confidenceLevels.${level}`) : level
  const textTypeLabel = (type: string) => (isOneOf(TEXT_TYPES, type) ? t(`output.textTypes.${type}`) : type)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        await fetchImageTokens(session.user.id)
      }
    }
    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchImageTokens(session.user.id)
      }
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth, fetchImageTokens])

  const IMAGE_TOKEN_COST = 1

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(tRef.current("errors.notImage"))
      return
    }

    // Server rejects base64 payloads over ~8.4MB of source data, so cap at 8MB here.
    if (file.size > 8 * 1024 * 1024) {
      setError(tRef.current("errors.tooLarge"))
      return
    }

    // A new selection invalidates any in-flight extraction and previous results.
    generationRef.current++
    setError(null)
    setExtractedText("")
    setConfidence(null)
    setTextType(null)
    setMimeType(file.type)

    const previewReader = new FileReader()
    previewReader.onload = (e) => setImagePreview(e.target?.result as string)
    previewReader.readAsDataURL(file)

    const base64Reader = new FileReader()
    base64Reader.onload = (e) => {
      const result = e.target?.result as string
      const base64 = result.split(",")[1]
      setImageBase64(base64)
    }
    base64Reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // Document-level paste listener so pasting an image works anywhere on the
  // page (the previous onPaste handler sat on a non-focusable div and never fired).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) handleImageSelect(file)
          break
        }
      }
    }
    document.addEventListener("paste", onPaste)
    return () => document.removeEventListener("paste", onPaste)
  }, [])

  const clearImage = () => {
    generationRef.current++
    setImagePreview(null)
    setImageBase64(null)
    setExtractedText("")
    setConfidence(null)
    setTextType(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleExtract = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!imageBase64) return

    if (IMAGE_TOKEN_COST > remainingImageTokens) {
      toast({
        title: t("toasts.notEnoughTokens.title"),
        description: t("toasts.notEnoughTokens.description"),
        variant: "destructive",
      })
      router.push("/pricing")
      return
    }

    const generation = ++generationRef.current
    setIsProcessing(true)
    setExtractedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/image-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ imageBase64, mimeType }),
      })

      if (response.status === 401) { router.push("/signin?next=/image-to-text"); return }
      if (response.status === 402) {
        toast({
          title: t("toasts.notEnoughTokens.title"),
          description: t("toasts.notEnoughTokens.description"),
          variant: "destructive",
        })
        await syncImageBalance()
        router.push("/pricing")
        return
      }
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("errors.failed"))
      }
      if (generation !== generationRef.current) return

      setExtractedText(data.result.extractedText || t("output.noTextDetected"))
      setConfidence(data.result.confidence || null)
      setTextType(data.result.textType || null)

      await syncImageBalance(data.remainingImageTokens)

      toast({
        title: t("toasts.extracted.title"),
        description: data.result.confidence
          ? t("toasts.extracted.descriptionWithConfidence", {
              count: String(data.result.wordCount || 0),
              confidence: confidenceLabel(String(data.result.confidence)),
            })
          : t("toasts.extracted.description", { count: String(data.result.wordCount || 0) }),
        variant: "success",
      })
    } catch (err) {
      if (generation !== generationRef.current) return
      console.error("OCR error:", err)
      const msg = apiError(err, t("errors.failed"))
      setError(msg)
      toast({ title: t("toasts.error"), description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractedText)
    setCopied(true)
    toast({ title: t("toasts.copied.title"), description: t("toasts.copied.description"), variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={ScanText}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        gradient="from-rose-500/[0.07]"
        iconColor="text-rose-500"
        iconBg="bg-rose-500/10 border-rose-500/20"
        categoryColor="text-rose-600 dark:text-rose-400"
      />

      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Image Upload */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("upload.label")}</span>
              {imagePreview && (
                <Button variant="ghost" size="sm" onClick={clearImage} disabled={isProcessing} className="h-7 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t("upload.clear")}
                </Button>
              )}
            </div>

            {!imagePreview ? (
              <div
                className={`rounded-xl border-2 border-dashed min-h-[280px] flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                  isDragging
                    ? "border-rose-400 bg-rose-500/5"
                    : "border-border hover:border-rose-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium">{t("upload.dropPrompt")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("upload.formats")}</p>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-xl overflow-hidden border transition-colors ${
                  isDragging ? "border-rose-400 bg-rose-500/5" : "border-border"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <img
                  src={imagePreview}
                  alt={t("upload.previewAlt")}
                  className="w-full h-auto max-h-[400px] object-contain bg-muted/30"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
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

            {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/image-to-text" />}

            <Button
              className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium"
              onClick={handleExtract}
              disabled={isProcessing || !imageBase64 || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("extracting")}</>
              ) : (
                <><ImageIcon className="mr-2 h-4 w-4" />{t("extract")}</>
              )}
            </Button>
          </div>

          {/* Right: Extracted Text */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("output.label")}</span>
            </div>

            {/* Confidence / type badge bar */}
            <ResultReveal show={!!extractedText}>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {confidence && (
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    confidence === "high" ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : confidence === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}>
                    {t("output.confidence", { level: confidenceLabel(String(confidence)) })}
                  </span>
                )}
                {textType && (
                  <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium capitalize">{textTypeLabel(String(textType))}</span>
                )}
                <span className="text-muted-foreground">{t("output.wordsExtracted", { count: extractedText.split(/\s+/).filter(Boolean).length })}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 ml-auto" onClick={handleCopy}>
                  {copied ? <><Check className="h-3 w-3" />{t("output.copied")}</> : <><Copy className="h-3 w-3" />{t("output.copy")}</>}
                </Button>
              </div>
            </ResultReveal>

            {/* Clean document card */}
            <div className="min-h-[280px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {extractedText || <span className="text-muted-foreground/40">{t("output.placeholder")}</span>}
            </div>

            {extractedText && extractedText !== t("output.noTextDetected") && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">{t("output.useWith")}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    {t("output.links.plagiarism")}
                  </Link>
                  <Link href="/ai-detector" className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    {t("output.links.aiDetector")}
                  </Link>
                  <Link href="/grammar-checker" className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    {t("output.links.grammar")}
                  </Link>
                </div>
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
                <ScanText className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">{t("features.handwritten.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.handwritten.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">{t("features.confidence.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.confidence.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">{t("features.reuse.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.reuse.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
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
                    <span className="text-rose-500 font-bold shrink-0">→</span>
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
