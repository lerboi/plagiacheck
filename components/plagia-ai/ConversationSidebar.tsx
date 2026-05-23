"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  MessageSquarePlus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react"
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
  /**
   * FE-13 — render mode.
   *   - "inline" (default): desktop sidebar with width-transition collapse.
   *     Visible only at lg+ breakpoint.
   *   - "drawer": mobile drawer body (always expanded). The PARENT supplies
   *     the fixed/translateX overlay + backdrop; this component only renders
   *     the header + list inside that overlay.
   */
  variant?: "inline" | "drawer"
  /** Drawer-mode close button — typically maps to `setMobileSidebarOpen(false)`. */
  onCloseDrawer?: () => void
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

const rowMotion = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
}

interface ListProps {
  conversations: StoredConversationSummary[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function ConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onDelete,
}: ListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 min-h-0">
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

      {!loading && (
        <AnimatePresence initial={false}>
          {conversations.map((c) => {
            const isActive = c.id === activeId
            const confirming = confirmDeleteId === c.id
            return (
              <motion.div
                key={c.id}
                layout="position"
                variants={rowMotion}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`group relative flex items-center gap-1 rounded-md transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-accent/60"
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-sm bg-violet-500"
                  />
                )}
                <button
                  onClick={() => onSelect(c.id)}
                  className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-left ${
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
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-opacity mr-1"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}
    </div>
  )
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
  variant = "inline",
  onCloseDrawer,
}: ConversationSidebarProps) {
  if (variant === "drawer") {
    // Drawer mode: always expanded, no width transition, no `hidden lg:flex`.
    // Parent supplies the position-fixed + translateX overlay.
    return (
      <div className="flex flex-col h-full bg-card border-r border-border">
        <div className="flex items-center gap-1 p-2">
          <button
            onClick={onNewChat}
            className="flex-1 h-9 inline-flex items-center gap-2 px-3 rounded-md border border-border bg-background hover:bg-accent text-sm text-foreground transition-colors min-w-0"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            <span className="truncate">New chat</span>
          </button>
          <button
            onClick={onCloseDrawer}
            className="h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close conversations"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          loading={loading}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </div>
    )
  }

  // Inline (desktop) mode — width-transition collapse.
  return (
    <aside
      className={`hidden lg:flex shrink-0 flex-col border-r border-border bg-card/30 overflow-hidden transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-[260px]"
      }`}
      aria-label="Conversation history"
    >
      <div
        className={`flex items-center gap-1 p-2 ${
          collapsed ? "flex-col" : ""
        }`}
      >
        {collapsed ? (
          <>
            <button
              onClick={onToggleCollapse}
              className="h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Expand conversations"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              onClick={onNewChat}
              className="h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onNewChat}
              className="flex-1 h-9 inline-flex items-center gap-2 px-3 rounded-md border border-border bg-background hover:bg-accent text-sm text-foreground transition-colors min-w-0"
            >
              <MessageSquarePlus className="h-4 w-4 shrink-0" />
              <span className="truncate">New chat</span>
            </button>
            <button
              onClick={onToggleCollapse}
              className="h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Outer fade for the whole list when sidebar collapses. The inner
          per-row AnimatePresence inside ConversationList handles row
          enter/exit. Two separate AnimatePresences — keep them disjoint. */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex-1 flex flex-col min-h-0"
          >
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              loading={loading}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
