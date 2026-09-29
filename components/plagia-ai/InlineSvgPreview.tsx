"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import type { PlagiaAiToolName } from "@/lib/plagia-ai/types"

interface InlineSvgPreviewProps {
  svg: string
  toolName: PlagiaAiToolName
}

/** Key under PlagiaAi.svgPreview.labels for each SVG-producing tool. */
const TOOL_LABELS: Partial<Record<PlagiaAiToolName, "chart" | "infographic" | "thumbnail">> = {
  generate_chart: "chart",
  generate_infographic: "infographic",
  generate_thumbnail: "thumbnail",
}

const FILENAME_BASE: Partial<Record<PlagiaAiToolName, string>> = {
  generate_chart: "chart",
  generate_infographic: "infographic",
  generate_thumbnail: "thumbnail",
}

/**
 * FE-21 — render a generated SVG inline inside a tool card so the user
 * doesn't have to leave the chat to see chart / infographic / thumbnail
 * output. Container always uses white background (matches downloaded file
 * appearance) regardless of theme.
 *
 * Respects prefers-reduced-motion via useReducedMotion(); MotionConfig
 * from FE-15 also suppresses transform-based motion globally, but the
 * fade here is opacity-only and stays under reduce-motion (per WCAG 2.3.3
 * — opacity is non-vestibular).
 */
export function InlineSvgPreview({ svg, toolName }: InlineSvgPreviewProps) {
  const t = useTranslations("PlagiaAi.svgPreview")
  const prefersReducedMotion = useReducedMotion()
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      }

  const label = t(`labels.${TOOL_LABELS[toolName] ?? "output"}`)

  const handleDownload = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${FILENAME_BASE[toolName] ?? "plagia-ai"}-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <motion.div {...motionProps} className="space-y-2 pt-1">
      <div
        // role="img" + aria-label give the rendered SVG a single accessible
        // name and stop AT from reading the chart's raw inner <text> nodes as
        // loose content. The lib/svg-templates.ts output is already a
        // self-contained <svg> with its own viewBox + bg fill; we just drop it
        // in and let the browser size it naturally.
        role="img"
        aria-label={t("outputAria", { label })}
        className="rounded-lg bg-white shadow-sm border border-border overflow-hidden p-3 [&>svg]:w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
          onClick={handleDownload}
          aria-label={t("downloadAria", { label: label.toLowerCase() })}
          title={t("download")}
        >
          <Download className="h-3 w-3" />
          {t("download")}
        </Button>
      </div>
    </motion.div>
  )
}
