"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Mic, Copy, Check, Sparkles, Zap, FileAudio, Square, Trash2, ListChecks } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

export default function AudioSummarizer() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [summary, setSummary] = useState<{
    title?: string
    overview?: string
    keyPoints?: string[]
    detailedSummary?: string
    contentType?: string
    actionItems?: string[]
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const interimRef = useRef("")

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkSession()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth])

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) setIsSupported(false)
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setIsSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      let interimTranscript = ""
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " "
        } else {
          interimTranscript += result[0].transcript
        }
      }
      if (finalTranscript) {
        setRawTranscript((prev) => {
          const cleaned = prev.replace(interimRef.current, "").trim()
          interimRef.current = ""
          return (cleaned ? cleaned + " " : "") + finalTranscript.trim()
        })
      }
      interimRef.current = interimTranscript
    }

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start() } catch {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setError(null)

    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current
      recognitionRef.current = null
      ref.onend = null
      ref.stop()
    }
    setIsRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop() }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const calculateRequiredTokens = (text: string) => Math.ceil(text.length / 6)

  const handleSummarize = async () => {
    if (!user) { router.push("/signin"); return }
    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) { router.push("/pricing"); return }

    setIsProcessing(true)
    setSummary(null)
    setError(null)

    try {
      const response = await fetch("/api/voice-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawTranscript, tool: "audio-summarize" }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to summarize")

      setSummary(data.result)
      await decrementWords(requiredTokens)

      toast({
        title: "Audio Summarized",
        description: `${data.result.contentType || "Content"} summarized with ${data.result.keyPoints?.length || 0} key points`,
        variant: "success",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to summarize"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return
    const text = [
      summary.title && `# ${summary.title}`,
      summary.overview && `\n${summary.overview}`,
      summary.keyPoints?.length && `\n## Key Points\n${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      summary.detailedSummary && `\n## Detailed Summary\n${summary.detailedSummary}`,
      summary.actionItems?.length && `\n## Action Items\n${summary.actionItems.map((a, i) => `- ${a}`).join("\n")}`,
    ].filter(Boolean).join("\n")

    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: "Copied!", description: "Summary copied to clipboard", variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    stopRecording()
    setRawTranscript("")
    setSummary(null)
    setDuration(0)
    setError(null)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const quickFeatures = [
    { icon: FileAudio, text: "Audio Capture", color: "text-orange-600" },
    { icon: ListChecks, text: "Key Points", color: "text-emerald-600" },
    { icon: Sparkles, text: "AI Summary", color: "text-purple-600" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div className="text-center space-y-6 mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-medium">
            <FileAudio className="h-4 w-4" />
            Summarize lectures, meetings & podcasts
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">Audio Summarizer</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Record a lecture, meeting, or podcast and get an instant summary with key points, action items, and a detailed overview.
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {quickFeatures.map((feature, index) => (
              <motion.div key={index} className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}>
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {!isSupported && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
              <p className="text-amber-700 dark:text-amber-300 font-medium">Your browser does not support the Web Speech API.</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Please use Chrome, Edge, or Safari.</p>
            </motion.div>
          )}

          {/* Recording Control */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 focus-visible:ring-red-300"
                      : "bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/30 focus-visible:ring-orange-300"
                  } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <Square className="h-10 w-10 text-white fill-white" /> : <Mic className="h-10 w-10 text-white" />}
                  {isRecording && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                      <span className="absolute -inset-2 rounded-full border-2 border-red-400 animate-pulse opacity-40" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  {isRecording ? (
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-red-500 flex items-center gap-2 justify-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Recording...
                      </p>
                      <p className="text-2xl font-mono font-bold">{formatDuration(duration)}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {rawTranscript ? "Click to record more" : "Record a lecture, meeting, or podcast to summarize"}
                    </p>
                  )}
                </div>

                {rawTranscript && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{rawTranscript.split(/\s+/).filter(Boolean).length} words transcribed</span>
                    <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600 h-8">
                      <Trash2 className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Transcript + Paste */}
          <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  Transcript
                </h3>
                <Textarea
                  className="min-h-[150px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed"
                  value={rawTranscript}
                  onChange={(e) => setRawTranscript(e.target.value)}
                  placeholder="Record audio above or paste a transcript here..."
                />

                <Button
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg transition-all rounded-xl"
                  onClick={handleSummarize}
                  disabled={isProcessing || !rawTranscript.trim() || calculateRequiredTokens(rawTranscript) > remainingWords}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Summarizing...</>
                  ) : (
                    <><FileAudio className="mr-2 h-5 w-5" />Summarize Audio ({calculateRequiredTokens(rawTranscript)} tokens)</>
                  )}
                </Button>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                {calculateRequiredTokens(rawTranscript) > remainingWords && rawTranscript.trim() && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Not enough tokens. <Link href="/pricing" className="font-semibold underline ml-1">Upgrade your plan</Link>
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Summary Output */}
          {summary && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      {summary.title || "Audio Summary"}
                    </h3>
                    <div className="flex items-center gap-2">
                      {summary.contentType && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">
                          {summary.contentType}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                        {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  {/* Overview */}
                  {summary.overview && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800">
                      <p className="text-base leading-relaxed">{summary.overview}</p>
                    </div>
                  )}

                  {/* Key Points */}
                  {summary.keyPoints && summary.keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-orange-500" />
                        Key Points
                      </h4>
                      <ul className="space-y-2">
                        {summary.keyPoints.map((point, index) => (
                          <li key={index} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">{index + 1}</span>
                            <span className="text-sm leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Detailed Summary */}
                  {summary.detailedSummary && (
                    <div>
                      <h4 className="font-semibold mb-3">Detailed Summary</h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        {summary.detailedSummary.split("\n").map((p, i) => (
                          p.trim() ? <p key={i} className="text-sm leading-relaxed mb-2 last:mb-0">{p}</p> : null
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {summary.actionItems && summary.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Action Items</h4>
                      <ul className="space-y-2">
                        {summary.actionItems.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* How it works */}
          <motion.div className="mt-12 grid md:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            {[
              { step: "1", title: "Record or Paste", desc: "Record audio live or paste an existing transcript from a lecture, meeting, or podcast", color: "from-orange-500 to-orange-600" },
              { step: "2", title: "AI Summarizes", desc: "Our AI identifies key points, action items, and creates a structured summary", color: "from-amber-500 to-amber-600" },
              { step: "3", title: "Review & Share", desc: "Copy the summary, share with your team, or use with other Plagiacheck tools", color: "from-yellow-500 to-yellow-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.color} text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4`}>{item.step}</div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}
