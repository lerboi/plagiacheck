"use client"

import { User, LogOut, CreditCard, Crown } from "lucide-react"
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

interface ProfileDropdownProps {
  user: SupabaseUser
  onLogout: () => Promise<void>
}

export function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
  // Get user initials for avatar fallback
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  // Get display name (first part of email before @)
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
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 border-gray-200 dark:border-gray-700 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl [&>*]:outline-none [&>*]:ring-0 [&>*]:border-0" 
        align="end" 
        forceMount
        style={{ outline: 'none', border: 'none' }}
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
            <div className="flex items-center space-x-2 px-2 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-md">
              <Crown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Free Plan
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors focus:bg-blue-50/50 dark:focus:bg-blue-950/20 focus:outline-none border-0 outline-none ring-0" 
          asChild
          style={{ outline: 'none', border: 'none' }}
        >
          <Link href="/billing" className="flex items-center w-full outline-none ring-0" style={{ outline: 'none' }}>
            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div 
          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-50/50 dark:hover:bg-red-950/10 text-red-600 dark:text-red-400 focus:bg-red-50/50 dark:focus:bg-red-950/10"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log("Sign out clicked!")
            handleSignOut()
          }}
          style={{ outline: 'none', border: 'none' }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}