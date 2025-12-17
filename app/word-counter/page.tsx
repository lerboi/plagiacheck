"use client"

import { useState, useMemo } from "react"
import { Nav } from "@/components/nav"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Clock, Hash, AlignLeft, Type, BookOpen, Copy, Check, BarChart3 } from "lucide-react"
import { FeatureShowcase } from "@/components/FeatureShowcase"
import { Hero } from "@/components/Hero"
import { FAQ } from "@/components/FAQ"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

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

  const mainStats = [
    { label: "Words", value: stats.words, icon: Type, color: "from-blue-500 to-blue-600" },
    { label: "Characters", value: stats.characters, icon: Hash, color: "from-purple-500 to-purple-600" },
    { label: "Sentences", value: stats.sentences, icon: AlignLeft, color: "from-green-500 to-green-600" },
    { label: "Paragraphs", value: stats.paragraphs, icon: FileText, color: "from-orange-500 to-orange-600" },
  ]

  const additionalStats = [
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
    { label: "Unique Words", value: stats.uniqueWords },
    { label: "Average Word Length", value: `${stats.avgWordLength} chars` },
    { label: "Lines", value: stats.lines },
    { label: "Longest Word", value: stats.longestWord || "-" },
  ]

  const timeStats = [
    { label: "Reading Time", value: `${stats.readingTimeMinutes} min`, icon: BookOpen, desc: "~200 words/min" },
    { label: "Speaking Time", value: `${stats.speakingTimeMinutes} min`, icon: Clock, desc: "~150 words/min" },
  ]

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero Section */}
      <section className="container py-16">
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Free Online Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="font-bold tracking-tight sm:text-6xl md:text-7xl">
              Word Counter
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
            Count words, characters, sentences, and more instantly.
            Perfect for essays, articles, and social media posts.
          </p>
        </motion.div>

        {/* Main Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {mainStats.map((stat, index) => (
            <Card key={index} className="p-6 border-0 shadow-lg bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="text-center">
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-12 items-start max-w-7xl mx-auto">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Text Area Card */}
            <Card className="p-8 shadow-lg border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Text</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!text}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Start typing or paste your text here to see word count and other statistics..."
                  className="min-h-[350px] resize-none border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-base leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText("")}
                    disabled={!text}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.toLowerCase())}
                    disabled={!text}
                  >
                    lowercase
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.toUpperCase())}
                    disabled={!text}
                  >
                    UPPERCASE
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setText(text.split(' ').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' '))}
                    disabled={!text}
                  >
                    Title Case
                  </Button>
                </div>
              </div>
            </Card>

            {/* Time Estimates */}
            <div className="grid grid-cols-2 gap-4">
              {timeStats.map((stat, index) => (
                <Card key={index} className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Sidebar with Additional Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="sticky top-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Detailed Statistics
                    </h3>

                    <div className="space-y-4">
                      {additionalStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                          <span className="font-semibold">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Character Limits */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Common Limits</h4>
                    <div className="space-y-3">
                      {[
                        { platform: "Twitter/X", limit: 280, unit: "chars" },
                        { platform: "Instagram Bio", limit: 150, unit: "chars" },
                        { platform: "LinkedIn Post", limit: 3000, unit: "chars" },
                        { platform: "SMS", limit: 160, unit: "chars" },
                        { platform: "Meta Description", limit: 160, unit: "chars" },
                      ].map((item, index) => {
                        const current = stats.characters
                        const percentage = Math.min(100, (current / item.limit) * 100)
                        const isOver = current > item.limit

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{item.platform}</span>
                              <span className={isOver ? "text-red-500 font-medium" : ""}>
                                {current}/{item.limit}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${isOver
                                  ? "bg-red-500"
                                  : percentage > 80
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  }`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Free Tool</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        This word counter is completely free and doesn&apos;t use any of your word credits!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />
      <Hero />
      <FAQ />
    </div>
  )
}
