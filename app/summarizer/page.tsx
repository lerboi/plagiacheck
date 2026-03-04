"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, FileText, Sparkles, Zap, Copy, Check, ListOrdered, AlignLeft } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

export default function Summarizer() {
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [bulletPoints, setBulletPoints] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
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
      router.push("/signin")
      return
    }

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

    try {
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          tool: "summarize",
          options: { length: summaryLength, format: outputType }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize text")
      }

      if (outputType === "paragraph") {
        setSummary(data.result.summary || "")
      } else {
        setBulletPoints(data.result.bulletPoints || [])
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

  const quickFeatures = [
    { icon: FileText, text: "Smart Extraction", color: "text-green-600" },
    { icon: Zap, text: "Instant Results", color: "text-yellow-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" }
  ]

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const summaryWordCount = outputType === "paragraph"
    ? summary.split(/\s+/).filter(Boolean).length
    : bulletPoints.join(" ").split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium">
            <FileText className="h-4 w-4" />
            AI-Powered Text Summarization
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            AI Summarizer
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Condense long articles, documents, and text into concise summaries.
            Get the key points in seconds with our AI summarization tool.
          </p>

          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {quickFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              >
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Original Text</h3>
                  <span className="text-sm text-muted-foreground">
                    {wordCount} words | {text.length} characters
                  </span>
                </div>
                <Textarea
                  placeholder="Paste your long text, article, or document here to summarize..."
                  className="min-h-[250px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleSummarize}
                  disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Summarize ({calculateRequiredTokens(text)} words)
                    </>
                  )}
                </Button>

                {calculateRequiredTokens(text) > remainingWords && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Not enough words remaining.
                      <Link href="/pricing" className="font-semibold underline ml-1">
                        Upgrade your plan
                      </Link>
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>

            {(summary || bulletPoints.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Summary</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {summaryWordCount} words ({wordCount > 0 ? Math.round((summaryWordCount / wordCount) * 100) : 0}% of original)
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                          {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {outputType === "paragraph" ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <p className="text-base leading-relaxed">{summary}</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {bulletPoints.map((point, index) => (
                          <li key={index} className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="text-base leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-20 shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Summary Settings
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Summary Length: {summaryLength}%
                        </Label>
                        <Slider
                          min={10}
                          max={80}
                          step={5}
                          value={[summaryLength]}
                          onValueChange={(value) => setSummaryLength(value[0])}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Shorter</span>
                          <span>Longer</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Output Format</Label>
                        <Tabs value={outputType} onValueChange={setOutputType}>
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="paragraph" className="text-sm">
                              <AlignLeft className="h-4 w-4 mr-2" />
                              Paragraph
                            </TabsTrigger>
                            <TabsTrigger value="bullets" className="text-sm">
                              <ListOrdered className="h-4 w-4 mr-2" />
                              Bullet Points
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">How It Works</h3>
                    {[
                      { step: "1", title: "Paste Text", desc: "Add your long-form content" },
                      { step: "2", title: "Set Length", desc: "Choose summary length" },
                      { step: "3", title: "Get Summary", desc: "Receive concise key points" }
                    ].map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-900 dark:text-green-300">Pro Tip</h4>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        For best results, use text that is at least 200 words long. The AI works better with more context.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}
