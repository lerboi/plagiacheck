"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTokenStore, TOKENS_CHANGED_EVENT } from "@/lib/store"
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  LayoutGrid,
  CreditCard,
  Coins,
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
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle } from "./theme-toggle"
import { ProfileDropdown } from "@/components/Profile/ProfileDropdown"

interface Tool {
  name: string
  href: string
  icon: LucideIcon
  desc: string
  color: string
  bgColor: string
  isFree?: boolean
  usesImageTokens?: boolean
}

interface ToolCategory {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  tools: Tool[]
}

export function Nav() {
  const { remainingWords, remainingImageTokens, guestTokens, fetchRemainingWords, fetchImageTokens, clearTokens } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const onPlagiaAi = pathname === "/plagia-ai"

  const toolCategories: ToolCategory[] = [
    {
      label: "Writing Tools",
      icon: Pen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      tools: [
        { name: "Plagiarism Checker", href: "/", icon: Shield, desc: "Check for plagiarism", color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { name: "AI Detector", href: "/ai-detector", icon: Brain, desc: "Detect AI-written text", color: "text-purple-500", bgColor: "bg-purple-500/10" },
        { name: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, desc: "Make AI text human", color: "text-pink-500", bgColor: "bg-pink-500/10" },
        { name: "Paraphraser", href: "/paraphraser", icon: RefreshCw, desc: "Rewrite your text", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
        { name: "Summarizer", href: "/summarizer", icon: FileText, desc: "Condense long text", color: "text-green-500", bgColor: "bg-green-500/10" },
        { name: "Grammar Checker", href: "/grammar-checker", icon: CheckCircle2, desc: "Fix grammar errors", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
        { name: "Word Counter", href: "/word-counter", icon: Hash, desc: "Count words & chars", color: "text-orange-500", bgColor: "bg-orange-500/10", isFree: true },
      ],
    },
    {
      label: "Image & Visual",
      icon: ImageIcon,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      tools: [
        { name: "Image to Text", href: "/image-to-text", icon: Image, desc: "Extract text from images", color: "text-rose-500", bgColor: "bg-rose-500/10", usesImageTokens: true },
        { name: "Infographic Generator", href: "/infographic-generator", icon: BarChart3, desc: "Text to infographics", color: "text-amber-500", bgColor: "bg-amber-500/10", usesImageTokens: true },
        { name: "Thumbnail Generator", href: "/thumbnail-generator", icon: ImagePlus, desc: "Create cover images", color: "text-violet-500", bgColor: "bg-violet-500/10", usesImageTokens: true },
        { name: "Chart Generator", href: "/chart-generator", icon: PieChart, desc: "Data to charts & diagrams", color: "text-teal-500", bgColor: "bg-teal-500/10", usesImageTokens: true },
      ],
    },
    {
      label: "Voice & Audio",
      icon: AudioLines,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      tools: [
        { name: "Speech to Text", href: "/speech-to-text", icon: Mic, desc: "Transcribe audio to text", color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { name: "Text to Speech", href: "/text-to-speech", icon: Volume2, desc: "Listen to text read aloud", color: "text-sky-500", bgColor: "bg-sky-500/10", isFree: true },
        { name: "Voice to Essay", href: "/voice-to-essay", icon: FileEdit, desc: "Speak ideas, get essays", color: "text-sky-600", bgColor: "bg-sky-600/10" },
        { name: "Audio Summarizer", href: "/audio-summarizer", icon: FileAudio, desc: "Summarize recordings", color: "text-orange-600", bgColor: "bg-orange-600/10" },
      ],
    },
  ]

  useEffect(() => {
    let activeUserId: string | null = null

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      activeUserId = session?.user?.id || null

      if (session?.user) {
        await fetchRemainingWords(session.user.id)
        await fetchImageTokens(session.user.id)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      activeUserId = session?.user?.id || null
      if (session?.user) {
        fetchRemainingWords(session.user.id)
        fetchImageTokens(session.user.id)
      }
    })

    const handleTokensChanged = () => {
      if (activeUserId) {
        fetchRemainingWords(activeUserId)
        fetchImageTokens(activeUserId)
      }
    }

    window.addEventListener(TOKENS_CHANGED_EVENT, handleTokensChanged)

    return () => {
      authListener.subscription.unsubscribe()
      window.removeEventListener(TOKENS_CHANGED_EVENT, handleTokensChanged)
    }
  }, [supabase.auth, fetchRemainingWords, fetchImageTokens])

  // Close mega menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isToolsOpen &&
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node) &&
        toolsButtonRef.current &&
        !toolsButtonRef.current.contains(event.target as Node)
      ) {
        setIsToolsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isToolsOpen])

  // Close mega menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsToolsOpen(false)
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearTokens()
    setUser(null)
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    setExpandedMobileCategory(null)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setExpandedMobileCategory(null)
  }

  const toggleMobileCategory = (label: string) => {
    setExpandedMobileCategory(expandedMobileCategory === label ? null : label)
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
          <div className="h-8 w-8 rounded-full text-blue-400 scale-[170%] items-center justify-center flex">
            <PiLetterCircleP />
          </div>
          <span className="font-bold text-lg">plagiacheck</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Tools Mega Menu Trigger */}
          <div className="relative">
            <button
              ref={toolsButtonRef}
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`relative h-9 text-sm font-medium gap-1.5 px-3 inline-flex items-center rounded-md transition-colors focus-visible:ring-0 focus:outline-none ${
                isToolsOpen ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              }`}
              aria-expanded={isToolsOpen}
              aria-haspopup="true"
            >
              <LayoutGrid className="h-4 w-4" />
              Tools
              {onPlagiaAi && (
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-500"
                  aria-label="On PlagiaAI"
                />
              )}
              <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Mega Menu Panel */}
            {isToolsOpen && (
              <div
                ref={toolsRef}
                className="absolute top-full left-0 mt-1 w-[680px] bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
              >
                <div className="p-4">
                  {/* Featured: PlagiaAI */}
                  <Link
                    href="/plagia-ai"
                    onClick={() => setIsToolsOpen(false)}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border mb-3 transition-all overflow-hidden ${
                      onPlagiaAi
                        ? "border-violet-500/50 bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-violet-500/15"
                        : "border-violet-200/60 dark:border-violet-800/60 bg-gradient-to-r from-violet-500/8 via-fuchsia-500/8 to-violet-500/8 hover:from-violet-500/12 hover:via-fuchsia-500/12 hover:to-violet-500/12"
                    }`}
                  >
                    <div className="p-1.5 rounded-md bg-violet-500/15 shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">PlagiaAI</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-violet-500/15 text-violet-600 dark:text-violet-300 rounded-full leading-none">
                          NEW
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Chat with an AI that uses all your tools
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>

                  {/* Category columns */}
                  <div className="grid grid-cols-3 gap-5">
                    {toolCategories.map((category) => (
                      <div key={category.label}>
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className={`p-1 rounded-md ${category.bgColor}`}>
                            <category.icon className={`h-3.5 w-3.5 ${category.color}`} />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {category.label}
                          </span>
                        </div>

                        {/* Tool list */}
                        <div className="space-y-0.5">
                          {category.tools.map((tool) => (
                            <Link
                              key={tool.name}
                              href={tool.href}
                              onClick={() => setIsToolsOpen(false)}
                              className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className={`p-1.5 rounded-md ${tool.bgColor} transition-transform group-hover:scale-110`}>
                                <tool.icon className={`h-3.5 w-3.5 ${tool.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate">{tool.name}</span>
                                  {tool.isFree && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full leading-none">
                                      FREE
                                    </span>
                                  )}
                                  {tool.usesImageTokens && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-full leading-none">
                                      IMG
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground leading-tight">{tool.desc}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <Link
                      href="/all-tools"
                      onClick={() => setIsToolsOpen(false)}
                      className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-gray-500/10">
                          <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">View all tools</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            className="h-9 px-3 inline-flex items-center justify-center text-sm font-medium transition-colors hover:text-primary hover:bg-accent rounded-md gap-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
          >
            <CreditCard className="h-4 w-4" />
            Pricing
          </Link>

          <ThemeToggle />
        </div>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Token display */}
          <TokenBadge user={user} remainingWords={remainingWords} remainingImageTokens={remainingImageTokens} guestTokens={guestTokens} />

          {user ? (
            <ProfileDropdown user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-9 focus-visible:ring-0 focus-visible:ring-offset-0" asChild>
                <Link href="/signin">Log in</Link>
              </Button>
              <Button size="sm" className="h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus-visible:ring-0 focus-visible:ring-offset-0" asChild>
                <Link href="/pricing">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-2">
          <MobileTokenBadge user={user} remainingWords={remainingWords} remainingImageTokens={remainingImageTokens} guestTokens={guestTokens} />

          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md hover:bg-accent transition-colors focus-visible:ring-0 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={closeMobileMenu} />
          <div className="fixed top-14 left-0 right-0 bg-background border-b shadow-lg z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="p-4 space-y-2">

              {/* Mobile token summary */}
              <MobileTokenSummary user={user} remainingWords={remainingWords} remainingImageTokens={remainingImageTokens} guestTokens={guestTokens} />

              {/* Featured: PlagiaAI (mobile) */}
              <Link
                href="/plagia-ai"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  onPlagiaAi
                    ? "border-violet-500/50 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10"
                    : "border-violet-200/40 dark:border-violet-800/40 bg-gradient-to-r from-violet-500/8 to-fuchsia-500/8"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-violet-500/15">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">PlagiaAI</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-full leading-none">
                      NEW
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Chat with an AI that uses all your tools
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>

              {/* Categorized Tool Sections */}
              {toolCategories.map((category) => {
                const isExpanded = expandedMobileCategory === category.label
                return (
                  <div key={category.label} className="rounded-xl border border-border/60 overflow-hidden">
                    {/* Category Header — Accordion Toggle */}
                    <button
                      onClick={() => toggleMobileCategory(category.label)}
                      className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/50 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${category.bgColor}`}>
                          <category.icon className={`h-4 w-4 ${category.color}`} />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-semibold">{category.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{category.tools.length} tools</span>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded Tool List */}
                    {isExpanded && (
                      <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
                        {category.tools.map((tool) => (
                          <Link
                            key={tool.name}
                            href={tool.href}
                            className="flex items-center gap-2.5 p-3 rounded-lg hover:bg-accent transition-colors"
                            onClick={closeMobileMenu}
                          >
                            <div className={`p-1.5 rounded-md ${tool.bgColor} flex-shrink-0`}>
                              <tool.icon className={`h-4 w-4 ${tool.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium truncate">{tool.name}</span>
                                {tool.isFree && (
                                  <span className="text-[8px] font-semibold px-1 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded leading-none flex-shrink-0">
                                    FREE
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Other Links */}
              <div className="space-y-1 pt-2 border-t border-border/60">
                <Link
                  href="/all-tools"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">All Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">Pricing</span>
                </Link>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-3 px-3 bg-accent/50 rounded-lg">
                <span className="text-sm font-medium">Theme</span>
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
              <div className="space-y-2 pt-1">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground px-3 py-2 bg-accent/30 rounded-lg">
                      {user.email}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/signin">Log in</Link>
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/pricing">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Token display sub-components ────────────────────────────────────────────

interface TokenBadgeProps {
  user: User | null
  remainingWords: number
  remainingImageTokens: number
  guestTokens: number
}

function TokenBadge({ user, remainingWords, remainingImageTokens, guestTokens }: TokenBadgeProps) {
  if (!user) {
    return (
      <Link
        href="/signin?tab=register"
        className="group flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-blue-500/10 border border-blue-200/60 dark:border-blue-800/60 hover:border-blue-400/60 dark:hover:border-blue-600/60 hover:from-blue-500/15 hover:via-violet-500/15 hover:to-blue-500/15 transition-all duration-200"
        title={`Sign up free — 1,000 tokens to start (you have ${guestTokens} trial tokens)`}
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-foreground">Sign up</span>
        <span className="text-xs text-muted-foreground hidden xl:inline">— 1,000 free tokens</span>
        <span className="text-xs text-muted-foreground inline xl:hidden">free</span>
      </Link>
    )
  }

  return (
    <div
      className="flex items-center h-8 rounded-full border border-border bg-muted/50 dark:bg-muted/30 divide-x divide-border overflow-hidden"
      title={`${remainingWords.toLocaleString()} text tokens · ${remainingImageTokens} image tokens`}
    >
      {/* Text tokens */}
      <div className="flex items-center gap-1.5 px-3 h-full">
        <Coins className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold tabular-nums">
          {remainingWords.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground hidden xl:inline">tok</span>
      </div>
      {/* Image tokens */}
      <Link
        href="/pricing"
        className="flex items-center gap-1.5 px-3 h-full hover:bg-accent/60 transition-colors"
        title="Image tokens — used for visual tools"
      >
        <ImageIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        <span className="text-xs font-semibold tabular-nums">{remainingImageTokens}</span>
        <span className="text-xs text-muted-foreground hidden xl:inline">img</span>
      </Link>
    </div>
  )
}

function MobileTokenBadge({ user, remainingWords, remainingImageTokens, guestTokens: _guestTokens }: TokenBadgeProps) {
  if (!user) {
    return (
      <Link
        href="/signin?tab=register"
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-200/50 dark:border-blue-800/50 hover:border-blue-400/50"
        title="Sign up free"
      >
        <Sparkles className="h-3 w-3 text-blue-500" />
        <span className="text-xs font-semibold">Sign up</span>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1 h-7 rounded-full border border-border bg-muted/50 dark:bg-muted/30 divide-x divide-border overflow-hidden">
      <div className="flex items-center gap-1 px-2 h-full">
        <Coins className="h-3 w-3 text-blue-500" />
        <span className="text-xs font-semibold tabular-nums">{remainingWords.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1 px-2 h-full">
        <ImageIcon className="h-3 w-3 text-rose-500" />
        <span className="text-xs font-semibold tabular-nums">{remainingImageTokens}</span>
      </div>
    </div>
  )
}

function MobileTokenSummary({ user, remainingWords, remainingImageTokens, guestTokens }: TokenBadgeProps) {
  if (!user) {
    return (
      <Link
        href="/signin?tab=register"
        className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-200/40 dark:border-blue-800/40 hover:border-blue-400/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-sm font-semibold">Sign up — 1,000 free tokens</p>
            <p className="text-xs text-muted-foreground">{guestTokens} trial tokens left</p>
          </div>
        </div>
        <span
          className="text-xs font-semibold text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        >
          Sign up →
        </span>
      </Link>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 mb-1">
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/8 dark:bg-blue-500/10 border border-blue-200/40 dark:border-blue-800/40">
        <div className="p-1.5 rounded-lg bg-blue-500/15">
          <Coins className="h-4 w-4 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums">{remainingWords.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">text tokens</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/8 dark:bg-rose-500/10 border border-rose-200/40 dark:border-rose-800/40">
        <div className="p-1.5 rounded-lg bg-rose-500/15">
          <ImageIcon className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <p className="text-sm font-bold tabular-nums">{remainingImageTokens}</p>
          <p className="text-xs text-muted-foreground">image tokens</p>
        </div>
      </div>
    </div>
  )
}
