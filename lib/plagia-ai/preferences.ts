/**
 * FE-09 — Persistent PlagiaAI preferences.
 *
 * Stored as a single JSONB column `plagia_ai_preferences` on `user_profiles`.
 * Required one-time SQL (run by the user — see the FE-09 commit body):
 *
 *   ALTER TABLE user_profiles
 *     ADD COLUMN IF NOT EXISTS plagia_ai_preferences JSONB DEFAULT '{}'::jsonb;
 *
 * Until that column exists, both load and save degrade gracefully: load returns
 * an empty object and save is a no-op. The route still functions; users just
 * don't get personalization injected into the system prompt.
 *
 * Why JSONB instead of separate columns: keeps the schema flexible. Adding a
 * new preference key never requires a migration — just bump this file's type
 * and ship.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export interface PlagiaAiPreferences {
  /** Default paraphrase mode when the user doesn't specify one in chat. */
  paraphraseMode?: "standard" | "fluency" | "formal" | "simple" | "creative" | "academic"
  /** Preferred humanizer tone when the user doesn't specify one. */
  humanizerTone?: "casual" | "professional" | "academic" | "creative" | "friendly"
  /** Default summary length as a percentage (10-90). */
  summaryLengthPercent?: number
  /** When true, ALWAYS ask before image-token tools (overrides cost-confirm bypass). */
  alwaysConfirmImageSpend?: boolean
}

export const EMPTY_PREFERENCES: PlagiaAiPreferences = {}

/**
 * Strip unknown / out-of-range keys before persisting or rendering. Defensive
 * against accidental column reads from older / newer schema versions.
 */
export function sanitizePreferences(raw: unknown): PlagiaAiPreferences {
  if (!raw || typeof raw !== "object") return EMPTY_PREFERENCES
  const r = raw as Record<string, unknown>
  const out: PlagiaAiPreferences = {}

  const mode = r.paraphraseMode
  if (typeof mode === "string" && ["standard", "fluency", "formal", "simple", "creative", "academic"].includes(mode)) {
    out.paraphraseMode = mode as PlagiaAiPreferences["paraphraseMode"]
  }

  const tone = r.humanizerTone
  if (typeof tone === "string" && ["casual", "professional", "academic", "creative", "friendly"].includes(tone)) {
    out.humanizerTone = tone as PlagiaAiPreferences["humanizerTone"]
  }

  const length = r.summaryLengthPercent
  if (typeof length === "number" && length >= 10 && length <= 90 && Number.isFinite(length)) {
    out.summaryLengthPercent = Math.round(length)
  }

  if (typeof r.alwaysConfirmImageSpend === "boolean") {
    out.alwaysConfirmImageSpend = r.alwaysConfirmImageSpend
  }

  return out
}

/**
 * Fetch the user's preferences. Returns EMPTY_PREFERENCES if:
 *   - the column doesn't exist yet (the user hasn't run the migration)
 *   - the row doesn't exist
 *   - the value is malformed
 *   - any error occurs
 *
 * Callers should never check for null — just always use the returned object.
 */
export async function loadPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlagiaAiPreferences> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("plagia_ai_preferences")
      .eq("id", userId)
      .single()
    if (error) return EMPTY_PREFERENCES
    return sanitizePreferences((data as { plagia_ai_preferences?: unknown })?.plagia_ai_preferences)
  } catch {
    return EMPTY_PREFERENCES
  }
}

/**
 * Save the user's preferences. Returns false (no throw) on any failure so the
 * UI can show a graceful error toast without crashing. The sanitizer runs
 * before write so callers can't inject arbitrary keys via the function.
 */
export async function savePreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: PlagiaAiPreferences,
): Promise<boolean> {
  const clean = sanitizePreferences(prefs)
  try {
    const { error } = await supabase
      .from("user_profiles")
      .update({ plagia_ai_preferences: clean })
      .eq("id", userId)
    return !error
  } catch {
    return false
  }
}

/**
 * Render the user's preferences as a compact system-prompt addendum. Returns
 * null when no preferences are set — so the route can skip injecting an
 * empty system message. Only includes keys the user has EXPLICITLY set
 * (per the FE-09 acceptance criterion "Don't bloat the system prompt — only
 * include preferences the user has explicitly set").
 */
export function buildPreferencesSystemMessage(prefs: PlagiaAiPreferences): string | null {
  const lines: string[] = []
  if (prefs.paraphraseMode) {
    lines.push(`- Default paraphrase mode: ${prefs.paraphraseMode}.`)
  }
  if (prefs.humanizerTone) {
    lines.push(`- Default humanizer tone: ${prefs.humanizerTone}.`)
  }
  if (typeof prefs.summaryLengthPercent === "number") {
    lines.push(`- Default summary length: ~${prefs.summaryLengthPercent}% of the original.`)
  }
  if (prefs.alwaysConfirmImageSpend) {
    lines.push(`- Always ask the user to confirm before calling any image-token tool, regardless of cost.`)
  }

  if (lines.length === 0) return null
  return `## User preferences (apply unless the current message explicitly overrides)\n${lines.join("\n")}`
}
