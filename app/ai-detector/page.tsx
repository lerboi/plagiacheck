"use client"
import { useState, useEffect } from "react"
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

interface SentenceAnalysis {
  text: string
  score: number
  type: "human" | "mixed" | "ai"
}

export default function AIDetector() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    score: number
    humanLikelihood: string
    analysis: string
    sentences: SentenceAnalysis[]
  } | null>(null)
  const { remainingWords, decrementWords } = useTokenStore()
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

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleDetect = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!text.trim()) return

    if (text.trim().length < 50) {
      toast({
        title: "Text too short",
        description: "Add at least 50 characters for a meaningful analysis.",
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

    try {
      // Animate progress while waiting for API
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer)
            return 90
          }
          return prev + 3
        })
      }, 100)

      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "ai-detect" }),
      })

      clearInterval(timer)

      if (response.status === 401) {
        router.push("/signin")
        return
      }
      if (response.status === 402) {
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze text")
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
        analysis: aiResult.analysis || "Analysis complete.",
        sentences,
      })

      await decrementWords(requiredTokens)

      toast({
        title: "Analysis Complete",
        description: `Text analyzed: ${aiResult.verdict}`,
        variant: "success",
      })
    } catch (err) {
      console.error("Error analyzing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDownloadReport = () => {
    if (!result) return
    generateAIDetectorReport({
      text,
      aiScore: result.score,
      humanLikelihood: result.humanLikelihood,
      analysis: result.analysis,
      sentences: result.sentences,
      date: new Date(),
    })
    toast({
      title: "Report Generated",
      description: "Your PDF report is ready to download",
      variant: "success",
    })
  }

  const buildResultText = (): string => {
    if (!result) return text
    const lines: string[] = []
    lines.push("AI Detection Result")
    lines.push("===================")
    lines.push("")
    lines.push(`Verdict: ${result.humanLikelihood}`)
    lines.push(`AI Probability: ${result.score}%`)
    lines.push("")
    lines.push("Summary:")
    lines.push(result.analysis)
    if (result.sentences.length > 0) {
      lines.push("")
      lines.push("Sentence-by-sentence breakdown:")
      result.sentences.forEach((s, i) => {
        lines.push(`${i + 1}. [${s.type.toUpperCase()} — ${s.score}%] ${s.text}`)
      })
    }
    return lines.join("\n")
  }

  const handleCopy = async () => {
    const payload = result ? buildResultText() : text
    if (!payload) return
    await navigator.clipboard.writeText(payload)
    setCopied(true)
    toast({
      title: "Copied!",
      description: result ? "Analysis copied to clipboard" : "Text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
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
        return { text: "AI", color: "text-red-600 bg-red-100 dark:bg-red-900/50" }
      case "mixed":
        return { text: "Mixed", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50" }
      default:
        return { text: "Human", color: "text-green-600 bg-green-100 dark:bg-green-900/50" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Brain}
        title="AI Detector"
        description="Analyze any text to determine if it was written by AI or a human. Get a confidence score and a sentence-by-sentence breakdown."
        category="AI Detection"
        gradient="from-purple-500/[0.07]"
        iconColor="text-purple-500"
        iconBg="bg-purple-500/10 border-purple-500/20"
        categoryColor="text-purple-600 dark:text-purple-400"
      />
      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Input area */}
        <div className="space-y-3">
          <Textarea
            placeholder="Paste text to analyze..."
            className="min-h-[200px] resize-none rounded-xl border-border text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-purple-500/30 focus-visible:ring-offset-0"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{text.length} chars</span>
            <div className="flex items-center gap-2">
              {needsSignIn && !user && <ToolSignInPrompt />}
              {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Need {calculateRequiredTokens(text)} tokens.{" "}
                  <Link href="/pricing" className="underline font-medium">Upgrade</Link>
                </p>
              )}
              <Button
                onClick={handleDetect}
                disabled={isAnalyzing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium"
              >
                {isAnalyzing ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing...</> : <>Detect ({calculateRequiredTokens(text)} tokens)</>}
              </Button>
            </div>
          </div>
          {isAnalyzing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Analyzing text...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Score card — shown when result exists */}
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
                    {result.score > 70 ? "Likely AI-generated" : result.score > 40 ? "Possibly AI-assisted" : "Likely human-written"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.analysis}</p>
                </div>
                {/* Human vs AI bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium tabular-nums w-16">{100 - result.score}% human</span>
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
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
                  {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadReport}>
                  <Download className="h-3 w-3" />PDF
                </Button>
              </div>
            </div>

            {/* Sentence analysis */}
            {result.sentences && result.sentences.length > 0 && (
              <>
                <div className="border-t border-border px-5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sentence Breakdown</span>
                  <div className="flex gap-3">
                    {[
                      { label: "Human", color: "bg-green-500" },
                      { label: "Mixed", color: "bg-amber-500" },
                      { label: "AI", color: "bg-red-500" },
                    ].map(({ label, color }) => (
                      <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-1.5 max-h-72 overflow-y-auto">
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
                        {Math.round((s.score ?? 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold">Sentence-Level Analysis</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Every sentence is scored individually and colour-coded as Human, Mixed, or AI — not just an overall number.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold">Confidence Score</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">A percentage score from 0–100 shows how likely the text is AI-generated, with a visual human-vs-AI bar.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold">PDF Report Export</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Download a formatted report with the full analysis — useful for documentation, reviews, or academic integrity records.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  Teachers verifying whether student submissions were written by AI
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  Editors checking if freelancer-delivered content is original
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  Students self-checking their AI-assisted drafts before submitting
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  Publishers screening content for AI-written passages before publication
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  Researchers studying patterns in AI-generated vs human-written text
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-purple-500 font-bold shrink-0">→</span>
                  Paste at least 200 words for a reliable result — very short text produces inconclusive scores.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-purple-500 font-bold shrink-0">→</span>
                  A score of 40–60% usually means AI-assisted rather than fully AI-generated.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-purple-500 font-bold shrink-0">→</span>
                  Humanize your AI drafts first, then re-check — target under 30% for a safe result.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-purple-500 font-bold shrink-0">→</span>
                  Sentence-level highlights show which specific sentences raised the score — edit those first.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ />
    </div>
  )
}
