"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"
import { Nav } from "@/components/nav"
import { ToolSignInPrompt } from "@/components/tool-signin-prompt"
import { FAQ } from "@/components/FAQ"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  Square,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wrench,
  Coins,
  RotateCcw,
  Trash2,
  ArrowDown,
  Paperclip,
  Mic,
  MicOff,
  Settings,
  Copy,
  Download,
  PanelLeftOpen,
  Pencil,
  X,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { getAuthHeader, useTokenStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useApiErrorMessage } from "@/lib/i18n/api-errors"
import { localeTags } from "@/i18n/config"
import type en from "@/messages/en"
import {
  type AttachedImage,
  type PlagiaAiEvent,
  type PlagiaAiMessage,
  type PlagiaAiToolName,
} from "@/lib/plagia-ai/types"
import { getFollowupId } from "@/lib/plagia-ai/followups"
import {
  deleteConversation,
  deriveConversationTitle,
  listConversations,
  loadConversation,
  renameConversation,
  saveConversation,
  setConversationPinned,
  type StoredConversationSummary,
} from "@/lib/plagia-ai/storage"
import {
  downloadConversationMarkdown,
  type ExportableMessage,
} from "@/lib/plagia-ai/export"
import { AssistantMarkdown } from "@/components/plagia-ai/AssistantMarkdown"
import { ConversationSidebar } from "@/components/plagia-ai/ConversationSidebar"
import { EmptyState } from "@/components/plagia-ai/EmptyState"
import { InlineSvgPreview } from "@/components/plagia-ai/InlineSvgPreview"
import { SuggestionChipBar } from "@/components/plagia-ai/SuggestionChipBar"
import {
  EMPTY_PREFERENCES,
  loadPreferences,
  savePreferences,
  type PlagiaAiPreferences,
} from "@/lib/plagia-ai/preferences"

type ToolCatalogId = keyof (typeof en)["ToolCatalog"]["tools"]

/** Each PlagiaAI tool's entry in the ToolCatalog messages (its display name). */
const TOOL_CATALOG_IDS: Record<PlagiaAiToolName, ToolCatalogId> = {
  paraphrase: "paraphraser",
  summarize: "summarizer",
  humanize: "aiHumanizer",
  ai_detect: "aiDetector",
  grammar: "grammarChecker",
  plagiarism_check: "plagiarismChecker",
  generate_infographic: "infographicGenerator",
  generate_chart: "chartGenerator",
  generate_thumbnail: "thumbnailGenerator",
  image_to_text: "imageToText",
  voice_to_essay: "voiceToEssay",
  audio_summarize: "audioSummarizer",
}

// Option values that appear inside server-built summaries. The values stay
// English everywhere else; these lists only drive the translated labels.
const MODE_IDS = ["standard", "fluency", "formal", "simple", "creative", "academic"] as const
const TONE_IDS = ["casual", "professional", "academic", "creative", "friendly"] as const
const FORMAT_IDS = ["paragraph", "bullets"] as const
const CHART_TYPE_IDS = [
  "auto-detect",
  "auto",
  "bar",
  "line",
  "pie",
  "flowchart",
  "mindmap",
  "timeline",
  "comparison",
] as const
const STYLE_IDS = ["modern", "minimal", "bold", "gradient"] as const
const CONFIDENCE_IDS = ["high", "medium", "low"] as const
const VERDICT_IDS: Record<string, "likelyHuman" | "possiblyAi" | "likelyAi"> = {
  "Likely Human": "likelyHuman",
  "Possibly AI": "possiblyAi",
  "Likely AI": "likelyAi",
}

// English tool errors produced by the dispatcher / route. They are also sent
// to the model, so they stay English at the source; these are only matched to
// show a translation.
const NO_IMAGE_ERROR = "No image attached. Ask the user to attach an image before extracting text."
const NO_PLAGIARISM_RESULT_ERROR = "No result from plagiarism check"
const AI_UNAVAILABLE_EVENT_MESSAGE = "The AI service is temporarily unavailable. Please try again."

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value)
}

/**
 * Display helpers for tool cards. The server builds the args summary, result
 * preview and error text in English (the same strings go to the model), and
 * they are stored with the conversation, so they are translated here, at
 * render time only. In English every helper returns its input unchanged.
 */
function useToolDisplay() {
  const t = useTranslations("PlagiaAi")
  const tCatalog = useTranslations("ToolCatalog")
  const locale = useLocale()
  const apiError = useApiErrorMessage()
  const translate = locale !== "en"

  const toolLabel = (name: PlagiaAiToolName): string => {
    const id = TOOL_CATALOG_IDS[name]
    return id ? tCatalog(`tools.${id}.name`) : String(name)
  }
  const mode = (v: string) => (isOneOf(MODE_IDS, v) ? t(`values.modes.${v}`) : v)
  const tone = (v: string) => (isOneOf(TONE_IDS, v) ? t(`values.tones.${v}`) : v)
  const format = (v: string) => (isOneOf(FORMAT_IDS, v) ? t(`values.formats.${v}`) : v)
  const chartType = (v: string) => (isOneOf(CHART_TYPE_IDS, v) ? t(`values.chartTypes.${v}`) : v)
  const style = (v: string) => (isOneOf(STYLE_IDS, v) ? t(`values.styles.${v}`) : v)
  const confidence = (v: string) => (isOneOf(CONFIDENCE_IDS, v) ? t(`values.confidence.${v}`) : v)
  const title = (v: string) => (v === "Untitled" ? t("preview.untitled") : v)

  const verdict = (v: string): string => {
    if (!translate) return v
    const id = VERDICT_IDS[v]
    return id ? t(`values.verdicts.${id}`) : v
  }

  const argsSummary = (name: PlagiaAiToolName, summary: string): string => {
    if (!translate || !summary) return summary
    let m: RegExpExecArray | null
    switch (name) {
      case "paraphrase":
        if ((m = /^Mode: (.*)$/.exec(summary))) return t("args.mode", { mode: mode(m[1]) })
        break
      case "summarize":
        if ((m = /^Length: (.*)% · (.*)$/.exec(summary)))
          return t("args.summarize", { percent: m[1], format: format(m[2]) })
        break
      case "humanize":
        if ((m = /^Tone: (.*) · Level: (.*)$/.exec(summary)))
          return t("args.humanize", { tone: tone(m[1]), level: m[2] })
        break
      case "ai_detect":
      case "grammar":
      case "plagiarism_check":
        if ((m = /^(\d+) chars$/.exec(summary))) return t("args.chars", { count: m[1] })
        break
      case "generate_chart":
        if ((m = /^Type: (.*)$/.exec(summary))) return t("args.chartType", { type: chartType(m[1]) })
        break
      case "generate_thumbnail":
        if ((m = /^Style: (.*)$/.exec(summary))) return t("args.style", { style: style(m[1]) })
        break
      case "image_to_text":
        if (summary === "Extract text from attached image") return t("args.extractImage")
        break
      case "voice_to_essay":
      case "audio_summarize":
        if ((m = /^(\d+) chars of transcript$/.exec(summary)))
          return t("args.transcriptChars", { count: m[1] })
        break
    }
    // generate_infographic shows the start of the user's own text.
    return summary
  }

  const resultPreview = (name: PlagiaAiToolName, preview: string): string => {
    if (!translate || !preview) return preview
    let m: RegExpExecArray | null
    switch (name) {
      case "ai_detect":
        if (preview === "Analysis complete") return t("preview.analysisComplete")
        if ((m = /^([\s\S]*) — (.*)% AI$/.exec(preview)))
          return t("preview.aiDetect", { verdict: verdict(m[1]), score: m[2] })
        break
      case "grammar":
        if ((m = /^(\d+) issues? found$/.exec(preview)))
          return t("preview.grammar", { count: Number(m[1]) })
        break
      case "plagiarism_check":
        if ((m = /^(-?\d+)% plagiarism · (\d+) match(?:es)?$/.exec(preview)))
          return t("preview.plagiarism", { percent: m[1], count: Number(m[2]) })
        break
      case "generate_infographic":
        if ((m = /^Infographic: ([\s\S]*)$/.exec(preview)))
          return t("preview.infographic", { title: title(m[1]) })
        break
      case "generate_chart":
        if ((m = /^Chart \(([^)]*)\): ([\s\S]*)$/.exec(preview)))
          return t("preview.chart", { type: chartType(m[1]), title: title(m[2]) })
        break
      case "generate_thumbnail":
        if ((m = /^Thumbnail: ([\s\S]*)$/.exec(preview)))
          return t("preview.thumbnail", { title: title(m[1]) })
        break
      case "image_to_text":
        if (preview === "No text extracted") return t("preview.noText")
        if ((m = /^Extracted (\d+) chars \((.*) confidence\)$/.exec(preview)))
          return t("preview.extractedWithConfidence", { count: m[1], confidence: confidence(m[2]) })
        if ((m = /^Extracted (\d+) chars$/.exec(preview))) return t("preview.extracted", { count: m[1] })
        break
      case "voice_to_essay":
        if ((m = /^([\s\S]*) · (\d+) words$/.exec(preview)))
          return t("preview.essay", {
            title: m[1] === "Essay" ? t("preview.essayTitle") : m[1],
            count: m[2],
          })
        if (preview === "Essay") return t("preview.essayTitle")
        break
      case "audio_summarize":
        if ((m = /^([\s\S]*) · (\d+) key points?$/.exec(preview)))
          return t("preview.audio", {
            title: m[1] === "Summary" ? t("preview.summaryTitle") : m[1],
            count: Number(m[2]),
          })
        break
    }
    // Paraphrase / summary / humanize / OCR previews are the tool's own output.
    return preview
  }

  const toolError = (name: PlagiaAiToolName, error: string): string => {
    if (translate) {
      let m: RegExpExecArray | null
      if ((m = /^[A-Za-z ]+ failed \((\d+)\)$/.exec(error)))
        return t("toolErrors.failedWithStatus", { tool: toolLabel(name), status: m[1] })
      if (error === NO_IMAGE_ERROR) return t("toolErrors.noImageAttached")
      if (error === NO_PLAGIARISM_RESULT_ERROR) return t("toolErrors.noPlagiarismResult")
      if ((m = /^Unknown tool: (.*)$/.exec(error))) return t("toolErrors.unknownTool", { name: m[1] })
      if ((m = /^Refused — this tool has already failed (\d+) times/.exec(error)))
        return t("toolErrors.retryCap", { count: m[1] })
    }
    return apiError(error, t("toolCard.failed"))
  }

  /** Fallback follow-ups arrive as English text; known ones are shown translated. */
  const suggestion = (text: string): string => {
    if (!translate) return text
    const id = getFollowupId(text)
    return id ? t(`followups.${id}`) : text
  }

  return { t, toolLabel, verdict, argsSummary, resultPreview, toolError, suggestion }
}

type ToolDisplay = ReturnType<typeof useToolDisplay>

type ChatItem =
  | { kind: "user"; id: string; content: string }
  | { kind: "assistant"; id: string; content: string }
  | {
      kind: "tool"
      id: string
      name: PlagiaAiToolName
      argsSummary: string
      reason?: string
      status: "pending_confirm" | "running" | "done" | "failed"
      resultPreview?: string
      error?: string
      result?: unknown
      /** FE-04: tool args + cost echoed back on Confirm to resume dispatch. */
      pendingConfirm?: {
        estimatedTokens: number
        currency: "text" | "image"
        args: Record<string, unknown>
      }
      /** FE-06: latest progress from the underlying streaming tool (0–100). */
      progress?: number
      /** FE-06: optional short progress hint, e.g. "analyzing sentence 3 of 12". */
      progressMessage?: string
      /** FE-23: actual token cost of this dispatch. Currency is inferred
       *  from `tokensCurrency` below. Only present on `status: "done"`. */
      tokensUsed?: number
      tokensCurrency?: "text" | "image"
    }

function genId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const messageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
}

interface PlagiaAiAppProps {
  marketingFooter?: ReactNode
}

export function PlagiaAiApp({ marketingFooter }: PlagiaAiAppProps = {}) {
  const t = useTranslations("PlagiaAi")
  const locale = useLocale()
  const apiError = useApiErrorMessage()
  const display = useToolDisplay()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const [input, setInput] = useState("")
  const [items, setItems] = useState<ChatItem[]>([])
  const [streaming, setStreaming] = useState(false)
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  // FE-18 — edit-and-resend a previous user message. editingMessageId is
  // the ChatItem.id of the user bubble currently being edited (null when
  // nothing is being edited). editingDraft holds the in-progress text so
  // Cancel can discard without losing the original.
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState("")
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Persistence
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<StoredConversationSummary[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  // FE-07: default to collapsed on small screens (< lg = 1024px) so the
  // chat column gets the full width. Read inside useEffect so SSR is
  // unaffected — the initial render matches server output (false), then
  // flips to true if the client is on mobile/tablet.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.innerWidth < 1024) setSidebarCollapsed(true)
  }, [])

  // FE-13 — mobile drawer state. On `< lg` the inline sidebar is hidden;
  // tapping the chat-header hamburger opens this drawer. Closed on backdrop
  // tap, Escape, or after a row tap (handleSelectConversation closes it).
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  useEffect(() => {
    if (!mobileSidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileSidebarOpen])

  // Multimodal input (FS-06): image attach + voice dictation
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<unknown>(null)

  // FE-04: "Don't ask again" preference for the cost-confirm gate.
  // Persisted in localStorage so the choice survives reloads. Read inside
  // an effect so SSR doesn't touch `window`.
  const [skipCostConfirm, setSkipCostConfirm] = useState(false)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("plagia-ai-skip-cost-confirm")
      if (stored === "true") setSkipCostConfirm(true)
    } catch {
      // localStorage can throw in privacy mode — fall back to default false
    }
  }, [])

  // FE-09 state declarations — useEffect + handleSavePreferences live AFTER
  // useToast() below so the toast hook is in scope when the save handler runs.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [prefs, setPrefs] = useState<PlagiaAiPreferences>(EMPTY_PREFERENCES)
  const [prefsSaving, setPrefsSaving] = useState(false)

  // FE-10 — follow-up suggestion chips. Cleared on every new send and when
  // the conversation is cleared. The server emits a `suggestions` SSE event
  // after a successful tool wrap-up; the chips render below the chat thread.
  const [followupSuggestions, setFollowupSuggestions] = useState<string[]>([])

  // FE-07 mobile polish — track the on-screen keyboard's intrusion via the
  // visualViewport API so the sticky input can rise above it instead of
  // being covered. Returns 0 on desktop and on mobile when the keyboard
  // is dismissed. The number is added to the sticky input's `bottom` so
  // the input stays in view as the user types.
  const [keyboardInset, setKeyboardInset] = useState(0)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => {
      // window.innerHeight - vv.height = on-screen keyboard + browser chrome.
      // vv.offsetTop accounts for cases where the page is scrolled inside the
      // visual viewport (pinch-zoom etc) — subtract it so we only get the
      // keyboard's intrusion, not the scroll offset.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInset(inset)
    }
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    update()
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])

  // Auto-scroll: pause when the user scrolls away from the bottom; resume on send.
  const [autoScrollPaused, setAutoScrollPaused] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  const { toast } = useToast()
  const { decrementWords, decrementImageTokens } = useTokenStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // UX-08: lets the post-turn focus-return tell whether focus is still on the
  // Send button (i.e. the user clicked Send) before refocusing the composer.
  const sendButtonRef = useRef<HTMLButtonElement>(null)
  // UX-09: AbortController for the in-flight turn so the user can Stop it.
  const abortRef = useRef<AbortController | null>(null)

  // FE-09 — persistent personalization (Supabase-backed).
  // The panel is a small inline section that slides open under the chat
  // header; only sign-in users can interact with it. Preferences are
  // sanitised before save and re-fetched on every user change.
  useEffect(() => {
    if (!user) {
      setPrefs(EMPTY_PREFERENCES)
      return
    }
    let cancelled = false
    void loadPreferences(supabase, user.id).then((loaded) => {
      if (!cancelled) setPrefs(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [user, supabase])
  const handleSavePreferences = useCallback(
    async (next: PlagiaAiPreferences) => {
      if (!user) return
      setPrefsSaving(true)
      const ok = await savePreferences(supabase, user.id, next)
      setPrefsSaving(false)
      if (ok) {
        setPrefs(next)
        toast({
          title: t("toasts.preferencesSaved"),
          description: t("toasts.preferencesSavedDescription"),
          variant: "success",
        })
      } else {
        toast({
          title: t("toasts.preferencesFailed"),
          description: t("toasts.preferencesFailedDescription"),
          variant: "destructive",
        })
      }
    },
    [user, supabase, toast, t],
  )

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      setAuthChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session?.user) {
        setConversations([])
        setConversationId(null)
        setItems([])
      }
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Fetch the user's saved conversations once we know they're signed in.
  useEffect(() => {
    if (!user) return
    let mounted = true
    setLoadingConversations(true)
    listConversations()
      .then((list) => {
        if (!mounted) return
        setConversations(list)
      })
      .finally(() => {
        if (mounted) setLoadingConversations(false)
      })
    return () => {
      mounted = false
    }
  }, [user])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (autoScrollPaused) return
    scrollToBottom()
  }, [items, autoScrollPaused, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const nearBottom = distanceFromBottom < 80
      setAutoScrollPaused(!nearBottom)
      setShowScrollToBottom(!nearBottom && items.length > 0)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [items.length])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // Detect Web Speech API availability for the mic button.
  useEffect(() => {
    if (typeof window === "undefined") return
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    setSpeechSupported(!!SR)
    return () => {
      try {
        ;(recognitionRef.current as { stop?: () => void } | null)?.stop?.()
      } catch {
        // ignore
      }
    }
  }, [])

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    // Wait for React to flush the new value into the textarea before placing
    // the cursor at the end and focusing — otherwise setSelectionRange runs
    // against the previous value and the cursor ends up wherever it was.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      try {
        el.setSelectionRange(prompt.length, prompt.length)
      } catch {
        // Some browsers throw if the textarea is not in the DOM yet — ignore.
      }
    })
  }

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

  const handleAttachClick = () => {
    setAttachmentError(null)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setAttachmentError(t("attach.onlyImages"))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setAttachmentError(t("attach.tooLarge"))
      return
    }
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result !== "string") return reject(new Error("Read failed"))
          // result is data:<mime>;base64,<base64>
          const comma = result.indexOf(",")
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = () => reject(new Error("Read failed"))
        reader.readAsDataURL(file)
      })
      setAttachedImage({ base64, mimeType: file.type, name: file.name })
    } catch (err) {
      setAttachmentError(apiError(err, t("attach.readFailed")))
    }
  }

  const handleRemoveAttached = () => {
    setAttachedImage(null)
    setAttachmentError(null)
  }

  const stopRecording = () => {
    try {
      ;(recognitionRef.current as { stop?: () => void } | null)?.stop?.()
    } catch {
      // ignore
    }
    setRecording(false)
  }

  const toggleRecording = () => {
    if (recording) {
      stopRecording()
      return
    }
    if (typeof window === "undefined") return
    const SR =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR() as {
      continuous: boolean
      interimResults: boolean
      lang: string
      start: () => void
      stop: () => void
      onresult: (e: unknown) => void
      onerror: (e: unknown) => void
      onend: () => void
    }
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = localeTags[locale]
    let inputBaseAtStart = ""
    setInput((cur) => {
      inputBaseAtStart = cur
      return cur
    })

    recognition.onresult = (event: unknown) => {
      const ev = event as { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }
      let finalText = ""
      let interimText = ""
      for (let i = 0; i < ev.results.length; i++) {
        const seg = ev.results[i]
        const t = seg[0]?.transcript || ""
        if (seg.isFinal) finalText += t
        else interimText += t
      }
      const combined = (inputBaseAtStart + " " + finalText + interimText).trim()
      setInput(combined)
    }
    recognition.onerror = () => {
      setRecording(false)
    }
    recognition.onend = () => {
      setRecording(false)
    }
    try {
      recognition.start()
      recognitionRef.current = recognition
      setRecording(true)
    } catch {
      setRecording(false)
    }
  }

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const appendItem = (item: ChatItem) => {
    setItems((prev) => [...prev, item])
  }

  const updateItem = (id: string, updater: (prev: ChatItem) => ChatItem) => {
    setItems((prev) => prev.map((it) => (it.id === id ? updater(it) : it)))
  }

  const conversationHistoryForServer = (current: ChatItem[]): PlagiaAiMessage[] => {
    return current
      .filter(
        (it): it is Extract<ChatItem, { kind: "user" | "assistant" }> =>
          it.kind === "user" || it.kind === "assistant"
      )
      .map((it) => ({ role: it.kind, content: it.content }))
  }

  const persistAndRefresh = useCallback(
    async (current: ChatItem[]) => {
      if (!user) return
      const firstUserMessage = current.find((it) => it.kind === "user")
      if (!firstUserMessage) return
      const title = deriveConversationTitle(
        (firstUserMessage as Extract<ChatItem, { kind: "user" }>).content
      )
      const savedId = await saveConversation(conversationId, title, current)
      if (savedId) {
        if (!conversationId) {
          setConversationId(savedId)
        }
        const fresh = await listConversations()
        setConversations(fresh)
      }
    },
    [user, conversationId]
  )

  const sendMessage = useCallback(
    async (
      text: string,
      opts?: {
        directDispatch?: {
          toolName: PlagiaAiToolName
          args: Record<string, unknown>
          callId: string
          reason?: string
        }
        /** FE-18 — override the base item list. Used by the edit-and-resend
         *  flow which needs to truncate the conversation BEFORE appending
         *  the new user message. Without this override, sendMessage's
         *  closure still sees the pre-truncate items and the truncate is
         *  lost. */
        baseItems?: ChatItem[]
      },
    ) => {
      const isDirectDispatch = !!opts?.directDispatch
      if (streaming) return
      if (!isDirectDispatch && !text.trim()) return
      if (!authChecked) return
      if (!user) {
        setNeedsSignIn(true)
        return
      }
      setNeedsSignIn(false)
      setLastFailedInput(null)

      // Stop any in-flight mic dictation before submitting.
      try {
        ;(recognitionRef.current as { stop?: () => void } | null)?.stop?.()
      } catch {
        // ignore
      }

      // Resume autoscroll when the user actively sends.
      setAutoScrollPaused(false)

      // On a directDispatch resume we do NOT add a new user message — the
      // user already sent their prompt; we're just unblocking the paused
      // tool. The pending-confirm tool card stays in place; the server's
      // next tool_call event (without pendingConfirm) will transition it
      // to "running" via the morph in the tool_call handler below.
      const base = opts?.baseItems ?? items
      const previousItems = base
      const nextItems: ChatItem[] = isDirectDispatch
        ? base
        : [...base, { kind: "user", id: genId(), content: text } as ChatItem]
      if (!isDirectDispatch) {
        setItems(nextItems)
        setInput("")
      }
      // FE-10 — any in-flight suggestion chips become stale the moment a
      // new turn starts. Clear so the user doesn't accidentally click an
      // outdated suggestion against fresh tool output.
      setFollowupSuggestions([])
      setStreaming(true)
      setPendingAssistantId(null)

      let currentAssistantId: string | null = null
      let currentAssistantText = ""

      const flushAssistant = () => {
        if (currentAssistantId && currentAssistantText.trim()) {
          const idToFreeze = currentAssistantId
          const textToFreeze = currentAssistantText
          setItems((prev) =>
            prev.map((it) =>
              it.id === idToFreeze && it.kind === "assistant"
                ? { ...it, content: textToFreeze }
                : it
            )
          )
        }
        currentAssistantId = null
        currentAssistantText = ""
      }

      // Capture the attached image so we send it once, then clear from state.
      const sentImage = attachedImage
      // UX-09: per-turn AbortController so a Stop press cancels the stream.
      const abortController = new AbortController()
      abortRef.current = abortController
      try {
        const authHeader = await getAuthHeader()
        const response = await fetch("/api/plagia-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          signal: abortController.signal,
          body: JSON.stringify({
            messages: conversationHistoryForServer(nextItems),
            attachedImage: sentImage || undefined,
            ...(skipCostConfirm ? { skipCostConfirm: true } : {}),
            ...(opts?.directDispatch ? { directDispatch: opts.directDispatch } : {}),
          }),
        })

        if (response.status === 401) {
          setNeedsSignIn(true)
          setStreaming(false)
          if (!isDirectDispatch) {
            setItems(previousItems)
            setInput(text)
          }
          return
        }

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => "")
          // The route returns JSON error bodies — surface the message, not raw JSON.
          let friendly = ""
          try {
            const parsed = JSON.parse(errText)
            if (parsed && typeof parsed.error === "string") friendly = parsed.error
          } catch {
            friendly = errText
          }
          throw new Error(friendly || t("errors.requestFailed", { status: response.status }))
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sepIndex
          while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sepIndex)
            buffer = buffer.slice(sepIndex + 2)
            const dataLine = rawEvent
              .split("\n")
              .find((line) => line.startsWith("data:"))
            if (!dataLine) continue
            const payload = dataLine.slice(5).trim()
            if (!payload) continue
            let event: PlagiaAiEvent
            try {
              event = JSON.parse(payload) as PlagiaAiEvent
            } catch {
              continue
            }

            if (event.type === "delta") {
              if (!currentAssistantId) {
                currentAssistantId = genId()
                currentAssistantText = event.content
                const newId = currentAssistantId
                setPendingAssistantId(newId)
                appendItem({ kind: "assistant", id: newId, content: currentAssistantText })
              } else {
                currentAssistantText += event.content
                const idToUpdate = currentAssistantId
                updateItem(idToUpdate, (prev) =>
                  prev.kind === "assistant"
                    ? { ...prev, content: currentAssistantText }
                    : prev
                )
              }
            } else if (event.type === "tool_call") {
              flushAssistant()
              setPendingAssistantId(null)
              // FE-04: morph a pending_confirm card into running when the
              // server re-emits the same callId (post-confirm resume). The
              // pendingConfirm payload on the event itself means we should
              // KEEP the card pending — render confirm UI.
              const nextStatus: "pending_confirm" | "running" = event.pendingConfirm
                ? "pending_confirm"
                : "running"
              setItems((prev) => {
                const idx = prev.findIndex((it) => it.id === event.id && it.kind === "tool")
                if (idx === -1) {
                  return [
                    ...prev,
                    {
                      kind: "tool",
                      id: event.id,
                      name: event.name,
                      argsSummary: event.argsSummary,
                      reason: event.reason,
                      status: nextStatus,
                      pendingConfirm: event.pendingConfirm,
                    },
                  ]
                }
                const next = prev.slice()
                const existing = next[idx]
                if (existing.kind !== "tool") return prev
                next[idx] = {
                  ...existing,
                  status: nextStatus,
                  reason: event.reason ?? existing.reason,
                  argsSummary: event.argsSummary,
                  pendingConfirm: event.pendingConfirm,
                }
                return next
              })
            } else if (event.type === "tool_progress") {
              // FE-06 — paint the latest progress on the matching tool card.
              // Clamp to [0, 100] defensively; ignore if the tool item is gone
              // (shouldn't happen but covers race conditions).
              const clamped = Math.max(0, Math.min(100, event.progress))
              updateItem(event.id, (prev) =>
                prev.kind === "tool"
                  ? { ...prev, progress: clamped, progressMessage: event.message }
                  : prev,
              )
            } else if (event.type === "tool_result") {
              // FE-23 — infer the cost currency from whichever remaining-
              // tokens field came back. text and image are mutually
              // exclusive per the dispatcher contract.
              const tokensCurrency: "text" | "image" | undefined =
                event.remainingTextTokens !== undefined
                  ? "text"
                  : event.remainingImageTokens !== undefined
                    ? "image"
                    : undefined
              updateItem(event.id, (prev) =>
                prev.kind === "tool"
                  ? {
                      ...prev,
                      status: event.ok ? "done" : "failed",
                      resultPreview: event.resultPreview,
                      error: event.error,
                      result: event.result,
                      tokensUsed: event.ok ? event.tokensUsed : undefined,
                      tokensCurrency: event.ok ? tokensCurrency : undefined,
                    }
                  : prev
              )
              if (event.ok) {
                if (event.remainingTextTokens !== undefined) {
                  void decrementWords()
                }
                if (event.remainingImageTokens !== undefined) {
                  void decrementImageTokens()
                }
              }
            } else if (event.type === "suggestions") {
              // FE-10 — the server has pulled the [[FOLLOWUPS:...]] marker
              // out of the assistant wrap-up and is handing us the chip
              // labels. They render under the chat once streaming ends.
              setFollowupSuggestions(event.suggestions)
            } else if (event.type === "error") {
              throw new Error(event.message)
            } else if (event.type === "done") {
              flushAssistant()
            }
          }
        }

        flushAssistant()

        // Clear the attached image now that it's been consumed by the round.
        setAttachedImage(null)

        // Auto-save after a successful turn. Read latest state via the setter
        // callback (React state updates here are still batched).
        setItems((current) => {
          void persistAndRefresh(current)
          return current
        })
      } catch (err) {
        // UX-09: a Stop press aborts the fetch — keep whatever streamed so far,
        // don't surface it as an error or queue a retry.
        if (abortController.signal.aborted) {
          flushAssistant()
        } else {
          const message = apiError(
            err,
            err instanceof Error && err.message === AI_UNAVAILABLE_EVENT_MESSAGE
              ? t("errors.aiUnavailable")
              : t("errors.generic"),
          )
          toast({
            title: t("toasts.serverError"),
            description: message,
            variant: "destructive",
          })
          setLastFailedInput(text)
          setInput(text)
        }
      } finally {
        abortRef.current = null
        setStreaming(false)
        setPendingAssistantId(null)
        // UX-08: return focus to the composer when a turn completes so keyboard
        // users can type the next message without hunting. Desktop only (a fine
        // pointer) — on touch this would re-open the keyboard over the reply.
        // Only when focus is on the composer (textarea / Send button) or nowhere
        // — never steal an intentional focus on a tool card or the sidebar.
        if (
          typeof window !== "undefined" &&
          window.matchMedia("(pointer: fine)").matches
        ) {
          const active = document.activeElement
          if (
            !active ||
            active === document.body ||
            active === textareaRef.current ||
            active === sendButtonRef.current
          ) {
            textareaRef.current?.focus()
          }
        }
      }
    },
    [
      streaming,
      authChecked,
      user,
      items,
      decrementWords,
      decrementImageTokens,
      toast,
      persistAndRefresh,
      attachedImage,
      skipCostConfirm,
      t,
      apiError,
    ]
  )

  const handleSend = () => {
    void sendMessage(input.trim())
  }

  // UX-09: abort the in-flight turn; the sendMessage catch keeps partial output.
  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleRetry = () => {
    if (!lastFailedInput) return
    const text = lastFailedInput
    setLastFailedInput(null)
    setInput("")
    void sendMessage(text)
  }

  // FE-04 — confirm a paused tool call: resume execution via directDispatch.
  const handleConfirmTool = useCallback(
    (id: string) => {
      const item = items.find((it) => it.id === id && it.kind === "tool")
      if (!item || item.kind !== "tool" || !item.pendingConfirm) return
      const { args } = item.pendingConfirm
      void sendMessage("", {
        directDispatch: {
          toolName: item.name,
          args,
          callId: item.id,
          reason: item.reason,
        },
      })
    },
    [items, sendMessage],
  )

  // FE-04 — cancel a paused tool call: just remove the pending card. The
  // server already closed its stream when it emitted the pendingConfirm event,
  // so there is no pending dispatch to abort server-side.
  const handleCancelTool = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id))
    },
    [],
  )

  // FE-04 — "Don't ask again": set the localStorage flag AND confirm the
  // current pending tool in one click.
  const handleDontAskAgain = useCallback(
    (id: string) => {
      try {
        window.localStorage.setItem("plagia-ai-skip-cost-confirm", "true")
      } catch {
        // ignore
      }
      setSkipCostConfirm(true)
      handleConfirmTool(id)
    },
    [handleConfirmTool],
  )

  const handleClearConversation = () => {
    setItems([])
    setExpandedTools({})
    setLastFailedInput(null)
    setConfirmingClear(false)
    setAutoScrollPaused(false)
    setConversationId(null)
    setFollowupSuggestions([])
    setEditingMessageId(null)
    setEditingDraft("")
  }

  // FE-12 — export the current conversation as Markdown. The export
  // shape is a thin subset of ChatItem (no IDs, no progress state) —
  // map here so lib/plagia-ai/export.ts stays decoupled from the
  // component's local ChatItem union.
  const handleExportConversation = () => {
    if (items.length === 0) return
    const exportable: ExportableMessage[] = items.map((it) => {
      if (it.kind === "user") return { kind: "user", content: it.content }
      if (it.kind === "assistant") return { kind: "assistant", content: it.content }
      return {
        kind: "tool",
        name: it.name,
        argsSummary: display.argsSummary(it.name, it.argsSummary),
        status: it.status,
        resultPreview: it.resultPreview
          ? display.resultPreview(it.name, it.resultPreview)
          : it.resultPreview,
        error: it.error ? display.toolError(it.name, it.error) : it.error,
      }
    })
    const filename = downloadConversationMarkdown(exportable, undefined, {
      heading: (date) => t("export.heading", { date }),
      you: t("export.you"),
      toolFailed: t("toolCard.failed"),
      toolStatus: {
        pending_confirm: t("export.status.pendingConfirm"),
        running: t("export.status.running"),
        done: "",
        failed: t("export.status.failed"),
      },
      dateLocale: localeTags[locale],
    })
    toast({
      title: t("toasts.exported"),
      description: filename,
      variant: "success",
    })
  }

  // FE-18 — open the inline editor on a user bubble. Capture the current
  // content into editingDraft so Cancel can discard without re-reading
  // items (in case items mutates between open and cancel).
  const handleStartEditMessage = (id: string, currentContent: string) => {
    if (streaming) return
    setEditingMessageId(id)
    setEditingDraft(currentContent)
    // Focus + cursor-at-end on the next paint when the textarea mounts.
    requestAnimationFrame(() => {
      const el = editingTextareaRef.current
      if (!el) return
      el.focus()
      try {
        el.setSelectionRange(currentContent.length, currentContent.length)
      } catch {
        // Some browsers throw if the textarea isn't in the DOM yet — ignore.
      }
    })
  }

  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingDraft("")
  }

  // FE-18 — save edit: truncate items to drop everything AT and AFTER the
  // edited message, then call sendMessage with the new content using the
  // baseItems override so the truncate isn't lost to React's state batching.
  // FE-19 — regenerate the last assistant turn. Walk back from the end of
  // `items` to find the most recent assistant bubble; from there walk back
  // to the immediately preceding user message; truncate items to drop the
  // FE-22 — copy an assistant bubble's text to the clipboard. Toasts on
  // success and on the rare failure (clipboard permission denied,
  // typically inside an iframe). Best-effort — clipboard API is async.
  const handleCopyAssistant = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        toast({ title: t("toasts.copied"), variant: "success" })
      } catch {
        toast({
          title: t("toasts.copyFailed"),
          description: t("toasts.copyFailedDescription"),
          variant: "destructive",
        })
      }
    },
    [toast, t],
  )

  // user message and everything after; then send the original user content
  // again. The model re-rolls a new answer on the same prompt.
  const handleRegenerate = useCallback(() => {
    if (streaming) return
    let lastAssistantIdx = -1
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].kind === "assistant") {
        lastAssistantIdx = i
        break
      }
    }
    if (lastAssistantIdx === -1) return
    let priorUserIdx = -1
    for (let i = lastAssistantIdx - 1; i >= 0; i--) {
      if (items[i].kind === "user") {
        priorUserIdx = i
        break
      }
    }
    if (priorUserIdx === -1) return
    const userTurn = items[priorUserIdx]
    if (userTurn.kind !== "user") return
    const truncated = items.slice(0, priorUserIdx)
    void sendMessage(userTurn.content, { baseItems: truncated })
  }, [streaming, items, sendMessage])

  const handleSaveEditMessage = () => {
    if (!editingMessageId) return
    const editedText = editingDraft.trim()
    if (!editedText) return
    const editIndex = items.findIndex((it) => it.id === editingMessageId)
    if (editIndex === -1) {
      handleCancelEditMessage()
      return
    }
    const original = items[editIndex]
    if (original.kind !== "user") {
      handleCancelEditMessage()
      return
    }
    if (editedText === original.content) {
      handleCancelEditMessage()
      return
    }
    const truncated = items.slice(0, editIndex)
    setEditingMessageId(null)
    setEditingDraft("")
    void sendMessage(editedText, { baseItems: truncated })
  }

  const handleNewChat = () => {
    setItems([])
    setExpandedTools({})
    setLastFailedInput(null)
    setInput("")
    setConversationId(null)
    setAutoScrollPaused(false)
    setFollowupSuggestions([])
    setMobileSidebarOpen(false)
    setEditingMessageId(null)
    setEditingDraft("")
    textareaRef.current?.focus()
  }

  const handleSelectConversation = async (id: string) => {
    if (streaming) return
    if (id === conversationId) return
    const c = await loadConversation(id)
    if (!c) {
      toast({
        title: t("toasts.loadFailed"),
        description: t("toasts.loadFailedDescription"),
        variant: "destructive",
      })
      return
    }
    setConversationId(c.id)
    setItems((c.messages || []) as ChatItem[])
    setLastFailedInput(null)
    setInput("")
    setExpandedTools({})
    setAutoScrollPaused(false)
    setMobileSidebarOpen(false)
    setEditingMessageId(null)
    setEditingDraft("")
  }

  const handleDeleteConversation = async (id: string) => {
    const ok = await deleteConversation(id)
    if (!ok) {
      toast({
        title: t("toasts.deleteFailed"),
        description: t("toasts.tryAgainLater"),
        variant: "destructive",
      })
      return
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === conversationId) {
      handleNewChat()
    }
  }

  // FE-20 — rename a saved conversation. The sidebar handles the inline-
  // editor UX; this handler just calls the storage helper and refreshes
  // the list on success. Failure toast points at the most likely cause
  // (auth lapsed mid-edit, transient network).
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return false
    const ok = await renameConversation(id, trimmed)
    if (!ok) {
      toast({
        title: t("toasts.renameFailed"),
        description: t("toasts.tryAgainLater"),
        variant: "destructive",
      })
      return false
    }
    const fresh = await listConversations()
    setConversations(fresh)
    return true
  }

  // FE-24 — toggle pin on a saved conversation. The storage helper handles
  // the UPDATE; we refetch the list so the new sort lands. Failure path
  // tells the user the migration probably needs to be run.
  const handleTogglePinConversation = async (id: string, pinned: boolean) => {
    const ok = await setConversationPinned(id, pinned)
    if (!ok) {
      toast({
        title: t("toasts.pinFailed"),
        description: t("toasts.pinFailedDescription"),
        variant: "destructive",
      })
      return false
    }
    const fresh = await listConversations()
    setConversations(fresh)
    return true
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const conversationStarted = items.length > 0

  // FE-19 — id of the last assistant text bubble in `items`, used to gate
  // the "Regenerate" button (visible only under the most recent answer).
  // Computed inline because items is a small array and React renders are
  // already cheap here.
  const lastAssistantId = (() => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].kind === "assistant") return items[i].id
    }
    return null
  })()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />

      <section className="flex-1 flex flex-col min-h-[calc(100svh-3.5rem)]">
        <div className="flex-1 flex flex-row min-h-0">
          {user && (
            <ConversationSidebar
              conversations={conversations}
              activeId={conversationId}
              loading={loadingConversations}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              onDelete={handleDeleteConversation}
              onRename={handleRenameConversation}
              onTogglePin={handleTogglePinConversation}
            />
          )}
          {/* FE-13 — mobile drawer (lg:hidden). Renders a backdrop +
              translateX drawer with the same ConversationSidebar inside.
              No-op until the user opens it via the chat-header hamburger. */}
          <AnimatePresence>
            {user && mobileSidebarOpen && (
              <div className="lg:hidden">
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 bg-black/40 z-40"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-hidden="true"
                />
                <motion.aside
                  key="drawer"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  /* h-drawer-dvh instead of bottom-0: a fixed `bottom: 0`
                     resolves against the layout viewport, which on iOS Safari
                     runs behind the bottom bar, hiding the last conversation
                     rows. Sizing in dvh ends the drawer at the real visible
                     edge. */
                  className="fixed top-14 left-0 z-50 h-drawer-dvh w-[280px] max-w-[85vw] shadow-xl"
                  aria-label={t("header.drawerAria")}
                  role="dialog"
                  aria-modal="true"
                >
                  <ConversationSidebar
                    variant="drawer"
                    conversations={conversations}
                    activeId={conversationId}
                    loading={loadingConversations}
                    collapsed={false}
                    onToggleCollapse={() => {}}
                    onSelect={handleSelectConversation}
                    onNewChat={handleNewChat}
                    onDelete={handleDeleteConversation}
                    onRename={handleRenameConversation}
                    onTogglePin={handleTogglePinConversation}
                    onCloseDrawer={() => setMobileSidebarOpen(false)}
                  />
                </motion.aside>
              </div>
            )}
          </AnimatePresence>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="w-full max-w-3xl mx-auto px-4 py-6 flex-1 flex flex-col">
          {needsSignIn && !user && (
            <div className="mb-4">
              <ToolSignInPrompt />
            </div>
          )}

          {/* Chat header: settings + conversation actions */}
          {user && (
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                {/* FE-13 — mobile drawer trigger (hidden on lg+) */}
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={t("header.openConversationsAria")}
                  title={t("header.openConversationsTitle")}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                {conversationStarted ? (
                  <span className="text-xs text-muted-foreground truncate">
                    {t("header.messageCount", {
                      count: items.filter((it) => it.kind === "user").length,
                    })}
                  </span>
                ) : (
                  <span />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="h-7 px-2 gap-1 rounded-md inline-flex items-center text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={t("header.preferencesAria")}
                  aria-expanded={settingsOpen}
                >
                  <Settings className="h-3 w-3" />
                  <span className="hidden sm:inline">{t("header.preferences")}</span>
                </button>
                {conversationStarted && !confirmingClear && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleExportConversation}
                    disabled={streaming}
                    aria-label={t("header.exportAria")}
                    title={t("header.exportAria")}
                  >
                    <Download className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("header.export")}</span>
                  </Button>
                )}
                {conversationStarted &&
                  (confirmingClear ? (
                    <>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {t("header.clearQuestion")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => setConfirmingClear(false)}
                      >
                        {t("header.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleClearConversation}
                      >
                        {t("header.confirmClear")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setConfirmingClear(true)}
                      disabled={streaming}
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("header.clear")}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {settingsOpen && user && (
            <PreferencesPanel
              prefs={prefs}
              saving={prefsSaving}
              onSave={(next) => void handleSavePreferences(next)}
              onClose={() => setSettingsOpen(false)}
            />
          )}

          <div className="relative flex-1 flex flex-col">
            {/* FE-13 — cross-fade the chat thread when switching between
                conversations. Keyed by conversationId so a loadConversation
                triggers a remount + opacity fade. `mode="wait"` keeps the
                two states from stacking during the transition. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={conversationStarted ? (conversationId ?? "active") : "empty"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 flex flex-col min-h-0"
              >
            {!conversationStarted ? (
              <EmptyState>
                <SuggestionChipBar onChipClick={handleSuggestedPrompt} />
              </EmptyState>
            ) : (
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label={t("thread.logAria")}
              // tabIndex makes the scrollable transcript keyboard-focusable so
              // keyboard-only users can scroll back through it (WCAG 2.1.1);
              // the focus-visible ring satisfies 2.4.7.
              tabIndex={0}
              className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/30 p-5 space-y-5 min-h-[480px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
            >
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] text-sm leading-relaxed text-foreground">
                  <span className="sr-only">{t("thread.assistantSaid")}</span>
                  {t("greeting")}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {items.map((it) => {
                  if (it.kind === "user") {
                    const isEditing = editingMessageId === it.id
                    const userContent = it.content
                    return (
                      <motion.div
                        key={it.id}
                        layout="position"
                        variants={messageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.15 }}
                        className="flex justify-end"
                      >
                        {isEditing ? (
                          // focus-within mirrors the main composer (UX-03): the
                          // inner Textarea suppresses its own ring, so the wrapper
                          // carries the visible focus state. Uses the primary
                          // palette this edit box is already themed in.
                          <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25">
                            <Textarea
                              ref={editingTextareaRef}
                              value={editingDraft}
                              onChange={(e) => setEditingDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault()
                                  handleCancelEditMessage()
                                } else if (
                                  e.key === "Enter" &&
                                  (e.ctrlKey || e.metaKey)
                                ) {
                                  e.preventDefault()
                                  handleSaveEditMessage()
                                }
                              }}
                              rows={2}
                              className="min-h-[60px] resize-none border-0 bg-transparent text-base md:text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                              aria-label={t("thread.editAria")}
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={handleCancelEditMessage}
                                disabled={streaming}
                              >
                                {t("thread.cancel")}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-3 bg-violet-600 hover:bg-violet-700 text-white"
                                onClick={handleSaveEditMessage}
                                disabled={
                                  streaming ||
                                  !editingDraft.trim() ||
                                  editingDraft.trim() === userContent
                                }
                              >
                                {t("thread.saveAndResend")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="group relative max-w-[85%] rounded-2xl bg-primary/10 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            <span className="sr-only">{t("thread.youSaid")}</span>
                            {userContent}
                            <button
                              type="button"
                              onClick={() => handleStartEditMessage(it.id, userContent)}
                              disabled={streaming}
                              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-0"
                              aria-label={t("thread.editMessage")}
                              title={t("thread.editMessage")}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  }
                  if (it.kind === "assistant") {
                    const isStreamingThis = streaming && it.id === pendingAssistantId
                    const isLastAssistant = it.id === lastAssistantId
                    const showRegenerate =
                      isLastAssistant &&
                      !streaming &&
                      !editingMessageId &&
                      it.content.trim().length > 0
                    return (
                      <motion.div
                        key={it.id}
                        layout="position"
                        variants={messageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.15 }}
                        className="flex flex-col items-start"
                      >
                        <div className="group relative max-w-[85%] text-sm leading-relaxed text-foreground">
                          <span className="sr-only">{t("thread.assistantSaid")}</span>
                          <AssistantMarkdown
                            content={it.content}
                            trailing={
                              isStreamingThis ? (
                                <span className="inline-block ml-0.5 w-1.5 h-3.5 bg-violet-500/70 align-[-2px] animate-pulse" aria-hidden="true" />
                              ) : null
                            }
                          />
                          {!isStreamingThis && it.content.trim() && (
                            <button
                              type="button"
                              onClick={() => void handleCopyAssistant(it.content)}
                              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                              aria-label={t("thread.copyAnswer")}
                              title={t("thread.copyAnswer")}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {showRegenerate && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            className="mt-1.5 inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label={t("thread.regenerateAria")}
                            title={t("thread.regenerateAria")}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t("thread.regenerate")}
                          </button>
                        )}
                      </motion.div>
                    )
                  }
                  const isExpanded = !!expandedTools[it.id]
                  const resultText = renderToolResult(it, display)
                  const toolLabel = display.toolLabel(it.name)
                  const previewText = it.resultPreview
                    ? display.resultPreview(it.name, it.resultPreview)
                    : ""
                  const errorText = it.error ? display.toolError(it.name, it.error) : ""
                  const a11yStatus =
                    it.status === "pending_confirm"
                      ? t("toolCard.a11y.pending", { tool: toolLabel })
                      : it.status === "running"
                        ? t("toolCard.a11y.running", { tool: toolLabel })
                        : it.status === "done"
                          ? t("toolCard.a11y.done", { tool: toolLabel, preview: previewText })
                          : t("toolCard.a11y.failed", { tool: toolLabel, error: errorText })
                  return (
                    <motion.div
                      key={it.id}
                      layout="position"
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.15 }}
                      role="status"
                      aria-label={a11yStatus}
                      className={`rounded-xl border px-4 py-3 text-sm space-y-2 transition-colors duration-300 ${
                        it.status === "failed"
                          ? "border-red-500/30 bg-red-500/5"
                          : it.status === "running"
                            ? "border-violet-500/30 bg-violet-500/5"
                            : it.status === "pending_confirm"
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-border bg-card/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                          <Wrench className="h-3.5 w-3.5" />
                          <span className="font-medium">
                            {toolLabel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                          {display.argsSummary(it.name, it.argsSummary)}
                        </span>
                        <ToolStatusBadge status={it.status} />
                      </div>
                      {it.reason && (
                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                          {it.reason}
                        </p>
                      )}
                      {it.status === "pending_confirm" && it.pendingConfirm && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-foreground">
                            {t.rich("toolCard.confirmCost", {
                              amount: it.pendingConfirm.estimatedTokens.toLocaleString(),
                              currency: it.pendingConfirm.currency,
                              count: it.pendingConfirm.estimatedTokens,
                              b: (chunks) => (
                                <span className="font-semibold tabular-nums">{chunks}</span>
                              ),
                            })}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                              onClick={() => handleConfirmTool(it.id)}
                              disabled={streaming}
                            >
                              {t("toolCard.confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-3 text-xs"
                              onClick={() => handleCancelTool(it.id)}
                              disabled={streaming}
                            >
                              {t("toolCard.cancel")}
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleDontAskAgain(it.id)}
                              disabled={streaming}
                              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              {t("toolCard.dontAskAgain")}
                            </button>
                          </div>
                        </div>
                      )}
                      {it.status === "running" && it.progress !== undefined && (
                        <div className="space-y-1 pt-0.5">
                          <div className="h-1 w-full rounded-full bg-violet-500/15 overflow-hidden">
                            <div
                              className="h-full bg-violet-500 transition-all duration-200 ease-out"
                              style={{ width: `${it.progress}%` }}
                              role="progressbar"
                              aria-valuenow={Math.round(it.progress)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="truncate min-w-0 mr-2">
                              {it.progressMessage || t("toolCard.working")}
                            </span>
                            <span className="tabular-nums shrink-0">
                              {Math.round(it.progress)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const inlineSvg = getInlineSvg(it)
                        return inlineSvg ? (
                          <InlineSvgPreview svg={inlineSvg} toolName={it.name} />
                        ) : null
                      })()}
                      {(it.status === "done" || it.status === "failed") && (
                        <div className="flex items-start gap-2 text-xs">
                          <button
                            onClick={() => toggleToolExpand(it.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                            aria-label={isExpanded ? t("toolCard.collapseAria") : t("toolCard.expandAria")}
                            aria-expanded={isExpanded}
                            type="button"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            {it.status === "failed" ? (
                              <span className="text-red-600 dark:text-red-400">
                                {errorText || t("toolCard.failed")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {previewText || t("toolCard.completed")}
                              </span>
                            )}
                            {/* FE-23 — per-run cost footnote. Done cards
                                only; failed cards refunded / didn't deduct. */}
                            {it.status === "done" &&
                              typeof it.tokensUsed === "number" &&
                              it.tokensUsed > 0 &&
                              it.tokensCurrency && (
                                <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                                  {t("toolCard.tokensUsed", {
                                    amount: it.tokensUsed.toLocaleString(),
                                    currency: it.tokensCurrency,
                                    count: it.tokensUsed,
                                  })}
                                </div>
                              )}
                            {isExpanded && resultText && (
                              <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-foreground bg-background/50 rounded-md p-3 border border-border max-h-[320px] overflow-y-auto">
                                {resultText}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
                {/* Typing indicator: bridges the gap between sending and the
                    first streamed token / tool card so the wait feels intentional.
                    Shows only while streaming and nothing has been appended after
                    the user's message yet (last item is still the user turn). */}
                {streaming &&
                  items.length > 0 &&
                  items[items.length - 1].kind === "user" && (
                    <motion.div
                      key="typing-indicator"
                      layout="position"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5"
                      role="status"
                      aria-label={t("thread.thinkingAria")}
                    >
                      <span className="sr-only">{t("thread.thinking")}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 motion-safe:animate-bounce [animation-delay:-0.3s]" aria-hidden="true" />
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 motion-safe:animate-bounce [animation-delay:-0.15s]" aria-hidden="true" />
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60 motion-safe:animate-bounce" aria-hidden="true" />
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
            )}
              </motion.div>
            </AnimatePresence>

            {/* Scroll-to-bottom floating button */}
            <AnimatePresence>
              {showScrollToBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    setAutoScrollPaused(false)
                    scrollToBottom()
                  }}
                  className="absolute bottom-3 right-3 h-9 w-9 rounded-full border border-border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={t("thread.scrollToBottom")}
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Retry banner shown after a network/SSE error */}
          {lastFailedInput && !streaming && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("thread.lastFailed")}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-700"
                onClick={handleRetry}
              >
                <RotateCcw className="h-3 w-3" />
                {t("thread.tryAgain")}
              </Button>
            </div>
          )}

          {!streaming && followupSuggestions.length > 0 && (
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label={t("thread.followupsAria")}
            >
              {followupSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setFollowupSuggestions([])
                    void sendMessage(display.suggestion(suggestion))
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-xs text-violet-700 dark:text-violet-300 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                  {display.suggestion(suggestion)}
                </button>
              ))}
            </div>
          )}

          <div
            className="mt-4 sticky"
            style={{ bottom: `${16 + keyboardInset}px` }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileSelected}
            />

            {(attachedImage || attachmentError) && (
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                {attachedImage && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-card text-xs">
                    <Paperclip className="h-3 w-3 text-violet-500" />
                    <span className="truncate max-w-[200px]">
                      {attachedImage.name || t("attach.defaultName")}
                    </span>
                    <button
                      onClick={handleRemoveAttached}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t("attach.removeAria")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {attachmentError && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {attachmentError}
                  </span>
                )}
              </div>
            )}

            {/* focus-within ring: the Textarea suppresses its own focus ring
                (focus-visible:ring-0), so the wrapper carries the focus state —
                otherwise clicking into the composer gives no visual feedback. */}
            <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/30">
              <Textarea
                ref={textareaRef}
                placeholder={t("composer.placeholder")}
                aria-label={t("composer.aria")}
                aria-describedby="plagia-ai-keyboard-hint"
                value={input}
                maxLength={12000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent text-base md:text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {input.length > 11000 && (
                <p className="px-3 text-[11px] text-amber-600 dark:text-amber-400 tabular-nums">
                  {t("composer.charCount", { count: input.length.toLocaleString() })}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAttachClick}
                    disabled={streaming || !!attachedImage}
                    className="h-10 w-10 sm:h-9 sm:w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label={t("composer.attachAria")}
                    title={t("composer.attachTitle")}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={toggleRecording}
                    disabled={streaming || !speechSupported}
                    className={`h-10 w-10 sm:h-9 sm:w-9 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                      recording
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={recording ? t("composer.stopDictation") : t("composer.startDictationAria")}
                    title={
                      !speechSupported
                        ? t("composer.dictationUnsupported")
                        : recording
                          ? t("composer.stopDictation")
                          : t("composer.dictation")
                    }
                  >
                    {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <span
                    id="plagia-ai-keyboard-hint"
                    className="hidden sm:inline text-[11px] text-muted-foreground ml-1"
                  >
                    {t("composer.keyboardHint")}
                  </span>
                </div>
                <Button
                  ref={sendButtonRef}
                  onClick={streaming ? handleStop : handleSend}
                  disabled={streaming ? false : !input.trim()}
                  aria-label={streaming ? t("composer.stopAria") : t("composer.sendAria")}
                  className="h-10 sm:h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium shadow-none ml-auto"
                >
                  {streaming ? (
                    // UX-09: while streaming the action becomes Stop (aborts the
                    // turn) instead of a disabled "Thinking" button.
                    <>
                      <Square className="mr-1.5 h-3 w-3 fill-current" />
                      {t("composer.stop")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      {t("composer.send")}
                    </>
                  )}
                </Button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!conversationStarted && marketingFooter ? marketingFooter : <FAQ />}
    </div>
  )
}

function PreferencesPanel({
  prefs,
  saving,
  onSave,
  onClose,
}: {
  prefs: PlagiaAiPreferences
  saving: boolean
  onSave: (next: PlagiaAiPreferences) => void
  onClose: () => void
}) {
  const t = useTranslations("PlagiaAi.preferences")
  const tValues = useTranslations("PlagiaAi.values")
  // Local form state — committed on Save. Lets users tweak controls without
  // each keystroke writing to Supabase.
  const [draft, setDraft] = useState<PlagiaAiPreferences>(prefs)
  useEffect(() => {
    setDraft(prefs)
  }, [prefs])

  const update = <K extends keyof PlagiaAiPreferences>(
    key: K,
    value: PlagiaAiPreferences[K] | undefined,
  ) => {
    setDraft((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={t("closeAria")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("intro")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-foreground">{t("paraphraseMode")}</span>
          <select
            value={draft.paraphraseMode ?? ""}
            onChange={(e) =>
              update(
                "paraphraseMode",
                (e.target.value || undefined) as PlagiaAiPreferences["paraphraseMode"],
              )
            }
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-base md:text-sm"
          >
            <option value="">{t("noPreference")}</option>
            <option value="standard">{tValues("modes.standard")}</option>
            <option value="fluency">{tValues("modes.fluency")}</option>
            <option value="formal">{tValues("modes.formal")}</option>
            <option value="simple">{tValues("modes.simple")}</option>
            <option value="creative">{tValues("modes.creative")}</option>
            <option value="academic">{tValues("modes.academic")}</option>
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-foreground">{t("humanizerTone")}</span>
          <select
            value={draft.humanizerTone ?? ""}
            onChange={(e) =>
              update(
                "humanizerTone",
                (e.target.value || undefined) as PlagiaAiPreferences["humanizerTone"],
              )
            }
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-base md:text-sm"
          >
            <option value="">{t("noPreference")}</option>
            <option value="casual">{tValues("tones.casual")}</option>
            <option value="professional">{tValues("tones.professional")}</option>
            <option value="academic">{tValues("tones.academic")}</option>
            <option value="creative">{tValues("tones.creative")}</option>
            <option value="friendly">{tValues("tones.friendly")}</option>
          </select>
        </label>

        <label className="space-y-1 text-xs sm:col-span-2">
          <span className="font-medium text-foreground inline-flex items-center gap-2">
            {t("summaryLength")}
            {typeof draft.summaryLengthPercent === "number" && (
              <span className="text-muted-foreground tabular-nums">
                {draft.summaryLengthPercent}%
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={draft.summaryLengthPercent ?? 30}
              onChange={(e) => update("summaryLengthPercent", Number(e.target.value))}
              className="flex-1 accent-violet-600"
              aria-label={t("summaryLengthAria")}
            />
            {typeof draft.summaryLengthPercent === "number" && (
              <button
                type="button"
                onClick={() => update("summaryLengthPercent", undefined)}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {t("clear")}
              </button>
            )}
          </div>
        </label>

        <label className="flex items-start gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            checked={!!draft.alwaysConfirmImageSpend}
            onChange={(e) =>
              update("alwaysConfirmImageSpend", e.target.checked || undefined)
            }
            className="mt-0.5 accent-violet-600"
          />
          <span>
            <span className="font-medium text-foreground">
              {t("alwaysConfirm")}
            </span>
            <span className="block text-muted-foreground mt-0.5">
              {t("alwaysConfirmHint")}
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-xs"
          onClick={() => setDraft(prefs)}
          disabled={saving}
        >
          {t("reset")}
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => onSave(draft)}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("save")
          )}
        </Button>
      </div>
    </div>
  )
}

function ToolStatusBadge({
  status,
}: {
  status: "pending_confirm" | "running" | "done" | "failed"
}) {
  const t = useTranslations("PlagiaAi.toolCard.status")
  // Tinted pills (not bare colored text) so a card's state is scannable at a
  // glance and running -> done / failed transitions read clearly. Each variant
  // carries an explicit dark-mode foreground for parity.
  const base =
    "inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
  if (status === "pending_confirm") {
    return (
      <span className={`${base} bg-amber-500/10 text-amber-700 dark:text-amber-400`}>
        <Coins className="h-3 w-3" aria-hidden="true" />
        {t("pendingConfirm")}
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className={`${base} bg-violet-500/10 text-violet-700 dark:text-violet-400`}>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {t("running")}
      </span>
    )
  }
  if (status === "done") {
    return (
      <span className={`${base} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`}>
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {t("done")}
      </span>
    )
  }
  return (
    <span className={`${base} bg-red-500/10 text-red-700 dark:text-red-400`}>
      <XCircle className="h-3 w-3" aria-hidden="true" />
      {t("failed")}
    </span>
  )
}

/**
 * FE-21 — extract the SVG string from a generate_* tool's result, if any.
 * Returns null for non-SVG tools or unfinished/failed runs so the caller
 * can skip the inline-render branch with a single truthy check.
 */
function getInlineSvg(
  it: Extract<ChatItem, { kind: "tool" }>,
): string | null {
  if (it.status !== "done") return null
  if (
    it.name !== "generate_chart" &&
    it.name !== "generate_infographic" &&
    it.name !== "generate_thumbnail"
  ) {
    return null
  }
  const r = it.result as { result?: { svg?: unknown } } | undefined
  const svg = r?.result?.svg
  return typeof svg === "string" && svg.length > 0 ? svg : null
}

function renderToolResult(
  it: Extract<ChatItem, { kind: "tool" }>,
  display: ToolDisplay,
): string | null {
  const { t } = display
  if (it.status === "failed") return it.error ? display.toolError(it.name, it.error) : null
  const r = it.result as { result?: any } | undefined
  if (!r || !r.result)
    return it.resultPreview ? display.resultPreview(it.name, it.resultPreview) : null

  const data = r.result
  switch (it.name) {
    case "paraphrase":
      return data.paraphrasedText || null
    case "summarize":
      if (data.summary) return data.summary
      if (Array.isArray(data.bulletPoints))
        return data.bulletPoints.map((b: string) => `• ${b}`).join("\n")
      return null
    case "humanize":
      return data.humanizedText || null
    case "ai_detect":
      return data.analysis
        ? `${t("resultText.aiScore", {
            verdict: display.verdict(String(data.verdict)),
            score: String(data.overallScore),
          })}\n\n${data.analysis}`
        : null
    case "grammar":
      return data.correctedText || null
    case "plagiarism_check": {
      const matches = Array.isArray(data.matches) ? data.matches : []
      const parts = [
        t("resultText.plagiarismDetected", {
          percent: String(Math.round(data.plagiarismPercentage ?? 0)),
        }),
      ]
      if (matches.length) {
        parts.push(
          ...matches
            .slice(0, 5)
            .map(
              (m: any) =>
                `• ${m.text || t("resultText.match")}${typeof m.similarity === "number" ? ` (${Math.round(m.similarity)}%)` : ""}`
            )
        )
      }
      return parts.join("\n")
    }
    case "generate_infographic":
    case "generate_chart":
    case "generate_thumbnail":
      return typeof data.svg === "string"
        ? t("resultText.svgOutput", { count: data.svg.length })
        : null
    case "image_to_text":
      return data.extractedText || null
    case "voice_to_essay": {
      const essay = data.essay
      const title = data.title
      if (!essay) return null
      return title ? `${title}\n\n${essay}` : essay
    }
    case "audio_summarize": {
      const parts: string[] = []
      if (data.title) parts.push(`# ${data.title}`)
      if (data.overview) parts.push(data.overview)
      if (Array.isArray(data.keyPoints) && data.keyPoints.length) {
        parts.push(t("resultText.keyPoints"))
        parts.push(...data.keyPoints.map((p: string) => `• ${p}`))
      }
      if (data.detailedSummary) parts.push("", data.detailedSummary)
      if (Array.isArray(data.actionItems) && data.actionItems.length) {
        parts.push("", t("resultText.actionItems"))
        parts.push(...data.actionItems.map((a: string) => `• ${a}`))
      }
      return parts.length ? parts.join("\n") : null
    }
  }
}
