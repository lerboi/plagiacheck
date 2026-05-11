"use client"
import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { ToolPageHeader } from "@/components/tool-page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Upload, Loader2, Shield, Copy, File, Check } from "lucide-react"
import { PlagiarismResults } from "@/components/plagiarism-results"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface PlagiarismMatch {
  text: string
  similarity: number
  startIndex?: number
  endIndex?: number
  reason?: string
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number
  matches: PlagiarismMatch[]
}

type PlagiarismResult = PlagiarismMatchResult | null

export default function PlagiarismCheckerContent() {
  const [text, setText] = useState("")
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [result, setResult] = useState<PlagiarismResult>(null)
  const { remainingWords, decrementWords, fetchRemainingWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user?.id) {
        fetchRemainingWords(session.user.id)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user?.id) {
        fetchRemainingWords(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth, fetchRemainingWords])

  useEffect(() => {
    if (!isChecking) return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < targetProgress) return Math.min(targetProgress, prev + 2)
        const ceiling =
          targetProgress < 30 ? 28 :
          targetProgress < 80 ? 78 :
          targetProgress < 100 ? 95 : 100
        if (prev < ceiling) return Math.min(ceiling, prev + 0.4)
        return prev
      })
    }, 120)
    return () => clearInterval(interval)
  }, [isChecking, targetProgress])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  const handlePlagiarismCheck = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!text.trim()) return

    const requiredTokens = calculateRequiredTokens(text)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsChecking(true)
    setProgress(0)
    setTargetProgress(0)
    setResult(null)
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/check-plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text }),
      })

      if (response.status === 401) {
        router.push("/signin")
        return
      }

      if (response.status === 402) {
        router.push("/pricing")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to check plagiarism")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream available")
      }

      const decoder = new TextDecoder()
      let resultReceived = false
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const newlineIndex = buffer.lastIndexOf("\n")
        if (newlineIndex === -1) continue
        const completeChunk = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)

        const lines = completeChunk.split("\n").filter((line) => line.startsWith("data: "))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (typeof data.progress === "number") {
              setTargetProgress(data.progress)
              if (data.progress >= 100) {
                setProgress(100)
              }
            }

            if (data.error) {
              setError(data.error)
              toast({
                title: "Error",
                description: data.error,
                variant: "destructive",
              })
            }

            if (data.result && !resultReceived) {
              resultReceived = true
              setResult({
                plagiarismPercentage: data.result.plagiarismPercentage,
                matches: data.result.matches || [],
              })
              await decrementWords()
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
    if (!file) return

    const ext = file.name.toLowerCase().split(".").pop() || ""
    const isPlainText = file.type.startsWith("text/") || ext === "txt" || ext === "md"

    if (!isPlainText) {
      toast({
        title: "Unsupported file format",
        description: `Only plain text (.txt, .md) is currently supported. For ${ext.toUpperCase()} files, copy and paste the text directly.`,
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setText(content)
    }
    reader.onerror = () => {
      toast({
        title: "Failed to read file",
        description: "Please try again or paste the text directly.",
        variant: "destructive",
      })
    }
    reader.readAsText(file)
    event.target.value = ""
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

      <ToolPageHeader
        icon={Shield}
        title="Plagiarism Checker"
        description="Detect copied or reused text with sentence-level highlighting. Paste your text or upload a .txt/.md file."
        category="Originality Detection"
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10 border-blue-500/20"
        categoryColor="text-blue-600 dark:text-blue-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-xl border border-gray-200/80 dark:border-gray-800 overflow-hidden">
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
              <div className="relative group">
                <Textarea
                  placeholder="Paste your text here to check for plagiarism. You can also upload a .txt or .md file using the button below..."
                  className="min-h-[220px] md:min-h-[280px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed rounded-xl transition-colors duration-200 pr-12"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

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
                      accept=".txt,.md,text/plain"
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

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

              {needsSignIn && !user && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Sign in to check for plagiarism</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Your text will be here when you get back.</p>
                    </div>
                  </div>
                  <Link
                    href="/signin?next=/plagiarism-checker"
                    className="shrink-0 h-9 px-4 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all duration-200 rounded-xl text-base"
                  onClick={handlePlagiarismCheck}
                  disabled={isChecking || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
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

                <div className="relative sm:hidden">
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
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
      </section>

      <FAQ />
    </div>
  )
}
