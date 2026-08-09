"use client"

import { memo, useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Check, Copy } from "lucide-react"

/**
 * Markdown renderer for PlagiaAI assistant messages.
 *
 * Renders the model's markdown (bold, lists, headings, tables, code) with
 * typography tuned to the chat's text-sm scale. Raw HTML in the model
 * output is skipped entirely, so nothing unsanitized reaches the DOM.
 * Memoized because the streaming message re-parses on every token — all
 * finished messages skip re-rendering.
 */

function CodeBlock({ children, language }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked — the button simply doesn't flip to "Copied".
    }
  }

  return (
    <div className="group/code relative my-2 rounded-lg border border-border bg-muted/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/60 bg-muted/40">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 text-xs leading-relaxed overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  )
}

interface AssistantMarkdownProps {
  content: string
  /** Rendered inline after the last block — used for the streaming caret. */
  trailing?: ReactNode
}

export const AssistantMarkdown = memo(function AssistantMarkdown({
  content,
  trailing,
}: AssistantMarkdownProps) {
  return (
    <div className="plagia-md min-w-0 text-sm leading-relaxed break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        skipHtml
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-violet-600 dark:text-violet-400 underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-base font-semibold tracking-tight">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-4 mb-1.5 text-[15px] font-semibold tracking-tight">{children}</h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-3 mb-1 text-sm font-semibold">{children}</h5>
          ),
          h4: ({ children }) => <h6 className="mt-3 mb-1 text-sm font-semibold">{children}</h6>,
          h5: ({ children }) => <h6 className="mt-2 mb-1 text-sm font-medium">{children}</h6>,
          h6: ({ children }) => <h6 className="mt-2 mb-1 text-sm font-medium">{children}</h6>,
          ul: ({ children }) => (
            <ul className="my-2 ml-1 space-y-1 list-disc list-inside marker:text-violet-500/70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-1 space-y-1 list-decimal list-inside marker:text-violet-500/70 marker:tabular-nums">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="[&>p]:inline [&>p]:my-0">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-violet-500/40 pl-3 text-muted-foreground [&>p]:my-1">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          table: ({ children }) => (
            <div className="my-2 w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 text-left font-semibold border-b border-border whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 border-b border-border/50 align-top">{children}</td>
          ),
          code: ({ className, children, ...props }) => {
            // Fenced blocks arrive with a language-* class and a newline-bearing
            // string; everything else is inline code.
            const match = /language-(\w+)/.exec(className || "")
            const text = String(children).replace(/\n$/, "")
            const isBlock = match || text.includes("\n")
            if (isBlock) {
              return <CodeBlock language={match?.[1]}>{text}</CodeBlock>
            }
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono border border-border/60"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
      {trailing}
    </div>
  )
})
