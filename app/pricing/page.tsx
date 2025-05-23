"use client"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check } from 'lucide-react'
import type { User } from "@supabase/auth-helpers-nextjs"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { CustomPlanSlider } from "@/components/CustomPlanSlider"
import { useTheme } from "next-themes"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function Pricing() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const plans = [
    {
      name: "Free",
      description: "For individuals",
      price: "$0",
      period: "/ month",
      features: ["Write without mistakes", "See your writing tone", "Generate text with 100 AI prompts"],
      button: {
        text: user ? "Logged in" : "Create account",
        variant: "outline" as const,
      },
      priceId: null,
    },
    {
      name: "Plus",
      description: "For individuals or small teams",
      price: "$9.99",
      period: "/ member / month, billed monthly",
      subtext: "$119 when billed yearly",
      features: ["Everything included in Free", "10,000 words monthly"],
      button: {
        text: "Get Started",
        variant: "default" as const,
      },
      popular: true,
      priceId: "price_1QrlQ3AJsVayTGRcMsOQu8Gy", // Replace with your actual Stripe Price ID
    },
    {
      name: "Premium",
      description: "For larger organizations",
      price: "$19.99",
      period: "/ member / month, billed monthly",
      features: ["Everything included in Plus", "Dedicated support", "100,000 words monthly"],
      button: {
        text: "Get Started",
        variant: "outline" as const,
      },
      priceId: "price_1QrlQJAJsVayTGRcmRXqWNfc", // Replace with your actual Stripe Price ID
    },
  ]

  const handleGetStarted = (planName: string, priceId: string | null) => {
    if (!user) {
      router.push("/signin?tab=register")
      return
    }

    if (!priceId) {
      console.log(`User ${user.id} selected ${planName} plan (Free)`)
      return
    }

    // Direct navigation instead of fetch
    window.location.href = `/api/create-checkout-session?priceId=${priceId}&planName=${planName}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container py-12">
        <div className="grid gap-8">
          <div className="grid gap-4 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-foreground">Plans & Pricing</h1>
            <p className="text-muted-foreground">Choose the perfect plan for your needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? "border-primary" : ""} bg-card`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-0 right-0 mx-auto w-32 rounded-full bg-primary px-3 py-1 text-center text-sm text-primary-foreground">
                    Most popular
                  </div>
                )}
                <CardHeader className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <h3 className="text-3xl font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-4xl font-bold text-foreground">{plan.price}</div>
                    {plan.period && <p className="text-sm text-muted-foreground">{plan.period}</p>}
                    {plan.subtext && <p className="text-sm text-muted-foreground">{plan.subtext}</p>}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    className={`w-full ${plan.button.variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                    variant={plan.button.variant}
                    onClick={() => handleGetStarted(plan.name, plan.priceId)}
                    disabled={plan.name === "Free" && user ? true : false}
                  >
                    {plan.button.text}
                  </Button>
                  <div className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <CustomPlanSlider user={user} />
        </div>
      </main>
    </div>
  )
}