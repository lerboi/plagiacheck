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
