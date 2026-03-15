"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ImagePlus, Sparkles, Zap, Download, Copy, Palette, Image as ImageIcon } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

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
    if (!user) { router.push("/signin"); return }
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
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tool: "thumbnail", options: { style } }),
      })

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

  const quickFeatures = [
    { icon: ImagePlus, text: "Cover Images", color: "text-violet-600" },
    { icon: Palette, text: "Multiple Styles", color: "text-pink-600" },
    { icon: Sparkles, text: "AI-Powered", color: "text-purple-600" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <motion.div className="text-center space-y-6 mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-2 rounded-full text-sm font-medium">
            <ImagePlus className="h-4 w-4" />
            Create stunning cover images
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">Thumbnail Generator</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Type your article title or topic and get a professional cover image instantly. Perfect for blogs, social media, and presentations.
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 text-sm">
              <ImageIcon className="h-4 w-4 text-violet-500" />
              <span className="font-semibold">{user ? remainingImageTokens : 0}</span>
              <span className="text-muted-foreground">image tokens remaining</span>
            </div>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            {/* Input Card */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-500" />
                  Title or Topic
                </h3>

                <input
                  type="text"
                  placeholder="e.g., 'The Future of Artificial Intelligence in Healthcare'"
                  className="w-full h-14 px-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-400 bg-transparent outline-none transition-colors"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Style selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Style</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStyle(s.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          style === s.value
                            ? "bg-violet-500 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white font-semibold shadow-lg transition-all rounded-xl"
                  onClick={handleGenerate}
                  disabled={isProcessing || !text.trim() || IMAGE_TOKEN_COST > remainingImageTokens}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Thumbnail...</>
                  ) : (
                    <><ImagePlus className="mr-2 h-5 w-5" />Generate Thumbnail ({IMAGE_TOKEN_COST} image tokens)</>
                  )}
                </Button>

                {IMAGE_TOKEN_COST > remainingImageTokens && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Not enough image tokens. <Link href="/pricing" className="font-semibold underline ml-1">Get more tokens</Link>
                    </p>
                  </motion.div>
                )}
              </div>
            </Card>

            {/* Output */}
            {svgOutput && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        Generated Thumbnail
                      </h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCopySvg} className="h-8">
                          <Copy className="h-4 w-4 mr-1" /> SVG
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8">
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-950 p-2" dangerouslySetInnerHTML={{ __html: svgOutput }} />
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* How it works */}
          <motion.div className="mt-12 grid md:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            {[
              { step: "1", title: "Enter Title", desc: "Type your article title, blog post name, or topic", color: "from-violet-500 to-violet-600" },
              { step: "2", title: "Pick a Style", desc: "Choose from modern, minimal, bold, or gradient styles", color: "from-purple-500 to-purple-600" },
              { step: "3", title: "Download", desc: "Get your thumbnail as SVG for any platform", color: "from-fuchsia-500 to-fuchsia-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
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
