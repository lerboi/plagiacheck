"use client"

import { useState, useMemo } from "react"
import { Nav } from "@/components/nav"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, Hash, Clock, TrendingUp } from "lucide-react"
import { FAQ } from "@/components/FAQ"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ToolPageHeader } from "@/components/tool-page-header"

const STOPWORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","is","are","was","were","it","i","you","he","she","we","they","this","that"])

export default function WordCounter() {
  const [text, setText] = useState("")
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

    // Reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(words / 200)

    // Speaking time (average 150 words per minute)
    const speakingTimeMinutes = Math.ceil(words / 150)

    // Average word length
    const avgWordLength = words > 0 ? (charactersNoSpaces / words).toFixed(1) : "0"

    // Longest word
    const wordsArray = trimmedText.split(/\s+/).filter(Boolean)
    const longestWord = wordsArray.reduce((longest, word) => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, "")
      return cleanWord.length > longest.length ? cleanWord : longest
    }, "")

    // Unique words
    const uniqueWords = new Set(wordsArray.map(w => w.toLowerCase().replace(/[^a-zA-Z]/g, ""))).size

    // Line count
    const lines = text.split("\n").length

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      readingTimeMinutes,
      speakingTimeMinutes,
      avgWordLength,
      longestWord,
      uniqueWords,
      lines,
    }
  }, [text])

  const topWords = useMemo(() => {
    const freq: Record<string, number> = {}
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || []
    words.forEach(w => { if (!STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1 })
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => ({ word, count }))
  }, [text])

  const readingTime = stats.words === 0 ? "—" : stats.words < 200 ? "< 1 min" : Math.ceil(stats.words / 200) + " min"
  const speakingTime = stats.words === 0 ? "—" : stats.words < 130 ? "< 1 min" : Math.ceil(stats.words / 130) + " min"

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
      variant: "success",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <ToolPageHeader
        icon={Hash}
        title="Word Counter"
        description="Instant word, character, sentence, and paragraph counts for any text. See reading time, top keywords, and unique word frequency — all free."
        category="Utility"
        gradient="from-orange-500/[0.07]"
        iconColor="text-orange-500"
        iconBg="bg-orange-500/10 border-orange-500/20"
        categoryColor="text-orange-600 dark:text-orange-400"
      />
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr,auto] gap-4 items-start">
          {/* LEFT — textarea */}
          <div className="space-y-3">
            <Textarea
              placeholder="Start typing or paste your text here to see word count and other statistics..."
              className="min-h-[420px] resize-none rounded-xl border-border bg-background text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-orange-500/30 focus-visible:ring-offset-0"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!text}
                className="h-7 text-xs"
              >
                {copied ? (
                  <><Check className="h-3 w-3 mr-1 text-green-500" />Copied</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" />Copy</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText("")}
                disabled={!text}
                className="h-7 text-xs"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText(text.toLowerCase())}
                disabled={!text}
                className="h-7 text-xs"
              >
                lowercase
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setText(text.toUpperCase())}
                disabled={!text}
                className="h-7 text-xs"
              >
                UPPERCASE
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setText(
                    text.replace(/\S+/g, (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    )
                  )
                }
                disabled={!text}
                className="h-7 text-xs"
              >
                Title Case
              </Button>
            </div>
          </div>

          {/* RIGHT — stats panel */}
          <div className="w-64 space-y-3">
            {/* Primary stats — 2x2 grid with large numbers */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Words", value: stats.words, color: "text-orange-500" },
                { label: "Characters", value: stats.characters, color: "text-blue-500" },
                { label: "Sentences", value: stats.sentences, color: "text-purple-500" },
                { label: "Paragraphs", value: stats.paragraphs, color: "text-green-500" },
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
                { label: "Reading time", value: readingTime },
                { label: "Speaking time", value: speakingTime },
                { label: "Chars (no spaces)", value: stats.charactersNoSpaces.toLocaleString() },
                { label: "Unique words", value: stats.uniqueWords.toLocaleString() },
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
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Words</span>
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
                <h3 className="text-sm font-semibold">Real-Time Counting</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Every stat updates instantly as you type — no submit button needed. Words, characters, sentences, and paragraphs.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Reading &amp; Speaking Time</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Estimated reading time (200 wpm) and speaking time (130 wpm) are calculated automatically.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Top Keywords</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">The most frequent non-trivial words are shown with proportional frequency bars — useful for checking keyword density.</p>
            </div>
          </div>

          {/* Use cases + Tips */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Perfect for</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Writers checking they meet or stay under a word limit for submissions
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Students verifying essay length requirements before submitting
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Podcasters or speakers estimating how long their script will take
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  SEO writers checking keyword frequency and density
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  Editors reviewing content length and reading complexity at a glance
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold">Tips for best results</h3>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Average blog posts read in 7–10 minutes — aim for 1,400–2,000 words for that range.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Check the top keywords list to spot over-repetition before your editor does.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Speaking time assumes 130 wpm — adjust if you speak faster or slower in practice.
                </li>
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-orange-500 font-bold shrink-0">→</span>
                  Use character count (no spaces) when working with platforms that count differently.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <FAQ />
    </div>
  )
}
