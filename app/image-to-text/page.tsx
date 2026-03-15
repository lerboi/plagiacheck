"use client"

import { useState, useEffect, useRef } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Image, Upload, Copy, Check, Zap, Shield, FileText, Trash2, ArrowRight } from "lucide-react"
import { useTokenStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function ImageToText() {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>("image/png")
  const [extractedText, setExtractedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
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

  const IMAGE_TOKEN_COST = 1 // 1 image token per extraction

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

    // Preview
    const previewReader = new FileReader()
    previewReader.onload = (e) => setImagePreview(e.target?.result as string)
    previewReader.readAsDataURL(file)

    // Base64 for API
    const base64Reader = new FileReader()
    base64Reader.onload = (e) => {
      const result = e.target?.result as string
      // Remove data:image/xxx;base64, prefix
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
      router.push("/signin")
      return
    }

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
      const response = await fetch("/api/image-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      })

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

  const quickFeatures = [
    { icon: Image, text: "OCR Powered", color: "text-rose-600" },
    { icon: Zap, text: "Instant Results", color: "text-green-600" },
    { icon: Shield, text: "AI Vision", color: "text-blue-600" },
  ]

  return (
    <div className="min-h-screen" onPaste={handlePaste}>
      <Nav />

      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-full text-sm font-medium">
            <Image className="h-4 w-4" />
            Extract text from any image
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Image to Text
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Upload photos of documents, handwritten notes, screenshots, or any image — our AI extracts the text instantly so you can check, edit, or analyze it.
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

          {/* Image token display */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-sm">
              <Image className="h-4 w-4 text-rose-500" />
              <span className="font-semibold">{user ? remainingImageTokens : 0}</span>
              <span className="text-muted-foreground">image tokens remaining</span>
            </div>
          </div>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Left: Image Upload */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    Upload Image
                  </h3>
                  {imagePreview && (
                    <Button variant="ghost" size="sm" onClick={clearImage} className="h-8 text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {!imagePreview ? (
                  <div
                    className={`relative border-2 border-dashed rounded-xl min-h-[300px] flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer ${
                      isDragging
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
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
                    <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-rose-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Drop an image here, click to upload, or paste
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={imagePreview}
                      alt="Uploaded image"
                      className="w-full h-auto max-h-[400px] object-contain bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <Button
                  className="w-full h-12 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold shadow-lg transition-all duration-300 rounded-xl"
                  onClick={handleExtract}
                  disabled={isProcessing || !imageBase64 || IMAGE_TOKEN_COST > remainingImageTokens}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Extracting Text...</>
                  ) : (
                    <><Image className="mr-2 h-5 w-5" />Extract Text (1 image token)</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Right: Extracted Text */}
            <Card className="p-6 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Extracted Text
                  </h3>
                  {extractedText && (
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                      {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                </div>

                <Textarea
                  placeholder="Extracted text will appear here..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 dark:border-gray-700 text-base leading-relaxed bg-green-50/50 dark:bg-green-900/10"
                  value={extractedText}
                  readOnly
                />

                {confidence && textType && (
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      confidence === "high"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {confidence} confidence
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                      {textType} text
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium">
                      {extractedText.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                )}

                {/* Quick actions with extracted text */}
                {extractedText && extractedText !== "No text detected." && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
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
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div
            className="mt-12 grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { step: "1", title: "Upload Image", desc: "Drag & drop, click to upload, or paste from clipboard", color: "from-rose-500 to-rose-600" },
              { step: "2", title: "AI Extracts Text", desc: "Our AI vision model reads printed, handwritten, or screen text", color: "from-pink-500 to-pink-600" },
              { step: "3", title: "Use Your Text", desc: "Copy, check for plagiarism, or run through any of our tools", color: "from-blue-500 to-blue-600" },
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900">
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
