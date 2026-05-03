"use client"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check, Sparkles, Zap, Shield, Brain, Wand2, RefreshCw, FileText, CheckCircle2, Hash, Image, Mic, BarChart3, ImagePlus, PieChart, Volume2, FileEdit, FileAudio, Pen, ImageIcon, AudioLines } from 'lucide-react'
import type { User } from "@supabase/auth-helpers-nextjs"
import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { CustomPlanSlider } from "@/components/PricingPage/CustomPlanSlider"
import { TrustSection } from "@/components/PricingPage/TrustSection"
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
      description: "Perfect for students",
      price: "$0",
      period: "forever",
      features: [
        "Write without mistakes", 
        "See your writing tone", 
        "Free 1000 words",
        "Basic plagiarism detection",
      ],
      button: {
        text: user ? "Current Plan" : "Get Started Free",
        variant: "outline" as const,
      },
      priceId: null,
      icon: null,
    },
    {
      name: "Plus",
      description: "For individuals & small teams",
      price: "$9.99",
      period: "per month",
      yearlyPrice: "$119",
      features: [
        "Everything in Free", 
        "100,000 words monthly",
        "Advanced plagiarism detection",
        "Detailed similarity reports",
        "Citation assistance",
        "Priority support"
      ],
      button: {
        text: "Start Plus Plan",
        variant: "default" as const,
      },
      popular: true,
      priceId: "price_1QrlQ3AJsVayTGRcMsOQu8Gy",
      icon: Sparkles,
      savings: "Save $20/year",
    },
    {
      name: "Premium",
      description: "For organizations & power users",
      price: "$29.99",
      period: "per month",
      yearlyPrice: "$239",
      features: [
        "Everything in Plus", 
        "1,000,000 words monthly",
        "Team collaboration tools",
        "API access",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced analytics"
      ],
      button: {
        text: "Go Premium",
        variant: "outline" as const,
      },
      priceId: "price_1S4ntlAJsVayTGRcEL6YUGdf",
      icon: Zap,
      savings: "Save $40/year",
    },
  ]

  const handleGetStarted = (planName: string, priceId: string | null) => {
    if (!user) {
      router.push("/signin?tab=register")
      return
    }

    if (!priceId) {
      // Free plan: logged-in users are already on it (or above) — nothing to do.
      return
    }

    window.location.href = `/api/create-checkout-session?priceId=${priceId}&planName=${planName}`
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        {/* Hero Section */}
        <section className="container py-16">
          <div className="grid gap-8">
            <div className="grid gap-6 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mx-auto">
                <Sparkles className="h-4 w-4" />
                Plain pricing — cancel anytime
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Choose Your Perfect Plan
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Ensure originality and maintain academic integrity with our advanced plagiarism detection. 
                Start free, upgrade when you need more power.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid lg:grid-cols-3 gap-8 mt-12">
              {plans.map((plan) => {
                const IconComponent = plan.icon
                return (
                  <Card
                    key={plan.name}
                    className={`relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                      plan.popular 
                        ? "border-primary shadow-lg ring-1 ring-primary/20" 
                        : "hover:border-primary/50"
                    } bg-card/50 backdrop-blur-sm`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-0 right-0 mx-auto w-36 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-lg">
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-3 mb-4">
                        {IconComponent && (
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-muted-foreground">/ {plan.period}</span>
                        </div>
                        {plan.yearlyPrice && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {plan.yearlyPrice} when billed yearly
                            </p>
                            {plan.savings && (
                              <div className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                                <Check className="h-3 w-3" />
                                {plan.savings}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <Button
                        className={`w-full mb-6 font-semibold transition-all ${
                          plan.button.variant === "default" 
                            ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl" 
                            : "border-2 hover:border-primary hover:bg-primary/5"
                        }`}
                        variant={plan.button.variant}
                        size="lg"
                        onClick={() => handleGetStarted(plan.name, plan.priceId)}
                        disabled={plan.name === "Free" && user ? true : false}
                      >
                        {plan.button.text}
                      </Button>
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-foreground mb-3">
                          Whats included:
                        </div>
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 bg-primary/10 rounded-full">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Custom Plan Slider - Moved above tools */}
            <div className="mt-16">
              <CustomPlanSlider user={user} />
            </div>

            {/* Tools Included Section */}
            <div className="mt-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">All Plans Include These Tools</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Get access to our complete suite of writing, image, and voice tools with any plan
                </p>
              </div>

              <div className="max-w-5xl mx-auto space-y-10">
                {/* Writing Tools */}
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Pen className="h-4 w-4 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Writing Tools</h3>
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {[
                      { name: "Plagiarism Checker", icon: Shield, color: "text-blue-500" },
                      { name: "AI Detector", icon: Brain, color: "text-purple-500" },
                      { name: "AI Humanizer", icon: Wand2, color: "text-pink-500" },
                      { name: "Paraphraser", icon: RefreshCw, color: "text-cyan-500" },
                      { name: "Summarizer", icon: FileText, color: "text-green-500" },
                      { name: "Grammar Checker", icon: CheckCircle2, color: "text-emerald-500" },
                      { name: "Word Counter", icon: Hash, color: "text-orange-500", isFree: true },
                    ].map((tool) => (
                      <div
                        key={tool.name}
                        className="group relative flex flex-col items-center p-4 md:p-5 rounded-xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-200"
                      >
                        <tool.icon className={`h-6 w-6 md:h-7 md:w-7 ${tool.color} mb-2 transition-transform duration-200 group-hover:scale-110`} />
                        <span className="font-medium text-xs md:text-sm text-center text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</span>
                        {tool.isFree && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-semibold px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">FREE</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image & Visual Tools */}
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-1.5 rounded-lg bg-rose-500/10">
                      <ImageIcon className="h-4 w-4 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Image & Visual</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-full">Uses Image Tokens</span>
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { name: "Image to Text", icon: Image, color: "text-rose-500" },
                      { name: "Infographic Generator", icon: BarChart3, color: "text-amber-500" },
                      { name: "Thumbnail Generator", icon: ImagePlus, color: "text-violet-500" },
                      { name: "Chart Generator", icon: PieChart, color: "text-teal-500" },
                    ].map((tool) => (
                      <div
                        key={tool.name}
                        className="group flex flex-col items-center p-4 md:p-5 rounded-xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-200"
                      >
                        <tool.icon className={`h-6 w-6 md:h-7 md:w-7 ${tool.color} mb-2 transition-transform duration-200 group-hover:scale-110`} />
                        <span className="font-medium text-xs md:text-sm text-center text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice & Audio Tools */}
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10">
                      <AudioLines className="h-4 w-4 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Voice & Audio</h3>
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { name: "Speech to Text", icon: Mic, color: "text-indigo-500" },
                      { name: "Text to Speech", icon: Volume2, color: "text-sky-500", isFree: true },
                      { name: "Voice to Essay", icon: FileEdit, color: "text-sky-600" },
                      { name: "Audio Summarizer", icon: FileAudio, color: "text-orange-600" },
                    ].map((tool) => (
                      <div
                        key={tool.name}
                        className="group relative flex flex-col items-center p-4 md:p-5 rounded-xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-200"
                      >
                        <tool.icon className={`h-6 w-6 md:h-7 md:w-7 ${tool.color} mb-2 transition-transform duration-200 group-hover:scale-110`} />
                        <span className="font-medium text-xs md:text-sm text-center text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</span>
                        {tool.isFree && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-semibold px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">FREE</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <TrustSection />

        {/* FAQ Section */}
        <section className="container py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about our pricing</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is my content secure?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely. We use enterprise-grade security and never store or share your documents.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, we offer a 30-day money-back guarantee for all paid plans.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">How does plagiarism detection work?</h3>
                <p className="text-sm text-muted-foreground">
                  We use a language model to flag passages that read like common patterns and surface similarity signals worth a closer look. It is a writing aid, not a verdict.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How accurate is AI detection?</h3>
                <p className="text-sm text-muted-foreground">
                  AI detection is an estimate based on writing style. Treat the score as a signal worth investigating, not a definitive label.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you support team accounts?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, our Premium plan includes team collaboration tools and user management.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}