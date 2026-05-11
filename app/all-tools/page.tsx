import type { Metadata } from "next"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { FAQ } from "@/components/FAQ"
import {
  Shield,
  Brain,
  Wand2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Hash,
  Image,
  BarChart3,
  ImagePlus,
  PieChart,
  Mic,
  Volume2,
  FileEdit,
  FileAudio,
  Sparkles,
  ChevronRight,
  Pen,
  ImageIcon,
  AudioLines,
  type LucideIcon,
} from "lucide-react"

export const metadata: Metadata = {
  title: "All Tools — Plagiacheck",
  description:
    "Every Plagiacheck writing tool in one place. Paraphraser, summarizer, AI detector, plagiarism checker, grammar checker, voice and image tools, and PlagiaAI — your AI assistant that runs them all.",
  alternates: { canonical: "/all-tools" },
  openGraph: {
    title: "All Tools — Plagiacheck",
    description:
      "Every Plagiacheck writing tool in one place. 15 tools across writing, image, and voice — plus PlagiaAI to chat your way through them.",
    type: "website",
    url: "/all-tools",
  },
}

interface ToolCard {
  name: string
  href: string
  icon: LucideIcon
  desc: string
  color: string
  bgColor: string
  isFree?: boolean
  usesImageTokens?: boolean
}

interface CategoryBlock {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  tools: ToolCard[]
}

const CATEGORIES: CategoryBlock[] = [
  {
    label: "Writing Tools",
    icon: Pen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tools: [
      { name: "Plagiarism Checker", href: "/plagiarism-checker", icon: Shield, desc: "Detect copied or reused text with sentence-level highlighting.", color: "text-blue-500", bgColor: "bg-blue-500/10" },
      { name: "AI Detector", href: "/ai-detector", icon: Brain, desc: "Spot AI-generated writing with a sentence-by-sentence confidence breakdown.", color: "text-purple-500", bgColor: "bg-purple-500/10" },
      { name: "AI Humanizer", href: "/ai-humanizer", icon: Wand2, desc: "Rewrite AI-flavoured text into natural-sounding human writing.", color: "text-pink-500", bgColor: "bg-pink-500/10" },
      { name: "Paraphraser", href: "/paraphraser", icon: RefreshCw, desc: "Rewrite text in six modes — standard, fluency, formal, simple, creative, academic.", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
      { name: "Summarizer", href: "/summarizer", icon: FileText, desc: "Condense long text into a paragraph or bullet points with adjustable length.", color: "text-green-500", bgColor: "bg-green-500/10" },
      { name: "Grammar Checker", href: "/grammar-checker", icon: CheckCircle2, desc: "Catch grammar, spelling, and punctuation errors with explanations.", color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
      { name: "Word Counter", href: "/word-counter", icon: Hash, desc: "Count words, characters, paragraphs, and reading time. Free, no tokens.", color: "text-orange-500", bgColor: "bg-orange-500/10", isFree: true },
    ],
  },
  {
    label: "Image & Visual",
    icon: ImageIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tools: [
      { name: "Image to Text", href: "/image-to-text", icon: Image, desc: "Extract text from photos, screenshots, and scanned documents.", color: "text-rose-500", bgColor: "bg-rose-500/10", usesImageTokens: true },
      { name: "Infographic Generator", href: "/infographic-generator", icon: BarChart3, desc: "Turn any article or topic into a clean, deterministic SVG infographic.", color: "text-amber-500", bgColor: "bg-amber-500/10", usesImageTokens: true },
      { name: "Thumbnail Generator", href: "/thumbnail-generator", icon: ImagePlus, desc: "Create 1200×630 cover images for blogs, videos, and social.", color: "text-violet-500", bgColor: "bg-violet-500/10", usesImageTokens: true },
      { name: "Chart Generator", href: "/chart-generator", icon: PieChart, desc: "Generate bar, line, pie, flowchart, mindmap, timeline, or comparison charts.", color: "text-teal-500", bgColor: "bg-teal-500/10", usesImageTokens: true },
    ],
  },
  {
    label: "Voice & Audio",
    icon: AudioLines,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    tools: [
      { name: "Speech to Text", href: "/speech-to-text", icon: Mic, desc: "Transcribe spoken audio to clean, punctuated text.", color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { name: "Text to Speech", href: "/text-to-speech", icon: Volume2, desc: "Read text aloud with adjustable rate and pitch. Free, no tokens.", color: "text-sky-500", bgColor: "bg-sky-500/10", isFree: true },
      { name: "Voice to Essay", href: "/voice-to-essay", icon: FileEdit, desc: "Speak your draft; get back a structured, polished essay.", color: "text-sky-600", bgColor: "bg-sky-600/10" },
      { name: "Audio Summarizer", href: "/audio-summarizer", icon: FileAudio, desc: "Summarize lectures, interviews, meetings, and podcasts into key points.", color: "text-orange-600", bgColor: "bg-orange-600/10" },
    ],
  },
]

export default function AllToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <header className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Plagiacheck
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            All Tools
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed">
            Fifteen writing, image, and voice tools — plus PlagiaAI, the chat
            assistant that runs them all for you. Pick a tool below, or just
            ask PlagiaAI.
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* PlagiaAI featured hero */}
        <Link
          href="/plagia-ai"
          className="group block rounded-2xl border border-violet-200/60 dark:border-violet-800/60 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/8 to-violet-500/10 hover:from-violet-500/15 hover:via-fuchsia-500/12 hover:to-violet-500/15 transition-all p-6 md:p-8 overflow-hidden relative"
        >
          <div className="flex items-start gap-4 md:gap-5">
            <div className="shrink-0 p-3 rounded-2xl bg-violet-500/15 border border-violet-500/20">
              <Sparkles className="h-6 w-6 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold">PlagiaAI</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-full leading-none">
                  NEW
                </span>
              </div>
              <p className="mt-1.5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Chat with an AI assistant that picks the right tool, runs it,
                and explains the result. Attach an image to OCR, dictate by
                voice, or just type what you want done.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 group-hover:gap-1.5 transition-all">
                Try PlagiaAI
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        {/* Categories */}
        {CATEGORIES.map((category) => (
          <section key={category.label} aria-labelledby={`cat-${category.label}`}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`p-1.5 rounded-md ${category.bgColor}`}>
                <category.icon className={`h-4 w-4 ${category.color}`} />
              </div>
              <h2
                id={`cat-${category.label}`}
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {category.label}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.tools.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group rounded-xl border border-border p-4 hover:border-foreground/20 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${tool.bgColor} shrink-0 transition-transform group-hover:scale-110`}>
                      <tool.icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-semibold">{tool.name}</h3>
                        {tool.isFree && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full leading-none">
                            FREE
                          </span>
                        )}
                        {tool.usesImageTokens && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-full leading-none">
                            IMG
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>

      <FAQ />
    </div>
  )
}
