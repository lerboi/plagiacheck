"use client"
import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, Sparkles, Shield, Zap, FileText, Copy, File, Brain, Wand2, RefreshCw, CheckCircle2, Hash, ArrowRight, Check, GraduationCap, Users, Globe, Image, Mic } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface PlagiarismMatch {
  text: string;
  similarity: number;
  startIndex?: number;
  endIndex?: number;
  reason?: string;
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
  const [copied, setCopied] = useState(false)
  const plagiarismCheckerRef = useRef<HTMLElement>(null)
  const { toast } = useToast()

  const scrollToChecker = () => {
    plagiarismCheckerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const tools = [
    { name: "Plagiarism Checker", desc: "Detect copied content", href: "/", icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { name: "AI Detector", desc: "Identify AI-generated text", href: "/ai-detector", icon: Brain, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { name: "AI Humanizer", desc: "Make AI text sound human", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { name: "Paraphraser", desc: "Rewrite with new words", href: "/paraphraser", icon: RefreshCw, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
    { name: "Summarizer", desc: "Condense long text", href: "/summarizer", icon: FileText, color: "text-green-500", bgColor: "bg-green-500/10" },
    { name: "Grammar Checker", desc: "Fix grammar & spelling", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { name: "Image to Text", desc: "Extract text from images", href: "/image-to-text", icon: Image, color: "text-rose-500", bgColor: "bg-rose-500/10" },
    { name: "Speech to Text", desc: "Transcribe audio to text", href: "/speech-to-text", icon: Mic, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { name: "Word Counter", desc: "Count words & characters", href: "/word-counter", icon: Hash, color: "text-orange-500", bgColor: "bg-orange-500/10", isFree: true },
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

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("Failed to check plagiarism")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream available")
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (typeof data.progress === "number") {
              setProgress(data.progress)
            }

            if (data.result) {
              setResult({
                plagiarismPercentage: data.result.plagiarismPercentage,
                matches: data.result.matches || [],
              })
              await decrementWords(requiredTokens)
              toast({
                title: "Check Complete",
                description: `Plagiarism score: ${data.result.plagiarismPercentage}%`,
                variant: "success",
              })
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      setIsChecking(false)
    } catch (err) {
      console.error("Plagiarism check error:", err)
      setError("Failed to check plagiarism. Please try again.")
      setIsChecking(false)
      toast({
        title: "Error",
        description: "Failed to check plagiarism. Please try again.",
        variant: "destructive",
      })
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: "Copied!", description: "Text copied to clipboard", variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent dark:from-blue-950/20 dark:via-transparent pointer-events-none" />

        <div className="container mx-auto px-4 pt-16 pb-8 md:pt-24 md:pb-12 relative">
          <motion.div
            className="text-center max-w-4xl mx-auto space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Trust Badge */}
            <motion.div
              className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Shield className="h-4 w-4" />
              Trusted by students & professionals worldwide
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
              Ensure Your Writing is{" "}
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                100% Original
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              AI-powered plagiarism detection, content analysis, and writing tools — all in one platform. Check, detect, rewrite, and perfect your work.
            </p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Button
                size="lg"
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25 transition-all duration-200 rounded-xl text-base"
                onClick={scrollToChecker}
              >
                <Shield className="h-5 w-5 mr-2" />
                Check for Plagiarism
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-xl text-base border-2"
                asChild
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              className="flex flex-wrap justify-center gap-8 md:gap-12 pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {[
                { icon: Users, value: "500K+", label: "Active Users" },
                { icon: Globe, value: "50B+", label: "Sources Checked" },
                { icon: Zap, value: "<30s", label: "Avg. Results" },
              ].map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Plagiarism Checker Tool */}
      <section ref={plagiarismCheckerRef} className="py-8 md:py-12 scroll-mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-xl border border-gray-200/80 dark:border-gray-800 overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between px-6 md:px-8 pt-6 md:pt-8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Plagiarism Checker</h2>
                      <p className="text-sm text-muted-foreground">Paste text or upload a file to scan</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{wordCount.toLocaleString()}</span> words
                    <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
                    <span className="font-medium">{text.length.toLocaleString()}</span> chars
                  </div>
                </div>

                <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-5">
                  {/* Textarea */}
                  <div className="relative group">
                    <Textarea
                      placeholder="Paste your text here to check for plagiarism. You can also upload a .txt, .doc, or .pdf file using the button below..."
                      className="min-h-[220px] md:min-h-[280px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed rounded-xl transition-colors duration-200 pr-12"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />

                    {/* Inline Actions */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                      {text && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Copy text"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
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
                          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Upload file"
                        >
                          <Upload className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {/* Token warning */}
                  {text.trim() && calculateRequiredTokens(text) > remainingWords && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                    >
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Not enough tokens. You need {calculateRequiredTokens(text)} but have {remainingWords}.{" "}
                        <Link href="/pricing" className="font-semibold underline">
                          Upgrade your plan
                        </Link>
                      </p>
                    </motion.div>
                  )}

                  {/* Action Row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all duration-200 rounded-xl text-base"
                      onClick={handlePlagiarismCheck}
                      disabled={isChecking || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                    >
                      {isChecking ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Analyzing... {Math.round(progress)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          <span>Check for Plagiarism</span>
                          {text.trim() && (
                            <span className="text-blue-200 text-sm ml-1">({calculateRequiredTokens(text)} tokens)</span>
                          )}
                        </div>
                      )}
                    </Button>

                    {/* Mobile file upload */}
                    <div className="relative sm:hidden">
                      <input
                        type="file"
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl border-2"
                      >
                        <File className="h-5 w-5 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </div>

                  {/* Results */}
                  {(isChecking || result) && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <PlagiarismResults isChecking={isChecking} progress={progress} result={result} originalText={text} />
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase mb-3">
              9 Tools in One Platform
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              Everything You Need to Write Better
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From plagiarism checking to grammar correction, all the writing tools you need — powered by AI.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
              >
                <Link
                  href={tool.href}
                  className="group relative flex items-start gap-4 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/50 dark:bg-gray-900/30 hover:bg-white dark:hover:bg-gray-900/60 hover:shadow-lg transition-all duration-200"
                >
                  <div className={`flex-shrink-0 w-11 h-11 ${tool.bgColor} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{tool.desc}</p>
                  </div>
                  {tool.isFree && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full uppercase tracking-wider">
                      Free
                    </span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase mb-3">
              Simple Process
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How It Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Paste or Upload",
                desc: "Paste your text directly or upload a document file to get started.",
                icon: FileText,
              },
              {
                step: "02",
                title: "AI Analysis",
                desc: "Our AI scans your content against billions of sources in seconds.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Get Results",
                desc: "Receive a detailed report with highlighted matches and similarity scores.",
                icon: CheckCircle2,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/20">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Step {item.step}
                </span>
                <h3 className="text-lg font-semibold mt-2 mb-2 text-gray-900 dark:text-gray-100">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>

                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-6 h-5 w-5 text-gray-300 dark:text-gray-700" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase mb-3">
              Why Plagiacheck
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for Accuracy & Speed
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Deep Scanning",
                desc: "Check against billions of web pages, academic papers, and published content.",
                color: "text-blue-600",
                bg: "bg-blue-500/10",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Get comprehensive results in under 30 seconds with real-time streaming.",
                color: "text-amber-600",
                bg: "bg-amber-500/10",
              },
              {
                icon: GraduationCap,
                title: "Academic Grade",
                desc: "Trusted by students, researchers, and educators for academic integrity.",
                color: "text-green-600",
                bg: "bg-green-500/10",
              },
              {
                icon: Sparkles,
                title: "AI-Powered",
                desc: "Advanced AI models provide nuanced analysis beyond simple text matching.",
                color: "text-purple-600",
                bg: "bg-purple-500/10",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
              >
                <Card className="h-full p-6 border border-gray-200/80 dark:border-gray-800 hover:shadow-lg transition-shadow duration-200">
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-10 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Check Your Work?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Start with 1,000 free tokens. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-xl text-base shadow-lg"
                  onClick={scrollToChecker}
                >
                  Start Checking Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-2 border-white/30 text-white hover:bg-white/10 font-semibold rounded-xl text-base"
                  asChild
                >
                  <Link href="/pricing">See Plans</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />
    </div>
  )
}
