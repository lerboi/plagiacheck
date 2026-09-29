"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, Copy, Check, MousePointerClick, FileText, Download } from "lucide-react"
import { generateGrammarReport } from "@/lib/pdf-generator"
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
import { useApiErrorMessage } from "@/lib/i18n/api-errors"
import { localeTags } from "@/i18n/config"

interface GrammarIssue {
  type: "error" | "warning" | "suggestion"
  text: string
  replacement: string
  message: string
  position: { start: number; end: number }
}

const FAQ_KEYS = ["kinds", "apply", "location", "style", "cost"] as const
const USE_CASE_KEYS = ["emails", "essays", "nonNative", "bloggers", "teams"] as const
const TIP_KEYS = ["writeFirst", "review", "twice", "sections"] as const

export default function GrammarChecker() {
  const t = useTranslations("GrammarChecker")
  const tPdf = useTranslations("PdfReport")
  const locale = useLocale()
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [correctedText, setCorrectedText] = useState("")
  const [issues, setIssues] = useState<GrammarIssue[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, syncWordBalance } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
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

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  const handleCheck = async () => {
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
    setCorrectedText("")
    setIssues([])
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "grammar" }),
      })

      if (response.status === 401) {
        router.push("/signin?next=/grammar-checker")
        return
      }
      if (response.status === 402) {
        await syncWordBalance()
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("errors.checkFailed"))
      }

      setCorrectedText(data.result.correctedText || text)

      const mappedIssues: GrammarIssue[] = (data.result.issues || []).map((issue: { type?: string; text?: string; replacement?: string; message?: string; startIndex?: number; endIndex?: number }) => ({
        type: issue.type || "error",
        text: issue.text || "",
        replacement: issue.replacement || "",
        message: issue.message || t("results.issueFallback"),
        position: {
          start: issue.startIndex || 0,
          end: issue.endIndex || 0
        }
      }))

      setIssues(mappedIssues)
      await syncWordBalance(data.remainingTokens)

      toast({
        title: t("toasts.completeTitle"),
        description: mappedIssues.length > 0
          ? t("toasts.issuesFound", { count: mappedIssues.length })
          : t("toasts.noIssues"),
        variant: mappedIssues.length > 0 ? "default" : "success",
      })
    } catch (err) {
      console.error("Error checking grammar:", err)
      const errorMessage = err instanceof Error
        ? apiError(err.message, t("errors.checkFailed"))
        : t("errors.checkFailed")
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
    if (!correctedText) return
    try {
      await navigator.clipboard.writeText(correctedText)
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

  const handleDownloadReport = () => {
    if (!correctedText && issues.length === 0) return
    const opened = generateGrammarReport(
      {
        originalText: text,
        correctedText,
        issues,
        date: new Date(),
      },
      {
        localeTag: localeTags[locale],
        labels: {
          documentTitle: tPdf("grammar.documentTitle"),
          reportTitle: tPdf("grammar.reportTitle"),
          generatedOn: (date) => tPdf("common.generatedOn", { date }),
          issuesFound: tPdf("grammar.issuesFound"),
          errors: tPdf("grammar.errors"),
          warnings: tPdf("grammar.warnings"),
          suggestions: tPdf("grammar.suggestions"),
          originalText: tPdf("grammar.originalText"),
          correctedText: tPdf("grammar.correctedText"),
          footer: tPdf("grammar.footer"),
        },
      }
    )
    if (opened) {
      toast({ title: t("toasts.reportTitle"), description: t("toasts.reportDescription"), variant: "success" })
    } else {
      toast({ title: t("toasts.popupTitle"), description: t("toasts.popupDescription"), variant: "destructive" })
    }
  }

  const applyFix = (issueIndex: number) => {
    const issue = issues[issueIndex]
    if (!issue || issue.text.length === 0) return

    // Model offsets are untrusted — locate the issue text ourselves,
    // searching near the reported offset first, then anywhere.
    const reportedStart = issue.position.start
    let idx = -1
    if (Number.isFinite(reportedStart) && reportedStart >= 0 && reportedStart <= text.length) {
      idx = text.indexOf(issue.text, Math.max(0, reportedStart - 40))
    }
    if (idx === -1) {
      idx = text.indexOf(issue.text)
    }
    if (idx === -1) {
      toast({
        title: t("toasts.fixFailedTitle"),
        description: t("toasts.fixFailedDescription"),
        variant: "destructive",
      })
      return
    }

    const newText = text.substring(0, idx) + issue.replacement + text.substring(idx + issue.text.length)
    setText(newText)

    // Remove only the applied issue (by index), then shift the remaining
    // issues using the position the fix was actually applied at.
    const lengthDiff = issue.replacement.length - issue.text.length
    const updatedIssues = issues
      .filter((_, i) => i !== issueIndex)
      .map(i => {
        if (i.position.start > idx) {
          return {
            ...i,
            position: {
              start: i.position.start + lengthDiff,
              end: i.position.end + lengthDiff,
            },
          }
        }
        return i
      })

    setIssues(updatedIssues)
    toast({
      title: t("toasts.fixedTitle"),
      description: t("toasts.fixedDescription", { from: String(issue.text), to: String(issue.replacement) }),
      variant: "success",
    })
  }

  const applyAllFixes = () => {
    if (!correctedText) return
    setText(correctedText)
    setIssues([])
    toast({
      title: t("toasts.allFixedTitle"),
      description: t("toasts.allFixedDescription"),
      variant: "success",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={CheckCircle2}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10 border-emerald-500/20"
        categoryColor="text-emerald-600 dark:text-emerald-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {needsSignIn && !user && <ToolSignInPrompt href="/signin?next=/grammar-checker" />}

        {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t.rich("input.needTokens", {
              required: calculateRequiredTokens(text),
              remaining: remainingWords,
              link: (chunks) => <Link href="/pricing" className="underline font-medium">{chunks}</Link>,
            })}
          </p>
        )}

        {text.length > 50000 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("input.tooLong", { current: text.length.toLocaleString() })}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT — input */}
          <div className="space-y-3">
            <Textarea
              aria-label={t("input.ariaLabel")}
              placeholder={t("input.placeholder")}
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-base md:text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{t("input.counts", { words: text.split(/\s+/).filter(Boolean).length, chars: text.length })}</span>
              <Button
                onClick={handleCheck}
                disabled={isProcessing || !text.trim() || text.length > 50000 || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t("input.checking")}</>
                ) : text.trim() ? (
                  t("input.checkWithCost", { count: calculateRequiredTokens(text) })
                ) : (
                  t("input.check")
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="space-y-3">
            {/* Summary bar — only when results exist */}
            <ResultReveal show={!!correctedText || issues.length > 0}>
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-border bg-card text-sm flex-wrap">
                {issues.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                    <Check className="h-3.5 w-3.5" /> {t("results.noIssues")}
                  </span>
                ) : (
                  <div className="flex gap-3">
                    {([
                      { type: "error", color: "bg-red-500" },
                      { type: "warning", color: "bg-amber-500" },
                      { type: "suggestion", color: "bg-blue-500" },
                    ] as const).map(({ type, color }) => {
                      const count = issues.filter((i) => i.type === type).length
                      return count > 0 ? (
                        <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`w-2 h-2 rounded-full ${color}`} />
                          {t.rich(`results.counts.${type}`, {
                            count,
                            b: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
                          })}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
                {correctedText && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
                      {copied ? <><Check className="h-3 w-3" />{t("results.copied")}</> : <><Copy className="h-3 w-3" />{t("results.copyCorrected")}</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadReport} disabled={isProcessing}>
                      <Download className="h-3 w-3" />PDF
                    </Button>
                  </div>
                )}
              </div>
            </ResultReveal>

            {/* Corrected text — styled document view */}
            {correctedText ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium">{t("results.correctedText")}</span>
                </div>
                <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">{correctedText}</div>
              </div>
            ) : (
              <div className="min-h-[160px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50">{t("results.emptyCorrected")}</p>
              </div>
            )}

            {/* Issues list */}
            {issues.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("results.issueCount", { count: issues.length })}
                  </span>
                  {correctedText && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={applyAllFixes}
                    >
                      {t("results.applyAll")}
                    </Button>
                  )}
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5">
                      <div
                        className={`w-1 rounded-full shrink-0 self-stretch min-h-[1.5rem] ${
                          issue.type === "error" ? "bg-red-500" : issue.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded line-through">
                            {issue.text}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-mono bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                            {issue.replacement}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{issue.message}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => applyFix(i)}
                      >
                        {t("results.fix")}
                      </Button>
                    </div>
                  ))}
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
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">{t("features.severity.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.severity.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">{t("features.oneClick.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.oneClick.description")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">{t("features.fullText.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.fullText.description")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                {USE_CASE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
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
                    <span className="text-emerald-500 font-bold shrink-0">→</span>
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
