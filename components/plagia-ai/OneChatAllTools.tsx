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
      { name: "Plagiarism Checker", icon: Shield },
      { name: "AI Detector", icon: Brain },
      { name: "AI Humanizer", icon: Wand2 },
      { name: "Paraphraser", icon: RefreshCw },
      { name: "Summarizer", icon: FileText },
      { name: "Grammar Checker", icon: CheckCircle2 },
      { name: "Word Counter", icon: Hash },
    ],
  },
  {
    label: "Image & Visual",
    icon: ImagesIcon,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    tools: [
      { name: "Infographic Generator", icon: BarChart3 },
      { name: "Thumbnail Generator", icon: ImagePlus },
      { name: "Chart Generator", icon: PieChart },
      { name: "Image to Text", icon: ImageIcon },
    ],
  },
  {
    label: "Voice & Audio",
    icon: AudioLines,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    tools: [
      { name: "Speech to Text", icon: Mic },
      { name: "Text to Speech", icon: Volume2 },
      { name: "Voice to Essay", icon: FileEdit },
      { name: "Audio Summarizer", icon: FileAudio },
    ],
  },
]

export function OneChatAllTools() {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
            One chat. Every tool.
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            Just describe what you need. PlagiaAI picks the right tool and runs it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((category) => (
            <div
              key={category.label}
              className="rounded-2xl border border-border p-5"
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
                  <li
                    key={tool.name}
                    className="flex items-center gap-2.5 text-sm text-foreground"
                  >
                    <tool.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{tool.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
