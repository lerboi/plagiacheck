"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  MessageSquarePlus,
  Pencil,
  Pin,
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
  /** FE-20 — rename a saved conversation. Returns true on success (parent
   *  is expected to refetch the list); false on failure. */
  onRename?: (id: string, newTitle: string) => Promise<boolean>
  /** FE-24 — toggle pin on a saved conversation. Same contract as rename. */
  onTogglePin?: (id: string, pinned: boolean) => Promise<boolean>
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
  /** FE-17 — when true the empty-list state means "no matches for the
   *  current filter query" rather than "no conversations at all". */
  isFiltered?: boolean
  onClearFilter?: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  /** FE-20 — see ConversationSidebarProps. */
  onRename?: (id: string, newTitle: string) => Promise<boolean>
  /** FE-24 — see ConversationSidebarProps. */
  onTogglePin?: (id: string, pinned: boolean) => Promise<boolean>
}

function ConversationList({
  conversations,
  activeId,
  loading,
  isFiltered = false,
  onClearFilter,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}: ListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // FE-20 — inline rename editor. Only one row at a time can be in edit
  // mode; switching to a different row commits/cancels the previous edit
  // implicitly (the click target unmounts the old input).
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

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

      {!loading && conversations.length === 0 && !isFiltered && (
        <p className="text-xs text-muted-foreground px-2 py-3">
          No saved conversations yet. Send a message to start one.
        </p>
      )}

      {!loading && conversations.length === 0 && isFiltered && (
        <div className="flex flex-col items-start gap-1.5 px-2 py-3">
          <p className="text-xs text-muted-foreground">No matches.</p>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {!loading && (() => {
        // FE-24 — visual separator between pinned and unpinned rows.
        // Computed once outside the map so the first unpinned row knows
        // whether to render its top border.
        const firstUnpinnedIdx = conversations.findIndex((c) => !c.pinned)
        const hasMixedPinned =
          firstUnpinnedIdx > 0 &&
          conversations.some((c) => c.pinned)
        return (
        <AnimatePresence initial={false}>
          {conversations.map((c, idx) => {
            const isActive = c.id === activeId
            const confirming = confirmDeleteId === c.id
            const isRenamingThisRow = renamingId === c.id
            const isFirstUnpinned = hasMixedPinned && idx === firstUnpinnedIdx
            const commitRename = async () => {
              const draft = renameDraft.trim()
              if (!onRename) {
                setRenamingId(null)
                setRenameDraft("")
                return
              }
              if (!draft) {
                // Empty title — keep editor open with visual error.
                return
              }
              if (draft === (c.title || "")) {
                setRenamingId(null)
                setRenameDraft("")
                return
              }
              const ok = await onRename(c.id, draft)
              if (ok) {
                setRenamingId(null)
                setRenameDraft("")
              }
              // On failure the parent already toasts; leave editor open for retry.
            }
            const cancelRename = () => {
              setRenamingId(null)
              setRenameDraft("")
            }

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
                  isFirstUnpinned ? "border-t border-border mt-1.5 pt-1.5" : ""
                } ${isActive ? "bg-accent" : "hover:bg-accent/60"}`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-sm bg-violet-500"
                  />
                )}
                {isRenamingThisRow ? (
                  <div className="flex-1 min-w-0 px-1.5 py-1">
                    <input
                      type="text"
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault()
                          cancelRename()
                        } else if (e.key === "Enter") {
                          e.preventDefault()
                          void commitRename()
                        }
                      }}
                      onBlur={() => void commitRename()}
                      className={`w-full h-7 px-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-1 ${
                        !renameDraft.trim()
                          ? "border-red-400 focus:ring-red-400"
                          : "border-violet-500 focus:ring-violet-500"
                      }`}
                      aria-label="Rename conversation"
                      maxLength={60}
                    />
                  </div>
                ) : (
                  <>
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
                      <div className="flex items-center mr-1">
                        {onTogglePin && (
                          <button
                            onClick={() =>
                              void onTogglePin(c.id, !c.pinned)
                            }
                            className={`h-7 w-7 flex items-center justify-center transition-opacity ${
                              c.pinned
                                ? "opacity-100 text-violet-600 dark:text-violet-400"
                                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-foreground"
                            }`}
                            aria-label={c.pinned ? "Unpin conversation" : "Pin conversation"}
                            aria-pressed={!!c.pinned}
                            title={c.pinned ? "Unpin" : "Pin"}
                          >
                            <Pin
                              className={`h-3.5 w-3.5 ${
                                c.pinned ? "fill-current" : ""
                              }`}
                            />
                          </button>
                        )}
                        {onRename && (
                          <button
                            onClick={() => {
                              setRenamingId(c.id)
                              setRenameDraft(c.title || "")
                            }}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity"
                            aria-label="Rename conversation"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                          aria-label="Delete conversation"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        )
      })()}
    </div>
  )
}

// FE-17 — threshold below which the filter input stays hidden.
// Small lists don't need filtering; the input would just be visual noise.
const FILTER_MIN_CONVERSATIONS = 6

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  collapsed,
  onToggleCollapse,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
  variant = "inline",
  onCloseDrawer,
}: ConversationSidebarProps) {
  // FE-17 — filter query (case-insensitive substring on `title`).
  // Lives at the outer component so both drawer and inline modes share it,
  // and so the empty-state branch can know whether to say "No matches" vs
  // "No conversations yet".
  const [filterQuery, setFilterQuery] = useState("")
  const showFilter = conversations.length >= FILTER_MIN_CONVERSATIONS
  const normalizedQuery = filterQuery.trim().toLowerCase()
  const filteredConversations = normalizedQuery
    ? conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(normalizedQuery),
      )
    : conversations
  const hasActiveFilter = normalizedQuery.length > 0

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
        {showFilter && (
          <div className="px-2 pb-2">
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter conversations"
              aria-label="Filter conversations"
              className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        )}
        <ConversationList
          conversations={filteredConversations}
          activeId={activeId}
          loading={loading}
          isFiltered={hasActiveFilter}
          onClearFilter={() => setFilterQuery("")}
          onSelect={onSelect}
          onDelete={onDelete}
          onRename={onRename}
          onTogglePin={onTogglePin}
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
            {showFilter && (
              <div className="px-2 pb-2">
                <input
                  type="search"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter conversations"
                  aria-label="Filter conversations"
                  className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            )}
            <ConversationList
              conversations={filteredConversations}
              activeId={activeId}
              loading={loading}
              isFiltered={hasActiveFilter}
              onClearFilter={() => setFilterQuery("")}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onTogglePin={onTogglePin}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
