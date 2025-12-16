"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  History,
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Download,
  BarChart3,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface HistoryItem {
  id: string
  type: "plagiarism" | "ai-detector" | "humanizer" | "paraphraser" | "summarizer" | "grammar"
  title: string
  preview: string
  result: string
  score?: number
  date: Date
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

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

      // Simulate loading history (in production, fetch from database)
      setTimeout(() => {
        // Demo history items
        const demoHistory: HistoryItem[] = [
          {
            id: "1",
            type: "plagiarism",
            title: "Research Paper Check",
            preview: "The impact of artificial intelligence on modern healthcare systems has been...",
            result: "8% plagiarism detected",
            score: 8,
            date: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
          },
          {
            id: "2",
            type: "ai-detector",
            title: "Blog Post Analysis",
            preview: "In today's digital age, content creation has evolved significantly...",
            result: "Likely Human (23%)",
            score: 23,
            date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          },
          {
            id: "3",
            type: "humanizer",
            title: "Essay Humanization",
            preview: "Furthermore, the implementation of sustainable practices demonstrates...",
            result: "Successfully humanized",
            date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
          },
          {
            id: "4",
            type: "grammar",
            title: "Email Draft",
            preview: "Dear Mr. Johnson, I am writing to express my interest in the...",
            result: "3 issues fixed",
            score: 3,
            date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          },
          {
            id: "5",
            type: "summarizer",
            title: "Article Summary",
            preview: "Climate change represents one of the most pressing challenges...",
            result: "Condensed to 150 words",
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          },
          {
            id: "6",
            type: "paraphraser",
            title: "Paragraph Rewrite",
            preview: "The advancement of technology has revolutionized the way we communicate...",
            result: "Paraphrased successfully",
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
          },
        ]
        setHistoryItems(demoHistory)
        setIsLoading(false)
      }, 1000)
    }

    checkSession()
  }, [supabase.auth, router])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "plagiarism":
        return <Shield className="h-5 w-5 text-blue-500" />
      case "ai-detector":
        return <Brain className="h-5 w-5 text-purple-500" />
      case "humanizer":
        return <Wand2 className="h-5 w-5 text-pink-500" />
      case "paraphraser":
        return <RefreshCw className="h-5 w-5 text-blue-500" />
      case "summarizer":
        return <FileText className="h-5 w-5 text-green-500" />
      case "grammar":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      default:
        return <History className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "plagiarism":
        return "Plagiarism Check"
      case "ai-detector":
        return "AI Detection"
      case "humanizer":
        return "Humanizer"
      case "paraphraser":
        return "Paraphraser"
      case "summarizer":
        return "Summarizer"
      case "grammar":
        return "Grammar Check"
      default:
        return "Unknown"
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hours ago`
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const filteredItems = activeTab === "all"
    ? historyItems
    : historyItems.filter((item) => item.type === activeTab)

  const handleDelete = (id: string) => {
    setHistoryItems((items) => items.filter((item) => item.id !== id))
    toast({
      title: "Deleted",
      description: "Item removed from history",
      variant: "success",
    })
  }

  // Stats calculations
  const totalChecks = historyItems.length
  const todayChecks = historyItems.filter(
    (item) => item.date.toDateString() === new Date().toDateString()
  ).length
  const weekChecks = historyItems.filter(
    (item) => item.date.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <section className="container py-16">
          <div className="max-w-6xl mx-auto space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="container py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold">History & Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              View your past checks and track your usage statistics
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid md:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Checks</p>
                  <p className="text-3xl font-bold text-blue-600">{totalChecks}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-3xl font-bold text-green-600">{todayChecks}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-3xl font-bold text-purple-600">{weekChecks}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tabs and History List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-6 border-0 shadow-lg">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 md:grid-cols-7 gap-1 mb-6 h-auto p-1 bg-gray-100 dark:bg-gray-800">
                  <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
                  <TabsTrigger value="plagiarism" className="text-xs md:text-sm">Plagiarism</TabsTrigger>
                  <TabsTrigger value="ai-detector" className="text-xs md:text-sm">AI Detect</TabsTrigger>
                  <TabsTrigger value="humanizer" className="text-xs md:text-sm">Humanizer</TabsTrigger>
                  <TabsTrigger value="paraphraser" className="text-xs md:text-sm hidden md:block">Paraphrase</TabsTrigger>
                  <TabsTrigger value="summarizer" className="text-xs md:text-sm hidden md:block">Summary</TabsTrigger>
                  <TabsTrigger value="grammar" className="text-xs md:text-sm hidden md:block">Grammar</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-0">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No history yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start using our tools to see your history here
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/">Plagiarism Checker</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/ai-detector">AI Detector</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/ai-humanizer">AI Humanizer</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                {getTypeIcon(item.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-sm">{item.title}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {getTypeLabel(item.type)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(item.date)}
                                  </div>
                                </div>

                                <p className="text-sm text-muted-foreground mt-2 truncate">
                                  {item.preview}
                                </p>

                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                    {item.result}
                                  </span>

                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                      onClick={() => handleDelete(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Plagiarism Check", href: "/", icon: Shield, color: "text-blue-500" },
                { label: "AI Detector", href: "/ai-detector", icon: Brain, color: "text-purple-500" },
                { label: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500" },
                { label: "Grammar Check", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500" },
              ].map((action, index) => (
                <Link key={index} href={action.href}>
                  <Card className="p-4 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer border-0 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
