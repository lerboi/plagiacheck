"use client"

import React from "react"

/**
 * Minimal, dependency-free Markdown renderer for PlagiaAI assistant messages.
 * The assistant frequently replies with markdown (bold, lists, headings, inline
 * code, links). Rendering it as plain text leaked the raw symbols, so this turns
 * the common block- and inline-level constructs into styled JSX. It is
 * intentionally small — not a spec-complete parser — covering what the model
 * actually emits: headings, bullet/numbered lists, blockquotes, fenced code,
 * horizontal rules, bold, italic, strikethrough, inline code, and links.
 */

interface InlineRule {
  regex: RegExp
  build: (match: RegExpExecArray, key: string) => React.ReactNode
}

function parseInline(text: string, keyBase: string): React.ReactNode[] {
  const rules: InlineRule[] = [
    {
      // inline code — never parsed for nested formatting
      regex: /`([^`]+)`/,
      build: (m, key) => (
        <code
          key={key}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {m[1]}
        </code>
      ),
    },
    {
      regex: /\[([^\]]+)\]\(([^)\s]+)\)/,
      build: (m, key) => (
        <a
          key={key}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 underline underline-offset-2 dark:text-violet-400"
        >
          {parseInline(m[1], key)}
        </a>
      ),
    },
    {
      regex: /\*\*([^*]+?)\*\*|__([^_]+?)__/,
      build: (m, key) => (
        <strong key={key} className="font-semibold">
          {parseInline(m[1] ?? m[2], key)}
        </strong>
      ),
    },
    {
      regex: /\*([^*\n]+?)\*|(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/,
      build: (m, key) => <em key={key}>{parseInline(m[1] ?? m[2], key)}</em>,
    },
    {
      regex: /~~([^~]+?)~~/,
      build: (m, key) => <del key={key}>{parseInline(m[1], key)}</del>,
    },
  ]

  const nodes: React.ReactNode[] = []
  let remaining = text
  let counter = 0

  while (remaining.length > 0) {
    let best: { idx: number; rule: InlineRule; match: RegExpExecArray } | null =
      null
    for (const rule of rules) {
      const m = rule.regex.exec(remaining)
      if (m && (best === null || m.index < best.idx)) {
        best = { idx: m.index, rule, match: m }
      }
    }
    if (!best) {
      nodes.push(remaining)
      break
    }
    if (best.idx > 0) nodes.push(remaining.slice(0, best.idx))
    nodes.push(best.rule.build(best.match, `${keyBase}-${counter++}`))
    remaining = remaining.slice(best.idx + best.match[0].length)
  }
  return nodes
}

const HEADING_SIZES = [
  "text-lg",
  "text-base",
  "text-base",
  "text-sm",
  "text-sm",
  "text-sm",
]

function parseBlocks(content: string): React.ReactNode[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  const isUl = (l: string) => /^\s*[-*+]\s+/.test(l)
  const isOl = (l: string) => /^\s*\d+\.\s+/.test(l)
  const isHeading = (l: string) => /^#{1,6}\s+/.test(l)
  const isQuote = (l: string) => /^>\s?/.test(l)
  const isFence = (l: string) => /^```/.test(l.trim())
  const isHr = (l: string) => /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim())

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (isFence(line)) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence (if present)
      blocks.push(
        <pre
          key={key++}
          className="my-2 overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-xs"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      )
      continue
    }

    if (line.trim() === "") {
      i++
      continue
    }

    if (isHr(line)) {
      blocks.push(<hr key={key++} className="my-3 border-border" />)
      i++
      continue
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      blocks.push(
        <p
          key={key++}
          className={`mb-1 mt-3 font-semibold first:mt-0 ${HEADING_SIZES[level - 1]}`}
        >
          {parseInline(h[2], `h${key}`)}
        </p>
      )
      i++
      continue
    }

    if (isQuote(line)) {
      const quote: string[] = []
      while (i < lines.length && isQuote(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""))
        i++
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
        >
          {parseInline(quote.join(" "), `q${key}`)}
        </blockquote>
      )
      continue
    }

    if (isUl(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && isUl(lines[i])) {
        const item = lines[i].replace(/^\s*[-*+]\s+/, "")
        items.push(
          <li key={items.length}>{parseInline(item, `ul${key}-${items.length}`)}</li>
        )
        i++
      }
      blocks.push(
        <ul key={key++} className="my-1.5 list-disc space-y-0.5 pl-5">
          {items}
        </ul>
      )
      continue
    }

    if (isOl(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && isOl(lines[i])) {
        const item = lines[i].replace(/^\s*\d+\.\s+/, "")
        items.push(
          <li key={items.length}>{parseInline(item, `ol${key}-${items.length}`)}</li>
        )
        i++
      }
      blocks.push(
        <ol key={key++} className="my-1.5 list-decimal space-y-0.5 pl-5">
          {items}
        </ol>
      )
      continue
    }

    // Paragraph: consecutive lines until a blank line or another block starts.
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isFence(lines[i]) &&
      !isHr(lines[i]) &&
      !isHeading(lines[i]) &&
      !isQuote(lines[i]) &&
      !isUl(lines[i]) &&
      !isOl(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    const paraNodes: React.ReactNode[] = []
    para.forEach((p, idx) => {
      if (idx > 0) paraNodes.push(<br key={`br-${idx}`} />)
      paraNodes.push(...parseInline(p, `p${key}-${idx}`))
    })
    blocks.push(
      <p key={key++} className="my-1.5 leading-relaxed first:mt-0 last:mb-0">
        {paraNodes}
      </p>
    )
  }

  return blocks
}

export function MarkdownMessage({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return <div className={className}>{parseBlocks(content)}</div>
}
