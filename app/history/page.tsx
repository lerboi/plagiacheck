"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  Image,
  Mic,
  BarChart3,
  ImagePlus,
  PieChart,
  Volume2,
  FileEdit,
  FileAudio,
  Pen,
  ImageIcon,
  AudioLines,
  Coins,
  type LucideIcon,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useTokenStore } from "@/lib/store"

interface Tool {
  name: string
  description: string
  href: string
  icon: LucideIcon
  color: string
  bgColor: string
  iconColor: string
  isFree?: boolean
  usesImageTokens?: boolean
}

interface ToolCategory {
  label: string
  description: string
  icon: LucideIcon
  accentColor: string
  accentBg: string
  tools: Tool[]
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { remainingWords, remainingImageTokens } = useTokenStore()
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (!session?.user) {
        router.push("/signin")
        return
      }

      setIsLoading(false)
    }

    checkSession()
  }, [supabase.auth, router])

  const categories: ToolCategory[] = [
    {
      label: "Writing Tools",
      description: "Analyze, improve, and transform your text",
      icon: Pen,
      accentColor: "text-blue-500",
      accentBg: "bg-blue-500/10",
      tools: [
        {
          name: "Plagiarism Checker",
          description: "Check your text for plagiarism against billions of sources",
          href: "/",
          icon: Shield,
          color: "from-blue-500 to-blue-600",
          bgColor: "bg-blue-50 dark:bg-blue-950/40",
          iconColor: "text-blue-600 dark:text-blue-400",
        },
        {
          name: "AI Detector",
          description: "Detect if text was written by AI or a human",
          href: "/ai-detector",
          icon: Brain,
          color: "from-purple-500 to-purple-600",
          bgColor: "bg-purple-50 dark:bg-purple-950/40",
          iconColor: "text-purple-600 dark:text-purple-400",
        },
        {
          name: "AI Humanizer",
          description: "Transform AI-generated text to sound more human",
          href: "/ai-humanizer",
          icon: Wand2,
          color: "from-pink-500 to-pink-600",
          bgColor: "bg-pink-50 dark:bg-pink-950/40",
          iconColor: "text-pink-600 dark:text-pink-400",
        },
        {
          name: "Paraphraser",
          description: "Rewrite your text with different words and style",
          href: "/paraphraser",
          icon: RefreshCw,
          color: "from-cyan-500 to-cyan-600",
          bgColor: "bg-cyan-50 dark:bg-cyan-950/40",
          iconColor: "text-cyan-600 dark:text-cyan-400",
        },
        {
          name: "Summarizer",
          description: "Condense long text into key points",
          href: "/summarizer",
          icon: FileText,
          color: "from-green-500 to-green-600",
          bgColor: "bg-green-50 dark:bg-green-950/40",
          iconColor: "text-green-600 dark:text-green-400",
        },
        {
          name: "Grammar Checker",
          description: "Fix spelling and grammar errors instantly",
          href: "/grammar-checker",
          icon: CheckCircle2,
          color: "from-emerald-500 to-emerald-600",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
          name: "Word Counter",
          description: "Count words, characters, sentences, and reading time",
          href: "/word-counter",
          icon: Hash,
          color: "from-orange-500 to-orange-600",
          bgColor: "bg-orange-50 dark:bg-orange-950/40",
          iconColor: "text-orange-600 dark:text-orange-400",
          isFree: true,
        },
      ],
    },
    {
      label: "Image & Visual",
      description: "Generate and extract visuals with image tokens",
      icon: ImageIcon,
      accentColor: "text-rose-500",
      accentBg: "bg-rose-500/10",
      tools: [
        {
          name: "Image to Text",
          description: "Extract text from photos, screenshots, and documents",
          href: "/image-to-text",
          icon: Image,
          color: "from-rose-500 to-rose-600",
          bgColor: "bg-rose-50 dark:bg-rose-950/40",
          iconColor: "text-rose-600 dark:text-rose-400",
          usesImageTokens: true,
        },
        {
          name: "Infographic Generator",
          description: "Turn articles and essays into visual infographics",
          href: "/infographic-generator",
          icon: BarChart3,
          color: "from-amber-500 to-amber-600",
          bgColor: "bg-amber-50 dark:bg-amber-950/40",
          iconColor: "text-amber-600 dark:text-amber-400",
          usesImageTokens: true,
        },
        {
          name: "Thumbnail Generator",
          description: "Create cover images for blogs and social media",
          href: "/thumbnail-generator",
          icon: ImagePlus,
          color: "from-violet-500 to-violet-600",
          bgColor: "bg-violet-50 dark:bg-violet-950/40",
          iconColor: "text-violet-600 dark:text-violet-400",
          usesImageTokens: true,
        },
        {
          name: "Chart Generator",
          description: "Create bar charts, pie charts, flowcharts, and diagrams",
          href: "/chart-generator",
          icon: PieChart,
          color: "from-teal-500 to-teal-600",
          bgColor: "bg-teal-50 dark:bg-teal-950/40",
          iconColor: "text-teal-600 dark:text-teal-400",
          usesImageTokens: true,
        },
      ],
    },
    {
      label: "Voice & Audio",
      description: "Record, transcribe, and transform speech",
      icon: AudioLines,
      accentColor: "text-indigo-500",
      accentBg: "bg-indigo-500/10",
      tools: [
        {
          name: "Speech to Text",
          description: "Transcribe audio to text with live recording",
          href: "/speech-to-text",
          icon: Mic,
          color: "from-indigo-500 to-indigo-600",
          bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
          iconColor: "text-indigo-600 dark:text-indigo-400",
        },
        {
          name: "Text to Speech",
          description: "Listen to your text read aloud for proofreading",
          href: "/text-to-speech",
          icon: Volume2,
          color: "from-sky-500 to-sky-600",
          bgColor: "bg-sky-50 dark:bg-sky-950/40",
          iconColor: "text-sky-600 dark:text-sky-400",
          isFree: true,
        },
        {
          name: "Voice to Essay",
          description: "Speak your ideas and get a structured, polished essay",
          href: "/voice-to-essay",
          icon: FileEdit,
          color: "from-sky-600 to-sky-700",
          bgColor: "bg-sky-50 dark:bg-sky-950/40",
          iconColor: "text-sky-700 dark:text-sky-400",
        },
        {
          name: "Audio Summarizer",
          description: "Summarize lectures, meetings, and podcasts",
          href: "/audio-summarizer",
          icon: FileAudio,
          color: "from-orange-500 to-orange-600",
          bgColor: "bg-orange-50 dark:bg-orange-950/40",
          iconColor: "text-orange-600 dark:text-orange-400",
        },
      ],
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <section className="container py-12">
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              15 Tools in One Place
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              What would you like to do?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose a tool below to get started. Everything you need to write, visualize, and record — all in one platform.
            </p>
          </motion.div>

          {/* Token Stats */}
          <motion.div
            className="mb-10 grid sm:grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Word Tokens</p>
                    <p className="text-xl font-bold">{remainingWords.toLocaleString()}</p>
                  </div>
                </div>
                <Button asChild variant="secondary" size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0">
                  <Link href="/pricing">
                    Get More
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Image Tokens</p>
                    <p className="text-xl font-bold">{remainingImageTokens.toLocaleString()}</p>
                  </div>
                </div>
                <Button asChild variant="secondary" size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0">
                  <Link href="/pricing">
                    Get More
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Tool Categories */}
          <div className="space-y-10">
            {categories.map((category, catIndex) => (
              <motion.div
                key={category.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + catIndex * 0.1 }}
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`p-2 rounded-xl ${category.accentBg}`}>
                    <category.icon className={`h-5 w-5 ${category.accentColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{category.label}</h2>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                {/* Tools Grid */}
                <div className={`grid gap-4 ${
                  category.tools.length <= 4
                    ? "md:grid-cols-2 lg:grid-cols-4"
                    : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }`}>
                  {category.tools.map((tool, index) => (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + catIndex * 0.1 + index * 0.05 }}
                    >
                      <Link href={tool.href}>
                        <Card className={`p-5 h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer border border-border/60 ${tool.bgColor} group`}>
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tool.color} shadow-md`}>
                                <tool.icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex gap-1.5">
                                {tool.isFree && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                                    FREE
                                  </span>
                                )}
                                {tool.usesImageTokens && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-full">
                                    IMG
                                  </span>
                                )}
                              </div>
                            </div>
                            <h3 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">
                              {tool.name}
                            </h3>
                            <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                              {tool.description}
                            </p>
                            <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              Open Tool
                              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pro Tip */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="p-5 border border-border/60 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Start with the <span className="font-medium text-foreground">Plagiarism Checker</span> to ensure originality,
                    then run the <span className="font-medium text-foreground">AI Detector</span> to verify human-like content.
                    Use the <span className="font-medium text-foreground">Humanizer</span> if any AI patterns are detected.
                    For visual content, try the <span className="font-medium text-foreground">Infographic Generator</span> to turn your essays into shareable visuals.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
