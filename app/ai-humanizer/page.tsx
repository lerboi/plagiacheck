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
