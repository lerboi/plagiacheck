"use client"

import type { ReactNode } from "react"

interface EmptyStateProps {
  children?: ReactNode
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 min-h-[480px]">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-balance">
            What can I help with today?
          </h2>
          <p className="text-base text-muted-foreground">
            One chat. 15 tools.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
