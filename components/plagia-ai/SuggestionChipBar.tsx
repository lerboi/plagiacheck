"use client"

import Link from "next/link"
import { motion } from "framer-motion"
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
  label: string
  icon: LucideIcon
  prefill: string
}

const CHIPS: ChipDef[] = [
  { label: "Check plagiarism", icon: Shield, prefill: "Check this text for plagiarism:\n\n" },
  { label: "Paraphrase", icon: Pencil, prefill: "Paraphrase this in a formal tone:\n\n" },
  { label: "Detect AI", icon: Bot, prefill: "Is this text AI-generated?\n\n" },
  { label: "Summarize", icon: FileText, prefill: "Summarize this in 3 bullet points:\n\n" },
  { label: "Make a chart", icon: BarChart3, prefill: "Make a bar chart showing " },
]

interface SuggestionChipBarProps {
  onChipClick: (prefill: string) => void
}

const itemVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

export function SuggestionChipBar({ onChipClick }: SuggestionChipBarProps) {
  return (
    <div
      role="group"
      aria-label="Suggested prompts"
      className="flex flex-wrap gap-2 justify-center"
    >
      {CHIPS.map(({ label, icon: Icon, prefill }, i) => (
        <motion.button
          key={label}
          type="button"
          onClick={() => onChipClick(prefill)}
          aria-label={label}
          variants={itemVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2, delay: 0.05 + i * 0.035, ease: "easeOut" }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent/40 hover:bg-accent border border-border text-sm text-foreground transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5"
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
          aria-label="See all tools"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-primary/30 hover:border-primary text-sm text-foreground transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5"
        >
          <span>See all tools</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </motion.div>
    </div>
  )
}
