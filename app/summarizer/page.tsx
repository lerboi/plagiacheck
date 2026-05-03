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

export default function Summarizer() {
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [bulletPoints, setBulletPoints] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, decrementWords } = useTokenStore()
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
    setSummary("")
    setBulletPoints([])
    setError(null)

    // Capture format at request time so toggling the tab mid-flight
    // doesn't cross the wires when the response arrives.
    const requestedFormat = outputType
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
        router.push("/signin")
        return
      }
      if (response.status === 402) {
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize text")
      }

      if (requestedFormat === "paragraph") {
        setSummary(data.result.summary || "")
        setBulletPoints([])
      } else {
        const bullets = Array.isArray(data.result.bulletPoints)
          ? data.result.bulletPoints.filter((p: unknown) => typeof p === "string" && p.trim().length > 0)
          : []
        setBulletPoints(bullets)
        setSummary("")
      }

      await decrementWords(requiredTokens)

      toast({
        title: "Summary Complete",
        description: "Your text has been successfully summarized.",
        variant: "success",
      })
    } catch (err) {
      console.error("Error summarizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to summarize"
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
    const textToCopy = outputType === "paragraph"
      ? summary
      : bulletPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Summary copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = outputType === "paragraph"
      ? summary
      : bulletPoints.map((point, i) => `${i + 1}. ${point}`).join("\n")
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "summary.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasOutput = summary || bulletPoints.length > 0

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={FileText}
        title="Summarizer"
        description="Turn long articles, essays, or documents into concise summaries or structured bullet points. Control the output length with a slider."
        category="Writing Tools"
        gradient="from-green-500/[0.07]"
        iconColor="text-green-500"
        iconBg="bg-green-500/10 border-green-500/20"
        categoryColor="text-green-600 dark:text-green-400"
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
            {/* Controls above textarea */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-28">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Length</span>
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
                    Paragraph
                  </TabsTrigger>
                  <TabsTrigger value="bullets" className="text-xs h-7 px-2">
                    <ListOrdered className="h-3 w-3 mr-1" />
                    Bullets
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Textarea
              placeholder="Paste your long text, article, or document here to summarize..."
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-green-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{wordCount} words · {text.length} chars</span>
              <Button
                onClick={handleSummarize}
                disabled={isProcessing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
                ) : (
                  `Summarize (${calculateRequiredTokens(text)} tokens)`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — output */}
          <div className="space-y-3">
            {(summary || bulletPoints.length > 0) && (
              <div className="flex items-center gap-4 px-3.5 py-2 rounded-lg border border-border bg-card text-xs flex-wrap">
                {text.trim() && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Compressed to</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">
                        {Math.round(
                          ((outputType === "bullets"
                            ? bulletPoints.join(" ").length
                            : summary.length) /
                            Math.max(text.length, 1)) *
                            100
                        )}%
                      </span>
                      <span className="text-muted-foreground">of original</span>
                    </div>
                    <span className="text-border">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {outputType === "bullets" ? bulletPoints.length + " points" : summary.split(/\s+/).filter(Boolean).length + " words"}
                      </span>
                    </div>
                  </>
                )}
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
            {outputType === "bullets" && bulletPoints.length > 0 ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ul className="divide-y divide-border/50">
                  {bulletPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : summary ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm leading-[1.75] whitespace-pre-wrap min-h-[200px]">
                {summary}
              </div>
            ) : (
              <div className="min-h-[360px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/40">{isProcessing ? "Summarizing..." : "Summary appears here"}</p>
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
                <h3 className="text-sm font-semibold">Paragraph or Bullets</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Choose between a flowing paragraph summary or structured bullet points — whichever suits your workflow.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">Adjustable Length</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">A slider controls how much of the original content is retained, from a brief overview to a detailed summary.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">Reading Time Estimate</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">See the compression ratio and word count so you know exactly how much the text has been condensed.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Researchers quickly digesting academic papers and literature reviews
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Professionals summarising meeting transcripts and long email chains
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Students condensing textbook chapters into revision notes
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Journalists getting the key facts from lengthy press releases
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Anyone saving time on long articles, reports, or documentation
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  Use bullet mode for technical documents and how-to content — the structure makes scanning faster.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  Set length to 20–30% for a tight executive summary; 50–60% to retain more nuance.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  Paste the full text including headings — the AI uses them to better identify key sections.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-green-500 font-bold shrink-0">→</span>
                  Run the output through the Paraphraser if you need to match a specific writing style.
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
