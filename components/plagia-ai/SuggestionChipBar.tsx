"use client"

import Link from "next/link"
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

export function SuggestionChipBar({ onChipClick }: SuggestionChipBarProps) {
  return (
    <div
      role="group"
      aria-label="Suggested prompts"
      className="flex flex-wrap gap-2 justify-center"
    >
      {CHIPS.map(({ label, icon: Icon, prefill }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChipClick(prefill)}
          aria-label={label}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent/40 hover:bg-accent border border-border text-sm text-foreground transition-colors"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
      <Link
        href="/all-tools"
        aria-label="See all tools"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-primary/30 hover:border-primary text-sm text-foreground transition-colors"
      >
        <span>See all tools</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
