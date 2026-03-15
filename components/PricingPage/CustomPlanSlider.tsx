"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import { FileText, Image, Mic } from "lucide-react"
import type { User } from "@supabase/auth-helpers-nextjs"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CustomPlanSliderProps {
  user: User | null
}

export const CustomPlanSlider: React.FC<CustomPlanSliderProps> = ({ user }) => {
  const [wordCount, setWordCount] = useState(250)
  const [imageTokens, setImageTokens] = useState(0)
  const [voiceMinutes, setVoiceMinutes] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const calculateWordPrice = (words: number) => {
    return Math.round(((words - 250) / (10000 - 250)) * (100 - 5) + 5)
  }

  const calculateImagePrice = (tokens: number) => {
    if (tokens === 0) return 0
    // $0.05 per image token, minimum $1
    return Math.max(1, Math.round(tokens * 0.05))
  }

  const calculateVoicePrice = (minutes: number) => {
    if (minutes === 0) return 0
    // $0.10 per minute, minimum $1
    return Math.max(1, Math.round(minutes * 0.10))
  }

  const wordPrice = calculateWordPrice(wordCount)
  const imagePrice = calculateImagePrice(imageTokens)
  const voicePrice = calculateVoicePrice(voiceMinutes)
  const totalPrice = wordPrice + imagePrice + voicePrice

  const handleCustomPurchase = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        window.location.href = "/signin?tab=register"
        return
      }

      // Create Checkout Session with all token types
      const response = await fetch("/api/create-custom-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wordCount,
          imageTokens,
          voiceMinutes,
          price: totalPrice,
        }),
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
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Customize Your Token Pack</h2>
          <p className="text-muted-foreground mt-2">Mix and match the tokens you need. One-time purchase, no subscription.</p>
        </div>

        <div className="space-y-8">
          {/* Word Tokens Slider */}
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

          {/* Image Tokens Slider */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Image className="h-4 w-4 text-rose-500" />
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
              min={0}
              max={500}
              step={10}
              value={[imageTokens]}
              onValueChange={(v) => setImageTokens(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>250</span>
              <span>500</span>
            </div>
          </div>

          {/* Voice Minutes Slider */}
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
              min={0}
              max={300}
              step={5}
              value={[voiceMinutes]}
              onValueChange={(v) => setVoiceMinutes(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>150</span>
              <span>300</span>
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="space-y-2 mb-4">
              {wordCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{wordCount.toLocaleString()} word tokens</span>
                  <span className="font-medium">${wordPrice}</span>
                </div>
              )}
              {imageTokens > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{imageTokens} image tokens</span>
                  <span className="font-medium">${imagePrice}</span>
                </div>
              )}
              {voiceMinutes > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{voiceMinutes} voice minutes</span>
                  <span className="font-medium">${voicePrice}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-3xl font-bold text-foreground">${totalPrice}</span>
              </div>
              <p className="text-xs text-muted-foreground text-right">One-time purchase</p>
            </div>

            <Button
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={handleCustomPurchase}
              disabled={isLoading || totalPrice === 0}
            >
              {isLoading ? "Processing..." : `Buy Now — $${totalPrice}`}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
