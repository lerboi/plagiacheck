"use client"

import { LogOut, CreditCard, Crown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User as SupabaseUser } from "@supabase/auth-helpers-nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTokenStore } from "@/lib/store"

interface ProfileDropdownProps {
  user: SupabaseUser
  onLogout: () => Promise<void>
}

export function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  const { remainingWords } = useTokenStore()

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const getDisplayName = (email: string) => {
    return email.split('@')[0]
  }

  const handleSignOut = async () => {
    try {
      await onLogout()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10 focus-visible:ring-0 focus-visible:ring-offset-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 shadow-xl"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                  {getInitials(user.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1 leading-none">
                <p className="text-sm font-medium text-foreground">
                  {getDisplayName(user.email || 'User')}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-md">
              <div className="flex items-center space-x-2">
                <Crown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {remainingWords.toLocaleString()} words
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/billing" className="flex items-center w-full">
            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
