"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Shield,
  Pencil,
  Bot,
  FileText,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"

interface ChipDef {
  /** Key under PlagiaAi.chips.items holding the chip's label and prefill text. */
  id: "plagiarism" | "paraphrase" | "detectAi" | "summarize" | "chart"
  icon: LucideIcon
}

const CHIPS: ChipDef[] = [
  { id: "plagiarism", icon: Shield },
  { id: "paraphrase", icon: Pencil },
  { id: "detectAi", icon: Bot },
  { id: "summarize", icon: FileText },
  { id: "chart", icon: BarChart3 },
]

interface SuggestionChipBarProps {
  onChipClick: (prefill: string) => void
}

const itemVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

export function SuggestionChipBar({ onChipClick }: SuggestionChipBarProps) {
  const t = useTranslations("PlagiaAi.chips")
  const chips = CHIPS.map(({ id, icon }) => ({
    id,
    icon,
    label: t(`items.${id}.label`),
    prefill: t(`items.${id}.prefill`),
  }))
  return (
    <div
      role="group"
      aria-label={t("groupAria")}
      className="flex flex-wrap gap-2 justify-center"
    >
      {chips.map(({ id, label, icon: Icon, prefill }, i) => (
        <motion.button
          key={id}
          type="button"
          onClick={() => onChipClick(prefill)}
          aria-label={label}
          variants={itemVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2, delay: 0.05 + i * 0.035, ease: "easeOut" }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent/40 hover:bg-accent border border-border text-sm text-foreground transition-[background-color,border-color,transform] duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </motion.button>
      ))}
      <motion.div
        variants={itemVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.2, delay: 0.05 + CHIPS.length * 0.035, ease: "easeOut" }}
      >
        <Link
          href="/all-tools"
          aria-label={t("seeAll")}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-primary/30 hover:border-primary text-sm text-foreground transition-[background-color,border-color,transform] duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <span>{t("seeAll")}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </motion.div>
    </div>
  )
}
