"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Pause, Play, Square, Sparkles, Sliders } from "lucide-react"
import { FAQ } from "@/components/FAQ"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"

const VOICES = [
  { value: "default", label: "Default" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

const FAQ_ITEMS = [
  {
    question: "Is text to speech free?",
    answer:
      "Yes, completely free. It uses your browser's built-in SpeechSynthesis engine, so no tokens are consumed and no account is required.",
  },
  {
    question: "Why do the voices sound different on my phone versus my laptop?",
    answer:
      "Voices come from your device and operating system, not from our servers. Windows, macOS, Android, and iOS each ship different voices, so quality and selection vary by device.",
  },
  {
    question: "What do the rate and pitch controls do?",
    answer:
      "Rate controls how fast the text is read and pitch shifts the voice higher or lower. Both apply the next time you press play.",
  },
  {
    question: "Can it read long documents?",
    answer:
      "Yes. Long text is split into chunks behind the scenes, because some browsers cut off speech after a certain length. Playback continues seamlessly across chunks.",
  },
  {
    question: "Which browsers are supported?",
    answer:
      "Chrome, Edge, and Safari all support speech synthesis well. If you hear nothing, check your system volume and try a different voice from the list.",
  },
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
  const speakSessionRef = useRef(0)

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
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
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

  // Chrome silently stops long single utterances after ~15 seconds, so long
  // text is split into sentence-boundary chunks and queued sequentially.
  const splitIntoChunks = (input: string, maxLength = 200): string[] => {
    const sentences = input.match(/[^.!?\n]+[.!?]*\s*/g) || [input]
    const chunks: string[] = []
    let current = ""

    for (const sentence of sentences) {
      if (current && (current + sentence).length > maxLength) {
        chunks.push(current)
        current = sentence
      } else {
        current += sentence
      }
      // A single sentence longer than maxLength gets hard-split on word boundaries.
      while (current.length > maxLength) {
        let cut = current.lastIndexOf(" ", maxLength)
        if (cut <= 0) cut = maxLength
        chunks.push(current.slice(0, cut))
        current = current.slice(cut)
      }
    }
    if (current.trim()) chunks.push(current)

    return chunks.map((c) => c.trim()).filter(Boolean)
  }

  const handleSpeak = () => {
    if (!text.trim()) return
    if (!window.speechSynthesis) return

    const session = ++speakSessionRef.current
    window.speechSynthesis.cancel()

    const chunks = splitIntoChunks(text)
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const voice = getVoice()
    let spokenLength = 0

    const speakChunk = (index: number) => {
      if (session !== speakSessionRef.current) return
      if (index >= chunks.length) {
        utteranceRef.current = null
        setIsSpeaking(false)
        setIsPaused(false)
        setProgress(100)
        return
      }

      const chunk = chunks[index]
      const utterance = new SpeechSynthesisUtterance(chunk)
      utterance.rate = rate
      utterance.pitch = pitch
      if (voice) utterance.voice = voice

      utterance.onboundary = (event) => {
        if (session !== speakSessionRef.current || totalLength === 0) return
        setProgress(Math.min(100, Math.round(((spokenLength + event.charIndex) / totalLength) * 100)))
      }

      utterance.onend = () => {
        if (session !== speakSessionRef.current) return
        spokenLength += chunk.length
        speakChunk(index + 1)
      }

      utterance.onerror = () => {
        if (session !== speakSessionRef.current) return
        utteranceRef.current = null
        setIsSpeaking(false)
        setIsPaused(false)
        toast({ title: "Error", description: "Speech synthesis failed", variant: "destructive" })
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    setIsSpeaking(true)
    setIsPaused(false)
    setProgress(0)
    speakChunk(0)
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
    speakSessionRef.current++
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setIsSpeaking(false)
    setIsPaused(false)
    setProgress(0)
  }

  useEffect(() => {
    const sessionRef = speakSessionRef
    return () => {
      sessionRef.current++
      window.speechSynthesis?.cancel()
    }
  }, [])

  const wordCount = text.split(/\s+/).filter(Boolean).length
  const estimatedTime = Math.ceil(wordCount / (150 * rate))

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Volume2}
        title="Text to Speech"
        description="Paste any text and hear it read aloud with natural voices. Adjust speed and pitch. Great for proofreading by ear or accessibility. Free — no tokens needed."
        category="Voice Tools"
        gradient="from-sky-500/[0.07]"
        iconColor="text-sky-500"
        iconBg="bg-sky-500/10 border-sky-500/20"
        categoryColor="text-sky-600 dark:text-sky-400"
      />

      {!isSupported && (
        <div className="container max-w-5xl mx-auto px-4 pt-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-sm">Your browser does not support the Web Speech Synthesis API.</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Please use Chrome, Edge, or Safari.</p>
          </div>
        </div>
      )}

      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-4 items-start">
          {/* Main text + controls */}
          <div className="space-y-4">
            <Card className="rounded-xl border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Your Text</h3>
                  <span className="text-xs text-muted-foreground">{wordCount} words · ~{estimatedTime} min</span>
                </div>

                <Textarea
                  placeholder="Paste your essay, article, or any text here to hear it read aloud. Great for catching errors your eyes might miss..."
                  className="min-h-[280px] resize-none text-sm leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Text to read aloud"
                />

                {/* Progress bar */}
                {isSpeaking && (
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}

                {/* Live waveform visualization */}
                {isSpeaking && (
                  <div className="flex items-end justify-center gap-0.5 h-10 py-1">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full bg-sky-500 ${i % 2 === 0 ? "animate-bounce" : ""}`}
                        style={{
                          height: `${8 + Math.abs(Math.sin(i * 0.8)) * 20}px`,
                          animationDuration: `${0.5 + (i % 5) * 0.15}s`,
                          opacity: 0.7 + (i % 3) * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-2">
                  {!isSpeaking ? (
                    <Button
                      className="h-9 px-5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
                      onClick={handleSpeak}
                      disabled={!text.trim() || !isSupported}
                    >
                      <Play className="mr-2 h-4 w-4" /> Play
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="h-9 px-5 text-sm font-medium"
                        variant="outline"
                        onClick={isPaused ? handleResume : handlePause}
                      >
                        {isPaused ? <><Play className="mr-2 h-4 w-4" /> Resume</> : <><Pause className="mr-2 h-4 w-4" /> Pause</>}
                      </Button>
                      <Button
                        className="h-9 px-4 text-sm font-medium"
                        variant="destructive"
                        onClick={handleStop}
                      >
                        <Square className="mr-2 h-3.5 w-3.5" /> Stop
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div>
            <Card className="rounded-xl border border-border bg-card sticky top-20">
              <CardContent className="p-5">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold">Voice Settings</h3>

                  {/* Voice selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voice</label>
                    <div className="flex flex-wrap gap-1.5">
                      {VOICES.map((v) => (
                        <button
                          key={v.value}
                          onClick={() => setSelectedVoice(v.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedVoice === v.value
                              ? "bg-sky-500 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Speed: {rate}x</label>
                    <Slider min={0.5} max={2} step={0.1} value={[rate]} onValueChange={(v) => setRate(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5x</span>
                      <span>1x</span>
                      <span>2x</span>
                    </div>
                  </div>

                  {/* Pitch */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pitch: {pitch}</label>
                    <Slider min={0.5} max={2} step={0.1} value={[pitch]} onValueChange={(v) => setPitch(v[0])} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Normal</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                        <h4 className="text-xs font-semibold text-sky-900 dark:text-sky-300">Pro Tip</h4>
                      </div>
                      <p className="text-xs text-sky-700 dark:text-sky-400">
                        Listening to your essay read aloud helps catch awkward phrasing, run-on sentences, and errors your eyes skip over.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl mx-auto px-4 pb-6">
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Multiple Voices</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Choose from Default, Male, or Female voice profiles. The browser selects the best available system voice for your chosen preference.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Speed &amp; Pitch Control</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Adjust playback speed from 0.5× to 2× and pitch from low to high to find the most comfortable listening experience.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Free — No Account Needed</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Text to speech is completely free and requires no sign-in. No tokens are consumed, no limits on text length.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Proofreading your writing by hearing it read back — your ears catch mistakes your eyes miss
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Making written content accessible to people with reading difficulties
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Previewing how a script or narration sounds before recording
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Listening to articles or notes while doing something else
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  Language learners checking pronunciation of words and phrases
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  Slow the speed to 0.75× when proofreading technical or complex content — it&apos;s easier to catch errors.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  Listen to the first paragraph at normal speed to check the flow, then scan the rest.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  For long text, paste one section at a time to keep the playback focused.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-sky-500 font-bold shrink-0">→</span>
                  If a voice sounds robotic, try a different browser — Chrome typically has the best voices.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={FAQ_ITEMS} />
    </div>
  )
}
