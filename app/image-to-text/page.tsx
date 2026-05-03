"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ImageIcon, Upload, Copy, Check, Trash2, Shield } from "lucide-react"
import { useTokenStore, getAuthHeader } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { FAQ } from "@/components/FAQ"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"
import { ScanText } from "lucide-react"

export default function ImageToText() {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("image/png")
  const [extractedText, setExtractedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [confidence, setConfidence] = useState<string | null>(null)
  const [textType, setTextType] = useState<string | null>(null)
  const { remainingImageTokens, decrementImageTokens, fetchImageTokens } = useTokenStore()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        await fetchImageTokens(session.user.id)
      }
    }
    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchImageTokens(session.user.id)
      }
    })
    return () => { authListener.subscription.unsubscribe() }
  }, [supabase.auth, fetchImageTokens])

  const IMAGE_TOKEN_COST = 1

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WEBP)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB")
      return
    }

    setError(null)
    setMimeType(file.type)

    const previewReader = new FileReader()
    previewReader.onload = (e) => setImagePreview(e.target?.result as string)
    previewReader.readAsDataURL(file)

    const base64Reader = new FileReader()
    base64Reader.onload = (e) => {
      const result = e.target?.result as string
      const base64 = result.split(",")[1]
      setImageBase64(base64)
    }
    base64Reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) handleImageSelect(file)
        break
      }
    }
  }

  const clearImage = () => {
    setImagePreview(null)
    setImageBase64(null)
    setExtractedText("")
    setConfidence(null)
    setTextType(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleExtract = async () => {
    if (!user) {
      setNeedsSignIn(true)
      return
    }
    setNeedsSignIn(false)

    if (!imageBase64) return

    if (IMAGE_TOKEN_COST > remainingImageTokens) {
      toast({
        title: "Not enough image tokens",
        description: "Purchase image tokens to use this tool.",
        variant: "destructive",
      })
      router.push("/pricing")
      return
    }

    setIsProcessing(true)
    setExtractedText("")
    setError(null)

    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/image-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ imageBase64, mimeType }),
      })

      if (response.status === 401) { router.push("/signin"); return }
      if (response.status === 402) { router.push("/pricing"); return }
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract text")
      }

      setExtractedText(data.result.extractedText || "No text detected.")
      setConfidence(data.result.confidence || null)
      setTextType(data.result.textType || null)

      await decrementImageTokens(IMAGE_TOKEN_COST)

      toast({
        title: "Text Extracted",
        description: `Found ${data.result.wordCount || 0} words (${data.result.confidence} confidence)`,
        variant: "success",
      })
    } catch (err) {
      console.error("OCR error:", err)
      const msg = err instanceof Error ? err.message : "Failed to extract text"
      setError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractedText)
    setCopied(true)
    toast({ title: "Copied!", description: "Text copied to clipboard", variant: "success" })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background" onPaste={handlePaste}>
      <Nav />
      <ToolPageHeader
        icon={ScanText}
        title="Image to Text"
        description="Upload photos of documents, handwritten notes, screenshots, or any image. Our AI vision model extracts all visible text instantly."
        category="Visual Tools"
        gradient="from-rose-500/[0.07]"
        iconColor="text-rose-500"
        iconBg="bg-rose-500/10 border-rose-500/20"
        categoryColor="text-rose-600 dark:text-rose-400"
      />

      <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: Image Upload */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Upload Image</span>
              {imagePreview && (
                <Button variant="ghost" size="sm" onClick={clearImage} className="h-7 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {!imagePreview ? (
              <div
                className={`rounded-xl border-2 border-dashed min-h-[280px] flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                  isDragging
                    ? "border-rose-400 bg-rose-500/5"
                    : "border-border hover:border-rose-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium">Drop an image, click to upload, or paste</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={imagePreview}
                  alt="Uploaded image"
                  className="w-full h-auto max-h-[400px] object-contain bg-muted/30"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {!!user && IMAGE_TOKEN_COST > remainingImageTokens && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Need {IMAGE_TOKEN_COST} image token — you have {remainingImageTokens}.{" "}
                <Link href="/pricing" className="underline font-medium">Get more</Link>
              </p>
            )}

            {needsSignIn && !user && <ToolSignInPrompt />}

            <Button
              className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium"
              onClick={handleExtract}
              disabled={isProcessing || !imageBase64 || (!!user && IMAGE_TOKEN_COST > remainingImageTokens)}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting...</>
              ) : (
                <><ImageIcon className="mr-2 h-4 w-4" />Extract Text (1 image token)</>
              )}
            </Button>
          </div>

          {/* Right: Extracted Text */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Extracted Text</span>
            </div>

            {/* Confidence / type badge bar */}
            {extractedText && (
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {confidence && (
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    confidence === "high" ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : confidence === "medium" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}>
                    {confidence} confidence
                  </span>
                )}
                {textType && (
                  <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium capitalize">{textType}</span>
                )}
                <span className="text-muted-foreground">{extractedText.split(/\s+/).filter(Boolean).length} words extracted</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 ml-auto" onClick={handleCopy}>
                  {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </Button>
              </div>
            )}

            {/* Clean document card */}
            <div className="min-h-[280px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {extractedText || <span className="text-muted-foreground/40">Extracted text appears here</span>}
            </div>

            {extractedText && extractedText !== "No text detected." && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Use extracted text with:</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/" className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    Plagiarism Check
                  </Link>
                  <Link href="/ai-detector" className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    AI Detector
                  </Link>
                  <Link href="/grammar-checker" className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    Grammar Check
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ScanText className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">Printed &amp; Handwritten</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Extracts text from typed documents, handwritten notes, printed receipts, screenshots, and mixed-media images.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">Confidence Scoring</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Each extraction is rated as high, medium, or low confidence so you know where to double-check the output.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold">One-Click Copy &amp; Reuse</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Extracted text is immediately editable and can be piped into the Plagiarism Checker, Grammar Checker, or Summarizer.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Digitising handwritten lecture notes or meeting whiteboard photos
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Extracting text from screenshots of articles or social posts
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Converting scanned receipts or invoices into editable data
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Archiving physical documents into searchable text
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Extracting quotes or data from printed research papers
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-rose-500 font-bold shrink-0">→</span>
                  Ensure good lighting and a straight-on angle — blurry or skewed photos reduce accuracy significantly.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-rose-500 font-bold shrink-0">→</span>
                  For handwritten text, write clearly and avoid overlapping letters for the best extraction.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-rose-500 font-bold shrink-0">→</span>
                  High-resolution images (1MP+) produce noticeably better results than compressed photos.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-rose-500 font-bold shrink-0">→</span>
                  After extraction, run through the Grammar Checker to catch any OCR errors.
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
