"use client"

import { useState, useMemo } from "react"
import { Nav } from "@/components/nav"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, Hash, Clock, TrendingUp } from "lucide-react"
import { FAQ } from "@/components/FAQ"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"
import { useTranslations } from "next-intl"

const STOPWORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","is","are","was","were","it","i","you","he","she","we","they","this","that"])

const READING_WPM = 200
const SPEAKING_WPM = 130

const FAQ_KEYS = ["free", "privacy", "counts", "timing", "stopwords"] as const

export default function WordCounter() {
  const t = useTranslations("WordCounter")
  const [text, setText] = useState("")
  const [previousText, setPreviousText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const stats = useMemo(() => {
    const trimmedText = text.trim()

    // Character counts
    const characters = text.length
    const charactersNoSpaces = text.replace(/\s/g, "").length

    // Word count
    const words = trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0

    // Sentence count (approximate)
    const sentences = trimmedText ? (trimmedText.match(/[.!?]+/g) || []).length || (trimmedText.length > 0 ? 1 : 0) : 0

    // Paragraph count
    const paragraphs = trimmedText ? trimmedText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0

    // Unique words — case-insensitive tokens, keeping digits and
    // apostrophes so numeric tokens and contractions count properly.
    const wordsArray = trimmedText.split(/\s+/).filter(Boolean)
    const uniqueWords = new Set(
      wordsArray
        .map(w => w.toLowerCase().replace(/[^a-z0-9'’]/g, ""))
        .filter(Boolean)
    ).size

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      uniqueWords,
    }
  }, [text])

  const topWords = useMemo(() => {
    const freq: Record<string, number> = {}
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || []
    words.forEach(w => { if (!STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1 })
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => ({ word, count }))
  }, [text])

  const readingTime = stats.words === 0 ? "—" : stats.words < READING_WPM ? t("time.underOneMinute") : t("time.minutes", { count: Math.ceil(stats.words / READING_WPM) })
  const speakingTime = stats.words === 0 ? "—" : stats.words < SPEAKING_WPM ? t("time.underOneMinute") : t("time.minutes", { count: Math.ceil(stats.words / SPEAKING_WPM) })

  // Case transforms are destructive — keep one level of undo.
  const applyTransform = (transform: (value: string) => string) => {
    setPreviousText(text)
    setText(transform(text))
  }

  const handleUndo = () => {
    if (previousText === null) return
    setText(previousText)
    setPreviousText(null)
  }

  const toTitleCase = (value: string) =>
    value.replace(/\S+/g, (word) => {
      // Preserve all-caps words (acronyms like NASA or HTML).
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: t("toasts.copiedTitle"),
      description: t("toasts.copiedDescription"),
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Hash}
        title={t("header.title")}
        description={t("header.description")}
        category={t("header.category")}
        iconColor="text-orange-500"
        iconBg="bg-orange-500/10 border-orange-500/20"
        categoryColor="text-orange-600 dark:text-orange-400"
      />
      <section className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr,auto] gap-4 items-start">
          {/* LEFT — textarea */}
          <div className="space-y-3">
            <Textarea
              aria-label={t("input.ariaLabel")}
              placeholder={t("input.placeholder")}
              className="min-h-[420px] resize-none rounded-xl border-border bg-background text-base md:text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-orange-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!text}
                className="h-7 text-xs"
              >
                {copied ? (
                  <><Check className="h-3 w-3 mr-1 text-green-500" />{t("actions.copied")}</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" />{t("actions.copy")}</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText("")}
                disabled={!text}
                className="h-7 text-xs"
              >
                {t("actions.clear")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyTransform((value) => value.toLowerCase())}
                disabled={!text}
                className="h-7 text-xs"
              >
                {t("actions.lowercase")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyTransform((value) => value.toUpperCase())}
                disabled={!text}
                className="h-7 text-xs"
              >
                {t("actions.uppercase")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyTransform(toTitleCase)}
                disabled={!text}
                className="h-7 text-xs"
              >
                {t("actions.titleCase")}
              </Button>
              {previousText !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className="h-7 text-xs"
                >
                  {t("actions.undo")}
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT — stats panel */}
          <div className="w-full lg:w-80 space-y-3">
            {/* Primary stats — 2x2 grid with large numbers */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("stats.words"), value: stats.words, color: "text-orange-500" },
                { label: t("stats.characters"), value: stats.characters, color: "text-blue-500" },
                { label: t("stats.sentences"), value: stats.sentences, color: "text-purple-500" },
                { label: t("stats.paragraphs"), value: stats.paragraphs, color: "text-green-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
              {[
                { label: t("stats.readingTime"), value: readingTime },
                { label: t("stats.speakingTime"), value: speakingTime },
                { label: t("stats.charsNoSpaces"), value: stats.charactersNoSpaces.toLocaleString() },
                { label: t("stats.uniqueWords"), value: stats.uniqueWords.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>

            {/* Keyword frequency — top 5 words */}
            {stats.words > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("stats.topWords")}</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {topWords.map(({ word, count: wc }) => (
                    <div key={word} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-20 truncate">{word}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500/60 rounded-full"
                          style={{ width: `${(wc / (topWords[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{wc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Informational content ── */}
        <div className="mt-10 pt-8 border-t border-border space-y-8">

          {/* Features row */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">{t("features.realtime.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.realtime.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">{t("features.time.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.time.body")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">{t("features.keywords.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("features.keywords.body")}</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("useCases.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  {t("useCases.items.writers")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  {t("useCases.items.students")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  {t("useCases.items.speakers")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  {t("useCases.items.seo")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  {t("useCases.items.editors")}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("tips.title")}</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  {t("tips.items.blog")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  {t("tips.items.keywords")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  {t("tips.items.speaking")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  {t("tips.items.noSpaces")}
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ items={faqItems} />
    </div>
  )
}
