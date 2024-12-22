'use client'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check } from 'lucide-react'

const plans = [
  {
    name: "Free",
    description: "For individuals",
    price: "$0",
    period: "/ month",
    features: [
      "Write without mistakes",
      "See your writing tone",
      "Generate text with 100 AI prompts",
    ],
    button: {
      text: "Create account",
      variant: "outline" as const,
    },
  },
  {
    name: "Plus",
    description: "For individuals or small teams",
    price: "$12",
    period: "/ member / month, billed monthly",
    subtext: "$144 when billed monthly",
    features: [
      "Everything included in Free",
      "10,000 words monthly",
    ],
    button: {
      text: "Get Started",
      variant: "default" as const,
    },
    popular: true,
  },
  {
    name: "Premium",
    description: "For larger organizations",
    price: "$25",
    period: "/ member / month, billed monthly",
    features: [
      "Everything included in Plus",
      "Dedicated support",
      "100,000 words monthly",
    ],
    button: {
      text: "Get Started",
      variant: "outline" as const,
    },
  },
]

export default function Pricing() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleGetStarted = async (planName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // TODO: Implement subscription logic here
      console.log(`User ${user.id} selected ${planName} plan`)
    } else {
      router.push('/signin?tab=register')
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 md:px-10">
      <Nav />
      <main className="container py-12">
        <div className="grid gap-8">
          <div className="grid gap-4 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Plans & Pricing
            </h1>
            <p className="text-muted-foreground">
              Choose the perfect plan for your needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? "border-blue-600" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-0 right-0 mx-auto w-32 rounded-full bg-blue-600 px-3 py-1 text-center text-sm text-white">
                    Most popular
                  </div>
                )}
                <CardHeader className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <h3 className="text-3xl font-bold">{plan.name}</h3>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-4xl font-bold">{plan.price}</div>
                    {plan.period && (
                      <p className="text-sm text-muted-foreground">{plan.period}</p>
                    )}
                    {plan.subtext && (
                      <p className="text-sm text-muted-foreground">{plan.subtext}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    className={
                      plan.button.variant === "default" ? "w-full bg-blue-500 hover:bg-blue-600" : "w-full"
                    }
                    variant={plan.button.variant}
                    onClick={() => handleGetStarted(plan.name)}
                  >
                    {plan.button.text}
                  </Button>
                  <div className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-blue-050" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

