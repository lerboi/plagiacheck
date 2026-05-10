"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, PieChart, Download, Copy, Sparkles } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

const CHART_TYPES = [
  { value: "auto-detect", label: "Auto-Detect" },
  { value: "bar", label: "Bar Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "flowchart", label: "Flowchart" },
  { value: "mindmap", label: "Mind Map" },
  { value: "timeline", label: "Timeline" },
]

export default function ChartGenerator() {
  const [text, setText] = useState("")
  const [chartType, setChartType] = useState("auto-detect")
  const [svgOutput, setSvgOutput] = useState("")
  const [chartInfo, setChartInfo] = useState<{ chartType?: string; title?: string; description?: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remainingImageTokens, decrementImageTokens } = useTokenStore()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

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
      toast({ title: "Not enough image tokens", description: "Purchase image tokens to generate charts.", variant: "destructive" })
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setSvgOutput("")
    setChartInfo(null)
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "chart", options: { chartType } }),
      })

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate chart")

      setSvgOutput(data.result.svg || "")
      setChartInfo({
        chartType: data.result.chartType,
        title: data.result.title,
        description: data.result.description,
      })
      await decrementImageTokens(IMAGE_TOKEN_COST)

      toast({ title: "Chart Generated", description: `${data.result.chartType} chart: "${data.result.title}"`, variant: "success" })
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
    a.download = `${chartInfo?.title || "chart"}.svg`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Downloaded!", description: "SVG file saved", variant: "success" })
  }

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(svgOutput)
    toast({ title: "Copied!", description: "SVG code copied to clipboard", variant: "success" })
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={PieChart}
        title="Chart Generator"
        description="Describe your data or concept in plain English and get professional charts, flowcharts, mind maps, and diagrams as downloadable SVGs."
        category="Visual Tools"
        gradient="from-teal-500/[0.07]"
        iconColor="text-teal-500"
        iconBg="bg-teal-500/10 border-teal-500/20"
        categoryColor="text-teal-600 dark:text-teal-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Input */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <span className="text-sm font-medium">Describe Your Chart</span>

            <Textarea
              placeholder={`Describe the data or concept you want to visualize. Examples:\n\n• 'Sales by quarter: Q1 $50k, Q2 $75k, Q3 $60k, Q4 $90k'\n• 'User signup flow: landing page → register → verify email → dashboard'\n• 'Compare React vs Vue vs Angular in terms of speed, ecosystem, learning curve'`}
              className="min-h-[200px] resize-none text-sm leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {/* Chart type selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Chart Type</label>
              <div className="flex flex-wrap gap-2">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      chartType === ct.value
                        ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-border hover:border-teal-400"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

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
              className="h-9 px-5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"
              onClick={handleGenerate}
              disabled={isProcessing || !text.trim() || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><PieChart className="mr-2 h-4 w-4" />Generate Chart ({IMAGE_TOKEN_COST} image tokens)</>
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <span className="text-sm font-medium">Generated Chart</span>

            {/* Metadata strip + SVG container */}
            {svgOutput && chartInfo && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl border border-b-0 border-border bg-card text-xs">
                {chartInfo.chartType && (
                  <span className="px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium capitalize">{chartInfo.chartType}</span>
                )}
                {chartInfo.title && <span className="font-medium text-foreground">{chartInfo.title}</span>}
                {chartInfo.description && <span className="text-muted-foreground hidden sm:inline">{chartInfo.description}</span>}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}>
                    <Copy className="h-3 w-3" />SVG
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}>
                    <Download className="h-3 w-3" />Download
                  </Button>
                </div>
              </div>
            )}
            <div className={`overflow-hidden p-4 ${svgOutput && chartInfo ? "rounded-b-xl border border-border" : "rounded-xl border border-border"} ${svgOutput ? "bg-white shadow-sm" : "bg-card dark:bg-card min-h-[280px] flex items-center justify-center"}`}>
              {svgOutput
                ? <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full" />
                : <div className="text-center text-muted-foreground/40"><PieChart className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-xs">Chart appears here</p></div>
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
                <PieChart className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">Auto Chart Type Detection</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Describe your data and the AI picks the best visualisation: bar, line, pie, flowchart, mind map, timeline, or comparison chart.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">SVG Export</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">All charts are generated as scalable SVG — resize them to any resolution without quality loss for presentations or print.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-500" />
                <h3 className="text-sm font-semibold">Natural Language Input</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">No data upload, no formatting required. Just describe what you want to visualise in plain English.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  Creating data charts for business presentations and reports
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  Visualising processes and workflows as flowcharts
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  Mapping relationships between concepts as mind maps
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  Building comparison tables for product or feature analysis
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  Generating quick timeline graphics for project overviews
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-teal-500 font-bold shrink-0">→</span>
                  Include specific numbers for data charts: &apos;Q1 $50k, Q2 $75k, Q3 $60k&apos; produces a more accurate bar chart than a vague description.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-teal-500 font-bold shrink-0">→</span>
                  For flowcharts, describe the steps sequentially: &apos;User visits page → clicks button → form appears → submits → confirmation shown.&apos;
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-teal-500 font-bold shrink-0">→</span>
                  Use &apos;Auto-Detect&apos; for your first attempt — then switch to a specific type if the result isn&apos;t what you expected.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-teal-500 font-bold shrink-0">→</span>
                  SVGs can be opened in Figma, Illustrator, or any vector editor for further customisation.
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
