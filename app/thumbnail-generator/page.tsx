"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Loader2, ImagePlus, Download, Copy, Maximize } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { ToolPageHeader } from "@/components/tool-page-header"

const STYLES = [
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "gradient", label: "Gradient" },
]

export default function ThumbnailGenerator() {
  const [text, setText] = useState("")
  const [style, setStyle] = useState("modern")
  const [svgOutput, setSvgOutput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remainingImageTokens, decrementImageTokens } = useTokenStore()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

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

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate thumbnail")

      setSvgOutput(data.result.svg || "")
      await decrementImageTokens(IMAGE_TOKEN_COST)

      toast({ title: "Thumbnail Generated", description: `${data.result.style || style} style cover image created`, variant: "success" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "thumbnail.svg"
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Downloaded!", description: "SVG file saved", variant: "success" })
  }

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(svgOutput)
    toast({ title: "Copied!", description: "SVG code copied to clipboard", variant: "success" })
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
          <span className="text-sm font-medium">Title or Topic</span>

          <input
            type="text"
            placeholder="e.g., 'The Future of Artificial Intelligence in Healthcare'"
            className="w-full h-11 px-3 text-sm rounded-lg border border-border bg-transparent outline-none transition-colors focus:border-violet-500 dark:focus:border-violet-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
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
        {svgOutput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Preview · 1200×630</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleCopySvg}><Copy className="h-3 w-3" />SVG</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={handleDownload}><Download className="h-3 w-3" />Download</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-black" style={{ aspectRatio: "1200/630" }}>
              <div dangerouslySetInnerHTML={{ __html: svgOutput }} className="w-full h-full" />
            </div>
          </div>
        )}

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

      <FAQ />
    </div>
  )
}
