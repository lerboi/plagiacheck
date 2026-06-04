"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  Image as ImageIcon,
  BarChart3,
  ImagePlus,
  PieChart,
  Mic,
  Volume2,
  FileEdit,
  FileAudio,
  Pen,
  ImageIcon as ImagesIcon,
  AudioLines,
  type LucideIcon,
} from "lucide-react"

interface Tool {
  name: string
  icon: LucideIcon
  /** Route to the tool's standalone page (all verified to exist). */
  href: string
}

interface CategoryBlock {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  tools: Tool[]
}

const CATEGORIES: CategoryBlock[] = [
  {
    label: "Writing",
    icon: Pen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tools: [
      { name: "Plagiarism Checker", icon: Shield, href: "/plagiarism-checker" },
      { name: "AI Detector", icon: Brain, href: "/ai-detector" },
      { name: "AI Humanizer", icon: Wand2, href: "/ai-humanizer" },
      { name: "Paraphraser", icon: RefreshCw, href: "/paraphraser" },
      { name: "Summarizer", icon: FileText, href: "/summarizer" },
      { name: "Grammar Checker", icon: CheckCircle2, href: "/grammar-checker" },
      { name: "Word Counter", icon: Hash, href: "/word-counter" },
    ],
  },
  {
    label: "Image & Visual",
    icon: ImagesIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tools: [
      { name: "Infographic Generator", icon: BarChart3, href: "/infographic-generator" },
      { name: "Thumbnail Generator", icon: ImagePlus, href: "/thumbnail-generator" },
      { name: "Chart Generator", icon: PieChart, href: "/chart-generator" },
      { name: "Image to Text", icon: ImageIcon, href: "/image-to-text" },
    ],
  },
  {
    label: "Voice & Audio",
    icon: AudioLines,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    tools: [
      { name: "Speech to Text", icon: Mic, href: "/speech-to-text" },
      { name: "Text to Speech", icon: Volume2, href: "/text-to-speech" },
      { name: "Voice to Essay", icon: FileEdit, href: "/voice-to-essay" },
      { name: "Audio Summarizer", icon: FileAudio, href: "/audio-summarizer" },
    ],
  },
]

export function OneChatAllTools() {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-10 md:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
            One chat. Every tool.
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            Just describe what you need. PlagiaAI picks the right tool and runs it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((category, i) => (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`p-1.5 rounded-md ${category.bgColor}`}>
                  <category.icon className={`h-4 w-4 ${category.color}`} />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {category.label}
                </h3>
              </div>
              <ul className="space-y-2">
                {category.tools.map((tool) => (
                  <li key={tool.name}>
                    {/* Each tool links to its standalone page so users can jump
                        straight there instead of only via chat. */}
                    <Link
                      href={tool.href}
                      className="group flex items-center gap-2.5 -mx-1 rounded-md px-1 py-1 text-sm text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    >
                      <tool.icon className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 motion-safe:group-hover:scale-110 group-hover:text-foreground" />
                      <span>{tool.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
