"use client"

import { useState } from "react"
import {
  MessageSquarePlus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StoredConversationSummary } from "@/lib/plagia-ai/storage"

interface ConversationSidebarProps {
  conversations: StoredConversationSummary[]
  activeId: string | null
  loading: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  collapsed,
  onToggleCollapse,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationSidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (collapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center gap-2 pt-2 pr-2 border-r border-border">
        <button
          onClick={onToggleCollapse}
          className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Expand conversations"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          onClick={onNewChat}
          className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="New chat"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-border pr-3 mr-1">
      <div className="flex items-center justify-between gap-2 pb-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 justify-start gap-2 text-xs"
          onClick={onNewChat}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New chat
        </Button>
        <button
          onClick={onToggleCollapse}
          className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mr-1 pr-1 space-y-0.5 min-h-0">
        {loading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-md bg-muted/40 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </>
        )}

        {!loading && conversations.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-3">
            No saved conversations yet. Send a message to start one.
          </p>
        )}

        {!loading &&
          conversations.map((c) => {
            const isActive = c.id === activeId
            const confirming = confirmDeleteId === c.id
            return (
              <div
                key={c.id}
                className={`group relative flex items-center gap-1 rounded-md transition-colors ${
                  isActive ? "bg-violet-500/10" : "hover:bg-accent"
                }`}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  className={`flex-1 min-w-0 flex items-center gap-2 px-2 py-2 text-left ${
                    isActive ? "text-foreground" : "text-foreground/85"
                  }`}
                >
                  <span className="text-xs truncate flex-1">
                    {c.title || "Untitled"}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {relativeTime(c.updated_at)}
                  </span>
                </button>
                {confirming ? (
                  <div className="flex items-center gap-0.5 pr-1">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDelete(c.id)
                        setConfirmDeleteId(null)
                      }}
                      className="h-6 px-1.5 text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium rounded"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-opacity mr-1"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
      </div>
    </aside>
  )
}
