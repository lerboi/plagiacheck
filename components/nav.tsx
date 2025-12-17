"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
import {
  Menu,
  X,
  ChevronDown,
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
} from "lucide-react"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle } from "./theme-toggle"
import { ProfileDropdown } from "@/components/Profile/ProfileDropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function Nav() {
  const { remainingWords, fetchRemainingWords } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const tools = [
    {
      name: "Plagiarism Checker",
      href: "/",
      icon: Shield,
      desc: "Check for plagiarism",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "AI Detector",
      href: "/ai-detector",
      icon: Brain,
      desc: "Detect AI-written text",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      name: "AI Humanizer",
      href: "/ai-humanizer",
      icon: Wand2,
      desc: "Make AI text human",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      name: "Paraphraser",
      href: "/paraphraser",
      icon: RefreshCw,
      desc: "Rewrite your text",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      name: "Summarizer",
      href: "/summarizer",
      icon: FileText,
      desc: "Condense long text",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "Grammar Checker",
      href: "/grammar-checker",
      icon: CheckCircle2,
      desc: "Fix grammar errors",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Word Counter",
      href: "/word-counter",
      icon: Hash,
      desc: "Count words & chars",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      isFree: true,
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
  }, [supabase.auth, fetchRemainingWords])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
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
          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 text-sm font-medium gap-1.5 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                <LayoutGrid className="h-4 w-4" />
                Tools
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2">
              <div className="grid gap-1">
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.name} asChild className="p-0">
                    <Link
                      href={tool.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-accent transition-colors w-full"
                    >
                      <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                        <tool.icon className={`h-4 w-4 ${tool.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{tool.name}</span>
                          {tool.isFree && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                              FREE
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{tool.desc}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem asChild className="p-0">
                <Link
                  href="/history"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-accent transition-colors w-full"
                >
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <LayoutGrid className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">All Tools</span>
                    <p className="text-xs text-muted-foreground">View all tools</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
          {/* Words counter for mobile */}
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
            <div className="p-4">
              {/* Tools Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {tools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl ${tool.bgColor} hover:opacity-80 transition-opacity`}
                    onClick={closeMobileMenu}
                  >
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                    <span className="text-xs font-medium text-center">{tool.name}</span>
                    {tool.isFree && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                        FREE
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Other Links */}
              <div className="space-y-1 mb-4">
                <Link
                  href="/history"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">All Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={closeMobileMenu}
                >
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Pricing</span>
                </Link>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-3 px-3 mb-4 bg-accent/50 rounded-lg">
                <span className="text-sm font-medium">Theme</span>
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
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
