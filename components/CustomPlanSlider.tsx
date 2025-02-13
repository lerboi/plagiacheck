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
    return Math.round(((words - 250) / (4000 - 250)) * (40 - 5) + 5)
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
        <h2 className="text-2xl font-bold mb-6 text-white">Customize Your Plan</h2>
        <div className="mb-6">
          <Slider min={250} max={4000} step={50} value={[wordCount]} onValueChange={handleSliderChange} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-lg font-semibold text-white">{wordCount} words</p>
            <p className="text-sm text-gray-400">Drag the slider to adjust</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">${price}</p>
            <p className="text-sm text-gray-400">One-time purchase</p>
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