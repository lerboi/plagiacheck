This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: app/grammar-checker/page.tsx, app/ai-detector/page.tsx, app/ai-humanizer/page.tsx, app/page.tsx, app/summarizer/page.tsx, app/paraphraser/page.tsx, app/signin/page.tsx, lib/pdf-generator.ts, app/word-counter/page.tsx, app/pricing/page.tsx, components/nav.tsx, app/billing/page.tsx, app/history/page.tsx, components/PricingPage/TrustSection.tsx, app/terms/page.tsx, components/ui/dropdown-menu.tsx, app/api/check-plagiarism/route.ts, components/ui/select.tsx, app/privacy/page.tsx, components/ui/toast.tsx, components/plagiarism-results.tsx, components/Profile/ProfileDropdown.tsx, components/Hero.tsx, hooks/use-toast.ts, app/globals.css, components/PageSkeleton.tsx, components/FAQ.tsx, test/ideas, components/PricingPage/CustomPlanSlider.tsx, app/layout.tsx, package.json, tailwind.config.ts, components/FeatureShowcase.tsx, components/ui/card.tsx, components/ui/button.tsx, components/ui/accordion.tsx, components/ui/tabs.tsx, lib/store.ts, README.md, app/api/handle-subscription-success/route.ts, components/Profile/Avatar.tsx, components/ui/avatar.tsx, components/theme-toggle.tsx, app/api/create-custom-checkout-session/route.ts, app/api/create-checkout-session/route.ts, components/Billing/Badge.tsx, components/ui/slider.tsx, middleware.ts, components/ui/progress.tsx, tsconfig.json, components/footer.tsx, components/ui/input.tsx, components/ui/toaster.tsx, components/ui/label.tsx, components/ui/textarea.tsx, eslint.config.mjs, .gitignore, components.json, app/redirects/page.tsx, app/api/custom-success/page.tsx, app/api/subscription-success/page.tsx, utils/generateCheckoutToken.ts, components/ui/skeleton.tsx, components/theme-provider.tsx, next.config.ts, lib/utils.ts, lib/stripe.js, postcss.config.mjs
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
app/
  ai-detector/
    page.tsx
  ai-humanizer/
    page.tsx
  api/
    check-plagiarism/
      route.ts
    create-checkout-session/
      route.ts
    create-custom-checkout-session/
      route.ts
    custom-success/
      page.tsx
    handle-subscription-success/
      route.ts
    subscription-success/
      page.tsx
  billing/
    page.tsx
  grammar-checker/
    page.tsx
  history/
    page.tsx
  paraphraser/
    page.tsx
  pricing/
    page.tsx
  privacy/
    page.tsx
  redirects/
    page.tsx
  signin/
    page.tsx
  summarizer/
    page.tsx
  terms/
    page.tsx
  word-counter/
    page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  Billing/
    Badge.tsx
  PricingPage/
    CustomPlanSlider.tsx
    TrustSection.tsx
  Profile/
    Avatar.tsx
    ProfileDropdown.tsx
  ui/
    accordion.tsx
    avatar.tsx
    button.tsx
    card.tsx
    dropdown-menu.tsx
    input.tsx
    label.tsx
    progress.tsx
    select.tsx
    skeleton.tsx
    slider.tsx
    tabs.tsx
    textarea.tsx
    toast.tsx
    toaster.tsx
  FAQ.tsx
  FeatureShowcase.tsx
  footer.tsx
  Hero.tsx
  nav.tsx
  PageSkeleton.tsx
  plagiarism-results.tsx
  theme-provider.tsx
  theme-toggle.tsx
hooks/
  use-toast.ts
lib/
  pdf-generator.ts
  store.ts
  stripe.js
  utils.ts
test/
  ideas
utils/
  generateCheckoutToken.ts
.gitignore
components.json
eslint.config.mjs
middleware.ts
next.config.ts
package.json
postcss.config.mjs
README.md
tailwind.config.ts
tsconfig.json
```

# Files

## File: app/ai-detector/page.tsx
````typescript
"use client"
import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Brain, Zap, Shield, Download, Copy, Check } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Progress } from "@/components/ui/progress"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { generateAIDetectorReport } from "@/lib/pdf-generator"

interface SentenceAnalysis {
  text: string
  score: number
  type: "human" | "mixed" | "ai"
}

export default function AIDetector() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const analyzeSentences = (text: string): SentenceAnalysis[] => {
    // Split into sentences
    const sentenceRegex = /[^.!?]+[.!?]+/g
    const sentences = text.match(sentenceRegex) || [text]

    // AI-like patterns
    const aiPatterns = [
      /\b(therefore|consequently|thus|hence)\b/gi,
      /\b(utilize|employ|implement)\b/gi,
      /\b(commence|initiate|facilitate)\b/gi,
      /\b(furthermore|moreover|additionally)\b/gi,
      /\b(demonstrate|illustrate|exemplify)\b/gi,
      /\b(significant|substantial|considerable)\b/gi,
      /\b(in conclusion|to summarize|in summary)\b/gi,
      /\b(it is important to note|it should be noted)\b/gi,
      /\b(this suggests that|this indicates that)\b/gi,
      /\b(plays a crucial role|is essential for)\b/gi,
    ]

    return sentences.map((sentence) => {
      let patternMatches = 0
      aiPatterns.forEach((pattern) => {
        const matches = sentence.match(pattern)
        if (matches) patternMatches += matches.length
      })

      // Calculate score based on patterns and sentence characteristics
      const wordCount = sentence.split(/\s+/).length
      const avgWordLength = sentence.replace(/\s/g, "").length / wordCount

      // AI tends to use longer words and more formal patterns
      let score = (patternMatches * 15) + (avgWordLength > 5.5 ? 20 : 0) + (wordCount > 25 ? 15 : 0)
      score = Math.min(100, Math.max(0, score + Math.random() * 20))

      let type: "human" | "mixed" | "ai" = "human"
      if (score > 60) type = "ai"
      else if (score > 30) type = "mixed"

      return {
        text: sentence.trim(),
        score: Math.round(score),
        type,
      }
    })
  }

  const handleDetect = async () => {
    if (!text.trim()) return

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
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        // Analyze sentences
        const sentenceAnalysis = analyzeSentences(text)

        // Calculate overall score
        const avgScore = sentenceAnalysis.reduce((sum, s) => sum + s.score, 0) / sentenceAnalysis.length
        const normalizedScore = Math.round(avgScore)

        let humanLikelihood = "Likely Human"
        let analysis =
          "The text appears to be written by a human. It contains natural language patterns and few indicators of AI generation."

        if (normalizedScore > 70) {
          humanLikelihood = "Likely AI"
          analysis =
            "The text shows strong indicators of AI generation. It contains formal language patterns and structures commonly found in AI-generated content."
        } else if (normalizedScore > 40) {
          humanLikelihood = "Possibly AI"
          analysis =
            "The text shows some indicators of AI generation, but also contains human-like elements. It may be AI-generated content that has been edited by a human."
        }

        setResult({
          score: normalizedScore,
          humanLikelihood,
          analysis,
          sentences: sentenceAnalysis,
        })

        decrementWords(requiredTokens)
        setIsAnalyzing(false)

        toast({
          title: "Analysis Complete",
          description: `Text analyzed: ${humanLikelihood}`,
          variant: "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error analyzing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze"
      setError(errorMessage)
      setIsAnalyzing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDownloadReport = () => {
    if (!result) return
    generateAIDetectorReport({
      text,
      aiScore: result.score,
      humanLikelihood: result.humanLikelihood,
      analysis: result.analysis,
      date: new Date(),
    })
    toast({
      title: "Report Generated",
      description: "Your PDF report is ready to download",
      variant: "success",
    })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
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

  const quickFeatures = [
    { icon: Brain, text: "Advanced AI Detection", color: "text-purple-600" },
    { icon: Zap, text: "Instant Analysis", color: "text-green-600" },
    { icon: Shield, text: "99% Accurate", color: "text-blue-600" }
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
            <Brain className="h-4 w-4" />
            Advanced AI Detection Technology
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className=" font-bold tracking-tight sm:text-6xl md:text-7xl">
              AI Detector
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Analyze text to determine if it was written by a human or generated by AI.
            Get instant insights with our advanced detection algorithms.
          </p>

          {/* Quick Features */}
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

        {/* Main Content */}
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
                  <h3 className="text-lg font-semibold">Enter Text to Analyze</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!text}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Paste text here to analyze whether it was written by AI or a human..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 text-base leading-relaxed"
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
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleDetect}
                  disabled={isAnalyzing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Detect AI ({calculateRequiredTokens(text)} words)
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

            {isAnalyzing && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Analyzing text patterns...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>
                </Card>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                {/* Overall Result */}
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">Detection Results</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadReport}
                        className="h-9"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </div>

                    <div className="text-center">
                      <h3 className="text-3xl font-bold mb-6">{result.humanLikelihood}</h3>

                      <div className="relative max-w-md mx-auto">
                        <div className="flex justify-between mb-3">
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Human
                          </span>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            AI Generated
                          </span>
                        </div>

                        <div className="h-4 bg-gradient-to-r from-green-200 to-red-200 dark:from-green-800 dark:to-red-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full transition-all duration-1000 relative"
                            style={{ width: `${result.score}%` }}
                          >
                            <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-gray-300 rounded-full shadow-lg"></div>
                          </div>
                        </div>

                        <div className="text-center mt-4">
                          <span className="text-lg font-bold">AI Probability: {result.score}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        Analysis Summary
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">{result.analysis}</p>
                    </div>
                  </div>
                </Card>

                {/* Sentence-Level Analysis */}
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">Sentence-by-Sentence Analysis</h3>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">Human</span>
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">Mixed</span>
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">AI</span>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {result.sentences.map((sentence, index) => {
                        const label = getSentenceLabel(sentence.type)
                        return (
                          <motion.div
                            key={index}
                            className={`p-4 rounded-lg border ${getSentenceColor(sentence.type)}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-sm leading-relaxed flex-1">{sentence.text}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${label.color}`}>
                                  {label.text}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {sentence.score}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {result.sentences.filter(s => s.type === "human").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Human Sentences</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {result.sentences.filter(s => s.type === "mixed").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Mixed Sentences</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {result.sentences.filter(s => s.type === "ai").length}
                        </p>
                        <p className="text-xs text-muted-foreground">AI Sentences</p>
                      </div>
                    </div>
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
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      How It Works
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Our AI detector analyzes patterns to identify machine-generated content
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { step: "1", title: "Paste Text", desc: "Add the content you want to analyze" },
                      { step: "2", title: "AI Analysis", desc: "Our algorithm scans for AI patterns" },
                      { step: "3", title: "Get Results", desc: "Receive detailed probability score" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-300">New Feature!</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        Now with sentence-by-sentence analysis. See exactly which parts of your text appear AI-generated.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/ai-humanizer/page.tsx
````typescript
"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Wand2, Sparkles, Zap, Shield, Copy, Check, ArrowRight, ArrowLeftRight } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function AIHumanizer() {
  const [text, setText] = useState("")
  const [humanizedText, setHumanizedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [humanizationLevel, setHumanizationLevel] = useState(50)
  const [tone, setTone] = useState("casual")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "tab">("split")
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleHumanize = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setHumanizedText("")
    setError(null)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        let result = text

        // Apply different transformations based on tone
        if (tone === "casual") {
          result = result
            .replace(/\b(therefore|consequently|thus)\b/gi, "so")
            .replace(/\b(utilize|employ)\b/gi, "use")
            .replace(/\b(commence|initiate)\b/gi, "start")
            .replace(/\b(furthermore|moreover)\b/gi, "also")
            .replace(/\b(demonstrate)\b/gi, "show")
            .replace(/\b(approximately)\b/gi, "about")
            .replace(/\b(sufficient)\b/gi, "enough")
            .replace(/\b(subsequently)\b/gi, "then")
        } else if (tone === "professional") {
          result = result
            .replace(/\b(use)\b/gi, "utilize")
            .replace(/\b(but)\b/gi, "however")
            .replace(/\b(also)\b/gi, "additionally")
            .replace(/\b(so)\b/gi, "therefore")
            .replace(/\b(show)\b/gi, "demonstrate")
        } else if (tone === "academic") {
          result = result
            .replace(/\b(show)\b/gi, "demonstrate")
            .replace(/\b(use)\b/gi, "implement")
            .replace(/\b(look at)\b/gi, "examine")
            .replace(/\b(find out)\b/gi, "ascertain")
            .replace(/\b(talk about)\b/gi, "discuss")
        } else if (tone === "friendly") {
          result = result
            .replace(/\b(therefore)\b/gi, "so basically")
            .replace(/\b(utilize)\b/gi, "use")
            .replace(/\b(demonstrate)\b/gi, "show you")
            .replace(/\b(furthermore)\b/gi, "and also")
            .replace(/\b(however)\b/gi, "but")
        } else if (tone === "persuasive") {
          result = result
            .replace(/\b(good)\b/gi, "excellent")
            .replace(/\b(important)\b/gi, "crucial")
            .replace(/\b(help)\b/gi, "empower")
            .replace(/\b(change)\b/gi, "transform")
            .replace(/\b(show)\b/gi, "reveal")
        }

        // Apply humanization level transformations
        if (humanizationLevel < 30) {
          result = result.replace(/\./g, ". ").replace(/\s+/g, " ").trim()
        } else if (humanizationLevel > 70) {
          result = result
            .replace(/\b(I believe|In my opinion)\b/gi, "I think")
            .replace(/\b(very)\b/gi, "really")
            .replace(/\b(extremely)\b/gi, "super")
            .replace(/\./g, ". ")
            .replace(/\s+/g, " ")
            .trim()
        }

        setHumanizedText(result)
        decrementWords(requiredTokens)
        setIsProcessing(false)

        toast({
          title: "Humanization Complete",
          description: "Your text has been successfully humanized.",
          variant: "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error humanizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to humanize"
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(humanizedText)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Humanized text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const quickFeatures = [
    { icon: Wand2, text: "AI to Human", color: "text-purple-600" },
    { icon: Zap, text: "Instant Results", color: "text-green-600" },
    { icon: Shield, text: "Bypass Detection", color: "text-blue-600" }
  ]

  const tones = [
    { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
    { value: "professional", label: "Professional", desc: "Business appropriate" },
    { value: "academic", label: "Academic", desc: "Scholarly and formal" },
    { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
    { value: "persuasive", label: "Persuasive", desc: "Compelling and convincing" },
  ]

  // Calculate changes for comparison
  const getChangedWords = () => {
    if (!text || !humanizedText) return { original: 0, changed: 0, percentage: 0 }
    const originalWords = text.toLowerCase().split(/\s+/)
    const humanizedWords = humanizedText.toLowerCase().split(/\s+/)
    let changedCount = 0

    originalWords.forEach((word, i) => {
      if (humanizedWords[i] && word !== humanizedWords[i]) {
        changedCount++
      }
    })

    return {
      original: originalWords.length,
      changed: changedCount,
      percentage: originalWords.length > 0 ? Math.round((changedCount / originalWords.length) * 100) : 0
    }
  }

  const changes = getChangedWords()

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
            <Wand2 className="h-4 w-4" />
            Transform AI text to human-like content
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              AI Humanizer
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Transform AI-generated content into natural, human-like text that bypasses
            AI detection tools while maintaining quality and meaning.
          </p>

          {/* Quick Features */}
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

        {/* Main Content - Side by Side Comparison */}
        <div className="max-w-7xl mx-auto">
          {/* View Toggle */}
          <motion.div
            className="flex justify-end mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === "split" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("split")}
                className="h-8"
              >
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                Side by Side
              </Button>
              <Button
                variant={viewMode === "tab" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tab")}
                className="h-8"
              >
                Stacked
              </Button>
            </div>
          </motion.div>

          {/* Comparison View */}
          <motion.div
            className={viewMode === "split" ? "grid lg:grid-cols-2 gap-6" : "space-y-6"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Original Input */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    Original (AI Text)
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {text.length} characters
                  </span>
                </div>
                <Textarea
                  placeholder="Paste your AI-generated text here to humanize it..."
                  className="min-h-[280px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </Card>

            {/* Arrow between (only in split view) */}
            {viewMode === "split" && (
              <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-purple-500 text-white p-2 rounded-full shadow-lg">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            )}

            {/* Humanized Output */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Humanized
                  </h3>
                  {humanizedText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Humanized text will appear here..."
                  className="min-h-[280px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed bg-green-50/50 dark:bg-green-900/10"
                  value={humanizedText}
                  readOnly
                />
              </div>
            </Card>
          </motion.div>

          {/* Changes Summary */}
          {humanizedText && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-0">
                <div className="flex flex-wrap items-center justify-center gap-8 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{changes.original}</p>
                    <p className="text-xs text-muted-foreground">Original Words</p>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{changes.changed}</p>
                    <p className="text-xs text-muted-foreground">Words Changed</p>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{changes.percentage}%</p>
                    <p className="text-xs text-muted-foreground">Transformation Rate</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Controls */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="grid md:grid-cols-3 gap-6 items-end">
                {/* Humanization Level */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Humanization Level: {humanizationLevel}%
                  </Label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[humanizationLevel]}
                    onValueChange={(value) => setHumanizationLevel(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Light</span>
                    <span>Medium</span>
                    <span>Heavy</span>
                  </div>
                </div>

                {/* Tone Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Writing Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {tones.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex flex-col">
                            <span>{t.label}</span>
                            <span className="text-xs text-muted-foreground">{t.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Button */}
                <Button
                  className="h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleHumanize}
                  disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Humanizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Humanize ({calculateRequiredTokens(text)} words)
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {calculateRequiredTokens(text) > remainingWords && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Not enough words remaining.
                    <Link href="/pricing" className="font-semibold underline ml-1">
                      Upgrade your plan
                    </Link>
                  </p>
                </motion.div>
              )}

              {isProcessing && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Humanizing content...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* How It Works */}
          <motion.div
            className="mt-12 grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { step: "1", title: "Paste AI Text", desc: "Add your AI-generated content to the input box", color: "from-purple-500 to-purple-600" },
              { step: "2", title: "Customize Settings", desc: "Choose your preferred tone and humanization level", color: "from-pink-500 to-pink-600" },
              { step: "3", title: "Get Human Text", desc: "Receive natural text that bypasses AI detection", color: "from-blue-500 to-blue-600" }
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.color} text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4`}>
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </motion.div>

          {/* Pro Tip */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-0">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">Pro Tip</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    For best results, use a higher humanization level (70%+) and the &quot;Casual&quot; tone to make text sound most natural.
                    The comparison view helps you see exactly what changes were made!
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/api/check-plagiarism/route.ts
````typescript
import { Mistral } from '@mistralai/mistralai';

// Mistral client setup
const mistralClient = process.env.MISTRAL_API_KEY ? new Mistral({ 
  apiKey: process.env.MISTRAL_API_KEY 
}) : null;

// Helper function to calculate text similarity using basic algorithms
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return (intersection.length / union.length) * 100;
}

// Enhanced detection using multiple approaches inspired by PlagBench
function detectPotentialPlagiarism(text: string): { matches: any[], score: number } {
  // Basic algorithmic detection for fallback only
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const matches: any[] = [];
  
  // Simple repetition analysis
  const words = text.toLowerCase().split(/\s+/);
  const wordCount: { [key: string]: number } = {};
  
  words.forEach(word => {
    if (word.length > 6) { // Only check longer words
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Only flag excessive repetition
  let totalSimilarity = 0;
  let matchCount = 0;
  
  Object.entries(wordCount).forEach(([word, count]) => {
    if (count > 5) { // Only flag if word appears more than 5 times
      const similarity = Math.min(count * 10, 70);
      matches.push({
        text: `Repeated word: "${word}" appears ${count} times`,
        similarity: similarity
      });
      totalSimilarity += similarity;
      matchCount++;
    }
  });
  
  const averageSimilarity = matchCount > 0 ? totalSimilarity / matchCount : 0;
  
  return {
    matches: matches.slice(0, 3), // Limit to top 3 matches
    score: Math.min(averageSimilarity * 0.5, 25) // Cap at 25% for basic detection
  };
}

// Helper function to extract JSON from response
function extractJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// Enhanced system prompt for Mistral with text highlighting
const ENHANCED_SYSTEM_PROMPT = `You are an advanced plagiarism detection system. Analyze the input text for plagiarism and identify specific text segments that are potentially plagiarized.

For each potentially plagiarized segment, you must:
1. Extract the EXACT text from the input (word-for-word)
2. Provide the start and end positions of that text in the original input
3. Explain why it's flagged

Return ONLY a valid JSON object with this exact structure:

{
  "plagiarismPercentage": number between 0 and 100,
  "matches": [
    {
      "text": "exact text segment from input",
      "startIndex": number (character position where match starts),
      "endIndex": number (character position where match ends),
      "similarity": number between 0 and 100,
      "reason": "brief explanation of why this was flagged"
    }
  ]
}

IMPORTANT: 
- The "text" field must contain the EXACT text from the input
- startIndex and endIndex must be accurate character positions
- Only flag text that shows clear signs of plagiarism
- Be precise with character positions for highlighting

If no plagiarism is detected, return:
{
  "plagiarismPercentage": 0,
  "matches": []
}`;

export async function POST(req: Request) {
  const { text } = await req.json();
  console.log("Enhanced plagiarism detection started...");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 0 })}\n\n`));

        let result: any = null;
        
        // Use Mistral AI for plagiarism detection
        if (mistralClient) {
          console.log("Using Mistral AI for plagiarism detection...");
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 30 })}\n\n`));
          
          const completion = await mistralClient.chat.complete({
            model: 'mistral-medium',
            messages: [
              {
                role: 'system',
                content: ENHANCED_SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: `Analyze this text for plagiarism:\n\n${text}`
              }
            ],
            temperature: 0.1,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 80 })}\n\n`));

          if (completion.choices && completion.choices[0]?.message?.content) {
            const mistralContent = completion.choices[0].message.content;
            const mistralContentString: string = typeof mistralContent === 'string' ? mistralContent : 
                                        Array.isArray(mistralContent) ? mistralContent.map((chunk: any) => chunk.text || '').join('') : 
                                        String(mistralContent);
            result = extractJSON(mistralContentString);
          }
        }

        // Final fallback: use basic algorithm-based detection
        if (!result) {
          console.log("Using algorithmic fallback detection...");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 70 })}\n\n`));
          
          const basicDetection = detectPotentialPlagiarism(text);
          result = {
            plagiarismPercentage: Math.round(basicDetection.score),
            matches: basicDetection.matches.map(match => ({
              text: match.text,
              similarity: Math.round(match.similarity)
            }))
          };
        }

        // Validate and clean result
        if (!result || typeof result.plagiarismPercentage !== "number") {
          result = {
            plagiarismPercentage: 0,
            matches: []
          };
        }

        // Ensure percentage is within bounds
        result.plagiarismPercentage = Math.max(0, Math.min(100, result.plagiarismPercentage));

        // Ensure matches is an array
        if (!Array.isArray(result.matches)) {
          result.matches = [];
        }

        // Clean matches data with highlighting information
        result.matches = result.matches.map((match: any) => ({
          text: match.text || "Unknown match",
          startIndex: match.startIndex || 0,
          endIndex: match.endIndex || 0,
          similarity: Math.max(0, Math.min(100, match.similarity || 0)),
          reason: match.reason || "Potential plagiarism detected"
        }));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 100 })}\n\n`));

        // Send final result
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              result: result,
            })}\n\n`
          )
        );

        console.log("Plagiarism detection completed successfully");

      } catch (error) {
        console.error("Error in plagiarism detection:", error);
        
        // Provide fallback result instead of error
        const fallbackResult = {
          plagiarismPercentage: 0,
          matches: [],
          note: "Analysis completed with basic detection due to service limitations"
        };

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              result: fallbackResult,
            })}\n\n`
          )
        );
      } finally {
        controller.close();
        console.log("Stream closed.");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
````

## File: app/api/create-checkout-session/route.ts
````typescript
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const priceId = url.searchParams.get('priceId')
    const planName = url.searchParams.get('planName')
    
    if (!priceId || !planName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `https://www.plagiacheck.online/api/handle-subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.plagiacheck.online/pricing`,
      metadata: {
        planName: planName,
      },
    })

    console.log("Redirecting to:", session.url)
    
    // Clean redirect response
    return NextResponse.redirect(session.url!, 303)
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}
````

## File: app/api/create-custom-checkout-session/route.ts
````typescript
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { wordCount, price } = await request.json()

  try {
    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Custom Plan - ${wordCount} words`,
              description: `Custom word count package for ${wordCount} words`,
            },
            unit_amount: Math.round(price * 100), // Stripe expects the amount in cents, ensure it's rounded
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://www.plagiacheck.online/success`,
      cancel_url: `https://www.plagiacheck.online/pricing`,
    })

    return NextResponse.json({
      url: session.url, // Return the URL instead of just the session ID
      sessionId: session.id,
    })
  } catch (err: any) {
    console.error("Stripe session creation error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
````

## File: app/api/custom-success/page.tsx
````typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Purchase Successful!</h1>
        <p className="text-xl">Thank you for supporting to our service.</p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
````

## File: app/api/handle-subscription-success/route.ts
````typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Update user's subscription status in your database
    const { error } = await supabase
      .from("user_profiles")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "active",
        plan: session.metadata?.planName,
      })
      .eq("id", session.metadata?.userId);

    if (error) {
      console.error("Error updating user subscription:", error);
      return NextResponse.redirect(new URL("/pricing?error=update_failed", req.url));
    }

    // ✅ Redirect to absolute URL
    return NextResponse.redirect(new URL("/subscription-success", req.url));
  } catch (error) {
    console.error("Error handling subscription success:", error);
    return NextResponse.redirect(new URL("/pricing?error=process_failed", req.url));
  }
}
````

## File: app/api/subscription-success/page.tsx
````typescript
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Subscription Successful!</h1>
        <p className="text-xl">Thank you for subscribing to our service.</p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
````

## File: app/billing/page.tsx
````typescript
"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/Billing/Badge"
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Download, 
  Crown, 
  AlertCircle, 
  CheckCircle,
  ArrowUpRight,
  FileText,
  Clock
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"

export default function Billing() {
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Mock data - replace with real data from your backend
  const currentPlan = {
    name: "Free Plan",
    status: "active",
    wordsRemaining: 1000,
    totalWords: 1000,
    renewalDate: null,
    price: "$0.00"
  }

  const paymentHistory = [] // Empty for now as specified

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="container py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view billing</h1>
            <Button asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container py-12 max-w-6xl mx-auto px-4">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
              <p className="text-muted-foreground">
                Manage your subscription, view usage, and download invoices
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" asChild>
              <Link href="/pricing">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </div>

          {/* Current Plan */}
          <Card className="border-2 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-blue-600" />
                  Current Plan
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {currentPlan.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{currentPlan.name}</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{currentPlan.price}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Words Used</span>
                      <span className="font-medium">
                        {currentPlan.totalWords - currentPlan.wordsRemaining} / {currentPlan.totalWords}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((currentPlan.totalWords - currentPlan.wordsRemaining) / currentPlan.totalWords) * 100}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan.wordsRemaining} words remaining
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-foreground">Plan Features</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Basic plagiarism detection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        1,000 words per month
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Standard support
                      </li>
                    </ul>
                  </div>

                  {currentPlan.renewalDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Renews on {currentPlan.renewalDate}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">No payment method added</h3>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to a paid plan to add Payment Method
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Words Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold text-foreground">
                    {currentPlan.totalWords - currentPlan.wordsRemaining}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Checks Performed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-foreground">0</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-muted-foreground">Account Age</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold text-foreground">
                    {user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Days</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment History
                </CardTitle>
                <Button variant="outline" size="sm" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">No payment history</h3>
                      <p className="text-sm text-muted-foreground">
                        Your payment history will appear here once you make your first purchase
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment history items would go here */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Ready to upgrade?</h3>
                  <p className="text-blue-100">
                    Get unlimited checks, advanced features, and priority support with our premium plans
                  </p>
                </div>
                <Button 
                  className="bg-white text-blue-600 hover:bg-gray-100 font-semibold" 
                  asChild
                >
                  <Link href="/pricing">
                    View Plans
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
````

## File: app/grammar-checker/page.tsx
````typescript
"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, Sparkles, Zap, Shield, Copy, Check, AlertTriangle, XCircle, Info } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

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
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleCheck = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setCorrectedText("")
    setIssues([])
    setError(null)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        // Common grammar rules for simulation
        const grammarRules: { pattern: RegExp; replacement: string; type: "error" | "warning" | "suggestion"; message: string }[] = [
          { pattern: /\bi\b/g, replacement: "I", type: "error", message: "Capitalize 'I' when referring to yourself" },
          { pattern: /\bthier\b/gi, replacement: "their", type: "error", message: "Spelling error: 'thier' should be 'their'" },
          { pattern: /\bteh\b/gi, replacement: "the", type: "error", message: "Spelling error: 'teh' should be 'the'" },
          { pattern: /\brecieve\b/gi, replacement: "receive", type: "error", message: "Spelling error: 'recieve' should be 'receive'" },
          { pattern: /\boccured\b/gi, replacement: "occurred", type: "error", message: "Spelling error: 'occured' should be 'occurred'" },
          { pattern: /\bdefinately\b/gi, replacement: "definitely", type: "error", message: "Spelling error: 'definately' should be 'definitely'" },
          { pattern: /\bseperate\b/gi, replacement: "separate", type: "error", message: "Spelling error: 'seperate' should be 'separate'" },
          { pattern: /\byour\s+(?=going|welcome|right|wrong)/gi, replacement: "you're ", type: "error", message: "Use 'you're' (you are) instead of 'your'" },
          { pattern: /\bits\s+(?=a|an|the|going|been)/gi, replacement: "it's ", type: "warning", message: "Consider using 'it's' (it is) instead of 'its'" },
          { pattern: /\balot\b/gi, replacement: "a lot", type: "error", message: "'alot' is not a word, use 'a lot'" },
          { pattern: /\bcould of\b/gi, replacement: "could have", type: "error", message: "'Could of' should be 'could have'" },
          { pattern: /\bshould of\b/gi, replacement: "should have", type: "error", message: "'Should of' should be 'should have'" },
          { pattern: /\bwould of\b/gi, replacement: "would have", type: "error", message: "'Would of' should be 'would have'" },
          { pattern: /\s{2,}/g, replacement: " ", type: "suggestion", message: "Remove extra spaces" },
          { pattern: /\.\s*,/g, replacement: ",", type: "error", message: "Incorrect punctuation" },
          { pattern: /\bthen\b(?=\s+(?:me|him|her|them|us))/gi, replacement: "than", type: "error", message: "Use 'than' for comparisons" },
          { pattern: /\baffect\b(?=\s+(?:on|is|was|has))/gi, replacement: "effect", type: "warning", message: "Consider using 'effect' (noun) instead of 'affect' (verb)" },
        ]

        let corrected = text
        const foundIssues: GrammarIssue[] = []

        grammarRules.forEach((rule) => {
          let match
          while ((match = rule.pattern.exec(text)) !== null) {
            // Avoid duplicate issues at the same position
            const isDuplicate = foundIssues.some(
              issue => issue.position.start === match!.index && issue.text === match![0]
            )

            if (!isDuplicate) {
              foundIssues.push({
                type: rule.type,
                text: match[0],
                replacement: rule.replacement,
                message: rule.message,
                position: { start: match.index, end: match.index + match[0].length }
              })
            }
          }
          corrected = corrected.replace(rule.pattern, rule.replacement)
        })

        // Sort issues by position
        foundIssues.sort((a, b) => a.position.start - b.position.start)

        setCorrectedText(corrected)
        setIssues(foundIssues)
        decrementWords(requiredTokens)
        setIsProcessing(false)

        toast({
          title: "Check Complete",
          description: foundIssues.length > 0
            ? `Found ${foundIssues.length} issue${foundIssues.length > 1 ? 's' : ''} in your text.`
            : "No issues found! Your text looks great.",
          variant: foundIssues.length > 0 ? "default" : "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error checking grammar:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check grammar"
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
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
    const newText = text.substring(0, issue.position.start) + issue.replacement + text.substring(issue.position.end)
    setText(newText)

    // Update issues by removing the fixed one and adjusting positions
    const lengthDiff = issue.replacement.length - issue.text.length
    const updatedIssues = issues
      .filter(i => i.position.start !== issue.position.start)
      .map(i => {
        if (i.position.start > issue.position.start) {
          return {
            ...i,
            position: {
              start: i.position.start + lengthDiff,
              end: i.position.end + lengthDiff
            }
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

  const quickFeatures = [
    { icon: CheckCircle2, text: "Grammar Check", color: "text-green-600" },
    { icon: Zap, text: "Instant Results", color: "text-yellow-600" },
    { icon: Shield, text: "Spelling Fix", color: "text-blue-600" }
  ]

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
      default:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
    }
  }

  const errorCount = issues.filter(i => i.type === "error").length
  const warningCount = issues.filter(i => i.type === "warning").length
  const suggestionCount = issues.filter(i => i.type === "suggestion").length

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            AI-Powered Grammar & Spelling
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              Grammar Checker
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Fix grammar, spelling, and punctuation errors instantly.
            Write with confidence using our AI-powered grammar checker.
          </p>

          {/* Quick Features */}
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Input Card */}
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Text</h3>
                  <span className="text-sm text-muted-foreground">
                    {text.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <Textarea
                  placeholder="Type or paste your text here to check for grammar and spelling errors..."
                  className="min-h-[250px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 text-base leading-relaxed"
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
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleCheck}
                  disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Check Grammar ({calculateRequiredTokens(text)} words)
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

            {isProcessing && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Checking grammar and spelling...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Results - Issues List */}
            {issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Issues Found</h3>
                      <div className="flex gap-3 text-sm">
                        {errorCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" /> {errorCount} errors
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <AlertTriangle className="h-4 w-4" /> {warningCount} warnings
                          </span>
                        )}
                        {suggestionCount > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Info className="h-4 w-4" /> {suggestionCount} suggestions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {issues.map((issue, index) => (
                        <motion.div
                          key={index}
                          className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {getIssueIcon(issue.type)}
                              <div>
                                <p className="text-sm font-medium">{issue.message}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <span className="line-through text-red-500">{issue.text}</span>
                                  <span className="mx-2">→</span>
                                  <span className="text-green-600 font-medium">{issue.replacement}</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyFix(issue)}
                              className="flex-shrink-0"
                            >
                              Fix
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Corrected Text */}
            {correctedText && issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Corrected Text</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copied ? "Copied!" : "Copy All"}
                      </Button>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{correctedText}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* No Issues Found */}
            {correctedText && issues.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Perfect!</h3>
                    <p className="text-emerald-700 dark:text-emerald-300">
                      No grammar or spelling issues found. Your text looks great!
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      What We Check
                    </h3>

                    <div className="space-y-4">
                      {[
                        { icon: XCircle, label: "Spelling Errors", color: "text-red-500" },
                        { icon: AlertTriangle, label: "Grammar Issues", color: "text-yellow-500" },
                        { icon: Info, label: "Style Suggestions", color: "text-blue-500" },
                        { icon: CheckCircle2, label: "Punctuation", color: "text-green-500" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                          <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">How It Works</h3>

                    {[
                      { step: "1", title: "Enter Text", desc: "Type or paste your content" },
                      { step: "2", title: "AI Analysis", desc: "We scan for all issues" },
                      { step: "3", title: "Review & Fix", desc: "Apply fixes with one click" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-300">Pro Tip</h4>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Click the &quot;Fix&quot; button on each issue to automatically apply corrections to your text.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/history/page.tsx
````typescript
"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useTokenStore } from "@/lib/store"

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { remainingWords } = useTokenStore()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (!session?.user) {
        router.push("/signin")
        return
      }

      setIsLoading(false)
    }

    checkSession()
  }, [supabase.auth, router])

  const tools = [
    {
      name: "Plagiarism Checker",
      description: "Check your text for plagiarism against billions of sources",
      href: "/",
      icon: Shield,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "AI Detector",
      description: "Detect if text was written by AI or a human",
      href: "/ai-detector",
      icon: Brain,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      name: "AI Humanizer",
      description: "Transform AI-generated text to sound more human",
      href: "/ai-humanizer",
      icon: Wand2,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      name: "Paraphraser",
      description: "Rewrite your text with different words and style",
      href: "/paraphraser",
      icon: RefreshCw,
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      name: "Summarizer",
      description: "Condense long text into key points",
      href: "/summarizer",
      icon: FileText,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      name: "Grammar Checker",
      description: "Fix spelling and grammar errors instantly",
      href: "/grammar-checker",
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      name: "Word Counter",
      description: "Count words, characters, and reading time",
      href: "/word-counter",
      icon: Hash,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      isFree: true,
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <section className="container py-12">
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              All Tools in One Place
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              What would you like to do?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose a tool below to get started. Each tool is designed to help you create better content.
            </p>
          </motion.div>

          {/* Usage Stats Card */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Words Remaining</p>
                    <p className="text-2xl font-bold">{remainingWords.toLocaleString()} words</p>
                  </div>
                </div>
                <Button asChild variant="secondary" className="bg-white text-blue-600 hover:bg-white/90">
                  <Link href="/pricing">
                    Upgrade Plan
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Tools Grid */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Link href={tool.href}>
                  <Card className={`p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 ${tool.bgColor} group`}>
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${tool.color} shadow-lg`}>
                          <tool.icon className="h-6 w-6 text-white" />
                        </div>
                        {tool.isFree && (
                          <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                            Free
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex-1">
                        {tool.description}
                      </p>
                      <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6 border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    For the best results, start with the Plagiarism Checker to ensure originality,
                    then use the AI Detector to verify human-like content.
                    Use the Humanizer if any AI patterns are detected.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
````

## File: app/paraphraser/page.tsx
````typescript
"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, RefreshCw, Sparkles, Zap, Shield, Copy, Check, ArrowRight } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function Paraphraser() {
  const [text, setText] = useState("")
  const [paraphrasedText, setParaphrasedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState("standard")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleParaphrase = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setParaphrasedText("")
    setError(null)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        let result = text

        // Apply different paraphrasing modes
        if (mode === "standard") {
          result = result
            .replace(/\b(very)\b/gi, "quite")
            .replace(/\b(good)\b/gi, "excellent")
            .replace(/\b(bad)\b/gi, "poor")
            .replace(/\b(big)\b/gi, "large")
            .replace(/\b(small)\b/gi, "little")
            .replace(/\b(important)\b/gi, "crucial")
            .replace(/\b(help)\b/gi, "assist")
            .replace(/\b(show)\b/gi, "demonstrate")
            .replace(/\b(use)\b/gi, "utilize")
            .replace(/\b(make)\b/gi, "create")
        } else if (mode === "fluency") {
          result = result
            .replace(/\b(therefore)\b/gi, "as a result")
            .replace(/\b(however)\b/gi, "on the other hand")
            .replace(/\b(also)\b/gi, "additionally")
            .replace(/\b(but)\b/gi, "nevertheless")
            .replace(/\b(so)\b/gi, "consequently")
            .replace(/\b(because)\b/gi, "since")
            .replace(/\b(although)\b/gi, "even though")
        } else if (mode === "creative") {
          result = result
            .replace(/\b(said)\b/gi, "expressed")
            .replace(/\b(think)\b/gi, "believe")
            .replace(/\b(want)\b/gi, "desire")
            .replace(/\b(need)\b/gi, "require")
            .replace(/\b(like)\b/gi, "appreciate")
            .replace(/\b(see)\b/gi, "observe")
            .replace(/\b(know)\b/gi, "understand")
            .replace(/\b(get)\b/gi, "obtain")
        } else if (mode === "formal") {
          result = result
            .replace(/\b(kids)\b/gi, "children")
            .replace(/\b(lots of)\b/gi, "numerous")
            .replace(/\b(a lot)\b/gi, "considerably")
            .replace(/\b(thing)\b/gi, "matter")
            .replace(/\b(stuff)\b/gi, "materials")
            .replace(/\b(guy)\b/gi, "individual")
            .replace(/\b(pretty)\b/gi, "fairly")
        }

        setParaphrasedText(result)
        decrementWords(requiredTokens)
        setIsProcessing(false)

        toast({
          title: "Paraphrasing Complete",
          description: "Your text has been successfully paraphrased.",
          variant: "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error paraphrasing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to paraphrase"
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
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

  const quickFeatures = [
    { icon: RefreshCw, text: "Smart Rewriting", color: "text-blue-600" },
    { icon: Zap, text: "Instant Results", color: "text-green-600" },
    { icon: Shield, text: "Plagiarism Free", color: "text-purple-600" }
  ]

  const modes = [
    { value: "standard", label: "Standard", desc: "Balanced paraphrasing" },
    { value: "fluency", label: "Fluency", desc: "Improve readability" },
    { value: "creative", label: "Creative", desc: "More expressive" },
    { value: "formal", label: "Formal", desc: "Professional tone" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
            <RefreshCw className="h-4 w-4" />
            AI-Powered Text Rewriting
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              AI Paraphraser
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Rewrite your content with different words while keeping the original meaning.
            Perfect for avoiding plagiarism and improving your writing.
          </p>

          {/* Quick Features */}
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

        {/* Main Content - Side by Side Comparison */}
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Input Section */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Original Text</h3>
                  <span className="text-sm text-muted-foreground">
                    {text.length} characters
                  </span>
                </div>
                <Textarea
                  placeholder="Enter or paste your text here to paraphrase..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </Card>

            {/* Output Section */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Paraphrased Text</h3>
                  {paraphrasedText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Paraphrased text will appear here..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed bg-gray-50 dark:bg-gray-800/50"
                  value={paraphrasedText}
                  readOnly
                />
              </div>
            </Card>
          </motion.div>

          {/* Controls */}
          <motion.div
            className="mt-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-3">
                  <Label htmlFor="mode" className="text-base font-medium">Paraphrasing Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger id="mode" className="h-11">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {modes.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="h-12 px-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleParaphrase}
                  disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Paraphrasing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Paraphrase ({calculateRequiredTokens(text)} words)
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {calculateRequiredTokens(text) > remainingWords && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Not enough words remaining.
                    <Link href="/pricing" className="font-semibold underline ml-1">
                      Upgrade your plan
                    </Link>
                  </p>
                </motion.div>
              )}

              {isProcessing && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Paraphrasing content...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          {/* How It Works */}
          <motion.div
            className="mt-12 grid md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { step: "1", title: "Enter Text", desc: "Paste or type your original content", icon: "text" },
              { step: "2", title: "Choose Mode", desc: "Select your preferred style", icon: "settings" },
              { step: "3", title: "Paraphrase", desc: "AI rewrites your content", icon: "magic" },
              { step: "4", title: "Copy Result", desc: "Use your unique content", icon: "copy" }
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < 3 && (
                  <ArrowRight className="h-5 w-5 text-blue-400 mx-auto mt-4 hidden md:block" />
                )}
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/pricing/page.tsx
````typescript
"use client"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check, Sparkles, Zap, Shield, Brain, Wand2, RefreshCw, FileText, CheckCircle2, Hash } from 'lucide-react'
import type { User } from "@supabase/auth-helpers-nextjs"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { CustomPlanSlider } from "@/components/PricingPage/CustomPlanSlider"
import { TrustSection } from "@/components/PricingPage/TrustSection"
import { useTheme } from "next-themes"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Pricing() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const plans = [
    {
      name: "Free",
      description: "Perfect for students",
      price: "$0",
      period: "forever",
      features: [
        "Write without mistakes", 
        "See your writing tone", 
        "Free 1000 words",
        "Basic plagiarism detection",
      ],
      button: {
        text: user ? "Current Plan" : "Get Started Free",
        variant: "outline" as const,
      },
      priceId: null,
      icon: null,
    },
    {
      name: "Plus",
      description: "For individuals & small teams",
      price: "$9.99",
      period: "per month",
      yearlyPrice: "$119",
      features: [
        "Everything in Free", 
        "100,000 words monthly",
        "Advanced plagiarism detection",
        "Detailed similarity reports",
        "Citation assistance",
        "Priority support"
      ],
      button: {
        text: "Start Plus Plan",
        variant: "default" as const,
      },
      popular: true,
      priceId: "price_1QrlQ3AJsVayTGRcMsOQu8Gy",
      icon: Sparkles,
      savings: "Save $20/year",
    },
    {
      name: "Premium",
      description: "For organizations & power users",
      price: "$29.99",
      period: "per month",
      yearlyPrice: "$239",
      features: [
        "Everything in Plus", 
        "1,000,000 words monthly",
        "Team collaboration tools",
        "API access",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced analytics"
      ],
      button: {
        text: "Go Premium",
        variant: "outline" as const,
      },
      priceId: "price_1S4ntlAJsVayTGRcEL6YUGdf",
      icon: Zap,
      savings: "Save $40/year",
    },
  ]

  const handleGetStarted = (planName: string, priceId: string | null) => {
    if (!user) {
      router.push("/signin?tab=register")
      return
    }

    if (!priceId) {
      console.log(`User ${user.id} selected ${planName} plan (Free)`)
      return
    }

    // Direct navigation instead of fetch
    window.location.href = `/api/create-checkout-session?priceId=${priceId}&planName=${planName}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        {/* Hero Section */}
        <section className="container py-16">
          <div className="grid gap-8">
            <div className="grid gap-6 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mx-auto">
                <Sparkles className="h-4 w-4" />
                Trusted by 10M+ users worldwide
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Choose Your Perfect Plan
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Ensure originality and maintain academic integrity with our advanced plagiarism detection. 
                Start free, upgrade when you need more power.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid lg:grid-cols-3 gap-8 mt-12">
              {plans.map((plan) => {
                const IconComponent = plan.icon
                return (
                  <Card
                    key={plan.name}
                    className={`relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                      plan.popular 
                        ? "border-primary shadow-lg ring-1 ring-primary/20" 
                        : "hover:border-primary/50"
                    } bg-card/50 backdrop-blur-sm`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-0 right-0 mx-auto w-36 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-lg">
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-3 mb-4">
                        {IconComponent && (
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-muted-foreground">/ {plan.period}</span>
                        </div>
                        {plan.yearlyPrice && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              ${plan.yearlyPrice} when billed yearly
                            </p>
                            {plan.savings && (
                              <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                                <Check className="h-3 w-3" />
                                {plan.savings}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <Button
                        className={`w-full mb-6 font-semibold transition-all ${
                          plan.button.variant === "default" 
                            ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl" 
                            : "border-2 hover:border-primary hover:bg-primary/5"
                        }`}
                        variant={plan.button.variant}
                        size="lg"
                        onClick={() => handleGetStarted(plan.name, plan.priceId)}
                        disabled={plan.name === "Free" && user ? true : false}
                      >
                        {plan.button.text}
                      </Button>
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-foreground mb-3">
                          Whats included:
                        </div>
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 bg-primary/10 rounded-full">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Tools Included Section */}
            <div className="mt-20">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-4">All Plans Include These Tools</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Get access to our complete suite of writing tools with any plan
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
                {[
                  { name: "Plagiarism Checker", icon: Shield, color: "text-blue-500" },
                  { name: "AI Detector", icon: Brain, color: "text-purple-500" },
                  { name: "AI Humanizer", icon: Wand2, color: "text-pink-500" },
                  { name: "Paraphraser", icon: RefreshCw, color: "text-cyan-500" },
                  { name: "Summarizer", icon: FileText, color: "text-green-500" },
                  { name: "Grammar Checker", icon: CheckCircle2, color: "text-emerald-500" },
                  { name: "Word Counter", icon: Hash, color: "text-orange-500", isFree: true },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="group relative flex flex-col items-center p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-300"
                  >
                    <div className="relative mb-3">
                      <tool.icon className={`h-7 w-7 md:h-8 md:w-8 ${tool.color} transition-transform duration-300 group-hover:scale-110`} />
                    </div>
                    <h3 className="font-medium text-sm md:text-base text-center text-gray-900 dark:text-gray-100">{tool.name}</h3>
                    {tool.isFree && (
                      <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                        FREE
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Plan Slider */}
            <div className="mt-16">
              <CustomPlanSlider user={user} />
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <TrustSection />

        {/* FAQ Section */}
        <section className="container py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about our pricing</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is my content secure?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely. We use enterprise-grade security and never store or share your documents.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, we offer a 30-day money-back guarantee for all paid plans.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">What sources do you check against?</h3>
                <p className="text-sm text-muted-foreground">
                  We check against billions of web pages, academic papers, and published content.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How accurate is the detection?</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI-powered system maintains a 99.9% accuracy rate with minimal false positives.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you support team accounts?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, our Premium plan includes team collaboration tools and user management.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
````

## File: app/privacy/page.tsx
````typescript
export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background py-8">
        <div className="container mx-auto px-8">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12 text-muted-foreground">
        <section className="space-y-8">
          <p>
            At Plagiacheck, we respect your privacy and are committed to safeguarding the personal information you share with us. This Privacy Policy explains how we collect, use, and protect your personal data when you use our services.
          </p>
          <p>
            By accessing or using our website and services (&quot;Service&quot;), you agree to this Privacy Policy. If you do not agree with the terms outlined, please refrain from using our Service.
          </p>

          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-6">
            <li><strong>Personal Information</strong>: This includes information you provide when you create an account, contact customer support, or interact with our Service. It may include your name, email address, billing information, and other relevant details.</li>
            <li><strong>Usage Data</strong>: We collect data on how you access and use our Service, such as your IP address, browser type, device information, and pages visited.</li>
            <li><strong>Cookies</strong>: We use cookies and similar tracking technologies to enhance your user experience and analyze how you use our Service. You can manage cookie settings through your browser.</li>
          </ul>

          <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6">
            <li>Provide and improve our Service.</li>
            <li>Personalize your experience and recommend features you may find useful.</li>
            <li>Communicate with you, including sending service-related updates or promotional materials (with your consent).</li>
            <li>Prevent fraud and ensure the security of our Service.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2 className="text-xl font-semibold">3. Sharing Your Information</h2>
          <p>We do not sell, rent, or share your personal information with third parties except for the following:</p>
          <ul className="list-disc pl-6">
            <li><strong>Service Providers</strong>: We may share your information with trusted third-party vendors who assist us in operating our Service, conducting business activities, or serving you.</li>
            <li><strong>Legal Compliance</strong>: We may disclose your information if required by law, regulation, or legal process, or if we believe that such disclosure is necessary to protect the rights, property, or safety of Plagiacheck, our users, or the public.</li>
          </ul>

          <h2 className="text-xl font-semibold">4. Data Retention</h2>
          <p>We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, or as required by law. If you close your account, we may retain certain information as required by law or for legitimate business purposes.</p>

          <h2 className="text-xl font-semibold">5. Your Rights</h2>
          <p>You have the following rights with respect to your personal data:</p>
          <ul className="list-disc pl-6">
            <li><strong>Access</strong>: You can request access to the personal data we hold about you.</li>
            <li><strong>Correction</strong>: You can update or correct your information if it is inaccurate or incomplete.</li>
            <li><strong>Deletion</strong>: You can request the deletion of your personal data, subject to certain conditions.</li>
            <li><strong>Opt-out of Marketing</strong>: You can unsubscribe from marketing communications at any time by following the opt-out instructions in the emails or contacting us directly.</li>
          </ul>
          <p>To exercise these rights, please contact us using the information provided in the &quot;Contact Us&quot; section.</p>

          <h2 className="text-xl font-semibold">6. Security</h2>
          <p>We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no data transmission method or storage system is completely secure, and we cannot guarantee the absolute security of your information.</p>

          <h2 className="text-xl font-semibold">7. International Transfers</h2>
          <p>Your information may be transferred to and maintained on servers located outside of your country or region. By using our Service, you consent to the transfer and processing of your data in jurisdictions that may not have the same data protection laws as your home country.</p>

          <h2 className="text-xl font-semibold">8. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated &quot;Last Updated&quot; date. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.</p>

          <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
          <p>Our Service is not intended for individuals under the age of 18, and we do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal data, we will take steps to delete such information from our records.</p>

          <h2 className="text-xl font-semibold">10. Contact Us</h2>
          <p>If you have any questions or concerns about this Privacy Policy, or if you wish to exercise your rights, please contact us at:</p>
          <p>
            MakeitAI  
            <br />
            plagiacheck@gmail.com
          </p>
        </section>
      </main>

    </div>
  );
}
````

## File: app/redirects/page.tsx
````typescript
'use client'
import { useEffect } from "react"

export default function Redirects(){

    useEffect(() => {
        async function callPayment(){
            const response = await fetch("/api/create-checkout-session-a", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    priceId: "price_1QqWVeAJsVayTGRctEvFA5UQ",
                    email: "leroyzzng@gmail.com"
                })
            });
        }
        callPayment()
    })

    return(
        <h2>testing</h2>
    )
}
````

## File: app/signin/page.tsx
````typescript
'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Nav } from "@/components/nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, AlertCircle, Loader2, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseClient } from '@supabase/auth-helpers-nextjs';

function AuthForm({
  email,
  password,
  setEmail,
  setPassword,
  error,
  setError,
  supabase,
  router,
}: {
  email: string;
  password: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  supabase: SupabaseClient;
  router: any;
}) {  
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 8 characters long.';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character.';
    }
    return null;
  };

  const handleSignIn = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
    } catch (error) {
      setError('Invalid login credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setSuccess('Registration successful! Please check your email to confirm your account.');
    } catch (error) {
      console.log(error)
      setError('Error during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Advanced plagiarism detection",
    "Instant results in seconds", 
    "Secure & private checking",
    "Academic integrity tools"
  ];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <CardHeader className="space-y-4 pb-6">
                <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  Welcome to Plagiacheck
                </CardTitle>
                <CardDescription className="text-center text-muted-foreground">
                  Ensure your content is 100% original with our AI-powered plagiarism checker
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={searchParams.get('tab') || 'signin'} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800">
                    <TabsTrigger value="signin" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-12 border-2 focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-12 border-2 focus:border-blue-500 transition-colors"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                          >
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-12 border-2 focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-12 border-2 focus:border-blue-500 transition-colors"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          <p>Password must contain:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>At least 8 characters</li>
                            <li>One uppercase letter</li>
                            <li>One special character</li>
                          </ul>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                          >
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                          </motion.div>
                        )}
                        {success && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right side - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Protect Your
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent"> Academic Integrity</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Join thousands of students and professionals who trust Plagiacheck to ensure their content is original and properly cited.
              </p>
            </div>

            <div className="grid gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{feature}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Trusted by 10M+ users</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Our advanced AI technology has helped millions of users maintain academic integrity and improve their writing quality.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <AuthForm
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        error={error}
        setError={setError}
        supabase={supabase}
        router={router}
      />
    </Suspense>
  );
}
````

## File: app/summarizer/page.tsx
````typescript
"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, FileText, Sparkles, Zap, Shield, Copy, Check, ListOrdered, AlignLeft } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function Summarizer() {
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [bulletPoints, setBulletPoints] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [summaryLength, setSummaryLength] = useState(50)
  const [outputType, setOutputType] = useState("paragraph")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleSummarize = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setSummary("")
    setBulletPoints([])
    setError(null)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        // Split text into sentences
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

        // Calculate how many sentences to keep based on length setting
        const keepRatio = summaryLength / 100
        const sentencesToKeep = Math.max(1, Math.ceil(sentences.length * keepRatio))

        // Score sentences by length and position (simple heuristic)
        const scoredSentences = sentences.map((sentence, index) => ({
          text: sentence.trim(),
          score: sentence.length + (index === 0 ? 50 : 0) + (index === sentences.length - 1 ? 30 : 0),
          index
        }))

        // Sort by score and take top sentences
        const topSentences = [...scoredSentences]
          .sort((a, b) => b.score - a.score)
          .slice(0, sentencesToKeep)
          .sort((a, b) => a.index - b.index)

        if (outputType === "paragraph") {
          setSummary(topSentences.map(s => s.text).join(" "))
        } else {
          setBulletPoints(topSentences.map(s => s.text))
        }

        decrementWords(requiredTokens)
        setIsProcessing(false)

        toast({
          title: "Summary Complete",
          description: "Your text has been successfully summarized.",
          variant: "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error summarizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to summarize"
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
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

      {/* Hero Section */}
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
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              AI Summarizer
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Condense long articles, documents, and text into concise summaries.
            Get the key points in seconds with our AI summarization tool.
          </p>

          {/* Quick Features */}
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Input Card */}
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

            {isProcessing && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Analyzing and summarizing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Results Card */}
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
                          {summaryWordCount} words ({Math.round((summaryWordCount / wordCount) * 100) || 0}% of original)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          className="h-8"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 mr-1 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
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

          {/* Settings Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Summary Settings
                    </h3>

                    <div className="space-y-6">
                      {/* Summary Length */}
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

                      {/* Output Type */}
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

                  {/* How It Works */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">How It Works</h3>

                    {[
                      { step: "1", title: "Paste Text", desc: "Add your long-form content" },
                      { step: "2", title: "Set Length", desc: "Choose summary length" },
                      { step: "3", title: "Get Summary", desc: "Receive concise key points" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </motion.div>
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

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/terms/page.tsx
````typescript
import React from 'react';

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Terms of Service</h1>
      <p className="text-lg mb-4">
        Welcome to Plagiacheck (“we,” “our,” or “us”). By using our website and services (the “Service”), you agree to these Terms of Service (&ldquo;Terms&ldquo;). Please read them carefully before accessing or using our Service.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
      <p className="text-lg mb-4">
        By accessing or using the Service, you agree to comply with and be bound by these Terms and our Privacy Policy, which is incorporated by reference. If you do not agree with these Terms, you must not use the Service.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">2. Eligibility</h2>
      <p className="text-lg mb-4">
        To use our Service, you must be at least 18 years old and have the legal capacity to form a binding contract. If you are using the Service on behalf of an organization or entity, you represent that you have the authority to bind that organization to these Terms.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">3. Account Registration and Security</h2>
      <p className="text-lg mb-4">
        To access certain features of the Service, you may be required to create an account. You agree to provide accurate, current, and complete information and to keep your account information updated. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">4. Use of the Service</h2>
      <p className="text-lg mb-4">
        You may use the Service solely for personal, non-commercial purposes in accordance with these Terms. You agree not to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Violate any applicable law or regulation.</li>
        <li>Use the Service for any unlawful or prohibited purpose.</li>
        <li>Interfere with or disrupt the functionality of the Service.</li>
        <li>Attempt to access any data or systems without authorization.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2">5. Subscription and Payment</h2>
      <p className="text-lg mb-4">
        Some features of the Service may require a subscription or one-time payment. By subscribing or purchasing access, you agree to pay the fees associated with your selected plan. All fees are non-refundable, except as otherwise provided in these Terms.
      </p>
      <p className="text-lg mb-4">
        You authorize us to charge your chosen payment method for recurring fees, as applicable. If you cancel your subscription, you will retain access to the Service until the end of the current billing period, but you will not be refunded.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">6. Plagiarism Checking Service</h2>
      <p className="text-lg mb-4">
        Our Service includes a plagiarism checking tool that allows users to analyze text for potential instances of plagiarism. You acknowledge that while we strive to provide accurate results, the tool’s accuracy may vary and is not guaranteed.
      </p>
      <p className="text-lg mb-4">
        You are solely responsible for ensuring that your use of the plagiarism checker complies with all applicable laws, including intellectual property laws.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">7. Intellectual Property</h2>
      <p className="text-lg mb-4">
        We retain all rights, title, and interest in and to the Service, including all associated intellectual property rights. Except for the limited right to use the Service as described in these Terms, you do not acquire any rights to the Service or its content.
      </p>
      <p className="text-lg mb-4">
        You grant us a non-exclusive, royalty-free license to use any content you upload to the Service solely for the purpose of providing the Service.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">8. User Content</h2>
      <p className="text-lg mb-4">
        You are responsible for all content that you upload, submit, or otherwise make available via the Service. You retain ownership of your content, but by using the Service, you grant us a license to store, process, and display your content as necessary to provide the Service.
      </p>
      <p className="text-lg mb-4">
        You represent and warrant that your content does not infringe on the rights of any third party and complies with all applicable laws.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">9. Termination</h2>
      <p className="text-lg mb-4">
        We may suspend or terminate your access to the Service at any time for any reason, including if you violate these Terms. Upon termination, all licenses granted to you under these Terms will immediately end, and you must cease all use of the Service.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">10. Disclaimers and Limitations of Liability</h2>
      <p className="text-lg mb-4">
        The Service is provided “as is” and “as available.” We do not warrant that the Service will be error-free, uninterrupted, or secure. To the maximum extent permitted by law, we disclaim all warranties, express or implied, regarding the Service.
      </p>
      <p className="text-lg mb-4">
        Our liability is limited to the maximum extent permitted by law. In no event shall we be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">11. Indemnification</h2>
      <p className="text-lg mb-4">
        You agree to indemnify and hold harmless Plagiacheck, its affiliates, employees, and agents from any claims, damages, or losses arising out of your use of the Service, including any violation of these Terms or infringement of third-party rights.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">12. Privacy Policy</h2>
      <p className="text-lg mb-4">
        Our Privacy Policy governs the collection and use of your personal information. By using the Service, you consent to the practices described in our Privacy Policy.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">13. Changes to These Terms</h2>
      <p className="text-lg mb-4">
        We reserve the right to modify these Terms at any time. Any changes will be posted on this page with an updated “Last Updated” date. Your continued use of the Service after any such changes constitutes your acceptance of the revised Terms.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">14. Governing Law</h2>
      <p className="text-lg mb-4">
        These Terms are governed by the laws of the State of Singapore, without regard to its conflict of law principles. Any disputes related to these Terms will be resolved in the competent courts of Singapore.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">15. Miscellaneous</h2>
      <p className="text-lg mb-4">
        <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Plagiacheck regarding the Service.
      </p>
      <p className="text-lg mb-4">
        <strong>Severability:</strong> If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.
      </p>
      <p className="text-lg mb-4">
        <strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be deemed a waiver of those rights.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2">16. Contact Us</h2>
      <p className="text-lg mb-4">
        If you have any questions or concerns regarding these Terms, please contact us at:
      </p>
      <p className="text-lg mb-4">
        MakeitAI<br />
        plagiacheck@gmail.com
      </p>
    </div>
  );
}
````

## File: app/word-counter/page.tsx
````typescript
"use client"

import { useState, useMemo } from "react"
import { Nav } from "@/components/nav"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Clock, Hash, AlignLeft, Type, BookOpen, Copy, Check, BarChart3 } from "lucide-react"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function WordCounter() {
  const [text, setText] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const stats = useMemo(() => {
    const trimmedText = text.trim()

    // Character counts
    const characters = text.length
    const charactersNoSpaces = text.replace(/\s/g, "").length

    // Word count
    const words = trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0

    // Sentence count (approximate)
    const sentences = trimmedText ? (trimmedText.match(/[.!?]+/g) || []).length || (trimmedText.length > 0 ? 1 : 0) : 0

    // Paragraph count
    const paragraphs = trimmedText ? trimmedText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0

    // Reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(words / 200)

    // Speaking time (average 150 words per minute)
    const speakingTimeMinutes = Math.ceil(words / 150)

    // Average word length
    const avgWordLength = words > 0 ? (charactersNoSpaces / words).toFixed(1) : "0"

    // Longest word
    const wordsArray = trimmedText.split(/\s+/).filter(Boolean)
    const longestWord = wordsArray.reduce((longest, word) => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, "")
      return cleanWord.length > longest.length ? cleanWord : longest
    }, "")

    // Unique words
    const uniqueWords = new Set(wordsArray.map(w => w.toLowerCase().replace(/[^a-zA-Z]/g, ""))).size

    // Line count
    const lines = text.split("\n").length

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      readingTimeMinutes,
      speakingTimeMinutes,
      avgWordLength,
      longestWord,
      uniqueWords,
      lines,
    }
  }, [text])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const mainStats = [
    { label: "Words", value: stats.words, icon: Type, color: "from-blue-500 to-blue-600" },
    { label: "Characters", value: stats.characters, icon: Hash, color: "from-purple-500 to-purple-600" },
    { label: "Sentences", value: stats.sentences, icon: AlignLeft, color: "from-green-500 to-green-600" },
    { label: "Paragraphs", value: stats.paragraphs, icon: FileText, color: "from-orange-500 to-orange-600" },
  ]

  const additionalStats = [
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
    { label: "Unique Words", value: stats.uniqueWords },
    { label: "Average Word Length", value: `${stats.avgWordLength} chars` },
    { label: "Lines", value: stats.lines },
    { label: "Longest Word", value: stats.longestWord || "-" },
  ]

  const timeStats = [
    { label: "Reading Time", value: `${stats.readingTimeMinutes} min`, icon: BookOpen, desc: "~200 words/min" },
    { label: "Speaking Time", value: `${stats.speakingTimeMinutes} min`, icon: Clock, desc: "~150 words/min" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Free Online Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              Word Counter
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Count words, characters, sentences, and more instantly.
            Perfect for essays, articles, and social media posts.
          </p>
        </motion.div>

        {/* Main Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {mainStats.map((stat, index) => (
            <Card key={index} className="p-6 border-0 shadow-lg bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="text-center">
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Text Area Card */}
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Text</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!text}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Start typing or paste your text here to see word count and other statistics..."
                  className="min-h-[350px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText("")}
                    disabled={!text}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.toLowerCase())}
                    disabled={!text}
                  >
                    lowercase
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.toUpperCase())}
                    disabled={!text}
                  >
                    UPPERCASE
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.split(' ').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' '))}
                    disabled={!text}
                  >
                    Title Case
                  </Button>
                </div>
              </div>
            </Card>

            {/* Time Estimates */}
            <div className="grid grid-cols-2 gap-4">
              {timeStats.map((stat, index) => (
                <Card key={index} className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Sidebar with Additional Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Detailed Statistics
                    </h3>

                    <div className="space-y-4">
                      {additionalStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                          <span className="font-semibold">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Character Limits */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Common Limits</h4>
                    <div className="space-y-3">
                      {[
                        { platform: "Twitter/X", limit: 280, unit: "chars" },
                        { platform: "Instagram Bio", limit: 150, unit: "chars" },
                        { platform: "LinkedIn Post", limit: 3000, unit: "chars" },
                        { platform: "SMS", limit: 160, unit: "chars" },
                        { platform: "Meta Description", limit: 160, unit: "chars" },
                      ].map((item, index) => {
                        const current = stats.characters
                        const percentage = Math.min(100, (current / item.limit) * 100)
                        const isOver = current > item.limit

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{item.platform}</span>
                              <span className={isOver ? "text-red-500 font-medium" : ""}>
                                {current}/{item.limit}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isOver
                                  ? "bg-red-500"
                                  : percentage > 80
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Free Tool</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        This word counter is completely free and doesn&apos;t use any of your word credits!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
````

## File: app/globals.css
````css
@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  :root {
    --background: 0 0% 95%;
    --foreground: 240 10% 3.9%;
 
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
 
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
 
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
 
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
 
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
 
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 3.9%;
 
    --radius: 0.5rem;
 
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }
 
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
 
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
 
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
 
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
 
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
 
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
 
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
 
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
 
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground transition-colors duration-300;
  }
}

/* Ensure smooth transition when changing themes */
* {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Override default focus styles for better visibility in both themes */
:focus {
  @apply outline-none ring-2 ring-primary ring-opacity-50;
}

/* Custom scrollbar styles for better theme integration */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  @apply bg-secondary;
}

::-webkit-scrollbar-thumb {
  @apply bg-primary rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-primary/80;
}
````

## File: app/layout.tsx
````typescript
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { Footer } from "@/components/footer"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plagiacheck",
  description: "Write confidently with Plagiacheck's AI-powered writing assistant",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml",
      },
    ],
    shortcut: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
    apple: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2393c5fd' stroke='%2360a5fa' stroke-width='2'/%3E%3Ctext x='16' y='22' font-family='Arial, sans-serif' font-size='18' font-weight='bold' text-anchor='middle' fill='%231e293b'%3EP%3C/text%3E%3C/svg%3E",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex-grow container mx-auto px-4">{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
````

## File: app/page.tsx
````typescript
"use client"
import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, Sparkles, Shield, Zap, FileText, Copy, File, Brain, Wand2, RefreshCw, CheckCircle2, Hash, ArrowRight, LayoutGrid } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { Hero } from "@/components/Hero"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"

interface PlagiarismMatch {
  text: string;
  similarity: number;
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number;
  matches: PlagiarismMatch[];
}

type PlagiarismResult = PlagiarismMatchResult | null

export default function Home() {
  const [text, setText] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<PlagiarismResult>(null)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const plagiarismCheckerRef = useRef<HTMLElement>(null)

  const scrollToChecker = () => {
    plagiarismCheckerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const tools = [
    { name: "Plagiarism Checker", href: "/", icon: Shield, color: "text-blue-500" },
    { name: "AI Detector", href: "/ai-detector", icon: Brain, color: "text-purple-500" },
    { name: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500" },
    { name: "Paraphraser", href: "/paraphraser", icon: RefreshCw, color: "text-cyan-500" },
    { name: "Summarizer", href: "/summarizer", icon: FileText, color: "text-green-500" },
    { name: "Grammar Checker", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500" },
    { name: "Word Counter", href: "/word-counter", icon: Hash, color: "text-orange-500", isFree: true },
  ]

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handlePlagiarismCheck = async () => {
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

    setIsChecking(true)
    setProgress(0)
    setResult(null)
    setError(null)

    try {
      // Simulate API call with progress
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + Math.random() * 15
        })
      }, 500)

      // Simulate actual API call
      setTimeout(async () => {
        clearInterval(timer)
        setProgress(100)
        
        // Mock result for demo
        setResult({
          matches: [
            { text: "Sample match 1", similarity: 85.5 },
            { text: "Sample match 2", similarity: 72.3 }
          ],
          plagiarismPercentage: Math.floor(Math.random() * 20)
        })
        
        await decrementWords(requiredTokens)
        setIsChecking(false)
      }, 3000)

    } catch (err) {
      setError("Failed to check plagiarism. Please try again.")
      setIsChecking(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setText(content)
      }
      reader.readAsText(file)
    }
  }

  const quickFeatures = [
    { icon: Shield, text: "99.9% Accurate", color: "text-blue-600" },
    { icon: Zap, text: "Results in 30s", color: "text-green-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Main Plagiarism Checker Tool - Now First */}
      <section ref={plagiarismCheckerRef} className="py-12 md:py-16 scroll-mt-16">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center space-y-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Trusted by 10M+ users worldwide
            </div>
          
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Plagiarism Checker
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Ensure academic integrity with our AI-powered plagiarism detection. 
              Get instant results and maintain originality in your work.
            </p>

            {/* Quick Features */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-4">
              {quickFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main Content - Restored Old Design with Improvements */}
          <div className="grid lg:grid-cols-[2fr,1fr] gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 md:p-8 shadow-xl border-0 ">
                <div className="space-y-6">
                  {/* Enhanced Textarea with Better Mobile Support */}
                  <div className="relative">
                    <Textarea
                      placeholder="Paste your text here to check for plagiarism..."
                      className="min-h-[250px] md:min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-sm md:text-base leading-relaxed rounded-xl transition-all duration-200"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    
                    {/* Enhanced File Upload Section */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {text && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(text)}
                          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Copy text"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept=".txt,.doc,.docx,.pdf"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Upload file"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Character Count */}
                    <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded backdrop-blur-sm">
                      {text.length.toLocaleString()} characters
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Enhanced Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-1 h-12 md:h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={handlePlagiarismCheck}
                      disabled={isChecking || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                    >
                      {isChecking ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Checking... {Math.round(progress)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          <span>Check for Plagiarism</span>
                        </div>
                      )}
                    </Button>

                    {/* File Upload Button for Mobile */}
                    <div className="relative sm:hidden">
                      <input
                        type="file"
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <File className="h-5 w-5 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </div>

                  {/* Quick Action Links - All Tools */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {tools.map((tool) => (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                      >
                        <tool.icon className={`h-3.5 w-3.5 ${tool.color}`} />
                        <span className="text-gray-700 dark:text-gray-300">{tool.name}</span>
                        {tool.isFree && (
                          <span className="ml-0.5 text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full font-semibold">
                            FREE
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Results Section */}
                  {(isChecking || result) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <PlagiarismResults isChecking={isChecking} progress={progress} result={result} />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Enhanced Sidebar */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Stats Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg">
                <CardContent className="p-0">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Why Choose Plagiacheck?</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Shield, label: "Security", value: "100%", desc: "Your data is secure" },
                      { icon: Zap, label: "Speed", value: "<3s", desc: "Lightning fast results" },
                      { icon: FileText, label: "Sources", value: "50B+", desc: "Comprehensive database" },
                      { icon: Sparkles, label: "Accuracy", value: "99%", desc: "Precise detection" }
                    ].map((stat, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                          <stat.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{stat.value}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{stat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-lg">
                <CardContent className="p-0">
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Pro Tips</h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Upload documents directly for faster checking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Check your work before submission</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Review highlighted matches carefully</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* CTA Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 shadow-lg">
                <CardContent className="p-0 text-center">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Need More Checks?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upgrade to premium for unlimited plagiarism checks</p>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl" asChild>
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hero Section - Now Second */}
      <Hero onTryFreeClick={scrollToChecker} />

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* Tools Showcase Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              All the Tools You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From plagiarism checking to grammar correction, we have everything to perfect your writing
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link
                  href={tool.href}
                  className="group relative flex flex-col items-center p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-300"
                >
                  <div className="relative mb-3">
                    <tool.icon className={`h-7 w-7 md:h-8 md:w-8 ${tool.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                  <h3 className="font-medium text-sm md:text-base text-center text-gray-900 dark:text-gray-100">{tool.name}</h3>
                  {tool.isFree && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                      FREE
                    </span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <LayoutGrid className="h-4 w-4" />
              View All Tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />
    </div>
  )
}
````

## File: components/Billing/Badge.tsx
````typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
````

## File: components/PricingPage/CustomPlanSlider.tsx
````typescript
"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import type { User } from "@supabase/auth-helpers-nextjs"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CustomPlanSliderProps {
  user: User | null
}

export const CustomPlanSlider: React.FC<CustomPlanSliderProps> = ({ user }) => {
  const [wordCount, setWordCount] = useState(250)
  const [isLoading, setIsLoading] = useState(false)

  const calculatePrice = (words: number) => {
    return Math.round(((words - 250) / (10000 - 250)) * (100 - 5) + 5)
  }

  const price = calculatePrice(wordCount)

  const handleSliderChange = (value: number[]) => {
    setWordCount(value[0])
  }

  const handleCustomPurchase = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        window.location.href = "/signin?tab=register"
        return
      }

      // Create Checkout Session
      const response = await fetch("/api/create-custom-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wordCount, price }),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error("Error creating checkout session:", error)
        return
      }

      // Redirect to Checkout
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error during checkout:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center w-full">
      <motion.div
        className="mt-16 p-8 w-full max-w-[65%] rounded-lg bg-transparent backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-6 text-foreground">Customize Your Plan</h2>
        <div className="mb-6">
          <Slider min={250} max={10000} step={50} value={[wordCount]} onValueChange={handleSliderChange} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-lg font-semibold text-foreground">{wordCount} words</p>
            <p className="text-sm text-muted-foreground">Drag the slider to adjust</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">${price}</p>
            <p className="text-sm text-muted-foreground">One-time purchase</p>
          </div>
        </div>
        <Button 
          className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
          onClick={handleCustomPurchase}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Buy Now"}
        </Button>
      </motion.div>
    </div>
  )
}
````

## File: components/PricingPage/TrustSection.tsx
````typescript
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Award, Clock, CheckCircle, Star, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

export function TrustSection() {
  const stats = [
    {
      icon: Users,
      number: "10M+",
      label: "Documents Checked"
    },
    {
      icon: Shield,
      number: "99.9%",
      label: "Accuracy Rate"
    },
    {
      icon: Clock,
      number: "< 30s",
      label: "Average Check Time"
    },
    {
      icon: Award,
      number: "500+",
      label: "Universities Trust Us"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Graduate Student",
      content: "This plagiarism checker saved my thesis. The accuracy is incredible.",
      rating: 5
    },
    {
      name: "Dr. Rodriguez",
      role: "Professor",
      content: "I recommend this to all my students. Great detailed reports.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Content Writer",
      content: "As a freelancer, this tool gives me confidence in every submission.",
      rating: 5
    }
  ]

  const features = [
    {
      icon: CheckCircle,
      title: "Real-time Scanning",
      description: "Check against billions of sources instantly"
    },
    {
      icon: Shield,
      title: "Privacy Protected",
      description: "Your documents are secure and never stored"
    },
    {
      icon: Award,
      title: "Citation Assistant",
      description: "Get proper citation suggestions"
    }
  ]

  return (
    <div className="py-20">
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
            Trusted Worldwide
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join millions who trust our advanced plagiarism detection technology
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="text-center p-6 h-full border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="mb-4 flex justify-center">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-2">{stat.number}</div>
                    <div className="font-medium text-muted-foreground text-sm">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Features */}
        <motion.div 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={index}
                  className="text-center group"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl group-hover:shadow-lg transition-shadow duration-300">
                      <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{feature.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-center mb-12">What Users Say</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-6 h-full border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <blockquote className="text-muted-foreground mb-4 italic leading-relaxed">
                      &ldquo{testimonial.content}&ldquo
                    </blockquote>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
            <CardContent className="relative p-12">
              <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                Join millions of users who trust our plagiarism detection technology
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Instant results</span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Secure & private</span>
                </div>
              </div>
              <Button 
                asChild
                className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 h-auto text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/pricing" className="inline-flex items-center gap-2">
                  Start Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
````

## File: components/Profile/Avatar.tsx
````typescript
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
````

## File: components/Profile/ProfileDropdown.tsx
````typescript
"use client"

import { User, LogOut, CreditCard, Crown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User as SupabaseUser } from "@supabase/auth-helpers-nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileDropdownProps {
  user: SupabaseUser
  onLogout: () => Promise<void>
}

export function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  // Get user initials for avatar fallback
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  // Get display name (first part of email before @)
  const getDisplayName = (email: string) => {
    return email.split('@')[0]
  }

  const handleSignOut = async () => {
    try {
      await onLogout()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 border-gray-200 dark:border-gray-700 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl [&>*]:outline-none [&>*]:ring-0 [&>*]:border-0" 
        align="end" 
        forceMount
        style={{ outline: 'none', border: 'none' }}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                  {getInitials(user.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1 leading-none">
                <p className="text-sm font-medium text-foreground">
                  {getDisplayName(user.email || 'User')}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-2 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-md">
              <Crown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Free Plan
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors focus:bg-blue-50/50 dark:focus:bg-blue-950/20 focus:outline-none border-0 outline-none ring-0" 
          asChild
          style={{ outline: 'none', border: 'none' }}
        >
          <Link href="/billing" className="flex items-center w-full outline-none ring-0" style={{ outline: 'none' }}>
            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div 
          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-50/50 dark:hover:bg-red-950/10 text-red-600 dark:text-red-400 focus:bg-red-50/50 dark:focus:bg-red-950/10"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log("Sign out clicked!")
            handleSignOut()
          }}
          style={{ outline: 'none', border: 'none' }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
````

## File: components/ui/accordion.tsx
````typescript
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
````

## File: components/ui/avatar.tsx
````typescript
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
````

## File: components/ui/button.tsx
````typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
````

## File: components/ui/card.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
````

## File: components/ui/dropdown-menu.tsx
````typescript
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
````

## File: components/ui/input.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
````

## File: components/ui/label.tsx
````typescript
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
````

## File: components/ui/progress.tsx
````typescript
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
````

## File: components/ui/select.tsx
````typescript
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
````

## File: components/ui/skeleton.tsx
````typescript
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
````

## File: components/ui/slider.tsx
````typescript
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
````

## File: components/ui/tabs.tsx
````typescript
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
````

## File: components/ui/textarea.tsx
````typescript
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
````

## File: components/ui/toast.tsx
````typescript
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success:
          "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
````

## File: components/ui/toaster.tsx
````typescript
"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
````

## File: components/FAQ.tsx
````typescript
import type React from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is plagiarism?",
    answer:
      "Plagiarism is the act of using someone else's words, ideas, or work without proper attribution or permission, presenting it as your own original work.",
  },
  {
    question: "How does the plagiarism checker work?",
    answer:
      "Our plagiarism checker uses advanced algorithms to compare your text against billions of web pages, academic papers, and other sources to identify potential instances of plagiarism.",
  },
  {
    question: "Is my content safe and confidential when I use the plagiarism checker?",
    answer:
      "Yes, we take your privacy seriously. Your content is encrypted and not stored after the check is complete. We do not share or publish your work.",
  },
  {
    question: "How accurate is the plagiarism detection?",
    answer:
      "Our plagiarism checker is highly accurate, but it's important to review the results carefully. Some matches may be coincidental or common phrases.",
  },
  {
    question: "Can I check multiple documents at once?",
    answer:
      "Currently, our system checks one document at a time for the most accurate results. However, you can run multiple checks in succession.",
  },
  {
    question: "What file formats are supported for upload?",
    answer:
      "We support various file formats including .txt, .doc, .docx, .pdf, and more. You can also paste text directly into the checker.",
  },
  {
    question: "How long does it take to check a document?",
    answer:
      "The time varies depending on the length of your document and current system load, but most checks are completed within a few minutes.",
  },
  {
    question: "Can I use this for academic papers?",
    answer:
      "Yes, our plagiarism checker is suitable for academic use. However, always follow your institution's guidelines for academic integrity.",
  },
  {
    question: "What should I do if plagiarism is detected in my work?",
    answer:
      "If plagiarism is detected, review the highlighted sections, add proper citations, or rephrase the content to make it original. Always ensure you're not unintentionally copying others' work.",
  },
  {
    question: "Is there a limit to how many checks I can perform?",
    answer:
      "The number of checks you can perform depends on your subscription plan. Free users have a limited number of checks, while premium users enjoy unlimited checks.",
  },
]

export const FAQ: React.FC = () => {
  const { theme } = useTheme()

  return (
    <section className={`${theme === "light" ? "text-gray-800" : "text-white"} py-16 backdrop-blur-sm`}>
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-3xl font-bold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Frequently Asked Questions
        </motion.h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AccordionItem value={`item-${index}`}>
                <AccordionTrigger className="hover:text-blue-400">{faq.question}</AccordionTrigger>
                <AccordionContent className="">{faq.answer}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
````

## File: components/FeatureShowcase.tsx
````typescript
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Zap, Award } from 'lucide-react';

const features = [
  {
    icon: <Shield className="w-12 h-12 text-blue-500" />,
    title: 'Comprehensive Protection',
    description: 'Our advanced algorithms scan your text against billions of web pages and academic papers.'
  },
  {
    icon: <Search className="w-12 h-12 text-green-500" />,
    title: 'In-Depth Analysis',
    description: 'Get detailed reports on potential plagiarism, including source links and similarity percentages.'
  },
  {
    icon: <Zap className="w-12 h-12 text-yellow-500" />,
    title: 'Lightning Fast',
    description: 'Receive results in seconds, allowing you to quickly refine your work.'
  },
  {
    icon: <Award className="w-12 h-12 text-purple-500" />,
    title: 'Academic Standard',
    description: 'Trusted by students and professionals worldwide for maintaining academic integrity.'
  }
];

export const FeatureShowcase: React.FC = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Plagiacheck?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/5 dark:bg-gray-800/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex flex-col items-center text-center">
                {feature.icon}
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
````

## File: components/footer.tsx
````typescript
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-20">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} MakeItAI. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
````

## File: components/Hero.tsx
````typescript
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface HeroProps {
  onTryFreeClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onTryFreeClick }) => {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <motion.div
            className="w-full lg:w-1/2 text-center lg:text-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 leading-tight">
              Ensure Your Work is{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                100% Original
              </span>
            </h1>
            <p className="text-lg md:text-xl mb-6 md:mb-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0">
              Our AI-powered plagiarism checker helps you maintain academic integrity and improve your writing with instant, accurate results.
            </p>
            
            {/* Feature List */}
            <div className="space-y-3 md:space-y-4 mb-8">
              {[
                'Check against billions of sources', 
                'Get instant results', 
                'Improve your writing quality'
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center lg:justify-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <CheckCircle className="mr-3 h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200 text-sm md:text-base">{item}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button
                onClick={onTryFreeClick}
                className="px-6 md:px-8 py-3 md:py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base"
              >
                Try Free Now
              </button>
              <Link
                href="/pricing"
                className="px-6 md:px-8 py-3 md:py-4 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors duration-200 text-sm md:text-base text-center"
              >
                View Pricing
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="w-full lg:w-1/2 mt-8 lg:mt-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              <img
                src="/herobg.jpg"
                alt="Plagiarism Checker Illustration"
                className="w-full h-auto rounded-lg md:rounded-xl shadow-2xl max-w-lg mx-auto lg:max-w-none"
              />

              <motion.div 
                className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 md:p-4 border"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs md:text-sm font-medium">Instant Results</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
````

## File: components/nav.tsx
````typescript
"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
import {
  Menu,
  X,
  ChevronDown,
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  LayoutGrid,
  CreditCard,
  Coins,
} from "lucide-react"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle } from "./theme-toggle"
import { ProfileDropdown } from "@/components/Profile/ProfileDropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function Nav() {
  const { remainingWords, fetchRemainingWords } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const tools = [
    {
      name: "Plagiarism Checker",
      href: "/",
      icon: Shield,
      desc: "Check for plagiarism",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "AI Detector",
      href: "/ai-detector",
      icon: Brain,
      desc: "Detect AI-written text",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "AI Humanizer",
      href: "/ai-humanizer",
      icon: Wand2,
      desc: "Make AI text human",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      name: "Paraphraser",
      href: "/paraphraser",
      icon: RefreshCw,
      desc: "Rewrite your text",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      name: "Summarizer",
      href: "/summarizer",
      icon: FileText,
      desc: "Condense long text",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "Grammar Checker",
      href: "/grammar-checker",
      icon: CheckCircle2,
      desc: "Fix grammar errors",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Word Counter",
      href: "/word-counter",
      icon: Hash,
      desc: "Count words & chars",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      isFree: true,
    },
  ]

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        await fetchRemainingWords(session.user.id)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchRemainingWords(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth, fetchRemainingWords])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
          <div className="h-8 w-8 rounded-full text-blue-400 scale-[170%] items-center justify-center flex">
            <PiLetterCircleP />
          </div>
          <span className="font-bold text-lg">plagiacheck</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 text-sm font-medium gap-1.5 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                <LayoutGrid className="h-4 w-4" />
                Tools
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2">
              <div className="grid gap-1">
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.name} asChild className="p-0">
                    <Link
                      href={tool.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-accent transition-colors w-full"
                    >
                      <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                        <tool.icon className={`h-4 w-4 ${tool.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{tool.name}</span>
                          {tool.isFree && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                              FREE
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{tool.desc}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem asChild className="p-0">
                <Link
                  href="/history"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-accent transition-colors w-full"
                >
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <LayoutGrid className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">All Tools</span>
                    <p className="text-xs text-muted-foreground">View all tools</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/pricing"
            className="h-9 px-3 inline-flex items-center justify-center text-sm font-medium transition-colors hover:text-primary hover:bg-accent rounded-md gap-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
          >
            <CreditCard className="h-4 w-4" />
            Pricing
          </Link>

          <ThemeToggle />
        </div>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50">
            <Coins className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold">{user ? remainingWords.toLocaleString() : "1,000"}</span>
            <span className="text-xs text-muted-foreground">words</span>
          </div>

          {user ? (
            <ProfileDropdown user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-9 focus-visible:ring-0 focus-visible:ring-offset-0" asChild>
                <Link href="/signin">Log in</Link>
              </Button>
              <Button size="sm" className="h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus-visible:ring-0 focus-visible:ring-offset-0" asChild>
                <Link href="/pricing">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Words counter for mobile */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50">
            <Coins className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold">{user ? remainingWords.toLocaleString() : "1,000"}</span>
          </div>

          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md hover:bg-accent transition-colors focus-visible:ring-0 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={closeMobileMenu} />
          <div className="fixed top-14 left-0 right-0 bg-background border-b shadow-lg z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="p-4">
              {/* Tools Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {tools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl ${tool.bgColor} hover:opacity-80 transition-opacity`}
                    onClick={closeMobileMenu}
                  >
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                    <span className="text-xs font-medium text-center">{tool.name}</span>
                    {tool.isFree && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                        FREE
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Other Links */}
              <div className="space-y-1 mb-4">
                <Link
                  href="/history"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">All Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Pricing</span>
                </Link>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-3 px-3 mb-4 bg-accent/50 rounded-lg">
                <span className="text-sm font-medium">Theme</span>
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
              <div className="space-y-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground px-3 py-2 bg-accent/30 rounded-lg">
                      {user.email}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/signin">Log in</Link>
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/pricing">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
````

## File: components/PageSkeleton.tsx
````typescript
"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function PageSkeleton() {
  return (
    <div className="container py-16">
      {/* Hero Section Skeleton */}
      <div className="text-center space-y-6 mb-16">
        <Skeleton className="h-8 w-64 mx-auto rounded-full" />
        <Skeleton className="h-16 w-96 mx-auto" />
        <Skeleton className="h-6 w-[500px] mx-auto" />
        <div className="flex justify-center gap-6 pt-4">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
        <div className="space-y-6">
          <Card className="p-8">
            <div className="space-y-6">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </Card>
        </div>
        <Card className="p-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function TextAreaSkeleton() {
  return (
    <Card className="p-8">
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </Card>
  )
}

export function ResultsSkeleton() {
  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto rounded-full" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </Card>
  )
}
````

## File: components/plagiarism-results.tsx
````typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import React from "react";

interface PlagiarismMatch {
  text: string;
  startIndex?: number;
  endIndex?: number;
  similarity: number;
  reason?: string;
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number;
  matches: PlagiarismMatch[];
}

interface PlagiarismResultsProps {
  isChecking: boolean;
  progress: number;
  result?: PlagiarismMatchResult | null;
  originalText?: string;
}

export function PlagiarismResults({ isChecking, progress, result, originalText }: PlagiarismResultsProps) {
  if (!isChecking && !result) return null;

  // Helper function to safely format numbers
  const formatNumber = (num: number | undefined | null): string => {
    return typeof num === 'number' ? num.toFixed(1) : '0.0';
  };

  // Helper function to get color based on percentage
  const getScoreColor = (percentage: number | undefined | null): string => {
    const score = typeof percentage === 'number' ? percentage : 0;
    if (score > 50) return "text-red-500";
    if (score > 20) return "text-orange-500";
    return "text-green-500";
  };

  // Function to highlight plagiarized text
  const highlightPlagiarizedText = (text: string, matches: PlagiarismMatch[]): React.ReactNode => {
    if (!text || !matches || matches.length === 0) {
      return <p className="text-sm leading-relaxed">{text}</p>;
    }

    // Sort matches by start index to process them in order
    const sortedMatches = [...matches]
      .filter(match => match.startIndex !== undefined && match.endIndex !== undefined)
      .sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

    if (sortedMatches.length === 0) {
      return <p className="text-sm leading-relaxed">{text}</p>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMatches.forEach((match, index) => {
      const startIndex = match.startIndex || 0;
      const endIndex = match.endIndex || 0;

      // Add text before the match
      if (startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, startIndex)}
          </span>
        );
      }

      // Add highlighted match
      elements.push(
        <span
          key={`highlight-${index}`}
          className="bg-red-200 text-red-800 px-1 py-0.5 rounded relative group cursor-help"
          title={match.reason || `${formatNumber(match.similarity)}% similarity`}
        >
          {text.substring(startIndex, endIndex)}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            {match.reason || `${formatNumber(match.similarity)}% similarity`}
          </span>
        </span>
      );

      lastIndex = endIndex;
    });

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <div className="text-sm leading-relaxed">{elements}</div>;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {isChecking ? "Checking for plagiarism..." : "Plagiarism Check Results"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isChecking ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {formatNumber(progress)}% complete
            </p>
          </div>
        ) : 
          result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Plagiarism Score:</span>
                <span
                  className={`text-lg font-bold ${getScoreColor(result.plagiarismPercentage)}`}
                >
                  {formatNumber(result.plagiarismPercentage)}%
                </span>
              </div>

              {/* Highlighted Text Section */}
              {originalText && (
                <div className="space-y-2">
                  <h4 className="font-medium">Analyzed Text:</h4>
                  <div className="p-4 border rounded-lg max-h-60 overflow-y-auto">
                    {highlightPlagiarizedText(originalText, result.matches)}
                  </div>
                  {result.matches.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Hover over highlighted text to see similarity details
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        
      </CardContent>
    </Card>
  );
}
````

## File: components/theme-provider.tsx
````typescript
"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
````

## File: components/theme-toggle.tsx
````typescript
"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
````

## File: hooks/use-toast.ts
````typescript
"use client"

import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
````

## File: lib/pdf-generator.ts
````typescript
// PDF Report Generator Utility
// Uses browser's built-in print functionality to generate PDFs

interface PlagiarismReportData {
  text: string
  plagiarismPercentage: number
  matches: { text: string; similarity: number }[]
  date: Date
}

interface AIDetectorReportData {
  text: string
  aiScore: number
  humanLikelihood: string
  analysis: string
  date: Date
}

interface GrammarReportData {
  originalText: string
  correctedText: string
  issues: { type: string; text: string; replacement: string; message: string }[]
  date: Date
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getBaseStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        padding: 40px;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 28px;
        font-weight: bold;
        color: #3b82f6;
      }
      .report-title {
        font-size: 24px;
        margin-top: 10px;
        color: #374151;
      }
      .date {
        color: #6b7280;
        font-size: 14px;
        margin-top: 5px;
      }
      .section {
        margin-bottom: 30px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      .score-box {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 25px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 20px;
      }
      .score-value {
        font-size: 48px;
        font-weight: bold;
      }
      .score-label {
        font-size: 16px;
        opacity: 0.9;
      }
      .score-green {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      .score-yellow {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }
      .score-red {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      .text-box {
        background: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 14px;
        max-height: 300px;
        overflow: hidden;
      }
      .match-item {
        padding: 15px;
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        margin-bottom: 10px;
        border-radius: 0 8px 8px 0;
      }
      .match-text {
        font-style: italic;
        color: #92400e;
      }
      .match-similarity {
        font-weight: 600;
        color: #b45309;
        margin-top: 5px;
      }
      .issue-item {
        padding: 12px 15px;
        margin-bottom: 10px;
        border-radius: 8px;
      }
      .issue-error {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
      }
      .issue-warning {
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
      }
      .issue-suggestion {
        background: #eff6ff;
        border-left: 4px solid #3b82f6;
      }
      .issue-message {
        font-size: 14px;
        color: #374151;
      }
      .issue-fix {
        margin-top: 8px;
        font-size: 13px;
      }
      .strike {
        text-decoration: line-through;
        color: #ef4444;
      }
      .replacement {
        color: #10b981;
        font-weight: 500;
      }
      .analysis-box {
        background: #f0fdf4;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #bbf7d0;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 12px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }
      .stat-item {
        text-align: center;
        padding: 15px;
        background: #f9fafb;
        border-radius: 8px;
      }
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #1f2937;
      }
      .stat-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
      }
      @media print {
        body {
          padding: 20px;
        }
        .text-box {
          max-height: none;
        }
      }
    </style>
  `
}

export function generatePlagiarismReport(data: PlagiarismReportData): void {
  const scoreClass = data.plagiarismPercentage < 20 ? "score-green" : data.plagiarismPercentage < 50 ? "score-yellow" : "score-red"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Plagiarism Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">Plagiarism Detection Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${scoreClass}">
          <div class="score-value">${data.plagiarismPercentage}%</div>
          <div class="score-label">Plagiarism Detected</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.text.split(/\s+/).filter(Boolean).length}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.text.length}</div>
            <div class="stat-label">Characters</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.matches.length}</div>
            <div class="stat-label">Matches Found</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analyzed Text</div>
        <div class="text-box">${data.text.substring(0, 1000)}${data.text.length > 1000 ? "..." : ""}</div>
      </div>

      ${data.matches.length > 0 ? `
      <div class="section">
        <div class="section-title">Potential Matches (${data.matches.length})</div>
        ${data.matches.map((match, i) => `
          <div class="match-item">
            <div class="match-text">"${match.text}"</div>
            <div class="match-similarity">${match.similarity}% similarity</div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Plagiarism Detection</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "Plagiarism_Report")
}

export function generateAIDetectorReport(data: AIDetectorReportData): void {
  const scoreClass = data.aiScore < 30 ? "score-green" : data.aiScore < 70 ? "score-yellow" : "score-red"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Detection Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">AI Content Detection Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${scoreClass}">
          <div class="score-value">${data.aiScore}%</div>
          <div class="score-label">AI Probability</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.text.split(/\s+/).filter(Boolean).length}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.text.length}</div>
            <div class="stat-label">Characters</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.humanLikelihood}</div>
            <div class="stat-label">Verdict</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analysis Summary</div>
        <div class="analysis-box">
          <p>${data.analysis}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analyzed Text</div>
        <div class="text-box">${data.text.substring(0, 1000)}${data.text.length > 1000 ? "..." : ""}</div>
      </div>

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Content Detection</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "AI_Detection_Report")
}

export function generateGrammarReport(data: GrammarReportData): void {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Grammar Check Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">Grammar Check Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${data.issues.length === 0 ? "score-green" : data.issues.length < 5 ? "score-yellow" : "score-red"}">
          <div class="score-value">${data.issues.length}</div>
          <div class="score-label">Issues Found</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "error").length}</div>
            <div class="stat-label">Errors</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "warning").length}</div>
            <div class="stat-label">Warnings</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "suggestion").length}</div>
            <div class="stat-label">Suggestions</div>
          </div>
        </div>
      </div>

      ${data.issues.length > 0 ? `
      <div class="section">
        <div class="section-title">Issues Found</div>
        ${data.issues.map((issue, i) => `
          <div class="issue-item issue-${issue.type}">
            <div class="issue-message">${issue.message}</div>
            <div class="issue-fix">
              <span class="strike">${issue.text}</span>
              <span> → </span>
              <span class="replacement">${issue.replacement}</span>
            </div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      <div class="section">
        <div class="section-title">Original Text</div>
        <div class="text-box">${data.originalText.substring(0, 800)}${data.originalText.length > 800 ? "..." : ""}</div>
      </div>

      <div class="section">
        <div class="section-title">Corrected Text</div>
        <div class="text-box" style="background: #f0fdf4; border-color: #bbf7d0;">${data.correctedText.substring(0, 800)}${data.correctedText.length > 800 ? "..." : ""}</div>
      </div>

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Grammar Checker</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "Grammar_Report")
}

function openPrintWindow(html: string, filename: string): void {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}
````

## File: lib/store.ts
````typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface TokenStore {
  remainingWords: number
  fetchRemainingWords: (userId: string) => Promise<void>
  decrementWords: (amount: number) => Promise<void>
}

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      remainingWords: 0, // Initially set to 0, will be fetched from Supabase

      fetchRemainingWords: async (userId) => {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from("user_profiles")
          .select("tokens")
          .eq("id", userId)
          .single()

        if (error) {
          console.error("Error fetching tokens:", error.message)
          return
        }

        set({ remainingWords: data.tokens })
      },

      decrementWords: async (amount) => {
        set((state) => ({ remainingWords: Math.max(0, state.remainingWords - amount) }))

        const supabase = createClientComponentClient()
        const user = await supabase.auth.getUser()

        if (!user?.data?.user?.id) return

        const currentState = useTokenStore.getState()

        const { error } = await supabase
          .from("user_profiles")
          .update({ tokens: Math.max(0, currentState.remainingWords - amount) })
          .eq("id", user.data.user.id)

        if (error) {
          console.error("Error updating tokens:", error.message)
        }
      },
    }),
    {
      name: "token-storage",
    }
  )
)
````

## File: lib/stripe.js
````javascript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use latest API version
});
````

## File: lib/utils.ts
````typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
````

## File: test/ideas
````
Privacy Policy

Introduction

At Plagiacheck, we respect your privacy and are committed to safeguarding the personal information you share with us. This Privacy Policy explains how we collect, use, and protect your personal data when you use our services.

By accessing or using our website and services ("Service"), you agree to this Privacy Policy. If you do not agree with the terms outlined, please refrain from using our Service.

1. Information We Collect

We collect the following types of information:

Personal Information: This includes information you provide when you create an account, contact customer support, or interact with our Service. It may include your name, email address, billing information, and other relevant details.
Usage Data: We collect data on how you access and use our Service, such as your IP address, browser type, device information, and pages visited.
Cookies: We use cookies and similar tracking technologies to enhance your user experience and analyze how you use our Service. You can manage cookie settings through your browser.
2. How We Use Your Information

We use the information we collect to:

Provide and improve our Service.
Personalize your experience and recommend features you may find useful.
Communicate with you, including sending service-related updates or promotional materials (with your consent).
Prevent fraud and ensure the security of our Service.
Comply with legal obligations.
3. Sharing Your Information

We do not sell, rent, or share your personal information with third parties except for the following:

Service Providers: We may share your information with trusted third-party vendors who assist us in operating our Service, conducting business activities, or serving you.
Legal Compliance: We may disclose your information if required by law, regulation, or legal process, or if we believe that such disclosure is necessary to protect the rights, property, or safety of Plagiacheck, our users, or the public.
4. Data Retention

We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, or as required by law. If you close your account, we may retain certain information as required by law or for legitimate business purposes.

5. Your Rights

You have the following rights with respect to your personal data:

Access: You can request access to the personal data we hold about you.
Correction: You can update or correct your information if it is inaccurate or incomplete.
Deletion: You can request the deletion of your personal data, subject to certain conditions.
Opt-out of Marketing: You can unsubscribe from marketing communications at any time by following the opt-out instructions in the emails or contacting us directly.
To exercise these rights, please contact us using the information provided in the "Contact Us" section.

6. Security

We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no data transmission method or storage system is completely secure, and we cannot guarantee the absolute security of your information.

7. International Transfers

Your information may be transferred to and maintained on servers located outside of your country or region. By using our Service, you consent to the transfer and processing of your data in jurisdictions that may not have the same data protection laws as your home country.

8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.

9. Children's Privacy

Our Service is not intended for individuals under the age of 18, and we do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal data, we will take steps to delete such information from our records.

10. Contact Us

If you have any questions or concerns about this Privacy Policy, or if you wish to exercise your rights, please contact us at:

MakeitAI
plagiacheck@gmail.com
````

## File: utils/generateCheckoutToken.ts
````typescript
import { createHash } from 'crypto';

export function generateCheckoutToken(userId: string, timestamp: number) {
  const secret = process.env.API_SECRET_KEY!; // Add this to your .env
  return createHash('sha256')
    .update(`${userId}${timestamp}${secret}`)
    .digest('hex');
}
````

## File: .gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: components.json
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
````

## File: eslint.config.mjs
````javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable "Unexpected any" error
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off"
    },
  },
];

export default eslintConfig;
````

## File: middleware.ts
````typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    
    if (request.nextUrl.pathname.startsWith('/api/webhook/stripe')) {
        console.log('Skipping middleware for Stripe webhook path');
        return NextResponse.next();
    }

    // Get the response
    const response = NextResponse.next()
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
}

// Change your matcher to be more specific - exclude the Stripe webhook path entirely
export const config = {
    matcher: [
        '/api/:path*',
        '/((?!api/webhook/stripe).*)'
    ],
}
````

## File: next.config.ts
````typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    esmExternals: 'loose', // This might help with ESM/CJS conflicts
  },
};

export default nextConfig;
````

## File: package.json
````json
{
  "name": "plagiacheck",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@mistralai/mistralai": "^1.5.0",
    "@paralleldrive/cuid2": "^2.2.2",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-collection": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-select": "^2.2.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@stripe/stripe-js": "^5.6.0",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/supabase-js": "^2.47.10",
    "ai": "^4.0.22",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.4.2",
    "lucide-react": "^0.469.0",
    "next": "15.1.11",
    "next-themes": "^0.4.4",
    "openai-edge": "^1.2.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "react-icons": "^5.4.0",
    "stripe": "^17.6.0",
    "supabase": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tsconfig/node16": "^16.1.4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.1.2",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
````

## File: postcss.config.mjs
````javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
````

## File: README.md
````markdown
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
````

## File: tailwind.config.ts
````typescript
import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
````

## File: tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
````
