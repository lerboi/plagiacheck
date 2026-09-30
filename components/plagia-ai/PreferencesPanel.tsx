"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useDragControls } from "framer-motion"
import { useTranslations } from "next-intl"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Loader2, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlagiaAiPreferences } from "@/lib/plagia-ai/preferences"

const PARAPHRASE_MODES = ["standard", "fluency", "formal", "simple", "creative", "academic"] as const
const HUMANIZER_TONES = ["casual", "professional", "academic", "creative", "friendly"] as const
/** Where the slider rests while no summary length is set. */
const SUMMARY_LENGTH_RESTING = 30

type SaveHandler = (next: PlagiaAiPreferences) => Promise<boolean>

interface SharedProps {
  prefs: PlagiaAiPreferences
  saving: boolean
  /** Resolves true once saved; the panel closes on success. */
  onSave: SaveHandler
}

export function countActivePreferences(prefs: PlagiaAiPreferences): number {
  return Object.values(prefs).filter((value) => value !== undefined && value !== false).length
}

function samePreferences(a: PlagiaAiPreferences, b: PlagiaAiPreferences): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof PlagiaAiPreferences>
  for (const key of keys) {
    // An unticked checkbox and an absent key mean the same thing.
    if ((a[key] || undefined) !== (b[key] || undefined)) return false
  }
  return true
}

/** A row of pill buttons, one of which (or "Auto") is selected. */
function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  optionLabel,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T | undefined
  optionLabel: (option: T) => string
  onChange: (next: T | undefined) => void
}) {
  const t = useTranslations("PlagiaAi.preferences")
  const labelId = useId()
  const choices: (T | undefined)[] = [undefined, ...options]
  return (
    <div className="space-y-2">
      <p id={labelId} className="text-xs font-medium text-foreground">
        {label}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {choices.map((option) => {
          const selected = option === value
          return (
            <button
              key={option ?? "auto"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`h-9 sm:h-8 px-3 rounded-full border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                selected
                  ? "border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/25"
              }`}
            >
              {option === undefined ? t("auto") : optionLabel(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  labelledBy: string
  describedBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
        checked ? "bg-violet-600" : "bg-muted-foreground/30"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

/** Radix slider with the accessible name on the thumb, which is the element screen readers focus. */
function LengthSlider({
  value,
  isSet,
  label,
  onChange,
}: {
  value: number
  isSet: boolean
  label: string
  onChange: (next: number) => void
}) {
  return (
    <SliderPrimitive.Root
      min={10}
      max={90}
      step={5}
      value={[value]}
      onValueChange={([next]) => onChange(next)}
      className={`relative flex w-full touch-none select-none items-center py-2 transition-opacity ${
        isSet ? "" : "opacity-50 hover:opacity-80"
      }`}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-violet-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className="block h-[18px] w-[18px] rounded-full border-2 border-violet-500 bg-background shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
      />
    </SliderPrimitive.Root>
  )
}

/**
 * The form itself, shared by the desktop popover and the mobile sheet. Edits
 * stay local until Save, so trying options out never writes to Supabase.
 */
function PreferencesForm({
  prefs,
  saving,
  onSave,
  onClose,
  titleId,
  layout,
}: SharedProps & {
  onClose: () => void
  titleId: string
  layout: "popover" | "sheet"
}) {
  const t = useTranslations("PlagiaAi.preferences")
  const tValues = useTranslations("PlagiaAi.values")
  const [draft, setDraft] = useState<PlagiaAiPreferences>(prefs)
  useEffect(() => {
    setDraft(prefs)
  }, [prefs])
  const dirty = !samePreferences(draft, prefs)
  const confirmLabelId = useId()
  const confirmHintId = useId()

  const update = <K extends keyof PlagiaAiPreferences>(key: K, value: PlagiaAiPreferences[K] | undefined) => {
    setDraft((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  const summaryLength = draft.summaryLengthPercent
  const handleSave = async () => {
    if (await onSave(draft)) onClose()
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 -mt-0.5 h-8 w-8 shrink-0 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={t("closeAria")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 space-y-5">
        <ChoiceGroup
          label={t("paraphraseMode")}
          options={PARAPHRASE_MODES}
          value={draft.paraphraseMode}
          optionLabel={(mode) => tValues(`modes.${mode}`)}
          onChange={(mode) => update("paraphraseMode", mode)}
        />

        <ChoiceGroup
          label={t("humanizerTone")}
          options={HUMANIZER_TONES}
          value={draft.humanizerTone}
          optionLabel={(tone) => tValues(`tones.${tone}`)}
          onChange={(tone) => update("humanizerTone", tone)}
        />

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-foreground">{t("summaryLength")}</p>
            <div className="flex items-baseline gap-2 text-xs">
              {typeof summaryLength === "number" && (
                <button
                  type="button"
                  onClick={() => update("summaryLengthPercent", undefined)}
                  className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  {t("useAuto")}
                </button>
              )}
              <span
                className={`tabular-nums font-medium ${
                  typeof summaryLength === "number" ? "text-violet-700 dark:text-violet-300" : "text-muted-foreground"
                }`}
              >
                {typeof summaryLength === "number" ? `${summaryLength}%` : t("auto")}
              </span>
            </div>
          </div>
          <LengthSlider
            value={summaryLength ?? SUMMARY_LENGTH_RESTING}
            isSet={typeof summaryLength === "number"}
            label={t("summaryLengthAria")}
            onChange={(value) => update("summaryLengthPercent", value)}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
            <span>{t("summaryShort")}</span>
            <span>{t("summaryLong")}</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/40 px-3.5 py-3">
          <div className="min-w-0">
            <p id={confirmLabelId} className="text-xs font-medium text-foreground">
              {t("alwaysConfirm")}
            </p>
            <p id={confirmHintId} className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              {t("alwaysConfirmHint")}
            </p>
          </div>
          <Switch
            checked={!!draft.alwaysConfirmImageSpend}
            onChange={(on) => update("alwaysConfirmImageSpend", on || undefined)}
            labelledBy={confirmLabelId}
            describedBy={confirmHintId}
          />
        </div>
      </div>

      <div
        className={`flex items-center gap-2 border-t border-border px-5 pt-3 ${
          layout === "sheet" ? "pb-safe" : "pb-3 justify-end"
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 px-3 text-xs ${layout === "sheet" ? "flex-1" : ""}`}
          onClick={() => setDraft(prefs)}
          disabled={saving || !dirty}
        >
          {t("discard")}
        </Button>
        <Button
          size="sm"
          className={`h-9 px-4 text-xs bg-violet-600 hover:bg-violet-700 text-white ${layout === "sheet" ? "flex-1" : ""}`}
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
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

/**
 * Desktop: the Preferences row pinned to the bottom of the conversation
 * sidebar, opening a card upward from it. Icon-only while the sidebar is
 * collapsed.
 */
export function PreferencesSidebarLauncher({ collapsed, ...shared }: SharedProps & { collapsed: boolean }) {
  const t = useTranslations("PlagiaAi.preferences")
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const active = countActivePreferences(shared.prefs)

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div className="relative shrink-0 border-t border-border p-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          collapsed ? (active > 0 ? `${t("title")}, ${t("activeCount", { count: active })}` : t("title")) : undefined
        }
        title={collapsed ? t("title") : undefined}
        className={`relative w-full h-9 flex items-center gap-2.5 rounded-md overflow-hidden text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
          collapsed ? "justify-center" : "px-2.5"
        } ${open ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
      >
        <Settings className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{t("title")}</span>}
        {active > 0 &&
          (collapsed ? (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-2.5 h-1.5 w-1.5 rounded-full bg-violet-500"
            />
          ) : (
            <span
              className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-semibold tabular-nums inline-flex items-center justify-center"
              title={t("activeCount", { count: active })}
            >
              <span aria-hidden="true">{active}</span>
              <span className="sr-only">{t("activeCount", { count: active })}</span>
            </span>
          ))}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "bottom left" }}
            className="absolute bottom-full left-2 mb-2 z-50 w-[360px] max-h-[calc(100dvh-8rem)] flex flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl focus:outline-none"
          >
            <PreferencesForm {...shared} onClose={() => close()} titleId={titleId} layout="popover" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Mobile: a bottom sheet opened from the gear button in the chat header. */
export function PreferencesSheet({
  open,
  onClose,
  ...shared
}: SharedProps & { open: boolean; onClose: () => void }) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  // Held in a ref so a new onClose identity on each parent render does not
  // re-run the effect below (which would steal focus back to the sheet).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    sheetRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", onKeyDown)
    // The sheet is lg:hidden; if the window widens past that while it is
    // open, close it rather than leave the page scroll-locked behind nothing.
    const desktop = window.matchMedia("(min-width: 1024px)")
    const onViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) onCloseRef.current()
    }
    desktop.addEventListener("change", onViewportChange)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
      desktop.removeEventListener("change", onViewportChange)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="lg:hidden">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose()
            }}
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl focus:outline-none"
          >
            {/* The handle is the only drag target, so the slider and the
                scrolling body keep their own touch gestures. */}
            <div
              className="flex justify-center pt-2.5 pb-1 cursor-grab touch-none"
              onPointerDown={(event) => dragControls.start(event)}
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <PreferencesForm {...shared} onClose={onClose} titleId={titleId} layout="sheet" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
