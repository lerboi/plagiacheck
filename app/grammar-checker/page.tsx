"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, Copy, Check, MousePointerClick, FileText } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

interface GrammarIssue {
  type: "error" | "warning" | "suggestion"
  text: string
  replacement: string
  message: string
  position: { start: number; end: number }
}

export default function GrammarChecker() {
  const [text, setText] = useState("")
  const [correctedText, setCorrectedText] = useState("")
  const [issues, setIssues] = useState<GrammarIssue[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, decrementWords } = useTokenStore()
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
        router.push("/signin")
        return
      }
      if (response.status === 402) {
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check grammar")
      }

      setCorrectedText(data.result.correctedText || text)

      const mappedIssues: GrammarIssue[] = (data.result.issues || []).map((issue: { type?: string; text?: string; replacement?: string; message?: string; startIndex?: number; endIndex?: number }) => ({
        type: issue.type || "error",
        text: issue.text || "",
        replacement: issue.replacement || "",
        message: issue.message || "Grammar issue detected",
        position: {
          start: issue.startIndex || 0,
          end: issue.endIndex || 0
        }
      }))

      setIssues(mappedIssues)
      await decrementWords(requiredTokens)

      toast({
        title: "Check Complete",
        description: mappedIssues.length > 0
          ? `Found ${mappedIssues.length} issue${mappedIssues.length > 1 ? 's' : ''} in your text.`
          : "No issues found! Your text looks great.",
        variant: mappedIssues.length > 0 ? "default" : "success",
      })
    } catch (err) {
      console.error("Error checking grammar:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check grammar"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(correctedText)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Corrected text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const applyFix = (issue: GrammarIssue) => {
    const { start, end } = issue.position
    let newText: string
    let appliedAt: number

    // Trust the model's offsets only if they actually point at the
    // issue text. LLMs return wrong character offsets routinely.
    const slice = text.substring(start, end)
    if (slice === issue.text && issue.text.length > 0) {
      newText = text.substring(0, start) + issue.replacement + text.substring(end)
      appliedAt = start
    } else {
      // Fall back to first-occurrence replacement of the original text.
      const idx = issue.text.length > 0 ? text.indexOf(issue.text) : -1
      if (idx === -1) {
        toast({
          title: "Unable to apply fix",
          description: "The original text no longer appears in your input. Edit manually or re-check.",
          variant: "destructive",
        })
        return
      }
      newText = text.substring(0, idx) + issue.replacement + text.substring(idx + issue.text.length)
      appliedAt = idx
    }

    setText(newText)

    const lengthDiff = issue.replacement.length - issue.text.length
    const updatedIssues = issues
      .filter(i => !(i.position.start === issue.position.start && i.text === issue.text))
      .map(i => {
        if (i.position.start > appliedAt) {
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
      title: "Fixed!",
      description: `Changed "${issue.text}" to "${issue.replacement}"`,
      variant: "success",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={CheckCircle2}
        title="Grammar Checker"
        description="Identify and fix grammar errors, spelling mistakes, and style issues. Review each correction individually and apply fixes with one click."
        category="Writing Tools"
        gradient="from-emerald-500/[0.07]"
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10 border-emerald-500/20"
        categoryColor="text-emerald-600 dark:text-emerald-400"
      />
      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {needsSignIn && !user && <ToolSignInPrompt />}

        {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Need {calculateRequiredTokens(text)} tokens — you have {remainingWords}.{" "}
            <Link href="/pricing" className="underline font-medium">Upgrade</Link>
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT — input */}
          <div className="space-y-3">
            <Textarea
              placeholder="Type or paste your text here to check for grammar and spelling errors..."
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{text.split(/\s+/).filter(Boolean).length} words · {text.length} chars</span>
              <Button
                onClick={handleCheck}
                disabled={isProcessing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Checking...</>
                ) : (
                  `Check Grammar (${calculateRequiredTokens(text)} tokens)`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="space-y-3">
            {/* Summary bar — only when results exist */}
            {(correctedText || issues.length > 0) && (
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-border bg-card text-sm flex-wrap">
                {issues.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                    <Check className="h-3.5 w-3.5" /> No issues found
                  </span>
                ) : (
                  <div className="flex gap-3">
                    {[
                      { type: "error", color: "bg-red-500", label: "errors" },
                      { type: "warning", color: "bg-amber-500", label: "warnings" },
                      { type: "suggestion", color: "bg-blue-500", label: "suggestions" },
                    ].map(({ type, color, label }) => {
                      const count = issues.filter((i) => i.type === type).length
                      return count > 0 ? (
                        <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="font-semibold text-foreground">{count}</span> {label}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
                {correctedText && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={handleCopy}>
                    {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy corrected</>}
                  </Button>
                )}
              </div>
            )}

            {/* Corrected text — styled document view */}
            {correctedText ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium">Corrected Text</span>
                </div>
                <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">{correctedText}</div>
              </div>
            ) : (
              <div className="min-h-[160px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50">Corrected text appears here</p>
              </div>
            )}

            {/* Issues list */}
            {issues.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {issues.length} {issues.length === 1 ? "Issue" : "Issues"}
                  </span>
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
                        onClick={() => applyFix(issue)}
                      >
                        Fix
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
                <h3 className="text-sm font-semibold">Three Severity Levels</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Issues are categorised as errors (must fix), warnings (should review), and suggestions (optional improvements).</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">One-Click Fixes</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Each issue shows the exact before → after change. Apply it instantly or skip it — you stay in control.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Full Corrected Text</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">A clean corrected version is generated alongside the issue list so you can copy it directly without applying fixes one by one.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Polishing professional emails before sending to clients or executives
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Proofreading essays, cover letters, and academic submissions
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Non-native English speakers checking grammar before publishing
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Bloggers doing a final pass before hitting publish
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Teams reviewing shared documents for consistency and correctness
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-emerald-500 font-bold shrink-0">→</span>
                  Write first, check grammar after — editing as you type disrupts flow and produces worse writing.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-emerald-500 font-bold shrink-0">→</span>
                  Review suggestions carefully; stylistic recommendations may not always fit your intended voice.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-emerald-500 font-bold shrink-0">→</span>
                  Run it twice: once after writing, once after making your own edits.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-emerald-500 font-bold shrink-0">→</span>
                  For long documents, paste in sections to get more focused, accurate feedback.
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
