"use client"

import type { LucideIcon } from "lucide-react"

interface ToolPageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  category: string
  /** @deprecated gradient prop kept for backwards-compat but no longer rendered */
  gradient?: string
  iconColor: string
  iconBg: string
  categoryColor: string
}

export function ToolPageHeader({
  icon: Icon,
  title,
  description,
  category,
  iconColor,
  iconBg,
  categoryColor,
}: ToolPageHeaderProps) {
  return (
    <div className="border-b border-border">
      <div className="container max-w-5xl mx-auto px-4 py-10 md:py-14 flex items-center justify-between gap-8">
        {/* Left — text */}
        <div className="space-y-3 flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${categoryColor}`}>
            {category}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {title}
          </h1>
          <p className="text-base text-muted-foreground max-w-md leading-relaxed">
            {description}
          </p>
        </div>

        {/* Right — icon */}
        <div className="hidden md:flex shrink-0 items-center justify-center relative">
          <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border ${iconBg}`}>
            <Icon className={`h-9 w-9 ${iconColor}`} strokeWidth={1.5} />
          </div>
          <div className={`absolute w-28 h-28 rounded-full border border-dashed opacity-15 ${iconBg.split(" ")[1] || "border-border"}`} />
          <div className={`absolute w-36 h-36 rounded-full border opacity-8 ${iconBg.split(" ")[1] || "border-border"}`} />
        </div>
      </div>
    </div>
  )
}
