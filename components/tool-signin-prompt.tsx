"use client"
import Link from "next/link"
import { LogIn } from "lucide-react"

interface ToolSignInPromptProps {
  /** Optional href — defaults to /signin. Pass ?next= to return after auth. */
  href?: string
}

export function ToolSignInPrompt({ href = "/signin" }: ToolSignInPromptProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center shrink-0">
          <LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Sign in to use this tool</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Your text will be here when you get back.</p>
        </div>
      </div>
      <Link
        href={href}
        className="shrink-0 h-9 px-4 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Sign In
      </Link>
    </div>
  )
}
