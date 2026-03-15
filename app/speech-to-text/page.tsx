"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mic, MicOff, Copy, Check, Zap, Shield, FileText, Sparkles, Trash2, Square } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [cleanedText, setCleanedText] = useState("")
  const [isCleaning, setIsCleaning] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [duration, setDuration] = useState(0)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)
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
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

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
        console.error("Speech recognition error:", event.error)
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      // Auto-restart if still in recording mode
      if (recognitionRef.current) {
        try {
          recognition.start()
        } catch {
          // Already started
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setError(null)

    // Start timer
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

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleCleanUp = async () => {
    if (!user) {
      router.push("/signin")
      return
    }

    if (!rawTranscript.trim()) return

    const requiredTokens = calculateRequiredTokens(rawTranscript)
    if (requiredTokens > remainingWords) {
      router.push("/pricing")
      return
    }

    setIsCleaning(true)
    setCleanedText("")
    setError(null)

    try {
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: rawTranscript, action: "clean" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to clean transcript")
      }

      setCleanedText(data.result.cleanedText || rawTranscript)
      await decrementWords(requiredTokens)

      toast({
        title: "Transcript Cleaned",
        description: `${data.result.changes || 0} corrections made`,
        variant: "success",
      })
    } catch (err) {
      console.error("Cleanup error:", err)
      const msg = err instanceof Error ? err.message : "Failed to clean transcript"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsCleaning(false)
    }
  }

  const handleCopy = async (text: string, type: "raw" | "clean") => {
    await navigator.clipboard.writeText(text)
    if (type === "raw") {
      setCopiedRaw(true)
      setTimeout(() => setCopiedRaw(false), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    toast({ title: "Copied!", description: "Text copied to clipboard", variant: "success" })
  }

  const clearAll = () => {
    stopRecording()
    setRawTranscript("")
    setCleanedText("")
    setDuration(0)
    setError(null)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const quickFeatures = [
    { icon: Mic, text: "Live Recording", color: "text-indigo-600" },
    { icon: Zap, text: "Real-time", color: "text-green-600" },
    { icon: Sparkles, text: "AI Cleanup", color: "text-purple-600" },
  ]

  const displayText = cleanedText || rawTranscript

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium">
            <Mic className="h-4 w-4" />
            Convert speech to text instantly
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Speech to Text
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Record lectures, interviews, or voice notes — get an instant transcript. Then use AI to clean up grammar, remove filler words, and format perfectly.
          </p>

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

        <div className="max-w-4xl mx-auto">
          {!isSupported && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center"
            >
              <p className="text-amber-700 dark:text-amber-300 font-medium">
                Your browser does not support the Web Speech API.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Please use Chrome, Edge, or Safari for speech recognition.
              </p>
            </motion.div>
          )}

          {/* Recording Control */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6">
                {/* Big mic button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isSupported}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 focus-visible:ring-red-300"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 focus-visible:ring-indigo-300"
                  } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <Square className="h-10 w-10 text-white fill-white" />
                  ) : (
                    <Mic className="h-10 w-10 text-white" />
                  )}
                  {/* Pulse animation when recording */}
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
                      <p className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                        {formatDuration(duration)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {rawTranscript ? "Click to record more" : "Click the microphone to start recording"}
                    </p>
                  )}
                </div>

                {/* Word count and controls */}
                {rawTranscript && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{rawTranscript.split(/\s+/).filter(Boolean).length} words transcribed</span>
                    <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-600 h-8">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Transcript Area */}
          {rawTranscript && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Raw transcript */}
              <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                      Raw Transcript
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(rawTranscript, "raw")} className="h-8">
                      {copiedRaw ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedRaw ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <Textarea
                    className="min-h-[150px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed"
                    value={rawTranscript}
                    onChange={(e) => setRawTranscript(e.target.value)}
                    placeholder="Transcript appears here as you speak..."
                  />

                  {/* AI Cleanup button */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-300 rounded-xl"
                      onClick={handleCleanUp}
                      disabled={isCleaning || !rawTranscript.trim() || calculateRequiredTokens(rawTranscript) > remainingWords}
                    >
                      {isCleaning ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cleaning Up...</>
                      ) : (
                        <><Sparkles className="mr-2 h-5 w-5" />AI Clean Up ({calculateRequiredTokens(rawTranscript)} tokens)</>
                      )}
                    </Button>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  {calculateRequiredTokens(rawTranscript) > remainingWords && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                    >
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Not enough tokens for AI cleanup.
                        <Link href="/pricing" className="font-semibold underline ml-1">Upgrade your plan</Link>
                      </p>
                    </motion.div>
                  )}
                </div>
              </Card>

              {/* Cleaned transcript */}
              {cleanedText && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          Cleaned Transcript
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(cleanedText, "clean")} className="h-8">
                          {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      </div>

                      <Textarea
                        className="min-h-[150px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed bg-green-50/50 dark:bg-green-900/10"
                        value={cleanedText}
                        readOnly
                      />

                      {/* Quick actions */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-muted-foreground mb-2">Use transcript with:</p>
                        <div className="flex flex-wrap gap-2">
                          <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            Plagiarism Check
                          </Link>
                          <Link href="/ai-detector" className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                            AI Detector
                          </Link>
                          <Link href="/summarizer" className="text-xs px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            Summarize
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* How it works */}
          <motion.div
            className="mt-12 grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { step: "1", title: "Record Audio", desc: "Click the microphone to start recording your speech in real-time", color: "from-indigo-500 to-indigo-600" },
              { step: "2", title: "AI Cleans Up", desc: "Our AI removes filler words, fixes grammar, and adds punctuation", color: "from-purple-500 to-purple-600" },
              { step: "3", title: "Use Anywhere", desc: "Copy the clean transcript or run it through our other writing tools", color: "from-blue-500 to-blue-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.color} text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4`}>
                  {item.step}
                </div>
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
