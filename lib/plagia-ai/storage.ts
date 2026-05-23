"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export interface StoredConversationSummary {
  id: string
  title: string | null
  updated_at: string
  created_at: string
}

export interface StoredConversation extends StoredConversationSummary {
  /** The full ChatItem[] serialized as JSON. Shape mirrors the client `ChatItem` type. */
  messages: unknown[]
}

const TABLE = "plagia_ai_conversations"
const TITLE_MAX_CHARS = 60

function getClient() {
  return createClientComponentClient()
}

export function deriveConversationTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, " ")
  if (cleaned.length <= TITLE_MAX_CHARS) return cleaned
  return `${cleaned.slice(0, TITLE_MAX_CHARS - 1).trimEnd()}…`
}

export async function listConversations(): Promise<StoredConversationSummary[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(60)

  if (error) {
    console.error("Failed to list conversations:", error.message)
    return []
  }
  return (data || []) as StoredConversationSummary[]
}

export async function loadConversation(id: string): Promise<StoredConversation | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, messages, updated_at, created_at")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Failed to load conversation:", error.message)
    return null
  }
  return data as StoredConversation
}

export async function saveConversation(
  id: string | null,
  title: string,
  messages: unknown[]
): Promise<string | null> {
  const supabase = getClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date().toISOString()

  if (id) {
    const { error } = await supabase
      .from(TABLE)
      .update({ title, messages, updated_at: now })
      .eq("id", id)
    if (error) {
      console.error("Failed to update conversation:", error.message)
      return null
    }
    return id
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: user.id, title, messages, updated_at: now })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Failed to insert conversation:", error?.message)
    return null
  }
  return data.id as string
}

/**
 * FE-20 — rename a saved conversation. The `title` column already exists
 * (FS-05) so this is a pure UPDATE — no migration needed. Trims the input
 * server-side so the database never holds whitespace-only titles even if
 * the client forgets to. Caps at `TITLE_MAX_CHARS` (60) to match what
 * `deriveConversationTitle` produces for auto-generated names.
 */
export async function renameConversation(
  id: string,
  newTitle: string,
): Promise<boolean> {
  const trimmed = newTitle.trim().slice(0, TITLE_MAX_CHARS)
  if (!trimmed) return false
  const supabase = getClient()
  const { error } = await supabase
    .from(TABLE)
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("Failed to rename conversation:", error.message)
    return false
  }
  return true
}

export async function deleteConversation(id: string): Promise<boolean> {
  const supabase = getClient()
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) {
    console.error("Failed to delete conversation:", error.message)
    return false
  }
  return true
}
