"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, PieChart, Sparkles, Zap, Download, Copy, Image } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

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
    if (!user) { router.push("/signin"); return }
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
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tool: "chart", options: { chartType } }),
      })

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

  const quickFeatures = [
    { icon: PieChart, text: "Multiple Chart Types", color: "text-teal-600" },
    { icon: Zap, text: "Instant Results", color: "text-green-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div className="text-center space-y-6 mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-full text-sm font-medium">
            <PieChart className="h-4 w-4" />
            Turn data & concepts into visuals
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">Chart & Diagram Generator</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Describe your data or concept in plain text and get professional charts, flowcharts, mind maps, and diagrams instantly.
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {quickFeatures.map((feature, index) => (
              <motion.div key={index} className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}>
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 text-sm">
              <Image className="h-4 w-4 text-teal-500" />
              <span className="font-semibold">{user ? remainingImageTokens : 0}</span>
              <span className="text-muted-foreground">image tokens remaining</span>
            </div>
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <motion.div className="grid lg:grid-cols-2 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            {/* Left: Input */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-teal-500" />
                  Describe Your Chart
                </h3>

                <Textarea
                  placeholder="Describe the data or concept you want to visualize. Examples:&#10;&#10;• 'Sales by quarter: Q1 $50k, Q2 $75k, Q3 $60k, Q4 $90k'&#10;• 'User signup flow: landing page → register → verify email → dashboard'&#10;• 'Compare React vs Vue vs Angular in terms of speed, ecosystem, learning curve'"
                  className="min-h-[200px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-teal-500 dark:focus:border-teal-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Chart type selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
                  <div className="flex flex-wrap gap-2">
                    {CHART_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        onClick={() => setChartType(ct.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          chartType === ct.value
                            ? "bg-teal-500 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-lg transition-all rounded-xl"
                  onClick={handleGenerate}
                  disabled={isProcessing || !text.trim() || IMAGE_TOKEN_COST > remainingImageTokens}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Chart...</>
                  ) : (
                    <><PieChart className="mr-2 h-5 w-5" />Generate Chart ({IMAGE_TOKEN_COST} image tokens)</>
                  )}
                </Button>

                {IMAGE_TOKEN_COST > remainingImageTokens && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Not enough image tokens. <Link href="/pricing" className="font-semibold underline ml-1">Get more tokens</Link>
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>

            {/* Right: Output */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    Generated Chart
                  </h3>
                  {svgOutput && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleCopySvg} className="h-8">
                        <Copy className="h-4 w-4 mr-1" /> SVG
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </div>
                  )}
                </div>

                {svgOutput ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-950 p-4" dangerouslySetInnerHTML={{ __html: svgOutput }} />
                    {chartInfo && (
                      <div className="flex flex-wrap gap-2">
                        {chartInfo.chartType && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">
                            {chartInfo.chartType}
                          </span>
                        )}
                        {chartInfo.description && (
                          <p className="text-sm text-muted-foreground">{chartInfo.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="min-h-[300px] flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="text-center text-muted-foreground">
                      <PieChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Your chart will appear here</p>
                      <p className="text-sm mt-1">Describe your data and click Generate</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div className="mt-12 grid md:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            {[
              { step: "1", title: "Describe Your Data", desc: "Type data points, describe a process, or explain a concept", color: "from-teal-500 to-teal-600" },
              { step: "2", title: "AI Creates Chart", desc: "Our AI picks the best chart type and generates a professional visual", color: "from-cyan-500 to-cyan-600" },
              { step: "3", title: "Download & Use", desc: "Download as SVG or copy for your reports and presentations", color: "from-blue-500 to-blue-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.color} text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4`}>{item.step}</div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}
