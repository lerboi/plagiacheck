"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Loader2, ImagePlus, Download, Copy, Maximize, Trash2 } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ResultReveal } from "@/components/plagia-ai/ResultReveal"

const STYLES = [
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "gradient", label: "Gradient" },
]

const MAX_INPUT_CHARS = 2000

function sanitizeFilename(name: string | null | undefined, fallback: string): string {
  const cleaned = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return cleaned || fallback
}

const FAQ_ITEMS = [
  {
    question: "What size are the thumbnails?",
    answer:
      "1200 x 630 pixels, the standard Open Graph size for link previews on social platforms. Because the output is SVG, it also scales cleanly to other sizes.",
  },
  {
    question: "How are the colors chosen?",
    answer:
      "The AI picks a palette to match the vibe of your topic and the style you select (modern, minimal, bold, or gradient). Regenerate to get a different palette and layout.",
  },
  {
    question: "What can I use the thumbnails for?",
    answer:
      "Blog covers, Open Graph and social share images, and YouTube thumbnails. For YouTube, note its preferred size is 1280 x 720 — the SVG scales, but you may want to crop to 16:9.",
  },
  {
    question: "How does generation work under the hood?",
    answer:
      "The AI produces a spec (title, subtitle, palette, vibe) and the cover is rendered deterministically from a template, so the text is always crisp and correctly spelled.",
  },
  {
    question: "How much does a thumbnail cost?",
    answer:
      "2 image tokens per generation. Failed generations are refunded automatically.",
  },
]

export default function ThumbnailGenerator() {
  const [text, setText] = useState("")
  const [style, setStyle] = useState("modern")
  const [svgOutput, setSvgOutput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remainingImageTokens, syncImageBalance } = useTokenStore()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const generationRef = useRef(0)

  const IMAGE_TOKEN_COST = 2

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

  const handleGenerate = async () => {
    if (!user) { setNeedsSignIn(true); return }
    setNeedsSignIn(false)
    if (!text.trim()) return

    if (IMAGE_TOKEN_COST > remainingImageTokens) {
      toast({ title: "Not enough image tokens", description: "Purchase image tokens to generate thumbnails.", variant: "destructive" })
      router.push("/pricing")
      return
    }

    const generation = ++generationRef.current
    setIsProcessing(true)
    setSvgOutput("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, tool: "thumbnail", options: { style } }),
      })

      if (response.status === 401) { router.push("/signin?next=/thumbnail-generator"); return }
      if (response.status === 402) {
        toast({ title: "Not enough image tokens", description: "Purchase image tokens to generate thumbnails.", variant: "destructive" })
        await syncImageBalance()
        router.push("/pricing")
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate thumbnail")
      if (generation !== generationRef.current) return

      setSvgOutput(data.result.svg || "")
      await syncImageBalance(data.remainingImageTokens)

      toast({ title: "Thumbnail Generated", description: `${data.result.style || style} style cover image created`, variant: "success" })
    } catch (err) {
      if (generation !== generationRef.current) return
      const msg = err instanceof Error ? err.message : "Failed to generate"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    generationRef.current++
    setText("")
    setSvgOutput("")
    setError(null)
  }

  const handleDownload = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sanitizeFilename(text, "thumbnail")}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
    toast({ title: "Downloaded!", description: "SVG file saved", variant: "success" })
  }

  const handleCopySvg = async () => {
    if (!svgOutput) return
    try {
      await navigator.clipboard.writeText(svgOutput)
      toast({ title: "Copied!", description: "SVG code copied to clipboard", variant: "success" })
    } catch {
      toast({ title: "Copy failed", description: "Could not access the clipboard", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={ImagePlus}
        title="Thumbnail Generator"
        description="Type your article title or topic and instantly get a professional cover image. Choose from Modern, Minimal, Bold, or Gradient styles. Download as SVG."
        category="Visual Tools"
        gradient="from-violet-500/[0.07]"
        iconColor="text-violet-500"
        iconBg="bg-violet-500/10 border-violet-500/20"
        categoryColor="text-violet-600 dark:text-violet-400"
      />

      <section className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Input card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Title or Topic</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">{text.length}/{MAX_INPUT_CHARS}</span>
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={isProcessing} className="h-7 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <input
            type="text"
            placeholder="e.g., 'The Future of Artificial Intelligence in Healthcare'"
            className="w-full h-11 px-3 text-sm rounded-lg border border-border bg-transparent outline-none transition-colors focus:border-violet-500 dark:focus:border-violet-400"
            value={text}
            maxLength={MAX_INPUT_CHARS}
            onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_CHARS))}
          />

          {/* Style selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Style</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    style === s.value
                      ? "bg-violet-500/10 border-violet-500 text-violet-600 dark:text-violet-400"
                      : "border-border hover:border-violet-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {!!user && IMAGE_TOKEN_COST > remainingImageTokens && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Need {IMAGE_TOKEN_COST} image tokens — you have {remainingImageTokens}.{" "}
              <Link href="/pricing" className="underline font-medium">Get more</Link>
            </p>
          )}

          {needsSignIn && !user && <ToolSignInPrompt />}

          <Button
            className="h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
            onClick={handleGenerate}
            disabled={isProcessing || !text.trim() || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><ImagePlus className="mr-2 h-4 w-4" />Generate Thumbnail ({IMAGE_TOKEN_COST} image tokens)</>
            )}
          </Button>
        </div>

        {/* SVG Output */}
        <ResultReveal show={!!svgOutput}>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Preview · 1200×630</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}><Copy className="h-3 w-3" />SVG</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}><Download className="h-3 w-3" />Download</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-black" style={{ aspectRatio: "1200/630" }}>
              <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full h-full [&>svg]:w-full [&>svg]:h-auto" />
            </div>
          </div>
        </ResultReveal>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">Four Distinct Styles</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Modern, Minimal, Bold, and Gradient — each produces a visually different cover image suited to different content types and platforms.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Maximize className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">Standard 1200×630 Format</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">All thumbnails are generated at the standard Open Graph image size — ideal for blog headers, YouTube, LinkedIn, and Twitter cards.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-semibold">SVG Export</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Download the thumbnail as a scalable SVG for use in any design tool, or paste it directly into your content management system.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Creating blog post featured images without a designer
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Generating YouTube video thumbnails from a video title
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Making consistent cover images for a newsletter or email series
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Producing social media header images for multiple posts quickly
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  Previewing how a title looks as a visual before committing to a design
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-violet-500 font-bold shrink-0">→</span>
                  Keep your title under 6 words for the clearest visual impact — longer titles get compressed and harder to read.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-violet-500 font-bold shrink-0">→</span>
                  Modern and Gradient styles work best for tech and business content; Minimal suits editorial and design blogs.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-violet-500 font-bold shrink-0">→</span>
                  SVGs can be customised in Figma or Illustrator if you need to change fonts, add a logo, or adjust colours.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-violet-500 font-bold shrink-0">→</span>
                  Generate a few variations using different styles for the same title and compare before deciding.
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
