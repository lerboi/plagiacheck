"use client"
import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Upload, Loader2, Shield, Copy, File, Check } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"

interface PlagiarismMatch {
  text: string
  similarity: number
  startIndex?: number
  endIndex?: number
  reason?: string
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number
  matches: PlagiarismMatch[]
  /** Snapshot of the text that was analyzed, so later edits to the
   *  textarea can't desync the highlight offsets. */
  analyzedText: string
}

type PlagiarismResult = PlagiarismMatchResult | null

export default function PlagiarismCheckerContent() {
  const t = useTranslations("PlagiarismChecker")
  const apiError = useApiErrorMessage()
  const [text, setText] = useState("")
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [result, setResult] = useState<PlagiarismResult>(null)
  const { remainingWords, syncWordBalance, fetchRemainingWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user?.id) {
        fetchRemainingWords(session.user.id)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user?.id) {
        fetchRemainingWords(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth, fetchRemainingWords])

  useEffect(() => {
    if (!isChecking) return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < targetProgress) return Math.min(targetProgress, prev + 2)
        const ceiling =
          targetProgress < 30 ? 28 :
          targetProgress < 80 ? 78 :
          targetProgress < 100 ? 95 : 100
        if (prev < ceiling) return Math.min(ceiling, prev + 0.4)
        return prev
      })
    }, 120)
    return () => clearInterval(interval)
  }, [isChecking, targetProgress])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const handlePlagiarismCheck = async () => {
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

    setIsChecking(true)
    setProgress(0)
    setTargetProgress(0)
    setResult(null)
    setError(null)

    // Snapshot the submitted text so edits made after the check don't
    // desync the highlight offsets in the results view.
    const submittedText = text

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/check-plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text: submittedText }),
      })

      if (response.status === 401) {
        router.push("/signin?next=/plagiarism-checker")
        return
      }

      if (response.status === 402) {
        await syncWordBalance()
        router.push("/pricing")
        return
      }

      if (!response.ok) {
        let message = t("errors.checkFailed")
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === "string" && errorData.error) {
            message = errorData.error
          }
        } catch {
          // Non-JSON error body; keep the generic message.
        }
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error(t("errors.noStream"))
      }

      const decoder = new TextDecoder()
      let resultReceived = false
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const newlineIndex = buffer.lastIndexOf("\n")
        if (newlineIndex === -1) continue
        const completeChunk = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)

        const lines = completeChunk.split("\n").filter((line) => line.startsWith("data: "))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (typeof data.progress === "number") {
              setTargetProgress(data.progress)
              if (data.progress >= 100) {
                setProgress(100)
              }
            }

            if (data.error) {
              const streamError = apiError(data.error, t("errors.checkFailed"))
              setError(streamError)
              toast({
                title: t("toasts.errorTitle"),
                description: streamError,
                variant: "destructive",
              })
            }

            if (data.result && !resultReceived) {
              resultReceived = true
              setResult({
                plagiarismPercentage: data.result.plagiarismPercentage,
                matches: data.result.matches || [],
                analyzedText: submittedText,
              })
              await syncWordBalance(data.remainingTokens)
              toast({
                title: t("toasts.completeTitle"),
                description: t("toasts.completeDescription", { score: String(data.result.plagiarismPercentage) }),
                variant: "success",
              })
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      console.error("Plagiarism check error:", err)
      const errorMessage = err instanceof Error && err.message
        ? apiError(err.message, t("errors.checkFailedRetry"))
        : t("errors.checkFailedRetry")
      setError(errorMessage)
      toast({
        title: t("toasts.errorTitle"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      // Always stop the loading state so the button and the progress
      // interval don't keep running after early returns or failures.
      setIsChecking(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.toLowerCase().split(".").pop() || ""
    const isPlainText = file.type.startsWith("text/") || ext === "txt" || ext === "md"

    if (!isPlainText) {
      toast({
        title: t("toasts.unsupportedTitle"),
        description: t("toasts.unsupportedDescription", { ext: ext.toUpperCase() }),
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setText(content)
    }
    reader.onerror = () => {
      toast({
        title: t("toasts.readFailedTitle"),
        description: t("toasts.readFailedDescription"),
        variant: "destructive",
      })
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: t("toasts.copiedTitle"), description: t("toasts.copiedDescription"), variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <ToolPageHeader
        icon={Shield}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10 border-blue-500/20"
        categoryColor="text-blue-600 dark:text-blue-400"
      />

      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid xl:grid-cols-2 gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-xl border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("input.heading")}</h2>
                  <p className="text-sm text-muted-foreground">{t("input.subheading")}</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                {t.rich("input.wordCount", {
                  count: wordCount.toLocaleString(),
                  b: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
                <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
                {t.rich("input.charCount", {
                  count: text.length.toLocaleString(),
                  b: (chunks) => <span className="font-medium">{chunks}</span>,
                })}
              </div>
            </div>

            <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-5">
              <div className="relative group">
                <Textarea
                  aria-label={t("input.ariaLabel")}
                  placeholder={t("input.placeholder")}
                  className="min-h-[220px] md:min-h-[280px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed rounded-xl transition-colors duration-200 pr-12"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  {text && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={t("input.copyTitle")}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    </Button>
                  )}
                  <label
                    className="h-8 w-8 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 transition-colors"
                    title={t("input.uploadTitle")}
                  >
                    <span className="sr-only">{t("input.uploadSrOnly")}</span>
                    <Upload className="h-4 w-4 text-gray-400" />
                    <input
                      type="file"
                      accept=".txt,.md,text/plain"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                >
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t.rich("input.notEnoughTokens", {
                      required: calculateRequiredTokens(text),
                      remaining: remainingWords,
                      link: (chunks) => (
                        <Link href="/pricing" className="font-semibold underline">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>
                </motion.div>
              )}

              {text.length > 50000 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                >
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t("input.tooLong", { current: text.length.toLocaleString() })}
                  </p>
                </motion.div>
              )}

              {needsSignIn && !user && (
                <ToolSignInPrompt href="/signin?next=/plagiarism-checker" />
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all duration-200 rounded-xl text-base"
                  onClick={handlePlagiarismCheck}
                  disabled={isChecking || !text.trim() || text.length > 50000 || (!!user && calculateRequiredTokens(text) > remainingWords)}
                >
                  {isChecking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t("button.analyzing", { progress: Math.round(progress) })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      <span>{t("button.check")}</span>
                      {text.trim() && (
                        <span className="text-blue-200 text-sm ml-1">{t("button.cost", { count: calculateRequiredTokens(text) })}</span>
                      )}
                    </div>
                  )}
                </Button>

                <label className="sm:hidden w-full h-12 rounded-xl border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center text-sm font-medium cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                  <File className="h-5 w-5 mr-2" />
                  {t("input.uploadButton")}
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* RIGHT — results panel */}
        <div>
          {!isChecking && !result && (
            <div className="min-h-[280px] rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-blue-500/40" />
              <p className="text-xs text-muted-foreground/40">{t("emptyResults")}</p>
            </div>
          )}
          <ResultReveal show={isChecking || !!result}>
            <PlagiarismResults isChecking={isChecking} progress={progress} result={result} originalText={result?.analyzedText} />
          </ResultReveal>
        </div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}
