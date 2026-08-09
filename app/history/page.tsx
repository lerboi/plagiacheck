"use client"

import { useState, useEffect, useCallback } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Search,
  Trash2,
  Clock,
  ArrowRight,
  Loader2,
  FileAudio,
  FileEdit,
  Mic,
  Image,
  PieChart,
  BarChart3,
  ImagePlus,
  type LucideIcon,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ToolHistoryRow {
  id: string
  tool: string
  input_preview: string
  output_preview: string | null
  metadata: Record<string, unknown> | null
  tokens_used: number
  created_at: string
}

const TOOL_META: Record<
  string,
  { label: string; href: string; icon: LucideIcon; color: string; bg: string }
> = {
  plagiarism: { label: "Plagiarism Checker", href: "/plagiarism-checker", icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" },
  "ai-detect": { label: "AI Detector", href: "/ai-detector", icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
  humanize: { label: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500", bg: "bg-pink-500/10" },
  paraphrase: { label: "Paraphraser", href: "/paraphraser", icon: RefreshCw, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  summarize: { label: "Summarizer", href: "/summarizer", icon: FileText, color: "text-green-500", bg: "bg-green-500/10" },
  grammar: { label: "Grammar Checker", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "audio-summarize": { label: "Audio Summarizer", href: "/audio-summarizer", icon: FileAudio, color: "text-orange-600", bg: "bg-orange-600/10" },
  "voice-to-essay": { label: "Voice to Essay", href: "/voice-to-essay", icon: FileEdit, color: "text-sky-600", bg: "bg-sky-600/10" },
  "speech-to-text": { label: "Speech to Text", href: "/speech-to-text", icon: Mic, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  "image-to-text": { label: "Image to Text", href: "/image-to-text", icon: Image, color: "text-rose-500", bg: "bg-rose-500/10" },
  chart: { label: "Chart Generator", href: "/chart-generator", icon: PieChart, color: "text-teal-500", bg: "bg-teal-500/10" },
  infographic: { label: "Infographic Generator", href: "/infographic-generator", icon: BarChart3, color: "text-amber-500", bg: "bg-amber-500/10" },
  thumbnail: { label: "Thumbnail Generator", href: "/thumbnail-generator", icon: ImagePlus, color: "text-violet-500", bg: "bg-violet-500/10" },
}

const PAGE_SIZE = 20

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "Just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`
  return new Date(iso).toLocaleDateString()
}

export default function HistoryPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [rows, setRows] = useState<ToolHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const u = session?.user || null
      setUser(u)
      setAuthChecked(true)
      if (!u) {
        router.push("/signin?next=/history")
      }
    }
    init()
  }, [supabase, router])

  // Debounce the search input and reset to the first page when it changes,
  // so the server-side query and pagination stay in sync.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    let query = supabase
      .from("tool_history")
      .select(
        "id, tool, input_preview, output_preview, metadata, tokens_used, created_at",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    if (filter !== "all") query = query.eq("tool", filter)

    if (debouncedSearch) {
      // Escape LIKE wildcards, and neutralize characters that would break
      // the PostgREST or() filter grammar.
      const escaped = debouncedSearch
        .replace(/\\/g, "\\\\")
        .replace(/[%_]/g, (m) => `\\${m}`)
        .replace(/[,()"]/g, " ")
      query = query.or(
        `input_preview.ilike.%${escaped}%,output_preview.ilike.%${escaped}%`
      )
    }

    const { data, error: fetchError, count } = await query

    if (fetchError) {
      setError("Could not load your history. Please try again.")
      setRows([])
      setTotalCount(null)
      setLoading(false)
      return
    }

    const fetched = (data || []) as ToolHistoryRow[]
    setHasMore(fetched.length > PAGE_SIZE)
    setRows(fetched.slice(0, PAGE_SIZE))
    setTotalCount(typeof count === "number" ? count : null)
    setLoading(false)
  }, [supabase, user, filter, page, debouncedSearch])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleDelete = async (id: string) => {
    if (!user) return
    const { error: delError } = await supabase
      .from("tool_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    setConfirmDeleteId(null)

    if (delError) {
      toast({
        title: "Could not delete",
        description: delError.message,
        variant: "destructive",
      })
      return
    }

    const newTotal = Math.max(0, (totalCount ?? 1) - 1)
    setTotalCount(newTotal)

    // If deleting the last row on this page, step back a page; otherwise
    // refetch the current page so it refills from the server.
    if (page > 0 && page * PAGE_SIZE >= newTotal) {
      setPage(page - 1)
    } else {
      fetchHistory()
    }

    toast({
      title: "Deleted",
      description: "History entry removed.",
      variant: "success",
    })
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="container mx-auto px-4 py-12">
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Your Activity
            </h1>
            <p className="text-muted-foreground mt-2">
              Recent tool runs and their results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search input or output..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v) => {
                setFilter(v)
                setPage(0)
              }}
            >
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="All tools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tools</SelectItem>
                {Object.entries(TOOL_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Card className="p-6 mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">
                {search.trim() || filter !== "all"
                  ? "No matches for your search"
                  : "No history yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {search.trim() || filter !== "all"
                  ? "Try a different search term or tool filter."
                  : "Your tool runs will show up here."}
              </p>
              {!search.trim() && filter === "all" && (
                <Button asChild>
                  <Link href="/">
                    Try a tool
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((row, i) => {
                  const meta = TOOL_META[row.tool] || {
                    label: row.tool,
                    href: "/",
                    icon: FileText,
                    color: "text-gray-500",
                    bg: "bg-gray-500/10",
                  }
                  const Icon = meta.icon
                  return (
                    <motion.li
                      key={row.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <Card className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex-shrink-0 w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center`}
                          >
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <h3 className="font-semibold">{meta.label}</h3>
                              <span className="text-xs text-muted-foreground">
                                {relativeTime(row.created_at)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                · {row.tokens_used} token{row.tokens_used === 1 ? "" : "s"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              <span className="font-medium text-foreground/70">Input: </span>
                              {row.input_preview}
                            </p>
                            {row.output_preview && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                <span className="font-medium text-foreground/70">Result: </span>
                                {row.output_preview}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8"
                            >
                              <Link href={meta.href}>
                                Open tool
                                <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Link>
                            </Button>
                            {confirmDeleteId === row.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(row.id)}
                                  className="h-8 px-2 text-xs"
                                  aria-label="Confirm delete"
                                >
                                  Delete
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-8 px-2 text-xs"
                                  aria-label="Cancel delete"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(row.id)}
                                className="h-8 text-muted-foreground hover:text-red-500"
                                aria-label="Delete history entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}

          {/* Pagination — always visible when there are results overall, even
              if the current page/search combination is empty. */}
          {!loading && totalCount !== null && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6">
                <span className="text-xs sm:text-sm text-muted-foreground tabular-nums text-center sm:text-left">
                  {totalCount !== null ? (
                    <>
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)}
                      </span>{" "}
                      of <span className="font-medium text-foreground">{totalCount}</span>
                      <span className="mx-1.5 opacity-60">·</span>
                      Page <span className="font-medium text-foreground">{page + 1}</span> of{" "}
                      <span className="font-medium text-foreground">
                        {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                      </span>
                    </>
                  ) : (
                    `Page ${page + 1}`
                  )}
                </span>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
