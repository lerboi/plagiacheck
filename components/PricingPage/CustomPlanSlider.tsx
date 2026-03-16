"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { FileText, Image as ImageIcon, Mic } from "lucide-react"
import type { User } from "@supabase/auth-helpers-nextjs"

interface CustomPlanSliderProps {
  user: User | null
}

type TokenType = "words" | "images" | "voice"

const tokenTabs: { key: TokenType; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { key: "words", label: "Word Tokens", icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500" },
  { key: "images", label: "Image Tokens", icon: ImageIcon, color: "text-rose-500", bgColor: "bg-rose-500" },
  { key: "voice", label: "Voice Minutes", icon: Mic, color: "text-indigo-500", bgColor: "bg-indigo-500" },
]

export const CustomPlanSlider: React.FC<CustomPlanSliderProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TokenType>("words")
  const [wordCount, setWordCount] = useState(250)
  const [imageTokens, setImageTokens] = useState(10)
  const [voiceMinutes, setVoiceMinutes] = useState(5)
  const [isLoading, setIsLoading] = useState(false)

  const calculateWordPrice = (words: number) => {
    return Math.round(((words - 250) / (10000 - 250)) * (100 - 5) + 5)
  }

  const calculateImagePrice = (tokens: number) => {
    if (tokens === 0) return 0
    return Math.max(1, Math.round(tokens * 0.05))
  }

  const calculateVoicePrice = (minutes: number) => {
    if (minutes === 0) return 0
    return Math.max(1, Math.round(minutes * 0.10))
  }

  const getActivePrice = () => {
    switch (activeTab) {
      case "words": return calculateWordPrice(wordCount)
      case "images": return calculateImagePrice(imageTokens)
      case "voice": return calculateVoicePrice(voiceMinutes)
    }
  }

  const getActiveAmount = () => {
    switch (activeTab) {
      case "words": return wordCount
      case "images": return imageTokens
      case "voice": return voiceMinutes
    }
  }

  const getActiveUnit = () => {
    switch (activeTab) {
      case "words": return "words"
      case "images": return "images"
      case "voice": return "minutes"
    }
  }

  const price = getActivePrice()

  const handleCustomPurchase = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        window.location.href = "/signin?tab=register"
        return
      }

      const body: Record<string, number> = { price }
      if (activeTab === "words") {
        body.wordCount = wordCount
        body.imageTokens = 0
        body.voiceMinutes = 0
      } else if (activeTab === "images") {
        body.wordCount = 0
        body.imageTokens = imageTokens
        body.voiceMinutes = 0
      } else {
        body.wordCount = 0
        body.imageTokens = 0
        body.voiceMinutes = voiceMinutes
      }

      const response = await fetch("/api/create-custom-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error("Error creating checkout session:", error)
        return
      }

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
        className="p-8 md:p-10 w-full max-w-3xl rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Buy Token Pack</h2>
          <p className="text-muted-foreground mt-2">Choose a token type and pick the amount you need. One-time purchase, no subscription.</p>
        </div>

        {/* Token Type Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50 mb-8">
          {tokenTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white dark:bg-gray-900 shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : ""}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Active Slider */}
        <div className="space-y-8">
          {activeTab === "words" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Word Tokens</h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground">{wordCount.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-1">words</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">For plagiarism checking, AI detection, paraphrasing, summarizing, grammar checking, and speech cleanup</p>
                </div>
              </div>
              <Slider
                min={250}
                max={10000}
                step={50}
                value={[wordCount]}
                onValueChange={(v) => setWordCount(v[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>250</span>
                <span>5,000</span>
                <span>10,000</span>
              </div>
            </div>
          )}

          {activeTab === "images" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Image Tokens</h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground">{imageTokens}</span>
                      <span className="text-sm text-muted-foreground ml-1">images</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">For Image-to-Text OCR — extract text from photos, screenshots, and documents</p>
                </div>
              </div>
              <Slider
                min={10}
                max={500}
                step={10}
                value={[imageTokens]}
                onValueChange={(v) => setImageTokens(v[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>
          )}

          {activeTab === "voice" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Voice Minutes</h3>
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground">{voiceMinutes}</span>
                      <span className="text-sm text-muted-foreground ml-1">minutes</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">For Speech-to-Text — transcribe lectures, interviews, and voice notes (recording is free, AI cleanup uses word tokens)</p>
                </div>
              </div>
              <Slider
                min={5}
                max={300}
                step={5}
                value={[voiceMinutes]}
                onValueChange={(v) => setVoiceMinutes(v[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>150</span>
                <span>300</span>
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{getActiveAmount().toLocaleString()} {getActiveUnit()}</span>
                <span className="font-medium">${price}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-3xl font-bold text-foreground">${price}</span>
              </div>
              <p className="text-xs text-muted-foreground text-right">One-time purchase</p>
            </div>

            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={handleCustomPurchase}
              disabled={isLoading || price === 0}
            >
              {isLoading ? "Processing..." : `Buy Now — $${price}`}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
