"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Pause, Play, Square, Sparkles, Zap, Shield } from "lucide-react"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"

const VOICES = [
  { value: "default", label: "Default" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export default function TextToSpeech() {
  const [text, setText] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [selectedVoice, setSelectedVoice] = useState("default")
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSupported, setIsSupported] = useState(true)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!window.speechSynthesis) {
      setIsSupported(false)
      return
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices.filter(v => v.lang.startsWith("en")))
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  const getVoice = useCallback(() => {
    if (availableVoices.length === 0) return null
    if (selectedVoice === "male") {
      return availableVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("james")) || availableVoices[0]
    }
    if (selectedVoice === "female") {
      return availableVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("samantha") || v.name.toLowerCase().includes("zira")) || availableVoices[0]
    }
    return availableVoices[0]
  }, [availableVoices, selectedVoice])

  const handleSpeak = () => {
    if (!text.trim()) return
    if (!window.speechSynthesis) return

    // Cancel any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.pitch = pitch

    const voice = getVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
      setProgress(0)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      setProgress(100)
    }

    utterance.onboundary = (event) => {
      if (text.length > 0) {
        setProgress(Math.min(100, Math.round((event.charIndex / text.length) * 100)))
      }
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      toast({ title: "Error", description: "Speech synthesis failed", variant: "destructive" })
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
    setProgress(0)
  }

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const estimatedTime = Math.ceil(wordCount / (150 * rate))

  const quickFeatures = [
    { icon: Volume2, text: "Natural Voices", color: "text-sky-600" },
    { icon: Zap, text: "Instant Playback", color: "text-green-600" },
    { icon: Shield, text: "Free to Use", color: "text-blue-600" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div className="text-center space-y-6 mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-4 py-2 rounded-full text-sm font-medium">
            <Volume2 className="h-4 w-4" />
            Listen to your text read aloud
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">Text to Speech</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Paste any text and listen to it read aloud. Perfect for proofreading by ear, accessibility, or turning articles into audio.
          </p>
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {quickFeatures.map((feature, index) => (
              <motion.div key={index} className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 rounded-full border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}>
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</span>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-sm">
              <Sparkles className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-green-700 dark:text-green-300">Free — no tokens required</span>
            </div>
          </div>
        </motion.div>

        {!isSupported && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
            <p className="text-amber-700 dark:text-amber-300 font-medium">Your browser does not support the Web Speech Synthesis API.</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Please use Chrome, Edge, or Safari.</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[2fr,1fr] gap-8 items-start max-w-6xl mx-auto">
          <motion.div className="space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Text</h3>
                  <span className="text-sm text-muted-foreground">{wordCount} words | ~{estimatedTime} min</span>
                </div>

                <Textarea
                  placeholder="Paste your essay, article, or any text here to hear it read aloud. Great for catching errors your eyes might miss..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 dark:focus:border-sky-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Progress bar */}
                {isSpeaking && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-3">
                  {!isSpeaking ? (
                    <Button
                      className="flex-1 h-12 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold shadow-lg transition-all rounded-xl"
                      onClick={handleSpeak}
                      disabled={!text.trim() || !isSupported}
                    >
                      <Play className="mr-2 h-5 w-5" /> Play
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1 h-12 font-semibold rounded-xl"
                        variant="outline"
                        onClick={isPaused ? handleResume : handlePause}
                      >
                        {isPaused ? <><Play className="mr-2 h-5 w-5" /> Resume</> : <><Pause className="mr-2 h-5 w-5" /> Pause</>}
                      </Button>
                      <Button
                        className="h-12 px-6 font-semibold rounded-xl"
                        variant="destructive"
                        onClick={handleStop}
                      >
                        <Square className="mr-2 h-4 w-4" /> Stop
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Settings Sidebar */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
            <Card className="sticky top-20 shadow-lg border-0 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Settings</h3>

                  {/* Voice selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Voice</label>
                    <div className="flex flex-wrap gap-2">
                      {VOICES.map((v) => (
                        <button
                          key={v.value}
                          onClick={() => setSelectedVoice(v.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedVoice === v.value
                              ? "bg-sky-500 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Speed: {rate}x</label>
                    <Slider min={0.5} max={2} step={0.1} value={[rate]} onValueChange={(v) => setRate(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5x</span>
                      <span>1x</span>
                      <span>2x</span>
                    </div>
                  </div>

                  {/* Pitch */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Pitch: {pitch}</label>
                    <Slider min={0.5} max={2} step={0.1} value={[pitch]} onValueChange={(v) => setPitch(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Normal</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-sky-100 dark:bg-sky-900/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-sky-600" />
                        <h4 className="font-semibold text-sky-900 dark:text-sky-300">Pro Tip</h4>
                      </div>
                      <p className="text-sm text-sky-700 dark:text-sky-400">
                        Listening to your essay read aloud helps catch awkward phrasing, run-on sentences, and errors your eyes skip over.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FAQ />
    </div>
  )
}
