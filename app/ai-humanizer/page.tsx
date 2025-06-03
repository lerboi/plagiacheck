"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Wand2, Sparkles, Zap, Shield, Copy } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"

export default function AIHumanizer() {
  const [text, setText] = useState("")
  const [humanizedText, setHumanizedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [error, setError] = useState<string | null>(null)
  const [humanizationLevel, setHumanizationLevel] = useState(50)
  const [tone, setTone] = useState("casual")

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

        // Simple humanization simulation
        let result = text

        // Apply different transformations based on tone
        if (tone === "casual") {
          result = result
            .replace(/\b(therefore|consequently|thus)\b/gi, "so")
            .replace(/\b(utilize|employ)\b/gi, "use")
            .replace(/\b(commence|initiate)\b/gi, "start")
        } else if (tone === "professional") {
          result = result
            .replace(/\b(use)\b/gi, "utilize")
            .replace(/\b(but)\b/gi, "however")
            .replace(/\b(also)\b/gi, "additionally")
        } else if (tone === "academic") {
          result = result
            .replace(/\b(show)\b/gi, "demonstrate")
            .replace(/\b(use)\b/gi, "implement")
            .replace(/\b(look at)\b/gi, "examine")
        }

        // Apply humanization level
        if (humanizationLevel < 30) {
          result = result.replace(/\./g, ". ").replace(/\s+/g, " ").trim()
        } else if (humanizationLevel > 70) {
          result = result
            .replace(/\b(I believe|In my opinion)\b/gi, "I think")
            .replace(/\b(very)\b/gi, "really")
            .replace(/\./g, ". ")
            .replace(/\s+/g, " ")
            .trim()
        }

        setHumanizedText(result)
        decrementWords(requiredTokens)
        setIsProcessing(false)
      }, 2000)
    } catch (err) {
      console.error("Error humanizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to humanize"
      setError(errorMessage)
      setIsProcessing(false)
    }
  }

  const quickFeatures = [
    { icon: Wand2, text: "AI to Human", color: "text-purple-600" },
    { icon: Zap, text: "Instant Results", color: "text-green-600" },
    { icon: Shield, text: "Bypass Detection", color: "text-blue-600" }
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Tabs defaultValue="humanize" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="humanize" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 text-base">
                  Input Text
                </TabsTrigger>
                <TabsTrigger value="result" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 text-base">
                  Humanized Result
                </TabsTrigger>
              </TabsList>

              <TabsContent value="humanize">
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <Textarea
                      placeholder="Paste your AI-generated text here to humanize it..."
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
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
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
                          Humanize Text ({calculateRequiredTokens(text)} words)
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
              </TabsContent>

              <TabsContent value="result">
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <Textarea
                      placeholder="Humanized text will appear here..."
                      className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed"
                      value={humanizedText}
                      readOnly
                    />
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="h-10 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => {
                          navigator.clipboard.writeText(humanizedText)
                        }}
                        disabled={!humanizedText}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {isProcessing && (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-3">
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
                </Card>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Humanization Settings
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="humanization-level" className="text-base font-medium">
                          Humanization Level: {humanizationLevel}%
                        </Label>
                        <Slider
                          id="humanization-level"
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
                        <Label htmlFor="tone" className="text-base font-medium">Writing Tone</Label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger id="tone" className="h-11">
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="academic">Academic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">How It Works</h3>
                    
                    {[
                      { step: "1", title: "Input AI Text", desc: "Paste your AI-generated content" },
                      { step: "2", title: "Configure Settings", desc: "Adjust tone and humanization level" },
                      { step: "3", title: "Get Human Text", desc: "Receive natural, undetectable content" }
                    ].map((item, index) => (
                      <motion.div 
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
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
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300">Pro Tip</h4>
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        Higher humanization levels create more natural text but may change meaning slightly. Find the perfect balance for your needs.
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