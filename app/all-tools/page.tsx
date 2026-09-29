import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Nav } from "@/components/nav"
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
import type en from "@/messages/en"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AllTools.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/all-tools" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "/all-tools",
    },
  }
}

type ToolId = keyof (typeof en)["ToolCatalog"]["tools"]
type CategoryId = keyof (typeof en)["ToolCatalog"]["categories"]

interface ToolCard {
  id: ToolId
  href: string
  icon: LucideIcon
  color: string
  bgColor: string
  isFree?: boolean
  usesImageTokens?: boolean
}

interface CategoryBlock {
  id: CategoryId
  /** English label, kept only for the stable section id / aria-labelledby. */
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  tools: ToolCard[]
}

const CATEGORIES: CategoryBlock[] = [
  {
    id: "writing",
    label: "Writing Tools",
    icon: Pen,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tools: [
      { id: "plagiarismChecker", href: "/plagiarism-checker", icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
      { id: "aiDetector", href: "/ai-detector", icon: Brain, color: "text-purple-500", bgColor: "bg-purple-500/10" },
      { id: "aiHumanizer", href: "/ai-humanizer", icon: Wand2, color: "text-pink-500", bgColor: "bg-pink-500/10" },
      { id: "paraphraser", href: "/paraphraser", icon: RefreshCw, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
      { id: "summarizer", href: "/summarizer", icon: FileText, color: "text-green-500", bgColor: "bg-green-500/10" },
      { id: "grammarChecker", href: "/grammar-checker", icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
      { id: "wordCounter", href: "/word-counter", icon: Hash, color: "text-orange-500", bgColor: "bg-orange-500/10", isFree: true },
    ],
  },
  {
    id: "image",
    label: "Image & Visual",
    icon: ImageIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tools: [
      { id: "imageToText", href: "/image-to-text", icon: Image, color: "text-rose-500", bgColor: "bg-rose-500/10", usesImageTokens: true },
      { id: "infographicGenerator", href: "/infographic-generator", icon: BarChart3, color: "text-amber-500", bgColor: "bg-amber-500/10", usesImageTokens: true },
      { id: "thumbnailGenerator", href: "/thumbnail-generator", icon: ImagePlus, color: "text-violet-500", bgColor: "bg-violet-500/10", usesImageTokens: true },
      { id: "chartGenerator", href: "/chart-generator", icon: PieChart, color: "text-teal-500", bgColor: "bg-teal-500/10", usesImageTokens: true },
    ],
  },
  {
    id: "voice",
    label: "Voice & Audio",
    icon: AudioLines,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    tools: [
      { id: "speechToText", href: "/speech-to-text", icon: Mic, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
      { id: "textToSpeech", href: "/text-to-speech", icon: Volume2, color: "text-sky-500", bgColor: "bg-sky-500/10", isFree: true },
      { id: "voiceToEssay", href: "/voice-to-essay", icon: FileEdit, color: "text-sky-600", bgColor: "bg-sky-600/10" },
      { id: "audioSummarizer", href: "/audio-summarizer", icon: FileAudio, color: "text-orange-600", bgColor: "bg-orange-600/10" },
    ],
  },
]

export default async function AllToolsPage() {
  const t = await getTranslations("AllTools")
  const tCatalog = await getTranslations("ToolCatalog")
  const tBadges = await getTranslations("Nav.badges")

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <header className="border-b border-border">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Plagiacheck
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {t("header.title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed">
            {t("header.description")}
          </p>
        </div>
      </header>

      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* PlagiaAI featured hero */}
        <Link
          href="/"
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
                  {tBadges("new")}
                </span>
              </div>
              <p className="mt-1.5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {t("plagiaAi.description")}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 group-hover:gap-1.5 transition-all">
                {t("plagiaAi.cta")}
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
                {tCatalog(`categories.${category.id}`)}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.tools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="group rounded-xl border border-border p-4 hover:border-foreground/20 hover:bg-accent/40 transition-[background-color,border-color,transform] duration-150 motion-safe:hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${tool.bgColor} shrink-0 transition-transform motion-safe:group-hover:scale-110`}>
                      <tool.icon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-semibold">{tCatalog(`tools.${tool.id}.name`)}</h3>
                        {tool.isFree && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full leading-none">
                            {tBadges("free")}
                          </span>
                        )}
                        {tool.usesImageTokens && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 rounded-full leading-none">
                            {tBadges("img")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {t(`tools.${tool.id}.description`)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
