"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
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
  const { remainingWords, remainingImageTokens, fetchRemainingWords, fetchImageTokens, clearTokens } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)

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
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        await fetchRemainingWords(session.user.id)
        await fetchImageTokens(session.user.id)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchRemainingWords(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
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
              className={`h-9 text-sm font-medium gap-1.5 px-3 inline-flex items-center rounded-md transition-colors focus-visible:ring-0 focus:outline-none ${
                isToolsOpen ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              }`}
              aria-expanded={isToolsOpen}
              aria-haspopup="true"
            >
              <LayoutGrid className="h-4 w-4" />
              Tools
              <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Mega Menu Panel */}
            {isToolsOpen && (
              <div
                ref={toolsRef}
                className="absolute top-full left-0 mt-1 w-[680px] bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
              >
                <div className="p-4">
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
                      href="/history"
                      onClick={() => setIsToolsOpen(false)}
                      className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-gray-500/10">
                          <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">View All Tools</span>
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50">
            <Coins className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold">{user ? remainingWords.toLocaleString() : "1,000"}</span>
            <span className="text-xs text-muted-foreground">words</span>
          </div>

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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50">
            <Coins className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold">{user ? remainingWords.toLocaleString() : "1,000"}</span>
          </div>

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
                  href="/history"
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
