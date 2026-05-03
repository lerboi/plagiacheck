"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, BarChart3, Download, Copy, Layers } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

export default function InfographicGenerator() {
  const [text, setText] = useState("")
  const [svgOutput, setSvgOutput] = useState("")
  const [title, setTitle] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remainingImageTokens, decrementImageTokens } = useTokenStore()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  const IMAGE_TOKEN_COST = 2

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
      toast({ title: "Not enough image tokens", description: "Purchase image tokens to generate infographics.", variant: "destructive" })
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setSvgOutput("")
    setTitle("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "infographic" }),
      })

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate infographic")

      setSvgOutput(data.result.svg || "")
      setTitle(data.result.title || "Infographic")
      await decrementImageTokens(IMAGE_TOKEN_COST)

      toast({ title: "Infographic Generated", description: `"${data.result.title}" with ${data.result.pointCount || 0} key points`, variant: "success" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title || "infographic"}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Downloaded!", description: "SVG file saved", variant: "success" })
  }

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(svgOutput)
    toast({ title: "Copied!", description: "SVG code copied to clipboard", variant: "success" })
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={BarChart3}
        title="Infographic Generator"
        description="Paste any article, essay, or report and get a beautiful visual infographic that highlights the key points and data. Download as SVG."
        category="Visual Tools"
        gradient="from-amber-500/[0.07]"
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10 border-amber-500/20"
        categoryColor="text-amber-600 dark:text-amber-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Input */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Text</span>
              <span className="text-xs text-muted-foreground tabular-nums">{wordCount} words</span>
            </div>

            <Textarea
              placeholder="Paste your article, essay, report, or any text you want to turn into an infographic..."
              className="min-h-[320px] resize-none text-sm leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {!!user && IMAGE_TOKEN_COST > remainingImageTokens && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Need {IMAGE_TOKEN_COST} image tokens — you have {remainingImageTokens}.{" "}
                <Link href="/pricing" className="underline font-medium">Get more</Link>
              </p>
            )}

            {needsSignIn && !user && <ToolSignInPrompt />}

            <Button
              className="h-9 px-5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
              onClick={handleGenerate}
              disabled={isProcessing || !text.trim() || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><BarChart3 className="mr-2 h-4 w-4" />Generate Infographic ({IMAGE_TOKEN_COST} image tokens)</>
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <span className="text-sm font-medium">Generated Infographic</span>

            {/* Metadata strip */}
            {svgOutput && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border border-b-0 border-border bg-card text-xs">
                {title && <span className="font-medium">{title}</span>}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}><Copy className="h-3 w-3" />SVG</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}><Download className="h-3 w-3" />Download</Button>
                </div>
              </div>
            )}
            <div ref={svgContainerRef} className={`bg-white dark:bg-gray-950 p-4 ${svgOutput ? "rounded-b-xl border border-border" : "rounded-xl border border-border min-h-[320px] flex items-center justify-center"}`}>
              {svgOutput
                ? <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full" />
                : <div className="text-center text-muted-foreground/40"><BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Infographic appears here</p></div>
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
                <BarChart3 className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Key Point Extraction</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The AI reads your text and identifies the most important facts, statistics, and takeaways to feature in the infographic.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Professional Layout</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Outputs a structured vertical layout with a title, highlighted statistics, numbered points, and a conclusion section.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">SVG Export</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Download the infographic as a scalable SVG file for use in blog posts, presentations, social media, or printed materials.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Turning long blog posts into shareable social media graphics
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Creating visual summaries of research papers or reports
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Making educational handouts from textbook chapters
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Producing data visualisations for marketing campaigns
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Summarising complex topics for non-technical audiences
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-amber-500 font-bold shrink-0">→</span>
                  Paste 200–500 words for the best balance — too little produces sparse output, too much causes the AI to over-generalise.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-amber-500 font-bold shrink-0">→</span>
                  Include statistics and numbers in your text — the AI highlights them prominently in the infographic.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-amber-500 font-bold shrink-0">→</span>
                  Use the Summarizer first to condense very long documents, then feed the summary into the Infographic Generator.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-amber-500 font-bold shrink-0">→</span>
                  SVGs can be edited in Figma or Illustrator to adjust colours, fonts, or layout after generation.
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
