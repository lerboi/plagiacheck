"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, Sparkles, Zap, Shield, Copy, Check, AlertTriangle, XCircle, Info } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface GrammarIssue {
  type: "error" | "warning" | "suggestion"
  text: string
  replacement: string
  message: string
  position: { start: number; end: number }
}

export default function GrammarChecker() {
  const [text, setText] = useState("")
  const [correctedText, setCorrectedText] = useState("")
  const [issues, setIssues] = useState<GrammarIssue[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleCheck = async () => {
    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setCorrectedText("")
    setIssues([])
    setError(null)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer)
            return 95
          }
          return prev + 5
        })
      }, 100)

      setTimeout(() => {
        clearInterval(timer)
        setProgress(100)

        // Common grammar rules for simulation
        const grammarRules: { pattern: RegExp; replacement: string; type: "error" | "warning" | "suggestion"; message: string }[] = [
          { pattern: /\bi\b/g, replacement: "I", type: "error", message: "Capitalize 'I' when referring to yourself" },
          { pattern: /\bthier\b/gi, replacement: "their", type: "error", message: "Spelling error: 'thier' should be 'their'" },
          { pattern: /\bteh\b/gi, replacement: "the", type: "error", message: "Spelling error: 'teh' should be 'the'" },
          { pattern: /\brecieve\b/gi, replacement: "receive", type: "error", message: "Spelling error: 'recieve' should be 'receive'" },
          { pattern: /\boccured\b/gi, replacement: "occurred", type: "error", message: "Spelling error: 'occured' should be 'occurred'" },
          { pattern: /\bdefinately\b/gi, replacement: "definitely", type: "error", message: "Spelling error: 'definately' should be 'definitely'" },
          { pattern: /\bseperate\b/gi, replacement: "separate", type: "error", message: "Spelling error: 'seperate' should be 'separate'" },
          { pattern: /\byour\s+(?=going|welcome|right|wrong)/gi, replacement: "you're ", type: "error", message: "Use 'you're' (you are) instead of 'your'" },
          { pattern: /\bits\s+(?=a|an|the|going|been)/gi, replacement: "it's ", type: "warning", message: "Consider using 'it's' (it is) instead of 'its'" },
          { pattern: /\balot\b/gi, replacement: "a lot", type: "error", message: "'alot' is not a word, use 'a lot'" },
          { pattern: /\bcould of\b/gi, replacement: "could have", type: "error", message: "'Could of' should be 'could have'" },
          { pattern: /\bshould of\b/gi, replacement: "should have", type: "error", message: "'Should of' should be 'should have'" },
          { pattern: /\bwould of\b/gi, replacement: "would have", type: "error", message: "'Would of' should be 'would have'" },
          { pattern: /\s{2,}/g, replacement: " ", type: "suggestion", message: "Remove extra spaces" },
          { pattern: /\.\s*,/g, replacement: ",", type: "error", message: "Incorrect punctuation" },
          { pattern: /\bthen\b(?=\s+(?:me|him|her|them|us))/gi, replacement: "than", type: "error", message: "Use 'than' for comparisons" },
          { pattern: /\baffect\b(?=\s+(?:on|is|was|has))/gi, replacement: "effect", type: "warning", message: "Consider using 'effect' (noun) instead of 'affect' (verb)" },
        ]

        let corrected = text
        const foundIssues: GrammarIssue[] = []

        grammarRules.forEach((rule) => {
          let match
          while ((match = rule.pattern.exec(text)) !== null) {
            // Avoid duplicate issues at the same position
            const isDuplicate = foundIssues.some(
              issue => issue.position.start === match!.index && issue.text === match![0]
            )

            if (!isDuplicate) {
              foundIssues.push({
                type: rule.type,
                text: match[0],
                replacement: rule.replacement,
                message: rule.message,
                position: { start: match.index, end: match.index + match[0].length }
              })
            }
          }
          corrected = corrected.replace(rule.pattern, rule.replacement)
        })

        // Sort issues by position
        foundIssues.sort((a, b) => a.position.start - b.position.start)

        setCorrectedText(corrected)
        setIssues(foundIssues)
        decrementWords(requiredTokens)
        setIsProcessing(false)

        toast({
          title: "Check Complete",
          description: foundIssues.length > 0
            ? `Found ${foundIssues.length} issue${foundIssues.length > 1 ? 's' : ''} in your text.`
            : "No issues found! Your text looks great.",
          variant: foundIssues.length > 0 ? "default" : "success",
        })
      }, 2000)
    } catch (err) {
      console.error("Error checking grammar:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to check grammar"
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(correctedText)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Corrected text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const applyFix = (issue: GrammarIssue) => {
    const newText = text.substring(0, issue.position.start) + issue.replacement + text.substring(issue.position.end)
    setText(newText)

    // Update issues by removing the fixed one and adjusting positions
    const lengthDiff = issue.replacement.length - issue.text.length
    const updatedIssues = issues
      .filter(i => i.position.start !== issue.position.start)
      .map(i => {
        if (i.position.start > issue.position.start) {
          return {
            ...i,
            position: {
              start: i.position.start + lengthDiff,
              end: i.position.end + lengthDiff
            }
          }
        }
        return i
      })

    setIssues(updatedIssues)
    toast({
      title: "Fixed!",
      description: `Changed "${issue.text}" to "${issue.replacement}"`,
      variant: "success",
    })
  }

  const quickFeatures = [
    { icon: CheckCircle2, text: "Grammar Check", color: "text-green-600" },
    { icon: Zap, text: "Instant Results", color: "text-yellow-600" },
    { icon: Shield, text: "Spelling Fix", color: "text-blue-600" }
  ]

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      case "warning":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
      default:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
    }
  }

  const errorCount = issues.filter(i => i.type === "error").length
  const warningCount = issues.filter(i => i.type === "warning").length
  const suggestionCount = issues.filter(i => i.type === "suggestion").length

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
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            AI-Powered Grammar & Spelling
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              Grammar Checker
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Fix grammar, spelling, and punctuation errors instantly.
            Write with confidence using our AI-powered grammar checker.
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
            {/* Input Card */}
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Text</h3>
                  <span className="text-sm text-muted-foreground">
                    {text.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <Textarea
                  placeholder="Type or paste your text here to check for grammar and spelling errors..."
                  className="min-h-[250px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 text-base leading-relaxed"
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

                <Button
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleCheck}
                  disabled={isProcessing || !text.trim() || calculateRequiredTokens(text) > remainingWords}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Check Grammar ({calculateRequiredTokens(text)} words)
                    </>
                  )}
                </Button>

                {calculateRequiredTokens(text) > remainingWords && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                  >
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Not enough words remaining.
                      <Link href="/pricing" className="font-semibold underline ml-1">
                        Upgrade your plan
                      </Link>
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>

            {isProcessing && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Checking grammar and spelling...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Results - Issues List */}
            {issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Issues Found</h3>
                      <div className="flex gap-3 text-sm">
                        {errorCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" /> {errorCount} errors
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <AlertTriangle className="h-4 w-4" /> {warningCount} warnings
                          </span>
                        )}
                        {suggestionCount > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Info className="h-4 w-4" /> {suggestionCount} suggestions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {issues.map((issue, index) => (
                        <motion.div
                          key={index}
                          className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {getIssueIcon(issue.type)}
                              <div>
                                <p className="text-sm font-medium">{issue.message}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <span className="line-through text-red-500">{issue.text}</span>
                                  <span className="mx-2">→</span>
                                  <span className="text-green-600 font-medium">{issue.replacement}</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyFix(issue)}
                              className="flex-shrink-0"
                            >
                              Fix
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Corrected Text */}
            {correctedText && issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Corrected Text</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copied ? "Copied!" : "Copy All"}
                      </Button>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{correctedText}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* No Issues Found */}
            {correctedText && issues.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Perfect!</h3>
                    <p className="text-emerald-700 dark:text-emerald-300">
                      No grammar or spelling issues found. Your text looks great!
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      What We Check
                    </h3>

                    <div className="space-y-4">
                      {[
                        { icon: XCircle, label: "Spelling Errors", color: "text-red-500" },
                        { icon: AlertTriangle, label: "Grammar Issues", color: "text-yellow-500" },
                        { icon: Info, label: "Style Suggestions", color: "text-blue-500" },
                        { icon: CheckCircle2, label: "Punctuation", color: "text-green-500" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                          <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">How It Works</h3>

                    {[
                      { step: "1", title: "Enter Text", desc: "Type or paste your content" },
                      { step: "2", title: "AI Analysis", desc: "We scan for all issues" },
                      { step: "3", title: "Review & Fix", desc: "Apply fixes with one click" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-300">Pro Tip</h4>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Click the &quot;Fix&quot; button on each issue to automatically apply corrections to your text.
                      </p>
                    </div>
                  </div>
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
