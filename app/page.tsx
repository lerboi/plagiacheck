"use client"
import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, Sparkles, Shield, Zap } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { Hero } from "@/components/Hero"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"

type PlagiarismResult = {
  matches: string[]
  plagiarismPercentage: number
} | null

export default function Home() {
  const [text, setText] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<PlagiarismResult>(null)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handlePlagiarismCheck = async () => {
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
  
    setIsChecking(true)
    setProgress(0)
    setResult(null)
    setError(null)
  
    try {
      const response = await fetch("/api/check-plagiarism", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })
  
      if (!response.ok) {
        throw new Error("Failed to check plagiarism")
      }
  
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
  
      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
  
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
  
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(5))
  
            if (data.progress !== undefined) {
              setProgress(data.progress)
            }
  
            if (data.result) {
              setResult({
                matches: Array.isArray(data.result.matches) ? data.result.matches : [],
                plagiarismPercentage: data.result.plagiarismPercentage || 0,
              });

              await decrementWords(requiredTokens)
            }
  
            if (data.error) {
              setError(data.error)
              throw new Error(data.error)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error checking plagiarism:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check"
      setError(errorMessage)
    } finally {
      setIsChecking(false)
    }
  }

  const formattedResult = result
  ? {
      plagiarismPercentage: result.plagiarismPercentage || 0,
      matches: [],
    }
  : null;

  const quickFeatures = [
    { icon: Shield, text: "99.9% Accurate", color: "text-blue-600" },
    { icon: Zap, text: "Results in 30s", color: "text-green-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" }
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
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Trusted by 10M+ users worldwide
          </div>
        
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tighter sm:text-6xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Plagiarism Checker
            </span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Ensure academic integrity with our AI-powered plagiarism detection. 
            Get instant results and maintain originality in your work.
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
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-6">
                <Textarea
                  placeholder="Paste your text here to check for plagiarism..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed"
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handlePlagiarismCheck}
                    disabled={isChecking || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-5 w-5" />
                        Check Plagiarism ({calculateRequiredTokens(text)} words)
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload File
                  </Button>
                </div>

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
            
            <PlagiarismResults isChecking={isChecking} progress={progress} result={formattedResult} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      Quick Start Guide
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Follow these simple steps to check your content
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      { step: "1", title: "Add Content", desc: "Paste your text or upload a document" },
                      { step: "2", title: "Scan", desc: "Click to start the plagiarism check" },
                      { step: "3", title: "Review", desc: "Get detailed results and suggestions" }
                    ].map((item, index) => (
                      <motion.div 
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {!user && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg">
                        Get Started Free
                      </Button>
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Already have an account?{" "}
                          <Link href="/signin" className="text-blue-500 hover:text-blue-600 font-medium">
                            Sign in
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}
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