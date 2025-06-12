"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
import { MessageCircle, Menu, X } from 'lucide-react'
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle } from "./theme-toggle"
import { ProfileDropdown } from "@/components/Profile/ProfileDropdown"

export function Nav() {
  const { remainingWords, fetchRemainingWords } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: "Plagiarism Checker", href: "/" },
    { name: "AI Humanizer", href: "/ai-humanizer" },
    { name: "AI Detector", href: "/ai-detector" },
    { name: "Pricing", href: "/pricing" },
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
    console.log("Logging out")
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
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
          <div className="h-8 w-8 rounded-full text-blue-300 scale-[170%] items-center justify-center flex">
            <PiLetterCircleP />
          </div>
          <span className="font-bold">plagiacheck</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navigation.map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-400/10 text-blue-050">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{user ? String(remainingWords) : "1000" } words</span>
          </div>

          {user ? (
            <ProfileDropdown user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Button variant="ghost" className="text-sm" asChild>
                <Link href="/signin">Log in</Link>
              </Button>
              <Button className="bg-blue-400 text-sm hover:bg-blue-500" asChild>
                <Link href="/pricing">Get Plagiacheck</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Words counter for mobile */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-400/10 text-blue-050 text-xs">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">{user ? String(remainingWords) : "1000"}</span>
          </div>
          
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md hover:bg-accent transition-colors"
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
          <div className="fixed top-16 left-0 right-0 bg-background border-b shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="container px-4 py-6">
              {/* Navigation Links */}
              <div className="space-y-4 mb-6">
                {navigation.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href} 
                    className="block text-base font-medium transition-colors hover:text-primary py-2 border-b border-border/50"
                    onClick={closeMobileMenu}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between py-2 mb-6 border-b border-border/50">
                <span className="text-sm font-medium">Theme</span>
                <ThemeToggle />
              </div>

              {/* Auth Buttons or Profile */}
              <div className="space-y-3">
                {user ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Signed in as {user.email}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full" asChild onClick={closeMobileMenu}>
                      <Link href="/signin">Log in</Link>
                    </Button>
                    <Button className="w-full bg-blue-400 hover:bg-blue-500" asChild onClick={closeMobileMenu}>
                      <Link href="/pricing">Get Plagiacheck</Link>
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