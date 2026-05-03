"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RefreshCw, Copy, Check, Download, Shield, Zap } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

export default function Paraphraser() {
  const [text, setText] = useState("")
  const [paraphrasedText, setParaphrasedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState("standard")
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

  const handleParaphrase = async () => {
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
    setParaphrasedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          text,
          tool: "paraphrase",
          options: { mode }
        }),
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
        throw new Error(data.error || "Failed to paraphrase text")
      }

      setParaphrasedText(data.result.paraphrasedText || text)
      await decrementWords(requiredTokens)

      toast({
        title: "Paraphrasing Complete",
        description: "Your text has been successfully paraphrased.",
        variant: "success",
      })
    } catch (err) {
      console.error("Error paraphrasing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to paraphrase"
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
    await navigator.clipboard.writeText(paraphrasedText)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([paraphrasedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "paraphrased.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={RefreshCw}
        title="Paraphraser"
        description="Rewrite any text in a different style while keeping the original meaning. Choose from Standard, Fluency, Formal, Simple, Creative, or Academic modes."
        category="Writing Tools"
        gradient="from-cyan-500/[0.07]"
        iconColor="text-cyan-500"
        iconBg="bg-cyan-500/10 border-cyan-500/20"
        categoryColor="text-cyan-600 dark:text-cyan-400"
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
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "standard", label: "Standard" },
                { value: "fluency", label: "Fluency" },
                { value: "formal", label: "Formal" },
                { value: "simple", label: "Simple" },
                { value: "creative", label: "Creative" },
                { value: "academic", label: "Academic" },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    mode === m.value
                      ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 font-medium"
                      : "border-border text-muted-foreground hover:border-cyan-400/40 hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Enter or paste your text here to paraphrase..."
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-cyan-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{text.length} chars</span>
              <Button
                onClick={handleParaphrase}
                disabled={isProcessing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
                ) : (
                  `Paraphrase (${calculateRequiredTokens(text)} tokens)`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — output */}
          <div className="space-y-3">
            {paraphrasedText && (
              <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg border border-border bg-card text-xs flex-wrap">
                <span className="text-muted-foreground capitalize font-medium text-cyan-600 dark:text-cyan-400">{mode}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">{text.split(/\s+/).filter(Boolean).length}</span>{" "}
                  →{" "}
                  <span className="font-medium text-foreground tabular-nums">{paraphrasedText.split(/\s+/).filter(Boolean).length}</span>{" "}
                  words
                </span>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopy}>
                    {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}>
                    <Download className="h-3 w-3" />Save
                  </Button>
                </div>
              </div>
            )}
            <div className="min-h-[360px] max-h-[520px] overflow-y-auto rounded-xl border border-border bg-card p-4 text-sm leading-[1.75] whitespace-pre-wrap relative">
              {paraphrasedText || (
                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-sm">
                  {isProcessing ? "Rewriting..." : "Paraphrased text appears here"}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-semibold">Six Writing Modes</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Standard, Fluency, Formal, Simple, Creative, and Academic — each mode rewrites with a distinct voice and purpose.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-semibold">Meaning Preserved</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The core ideas and facts stay intact. Only phrasing, structure, and vocabulary are changed.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-semibold">Instant Results</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">No waiting. Results appear in seconds so you can iterate and compare modes quickly.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  Students avoiding unintentional self-plagiarism between drafts
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  Content marketers creating SEO variations of existing articles
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  Non-native English speakers polishing their writing
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  Academics translating informal notes into formal prose
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  Bloggers refreshing older posts without rewriting from scratch
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-cyan-500 font-bold shrink-0">→</span>
                  Use Academic mode for thesis papers and formal reports — it elevates vocabulary and sentence complexity.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-cyan-500 font-bold shrink-0">→</span>
                  Creative mode works best for social media captions and casual blog posts.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-cyan-500 font-bold shrink-0">→</span>
                  Run the same text through multiple modes to find the version that fits your voice.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-cyan-500 font-bold shrink-0">→</span>
                  Shorter inputs (under 300 words) tend to produce the cleanest rewrites.
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
