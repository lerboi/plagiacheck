"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
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
import type en from "@/messages/en"

type ToolCatalogId = keyof (typeof en)["ToolCatalog"]["tools"]

interface Tool {
  /** Key of the tool's name in the ToolCatalog messages. */
  id: ToolCatalogId
  icon: LucideIcon
  /** Route to the tool's standalone page (all verified to exist). */
  href: string
}

interface CategoryBlock {
  id: "writing" | "image" | "voice"
  icon: LucideIcon
  color: string
  bgColor: string
  tools: Tool[]
}

const CATEGORIES: CategoryBlock[] = [
  {
    id: "writing",
    icon: Pen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tools: [
      { id: "plagiarismChecker", icon: Shield, href: "/plagiarism-checker" },
      { id: "aiDetector", icon: Brain, href: "/ai-detector" },
      { id: "aiHumanizer", icon: Wand2, href: "/ai-humanizer" },
      { id: "paraphraser", icon: RefreshCw, href: "/paraphraser" },
      { id: "summarizer", icon: FileText, href: "/summarizer" },
      { id: "grammarChecker", icon: CheckCircle2, href: "/grammar-checker" },
      { id: "wordCounter", icon: Hash, href: "/word-counter" },
    ],
  },
  {
    id: "image",
    icon: ImagesIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tools: [
      { id: "infographicGenerator", icon: BarChart3, href: "/infographic-generator" },
      { id: "thumbnailGenerator", icon: ImagePlus, href: "/thumbnail-generator" },
      { id: "chartGenerator", icon: PieChart, href: "/chart-generator" },
      { id: "imageToText", icon: ImageIcon, href: "/image-to-text" },
    ],
  },
  {
    id: "voice",
    icon: AudioLines,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    tools: [
      { id: "speechToText", icon: Mic, href: "/speech-to-text" },
      { id: "textToSpeech", icon: Volume2, href: "/text-to-speech" },
      { id: "voiceToEssay", icon: FileEdit, href: "/voice-to-essay" },
      { id: "audioSummarizer", icon: FileAudio, href: "/audio-summarizer" },
    ],
  },
]

export function OneChatAllTools() {
  const t = useTranslations("Home.oneChat")
  const tCatalog = useTranslations("ToolCatalog")
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-10 md:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((category, i) => (
            <motion.div
              key={category.id}
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
                  {t(`categories.${category.id}`)}
                </h3>
              </div>
              <ul className="space-y-2">
                {category.tools.map((tool) => (
                  <li key={tool.id}>
                    {/* Each tool links to its standalone page so users can jump
                        straight there instead of only via chat. */}
                    <Link
                      href={tool.href}
                      className="group flex items-center gap-2.5 -mx-1 rounded-md px-1 py-1 text-sm text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    >
                      <tool.icon className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 motion-safe:group-hover:scale-110 group-hover:text-foreground" />
                      <span>{tCatalog(`tools.${tool.id}.name`)}</span>
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
