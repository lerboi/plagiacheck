"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

interface EmptyStateProps {
  children?: ReactNode
}

export function EmptyState({ children }: EmptyStateProps) {
  const t = useTranslations("PlagiaAi.emptyState")
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 min-h-[480px]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        <div className="space-y-4">
          {/* Eyebrow: states the value proposition at a glance and anchors the
              visual hierarchy (badge → headline → subcopy → suggestion chips). */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
            {t("badge")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-balance">
            {t("title")}
          </h2>
          {/* Tells a first-time visitor what to do and that PlagiaAI runs a real
              tool, rather than being a generic chatbot. */}
          <p className="text-base text-muted-foreground text-balance max-w-md mx-auto">
            {t("description")}
          </p>
        </div>
        {children}
      </motion.div>
    </div>
  )
}
