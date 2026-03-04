"use client"

import { useState, useEffect } from "react"
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

export default function AIHumanizer() {
  const [text, setText] = useState("")
  const [humanizedText, setHumanizedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [humanizationLevel, setHumanizationLevel] = useState(50)
  const [tone, setTone] = useState("casual")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "tab">("split")
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

  const handleHumanize = async () => {
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
    setHumanizedText("")
    setError(null)

    try {
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          tool: "humanize",
          options: { tone, level: humanizationLevel }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to humanize text")
      }

      setHumanizedText(data.result.humanizedText || text)
      await decrementWords(requiredTokens)

      toast({
        title: "Humanization Complete",
        description: "Your text has been successfully humanized.",
        variant: "success",
      })
    } catch (err) {
      console.error("Error humanizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to humanize"
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
            AI Humanizer
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Transform AI-generated content into natural, human-like text that bypasses
            AI detection tools while maintaining quality and meaning.
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

        <div className="max-w-7xl mx-auto">
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

          <motion.div
            className={viewMode === "split" ? "grid lg:grid-cols-2 gap-6 relative" : "space-y-6"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
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

            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Humanized
                  </h3>
                  {humanizedText && (
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                      {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
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

          {humanizedText && (
            <motion.div className="mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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

          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="grid md:grid-cols-3 gap-6 items-end">
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
            </Card>
          </motion.div>

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
        </div>
      </section>

      <FAQ />
    </div>
  )
}
