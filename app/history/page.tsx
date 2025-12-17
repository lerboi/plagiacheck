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
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useTokenStore } from "@/lib/store"

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { remainingWords } = useTokenStore()
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

  const tools = [
    {
      name: "Plagiarism Checker",
      description: "Check your text for plagiarism against billions of sources",
      href: "/",
      icon: Shield,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "AI Detector",
      description: "Detect if text was written by AI or a human",
      href: "/ai-detector",
      icon: Brain,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      name: "AI Humanizer",
      description: "Transform AI-generated text to sound more human",
      href: "/ai-humanizer",
      icon: Wand2,
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      name: "Paraphraser",
      description: "Rewrite your text with different words and style",
      href: "/paraphraser",
      icon: RefreshCw,
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      name: "Summarizer",
      description: "Condense long text into key points",
      href: "/summarizer",
      icon: FileText,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      name: "Grammar Checker",
      description: "Fix spelling and grammar errors instantly",
      href: "/grammar-checker",
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      name: "Word Counter",
      description: "Count words, characters, and reading time",
      href: "/word-counter",
      icon: Hash,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      isFree: true,
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
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              All Tools in One Place
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              What would you like to do?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose a tool below to get started. Each tool is designed to help you create better content.
            </p>
          </motion.div>

          {/* Usage Stats Card */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Words Remaining</p>
                    <p className="text-2xl font-bold">{remainingWords.toLocaleString()} words</p>
                  </div>
                </div>
                <Button asChild variant="secondary" className="bg-white text-blue-600 hover:bg-white/90">
                  <Link href="/pricing">
                    Upgrade Plan
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Tools Grid */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {tools.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Link href={tool.href}>
                  <Card className={`p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 ${tool.bgColor} group`}>
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${tool.color} shadow-lg`}>
                          <tool.icon className="h-6 w-6 text-white" />
                        </div>
                        {tool.isFree && (
                          <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                            Free
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex-1">
                        {tool.description}
                      </p>
                      <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6 border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    For the best results, start with the Plagiarism Checker to ensure originality,
                    then use the AI Detector to verify human-like content.
                    Use the Humanizer if any AI patterns are detected.
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
