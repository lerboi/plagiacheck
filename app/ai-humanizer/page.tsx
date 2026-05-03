"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Wand2, Copy, Check, Download, ArrowLeftRight, BarChart, Sliders } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

export default function AIHumanizer() {
  const [text, setText] = useState("")
  const [humanizedText, setHumanizedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const { remainingWords, decrementWords } = useTokenStore()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [humanizationLevel, setHumanizationLevel] = useState(50)
  const [tone, setTone] = useState("casual")
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<"split" | "stacked">("split")
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

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

  const calculateRequiredTokens = (text: string) => {
    return Math.ceil(text.length / 6)
  }

  const handleHumanize = async () => {
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

    setIsProcessing(true)
    setHumanizedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          text,
          tool: "humanize",
          options: { tone, level: humanizationLevel }
        }),
      })

      if (response.status === 401) {
        router.push("/signin")
        return
      }
      if (response.status === 402) {
        router.push("/pricing")
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to humanize text")
      }

      setHumanizedText(data.result.humanizedText || text)
      await decrementWords(requiredTokens)

      toast({
        title: "Humanization Complete",
        description: "Your text has been successfully humanized.",
        variant: "success",
      })
    } catch (err) {
      console.error("Error humanizing text:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to humanize"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(humanizedText)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Humanized text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([humanizedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "humanized.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const tones = [
    { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
    { value: "professional", label: "Professional", desc: "Business appropriate" },
    { value: "academic", label: "Academic", desc: "Scholarly and formal" },
    { value: "friendly", label: "Friendly", desc: "Warm and approachable" },
    { value: "persuasive", label: "Persuasive", desc: "Compelling and convincing" },
  ]

  // Jaccard distance over word multisets — robust to insertions/deletions
  // (the previous positional index diff inflated wildly on length changes).
  const getChangedWords = () => {
    if (!text || !humanizedText) return { original: 0, output: 0, percentage: 0 }
    const tokenize = (s: string) =>
      s.toLowerCase().split(/\s+/).filter(Boolean)

    const orig = tokenize(text)
    const out = tokenize(humanizedText)
    if (orig.length === 0 || out.length === 0) {
      return { original: orig.length, output: out.length, percentage: 0 }
    }

    const counts = new Map<string, number>()
    orig.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1))
    let shared = 0
    out.forEach((w) => {
      const c = counts.get(w) || 0
      if (c > 0) {
        shared++
        counts.set(w, c - 1)
      }
    })

    const union = orig.length + out.length - shared
    const distance = union > 0 ? 1 - shared / union : 0
    return {
      original: orig.length,
      output: out.length,
      percentage: Math.round(distance * 100),
    }
  }

  const changes = getChangedWords()

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Wand2}
        title="AI Humanizer"
        description="Transform AI-generated text into natural, human-sounding writing. Adjust the humanization level and choose a tone that fits your voice."
        category="AI Tools"
        gradient="from-pink-500/[0.07]"
        iconColor="text-pink-500"
        iconBg="bg-pink-500/10 border-pink-500/20"
        categoryColor="text-pink-600 dark:text-pink-400"
      />
      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {needsSignIn && !user && <ToolSignInPrompt />}

        {!!user && text.trim() && calculateRequiredTokens(text) > remainingWords && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Need {calculateRequiredTokens(text)} tokens — you have {remainingWords}.{" "}
            <Link href="/pricing" className="underline font-medium">Upgrade</Link>
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Level</Label>
            <div className="w-28">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Humanization Level</span>
                <span className="font-medium tabular-nums">{humanizationLevel}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[humanizationLevel]}
                onValueChange={(value) => setHumanizationLevel(value[0])}
                className="w-full"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {humanizationLevel < 34 ? "Light" : humanizationLevel < 67 ? "Medium" : "Heavy"}
            </span>
          </div>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col">
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === "split" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("split")}
              className="h-7 text-xs px-2"
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              Side by side
            </Button>
            <Button
              variant={viewMode === "stacked" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("stacked")}
              className="h-7 text-xs px-2"
            >
              Stacked
            </Button>
          </div>
        </div>

        <div className={viewMode === "split" ? "grid lg:grid-cols-2 gap-4" : "space-y-4"}>
          {/* LEFT — input */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs font-medium text-muted-foreground">Original (AI Text)</span>
            </div>
            <Textarea
              placeholder="Paste your AI-generated text here to humanize it..."
              className="min-h-[360px] resize-none rounded-xl border-border bg-background text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-pink-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{text.length} chars</span>
              <Button
                onClick={handleHumanize}
                disabled={isProcessing || !text.trim() || (!!user && calculateRequiredTokens(text) > remainingWords)}
                className="h-9 px-5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium shadow-none"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
                ) : (
                  `Humanize (${calculateRequiredTokens(text)} tokens)`
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — output */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-muted-foreground">Humanized</span>
            </div>
            {humanizedText && (
              <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-border bg-card text-xs flex-wrap gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Words changed</span>
                  <span className="font-semibold text-pink-600 dark:text-pink-400">{changes.percentage}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Original</span>
                  <span className="font-semibold tabular-nums">{text.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Result</span>
                  <span className="font-semibold tabular-nums">{humanizedText.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopy}>
                    {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
                    <Download className="h-3 w-3" />Download
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => setViewMode(viewMode === "split" ? "stacked" : "split")}
                  >
                    {viewMode === "split" ? "Stack" : "Split"}
                  </Button>
                </div>
              </div>
            )}
            <div className="min-h-[320px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {humanizedText || <span className="text-muted-foreground/40">Humanized text appears here</span>}
            </div>
          </div>
        </div>
        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">Five Tone Options</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Casual, Professional, Friendly, Confident, or Empathetic — match the humanized output to the context you&apos;re writing for.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">Humanization Level</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">A 0–100 slider controls how aggressively the text is rewritten. Lower levels preserve structure; higher levels fully rephrase.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-pink-500" />
                <h3 className="text-sm font-semibold">Change Percentage</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">See exactly what percentage of words were changed so you can calibrate the output without going too far.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  Making AI-drafted emails, proposals, or reports sound natural before sending
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  Students humanising AI-assisted study notes to avoid detection
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  Content creators adjusting AI copy to match their personal brand voice
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  Marketers ensuring AI-generated ad copy doesn&apos;t sound robotic
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                  Anyone who used AI to draft something but wants it to sound like them
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  Start at level 40–60 — aggressive humanization (80+) can change meaning in unexpected ways.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  Professional tone pairs well with formal reports; Casual works best for social content.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  After humanizing, run the result through the AI Detector to verify the score dropped.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-pink-500 font-bold shrink-0">→</span>
                  If the result sounds off, try a different tone with the same level rather than increasing the level.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ />
    </div>
  )
}
