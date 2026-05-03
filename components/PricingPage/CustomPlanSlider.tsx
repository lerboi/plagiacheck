"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import { FileText, Image as ImageIcon } from "lucide-react"
import type { User } from "@supabase/auth-helpers-nextjs"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CustomPlanSliderProps {
  user: User | null
}

type TokenType = "words" | "images"

const WORD_MIN = 250
const WORD_MAX = 10000
const WORD_STEP = 50

const IMAGE_MIN = 50
const IMAGE_MAX = 2000
const IMAGE_STEP = 50

function calculateWordPrice(words: number): number {
  return Math.round(((words - WORD_MIN) / (WORD_MAX - WORD_MIN)) * (100 - 5) + 5)
}

function calculateImagePrice(images: number): number {
  // $5 base up to 50 images, then $0.05 per image (rounded to nearest dollar, minimum $5)
  return Math.max(5, Math.round(images * 0.05))
}

export const CustomPlanSlider: React.FC<CustomPlanSliderProps> = ({ user }) => {
  const [tokenType, setTokenType] = useState<TokenType>("words")
  const [wordCount, setWordCount] = useState(2500)
  const [imageCount, setImageCount] = useState(200)
  const [isLoading, setIsLoading] = useState(false)

  const wordPrice = calculateWordPrice(wordCount)
  const imagePrice = calculateImagePrice(imageCount)
  const totalPrice = tokenType === "words" ? wordPrice : imagePrice

  const handlePurchase = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        window.location.href = "/signin?tab=register"
        return
      }

      const body =
        tokenType === "words"
          ? { wordCount, price: totalPrice }
          : { imageTokens: imageCount, price: totalPrice }

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
        className="p-8 md:p-10 w-full max-w-3xl rounded-2xl border border-border bg-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Customize Your Tokens</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            One-time purchase, no subscription. Pick exactly what you need.
          </p>
        </div>

        {/* Token type toggle */}
        <div className="flex rounded-xl border border-border p-1 mb-8 bg-muted/40">
          {(["words", "images"] as TokenType[]).map((type) => {
            const isActive = tokenType === type
            const Icon = type === "words" ? FileText : ImageIcon
            const label = type === "words" ? "Word Tokens" : "Image Tokens"
            const description =
              type === "words"
                ? "For all writing & analysis tools"
                : "For image, chart & infographic tools"
            return (
              <button
                key={type}
                onClick={() => setTokenType(type)}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  isActive
                    ? type === "words"
                      ? "bg-background shadow-sm border border-border"
                      : "bg-background shadow-sm border border-border"
                    : "hover:bg-background/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? type === "words"
                        ? "bg-blue-500/15"
                        : "bg-rose-500/15"
                      : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive
                        ? type === "words"
                          ? "text-blue-500"
                          : "text-rose-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold leading-none ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    {description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Slider section */}
        <AnimatePresence mode="wait">
          {tokenType === "words" ? (
            <motion.div
              key="words"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Count display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Word Tokens</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold tabular-nums">{wordCount.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-1">words</span>
                </div>
              </div>

              <Slider
                min={WORD_MIN}
                max={WORD_MAX}
                step={WORD_STEP}
                value={[wordCount]}
                onValueChange={(v) => setWordCount(v[0])}
                className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_.relative>.absolute]:bg-blue-500"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>250</span>
                <span>5,000</span>
                <span>10,000</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Used by: plagiarism checker, AI detector, AI humanizer, paraphraser, summarizer, grammar checker, speech-to-text, and voice tools.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="images"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Count display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Image Tokens</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold tabular-nums">{imageCount.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-1">images</span>
                </div>
              </div>

              <Slider
                min={IMAGE_MIN}
                max={IMAGE_MAX}
                step={IMAGE_STEP}
                value={[imageCount]}
                onValueChange={(v) => setImageCount(v[0])}
                className="[&_[role=slider]]:bg-rose-500 [&_[role=slider]]:border-rose-500 [&_.relative>.absolute]:bg-rose-500"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50</span>
                <span>1,000</span>
                <span>2,000</span>
              </div>

              {/* Cost per token hint */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Image to Text: <strong className="text-foreground">1 token</strong> per image</span>
                <span>Charts / Infographics / Thumbnails: <strong className="text-foreground">2 tokens</strong> per generation</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pricing summary + buy button */}
        <div className="border-t border-border mt-8 pt-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {tokenType === "words"
                  ? `${wordCount.toLocaleString()} word tokens`
                  : `${imageCount.toLocaleString()} image tokens`}
              </span>
              <span className="font-medium">${totalPrice}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-border">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                <span className="text-3xl font-bold">${totalPrice}</span>
                <p className="text-xs text-muted-foreground">One-time purchase</p>
              </div>
            </div>
          </div>

          <Button
            className={`w-full h-11 font-semibold text-white transition-colors ${
              tokenType === "words"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
            onClick={handlePurchase}
            disabled={isLoading || totalPrice === 0}
          >
            {isLoading
              ? "Processing..."
              : `Buy ${tokenType === "words" ? "Word" : "Image"} Tokens — $${totalPrice}`}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
