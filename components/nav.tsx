"use client"

import { PiLetterCircleP } from "react-icons/pi"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTokenStore } from "@/lib/store"
import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { ThemeToggle } from "./theme-toggle"
import { ProfileDropdown } from "@/components/Profile/ProfileDropdown"

export function Nav() {
  const { remainingWords, fetchRemainingWords } = useTokenStore()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<User | null>(null)

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
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full text-blue-300 scale-[170%] items-center justify-center flex">
              <PiLetterCircleP />
            </div>
            <span className="font-bold">plagiacheck</span>
          </Link>
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
        <div className="flex items-center gap-4">
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
      </div>
    </nav>
  )
}