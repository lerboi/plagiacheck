"use client"
import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, Sparkles, Shield, Zap, FileText, Copy, File, Brain, Wand2, RefreshCw, CheckCircle2, Hash, ArrowRight, LayoutGrid } from "lucide-react"
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

interface PlagiarismMatch {
  text: string;
  similarity: number;
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number;
  matches: PlagiarismMatch[];
}

type PlagiarismResult = PlagiarismMatchResult | null

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
  const plagiarismCheckerRef = useRef<HTMLElement>(null)

  const scrollToChecker = () => {
    plagiarismCheckerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const tools = [
    { name: "Plagiarism Checker", href: "/", icon: Shield, color: "text-blue-500" },
    { name: "AI Detector", href: "/ai-detector", icon: Brain, color: "text-purple-500" },
    { name: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500" },
    { name: "Paraphraser", href: "/paraphraser", icon: RefreshCw, color: "text-cyan-500" },
    { name: "Summarizer", href: "/summarizer", icon: FileText, color: "text-green-500" },
    { name: "Grammar Checker", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500" },
    { name: "Word Counter", href: "/word-counter", icon: Hash, color: "text-orange-500", isFree: true },
  ]

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
      // Simulate API call with progress
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + Math.random() * 15
        })
      }, 500)

      // Simulate actual API call
      setTimeout(async () => {
        clearInterval(timer)
        setProgress(100)
        
        // Mock result for demo
        setResult({
          matches: [
            { text: "Sample match 1", similarity: 85.5 },
            { text: "Sample match 2", similarity: 72.3 }
          ],
          plagiarismPercentage: Math.floor(Math.random() * 20)
        })
        
        await decrementWords(requiredTokens)
        setIsChecking(false)
      }, 3000)

    } catch (err) {
      setError("Failed to check plagiarism. Please try again.")
      setIsChecking(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setText(content)
      }
      reader.readAsText(file)
    }
  }

  const quickFeatures = [
    { icon: Shield, text: "99.9% Accurate", color: "text-blue-600" },
    { icon: Zap, text: "Results in 30s", color: "text-green-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Main Plagiarism Checker Tool - Now First */}
      <section ref={plagiarismCheckerRef} className="py-12 md:py-16 scroll-mt-16">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center space-y-6 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Trusted by 10M+ users worldwide
            </div>
          
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Plagiarism Checker
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              Ensure academic integrity with our AI-powered plagiarism detection. 
              Get instant results and maintain originality in your work.
            </p>

            {/* Quick Features */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-4">
              {quickFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main Content - Restored Old Design with Improvements */}
          <div className="grid lg:grid-cols-[2fr,1fr] gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 md:p-8 shadow-xl border-0 ">
                <div className="space-y-6">
                  {/* Enhanced Textarea with Better Mobile Support */}
                  <div className="relative">
                    <Textarea
                      placeholder="Paste your text here to check for plagiarism..."
                      className="min-h-[250px] md:min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-sm md:text-base leading-relaxed rounded-xl transition-all duration-200"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    
                    {/* Enhanced File Upload Section */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {text && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(text)}
                          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Copy text"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept=".txt,.doc,.docx,.pdf"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Upload file"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Character Count */}
                    <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded backdrop-blur-sm">
                      {text.length.toLocaleString()} characters
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Enhanced Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-1 h-12 md:h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={handlePlagiarismCheck}
                      disabled={isChecking || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                    >
                      {isChecking ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Checking... {Math.round(progress)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          <span>Check for Plagiarism</span>
                        </div>
                      )}
                    </Button>

                    {/* File Upload Button for Mobile */}
                    <div className="relative sm:hidden">
                      <input
                        type="file"
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <File className="h-5 w-5 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </div>

                  {/* Quick Action Links - All Tools */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {tools.map((tool) => (
                      <Link
                        key={tool.name}
                        href={tool.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                      >
                        <tool.icon className={`h-3.5 w-3.5 ${tool.color}`} />
                        <span className="text-gray-700 dark:text-gray-300">{tool.name}</span>
                        {tool.isFree && (
                          <span className="ml-0.5 text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full font-semibold">
                            FREE
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Results Section */}
                  {(isChecking || result) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <PlagiarismResults isChecking={isChecking} progress={progress} result={result} />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Enhanced Sidebar */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Stats Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg">
                <CardContent className="p-0">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Why Choose Plagiacheck?</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Shield, label: "Security", value: "100%", desc: "Your data is secure" },
                      { icon: Zap, label: "Speed", value: "<3s", desc: "Lightning fast results" },
                      { icon: FileText, label: "Sources", value: "50B+", desc: "Comprehensive database" },
                      { icon: Sparkles, label: "Accuracy", value: "99%", desc: "Precise detection" }
                    ].map((stat, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                          <stat.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{stat.value}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{stat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-lg">
                <CardContent className="p-0">
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">Pro Tips</h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Upload documents directly for faster checking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Check your work before submission</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Review highlighted matches carefully</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* CTA Card */}
              <Card className="p-6 border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 shadow-lg">
                <CardContent className="p-0 text-center">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Need More Checks?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Upgrade to premium for unlimited plagiarism checks</p>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl" asChild>
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hero Section - Now Second */}
      <Hero onTryFreeClick={scrollToChecker} />

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* Tools Showcase Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              All the Tools You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From plagiarism checking to grammar correction, we have everything to perfect your writing
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link
                  href={tool.href}
                  className="group relative flex flex-col items-center p-5 md:p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all duration-300"
                >
                  <div className="relative mb-3">
                    <tool.icon className={`h-7 w-7 md:h-8 md:w-8 ${tool.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                  <h3 className="font-medium text-sm md:text-base text-center text-gray-900 dark:text-gray-100">{tool.name}</h3>
                  {tool.isFree && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                      FREE
                    </span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <LayoutGrid className="h-4 w-4" />
              View All Tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />
    </div>
  )
}