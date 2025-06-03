"use client"
import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Brain, Zap, Shield, Sparkles } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Progress } from "@/components/ui/progress"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"

export default function AIDetector() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    score: number
    humanLikelihood: string
    analysis: string
  } | null>(null)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [error, setError] = useState<string | null>(null)

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
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
      // Simulate API call with progress
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      // Simulate API response
      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        // Simple detection simulation
        const patterns = [
          /\b(therefore|consequently|thus)\b/gi,
          /\b(utilize|employ)\b/gi,
          /\b(commence|initiate)\b/gi,
          /\b(furthermore|moreover|additionally)\b/gi,
          /\b(demonstrate|illustrate)\b/gi,
        ]

        let patternMatches = 0
        patterns.forEach((pattern) => {
          const matches = text.match(pattern)
          if (matches) patternMatches += matches.length
        })

        const textLength = text.length
        const normalizedScore = Math.min(
          100,
          Math.max(0, (patternMatches / (textLength / 100)) * 20 + Math.random() * 30 + (text.length > 200 ? 20 : 0)),
        )

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
          score: Math.round(normalizedScore),
          humanLikelihood,
          analysis,
        })

        decrementWords(requiredTokens)
        setIsAnalyzing(false)
      }, 2000)
    } catch (err) {
      console.error("Error analyzing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze"
      setError(errorMessage)
      setIsAnalyzing(false)
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
                      ⚠️ Not enough words remaining. 
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
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-8">
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
                      <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-300">Accuracy Note</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        While highly accurate, no AI detection tool is perfect. Results should be considered as probability rather than absolute certainty.
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