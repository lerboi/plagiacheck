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
import { useState, useEffect, useRef, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle, ThemeMenuRow } from "./theme-toggle"
import { LanguageToggle, LanguageMenuRow } from "./language-toggle"
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
  const onPlagiaAi = pathname === "/" || pathname === "/plagia-ai"
  const t = useTranslations("Nav")
  const tc = useTranslations("ToolCatalog")

  const toolCategories: ToolCategory[] = [
    {
      label: tc("categories.writing"),
      icon: Pen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      tools: [
        { name: tc("tools.plagiarismChecker.name"), href: "/plagiarism-checker", icon: Shield, desc: tc("tools.plagiarismChecker.short"), color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { name: tc("tools.aiDetector.name"), href: "/ai-detector", icon: Brain, desc: tc("tools.aiDetector.short"), color: "text-purple-500", bgColor: "bg-purple-500/10" },
        { name: tc("tools.aiHumanizer.name"), href: "/ai-humanizer", icon: Wand2, desc: tc("tools.aiHumanizer.short"), color: "text-pink-500", bgColor: "bg-pink-500/10" },
        { name: tc("tools.paraphraser.name"), href: "/paraphraser", icon: RefreshCw, desc: tc("tools.paraphraser.short"), color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
        { name: tc("tools.summarizer.name"), href: "/summarizer", icon: FileText, desc: tc("tools.summarizer.short"), color: "text-green-500", bgColor: "bg-green-500/10" },
        { name: tc("tools.grammarChecker.name"), href: "/grammar-checker", icon: CheckCircle2, desc: tc("tools.grammarChecker.short"), color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
        { name: tc("tools.wordCounter.name"), href: "/word-counter", icon: Hash, desc: tc("tools.wordCounter.short"), color: "text-orange-500", bgColor: "bg-orange-500/10", isFree: true },
      ],
    },
    {
      label: tc("categories.image"),
      icon: ImageIcon,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      tools: [
        { name: tc("tools.imageToText.name"), href: "/image-to-text", icon: Image, desc: tc("tools.imageToText.short"), color: "text-rose-500", bgColor: "bg-rose-500/10", usesImageTokens: true },
        { name: tc("tools.infographicGenerator.name"), href: "/infographic-generator", icon: BarChart3, desc: tc("tools.infographicGenerator.short"), color: "text-amber-500", bgColor: "bg-amber-500/10", usesImageTokens: true },
        { name: tc("tools.thumbnailGenerator.name"), href: "/thumbnail-generator", icon: ImagePlus, desc: tc("tools.thumbnailGenerator.short"), color: "text-violet-500", bgColor: "bg-violet-500/10", usesImageTokens: true },
        { name: tc("tools.chartGenerator.name"), href: "/chart-generator", icon: PieChart, desc: tc("tools.chartGenerator.short"), color: "text-teal-500", bgColor: "bg-teal-500/10", usesImageTokens: true },
      ],
    },
    {
      label: tc("categories.voice"),
      icon: AudioLines,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      tools: [
        { name: tc("tools.speechToText.name"), href: "/speech-to-text", icon: Mic, desc: tc("tools.speechToText.short"), color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
        { name: tc("tools.textToSpeech.name"), href: "/text-to-speech", icon: Volume2, desc: tc("tools.textToSpeech.short"), color: "text-sky-500", bgColor: "bg-sky-500/10", isFree: true },
        { name: tc("tools.voiceToEssay.name"), href: "/voice-to-essay", icon: FileEdit, desc: tc("tools.voiceToEssay.short"), color: "text-sky-600", bgColor: "bg-sky-600/10" },
        { name: tc("tools.audioSummarizer.name"), href: "/audio-summarizer", icon: FileAudio, desc: tc("tools.audioSummarizer.short"), color: "text-orange-600", bgColor: "bg-orange-600/10" },
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

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileMenuOpen])

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
      <div className="w-full flex h-14 items-center justify-between px-4 sm:px-6">
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
              {t("tools")}
              {onPlagiaAi && (
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-500"
                  aria-label={t("onPlagiaAi")}
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
                    href="/"
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
                        <span className="text-sm font-semibold">{tc("plagiaAi.name")}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-violet-500/15 text-violet-600 dark:text-violet-300 rounded-full leading-none">
                          {t("badges.new")}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {tc("plagiaAi.tagline")}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground motion-safe:group-hover:translate-x-0.5 transition-transform shrink-0" />
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
                              key={tool.href}
                              href={tool.href}
                              onClick={() => setIsToolsOpen(false)}
                              className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className={`p-1.5 rounded-md ${tool.bgColor} transition-transform motion-safe:group-hover:scale-110`}>
                                <tool.icon className={`h-3.5 w-3.5 ${tool.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium truncate">{tool.name}</span>
                                  {tool.isFree && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full leading-none">
                                      {t("badges.free")}
                                    </span>
                                  )}
                                  {tool.usesImageTokens && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-full leading-none">
                                      {t("badges.img")}
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
                        <span className="text-sm font-medium">{t("viewAllTools")}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground motion-safe:group-hover:translate-x-0.5 transition-transform" />
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
            {t("pricing")}
          </Link>

          <ThemeToggle />
          <LanguageToggle />
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
                <Link href="/signin">{t("logIn")}</Link>
              </Button>
              <Button size="sm" className="h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus-visible:ring-0 focus-visible:ring-offset-0" asChild>
                <Link href="/signin?tab=register">{t("getStarted")}</Link>
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
            aria-label={t("toggleMenu")}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={closeMobileMenu}
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            /* max-h-sheet-dvh (globals.css) sizes the panel against the
               viewport as it actually is, so its bottom edge lands above
               Safari's bottom bar instead of behind it. flex-col then splits
               the panel into a scrolling body and a pinned footer, so the auth
               buttons stay reachable however long the tool list gets. */
            className="fixed top-14 left-0 right-0 bg-background border-b shadow-lg z-50 max-h-sheet-dvh flex flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-2">

              {/* Token summary — one quiet line. The nav bar already shows
                  the live counts next to the menu button, so this only adds
                  the labels those bare numbers are missing. */}
              <MobileTokenSummary user={user} remainingWords={remainingWords} remainingImageTokens={remainingImageTokens} guestTokens={guestTokens} onNavigate={closeMobileMenu} />

              {/* Featured: PlagiaAI (mobile). The one accented row in the
                  sheet — a faint tint rather than a bordered gradient card, so
                  it still reads as "first" without boxing itself off. */}
              <Link
                href="/"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 py-3 px-3 rounded-lg transition-colors ${
                  onPlagiaAi ? "bg-violet-500/10" : "bg-violet-500/5 hover:bg-violet-500/10"
                }`}
              >
                <Sparkles className="h-5 w-5 text-violet-500 shrink-0" />
                <span className="font-medium text-sm">{tc("plagiaAi.name")}</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-full leading-none">
                  {t("badges.new")}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
              </Link>

              {/* Categorized Tool Sections — plain accordion rows that match
                  the links below them. The category icon keeps its colour so
                  the three groups stay scannable; everything else (card
                  border, icon chip, two-column grid) is dropped. */}
              {toolCategories.map((category) => {
                const isExpanded = expandedMobileCategory === category.label
                return (
                  <div key={category.label}>
                    <button
                      onClick={() => toggleMobileCategory(category.label)}
                      className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg transition-colors ${
                        isExpanded ? "bg-accent/60" : "hover:bg-accent"
                      }`}
                      aria-expanded={isExpanded}
                    >
                      <category.icon className={`h-5 w-5 shrink-0 ${category.color}`} />
                      <span className="font-medium text-sm">{category.label}</span>
                      <span className="text-xs text-muted-foreground">{category.tools.length}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* One tool per row: the old two-column grid truncated
                        half the names ("Speech to...", "Voice to E..."). */}
                    {isExpanded && (
                      <div className="mt-0.5 mb-1 pl-3 border-l border-border/60 ml-5 space-y-0.5">
                        {category.tools.map((tool) => (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-accent transition-colors"
                            onClick={closeMobileMenu}
                          >
                            <tool.icon className={`h-4 w-4 shrink-0 ${tool.color}`} />
                            <span className="text-sm truncate">{tool.name}</span>
                            {tool.isFree && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-green-500/15 text-green-600 dark:text-green-400 rounded-full leading-none shrink-0">
                                {t("badges.free")}
                              </span>
                            )}
                            {tool.usesImageTokens && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-full leading-none shrink-0">
                                {t("badges.img")}
                              </span>
                            )}
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
                  <span className="font-medium text-sm">{t("allTools")}</span>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{t("pricing")}</span>
                </Link>
                {user && (
                  <Link
                    href="/billing"
                    className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Coins className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-sm">{t("billing")}</span>
                  </Link>
                )}

                {/* Language takes the slot History used to have here, and is
                    shown signed in or out. History stays in the desktop
                    profile menu. */}
                <LanguageMenuRow />

                {/* Theme — the same row as the links above it, so a display
                    setting stops outweighing the actual navigation. */}
                <ThemeMenuRow />
              </div>
            </div>

            {/* Auth Buttons — pinned below the scroll area so they are never
                pushed under Safari's bottom bar. pb-safe keeps them clear of
                the home indicator too. */}
            <div className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-safe">
              <div className="space-y-2">
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
                      {t("signOut")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/signin">{t("logIn")}</Link>
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0" asChild onClick={closeMobileMenu}>
                      <Link href="/signin?tab=register">{t("getStarted")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
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

function TokenBadge({ user, remainingWords, remainingImageTokens, guestTokens: _guestTokens }: TokenBadgeProps) {
  const t = useTranslations("Nav.tokens")
  if (!user) {
    return (
      <Link
        href="/signin?tab=register"
        className="group flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-blue-500/10 border border-blue-200/60 dark:border-blue-800/60 hover:border-blue-400/60 dark:hover:border-blue-600/60 hover:from-blue-500/15 hover:via-violet-500/15 hover:to-blue-500/15 transition-all duration-200"
        title={t("signUpTitle")}
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-foreground">{t("signUp")}</span>
        <span className="text-xs text-muted-foreground hidden xl:inline">{t("freeTokensLong")}</span>
        <span className="text-xs text-muted-foreground inline xl:hidden">{t("freeShort")}</span>
      </Link>
    )
  }

  return (
    <div
      className="flex items-center h-8 rounded-full border border-border bg-muted/50 dark:bg-muted/30 divide-x divide-border overflow-hidden"
      title={t("balanceTitle", { text: remainingWords.toLocaleString(), image: String(remainingImageTokens) })}
    >
      {/* Text tokens */}
      <div className="flex items-center gap-1.5 px-3 h-full">
        <Coins className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold tabular-nums">
          {remainingWords.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground hidden xl:inline">{t("textAbbr")}</span>
      </div>
      {/* Image tokens */}
      <Link
        href="/pricing"
        className="flex items-center gap-1.5 px-3 h-full hover:bg-accent/60 transition-colors"
        title={t("imageTitle")}
      >
        <ImageIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        <span className="text-xs font-semibold tabular-nums">{remainingImageTokens}</span>
        <span className="text-xs text-muted-foreground hidden xl:inline">{t("imageAbbr")}</span>
      </Link>
    </div>
  )
}

function MobileTokenBadge({ user, remainingWords, remainingImageTokens, guestTokens: _guestTokens }: TokenBadgeProps) {
  const t = useTranslations("Nav.tokens")
  if (!user) {
    return (
      <Link
        href="/signin?tab=register"
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-200/50 dark:border-blue-800/50 hover:border-blue-400/50"
        title={t("signUpFreeTitle")}
      >
        <Sparkles className="h-3 w-3 text-blue-500" />
        <span className="text-xs font-semibold">{t("signUp")}</span>
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

function MobileTokenSummary({ user, remainingWords, remainingImageTokens, guestTokens: _guestTokens, onNavigate }: TokenBadgeProps & { onNavigate: () => void }) {
  const t = useTranslations("Nav.tokens")
  if (!user) {
    // Signed out: the nav bar already carries a "Sign up" pill and the sheet
    // pins a "Get Started" button, so this is a quiet reminder of what signing
    // up gives you rather than a third competing call to action.
    return (
      <Link
        href="/signin?tab=register"
        onClick={onNavigate}
        className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
      >
        <Sparkles className="h-5 w-5 text-blue-500 shrink-0" />
        <span className="font-medium text-sm">{t("signUp")}</span>
        <span className="text-xs text-muted-foreground">{t("freeTokens")}</span>
      </Link>
    )
  }

  // Signed in: one line. The counts are already live in the nav bar badge —
  // this exists to label them, which two bare numbers behind icons cannot.
  return (
    <div className="flex items-center gap-3 py-3 px-3">
      <Coins className="h-5 w-5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground">
        {t.rich("textCount", { count: remainingWords.toLocaleString(), num: countTag })}
        <span className="mx-1.5 text-border">|</span>
        {t.rich("imageCount", { count: String(remainingImageTokens), num: countTag })}
      </span>
    </div>
  )
}

function countTag(chunks: ReactNode) {
  return <span className="font-medium text-foreground tabular-nums">{chunks}</span>
}
