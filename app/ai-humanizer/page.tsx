"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Wand2 } from "lucide-react"
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
          // Light humanization - just a few changes
          result = result.replace(/\./g, ". ").replace(/\s+/g, " ").trim()
        } else if (humanizationLevel > 70) {
          // Heavy humanization - more conversational
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

  return (
    <div className="min-h-screen bg-background px-5 md:px-10">
      <Nav />
      <main className="container py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">AI Humanizer</h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground">
            Transform AI-generated content into natural, human-like text that bypasses AI detection tools.
          </p>
        </div>
        <div className="grid md:grid-cols-[2fr,1fr] gap-8 items-start">
          <div className="space-y-4">
            <Tabs defaultValue="humanize" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="humanize">Humanize Text</TabsTrigger>
                <TabsTrigger value="result">Result</TabsTrigger>
              </TabsList>
              <TabsContent value="humanize">
                <Card className="p-6">
                  <Textarea
                    placeholder="Paste your AI-generated text here to humanize it."
                    className="min-h-[300px] resize-none"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                  <div className="mt-4">
                    <Button
                      className="w-full bg-blue-400 hover:bg-blue-500"
                      onClick={handleHumanize}
                      disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Humanizing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Humanize Text ({calculateRequiredTokens(text)} words)
                        </>
                      )}
                    </Button>
                  </div>
                  {calculateRequiredTokens(text) > remainingWords && (
                    <p className="mt-2 text-sm text-red-500">Not enough words remaining. Please upgrade your plan.</p>
                  )}
                </Card>
              </TabsContent>
              <TabsContent value="result">
                <Card className="p-6">
                  <Textarea
                    placeholder="Humanized text will appear here."
                    className="min-h-[300px] resize-none"
                    value={humanizedText}
                    readOnly
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(humanizedText)
                      }}
                      disabled={!humanizedText}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-400 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Humanization Settings</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="humanization-level">Humanization Level: {humanizationLevel}%</Label>
                      <Slider
                        id="humanization-level"
                        min={0}
                        max={100}
                        step={1}
                        value={[humanizationLevel]}
                        onValueChange={(value) => setHumanizationLevel(value[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Light</span>
                        <span>Medium</span>
                        <span>Heavy</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tone">Writing Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger id="tone">
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

                <div className="space-y-4">
                  <h3 className="font-semibold">How it works:</h3>
                  <div>
                    <p className="font-semibold">Step 1:</p>
                    <p className="text-muted-foreground">Paste your AI-generated text.</p>
                  </div>
                  <div>
                    <p className="font-semibold">Step 2:</p>
                    <p className="text-muted-foreground">Adjust humanization settings to your preference.</p>
                  </div>
                  <div>
                    <p className="font-semibold">Step 3:</p>
                    <p className="text-muted-foreground">
                      Click Humanize Text and get content that reads like it was written by a human.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
