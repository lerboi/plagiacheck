"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Mic, MicOff, Copy, Check, Sparkles, Zap, FileEdit, Square, Trash2 } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

export default function VoiceToEssay() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [essay, setEssay] = useState("")
  const [essayTitle, setEssayTitle] = useState("")
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

  const handleConvert = async () => {
    if (!user) { router.push("/signin"); return }
    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) { router.push("/pricing"); return }

    setIsProcessing(true)
    setEssay("")
    setEssayTitle("")
    setError(null)

    try {
      const response = await fetch("/api/voice-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawTranscript, tool: "voice-to-essay" }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to convert to essay")

      setEssay(data.result.essay || rawTranscript)
      setEssayTitle(data.result.title || "")
      await decrementWords(requiredTokens)

      toast({
        title: "Essay Generated",
        description: `"${data.result.title}" — ${data.result.wordCount || 0} words, ${data.result.paragraphCount || 0} paragraphs`,
        variant: "success",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to convert"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    const fullText = essayTitle ? `${essayTitle}\n\n${essay}` : essay
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    toast({ title: "Copied!", description: "Essay copied to clipboard", variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    stopRecording()
    setRawTranscript("")
    setEssay("")
    setEssayTitle("")
    setDuration(0)
    setError(null)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const quickFeatures = [
    { icon: Mic, text: "Voice Input", color: "text-sky-600" },
    { icon: FileEdit, text: "Structured Essay", color: "text-emerald-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div className="text-center space-y-6 mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-4 py-2 rounded-full text-sm font-medium">
            <FileEdit className="h-4 w-4" />
            Speak your ideas, get a polished essay
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">Voice Notes to Essay</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Record your thoughts by speaking, and our AI transforms your voice notes into a well-structured, polished essay with proper paragraphs, transitions, and formatting.
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
                      : "bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/30 focus-visible:ring-sky-300"
                  } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <Square className="h-10 w-10 text-white fill-white" />
                  ) : (
                    <Mic className="h-10 w-10 text-white" />
                  )}
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
                      {rawTranscript ? "Click to record more" : "Speak your essay ideas — the AI will structure it for you"}
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

          {/* Transcript + Convert */}
          {rawTranscript && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-500" />
                    Voice Notes
                  </h3>
                  <Textarea
                    className="min-h-[150px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed"
                    value={rawTranscript}
                    onChange={(e) => setRawTranscript(e.target.value)}
                    placeholder="Your voice notes appear here..."
                  />

                  <Button
                    className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg transition-all rounded-xl"
                    onClick={handleConvert}
                    disabled={isProcessing || !rawTranscript.trim() || calculateRequiredTokens(rawTranscript) > remainingWords}
                  >
                    {isProcessing ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Essay...</>
                    ) : (
                      <><FileEdit className="mr-2 h-5 w-5" />Convert to Essay ({calculateRequiredTokens(rawTranscript)} tokens)</>
                    )}
                  </Button>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {calculateRequiredTokens(rawTranscript) > remainingWords && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Not enough tokens. <Link href="/pricing" className="font-semibold underline ml-1">Upgrade your plan</Link>
                      </p>
                    </motion.div>
                  )}
                </div>
              </Card>

              {/* Essay Output */}
              {essay && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500" />
                          {essayTitle || "Generated Essay"}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                          {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>

                      <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="prose dark:prose-invert max-w-none">
                          {essay.split("\n").map((paragraph, i) => (
                            paragraph.trim() ? <p key={i} className="text-base leading-relaxed mb-3 last:mb-0">{paragraph}</p> : null
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{essay.split(/\s+/).filter(Boolean).length} words</span>
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{essay.split("\n").filter(p => p.trim()).length} paragraphs</span>
                      </div>

                      {/* Quick actions */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-muted-foreground mb-2">Use your essay with:</p>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Plagiarism Check</Link>
                          <Link href="/grammar-checker" className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">Grammar Check</Link>
                          <Link href="/ai-humanizer" className="text-xs px-3 py-1.5 rounded-full border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">Humanize</Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* How it works */}
          <motion.div className="mt-12 grid md:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            {[
              { step: "1", title: "Speak Your Ideas", desc: "Record your thoughts, arguments, or outline for your essay", color: "from-sky-500 to-sky-600" },
              { step: "2", title: "AI Writes Essay", desc: "Our AI structures your speech into a polished essay with intro, body, and conclusion", color: "from-emerald-500 to-emerald-600" },
              { step: "3", title: "Edit & Use", desc: "Copy your essay, check for plagiarism, or run through grammar checker", color: "from-blue-500 to-blue-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
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
