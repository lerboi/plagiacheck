import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface TokenStore {
  remainingWords: number
  remainingImageTokens: number
  /** Free-trial token count for non-logged-in visitors. Starts at 200, persisted in localStorage. */
  guestTokens: number
  fetchRemainingWords: (userId: string) => Promise<void>
  fetchImageTokens: (userId: string) => Promise<void>
  /**
   * Refresh the locally-displayed token balance from the server. The server
   * is authoritative for token deductions — this just reconciles the cached
   * display value. The `_amount` parameter is accepted for backward
   * compatibility with existing callers but is no longer used for math.
   */
  decrementWords: (_amount?: number) => Promise<void>
  decrementImageTokens: (_amount?: number) => Promise<void>
  setRemainingWords: (value: number) => void
  setRemainingImageTokens: (value: number) => void
  clearTokens: () => void
}

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      remainingWords: 0,
      remainingImageTokens: 0,
      guestTokens: 200,

      fetchRemainingWords: async (userId) => {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from("user_profiles")
          .select("tokens")
          .eq("id", userId)
          .single()

        if (error) {
          console.error("Error fetching tokens:", error.message)
          return
        }

        set({ remainingWords: data.tokens })
      },

      fetchImageTokens: async (userId) => {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from("PurchasedToken")
          .select("imageTokens")
          .eq("userId", userId)
          .single()

        if (error) {
          set({ remainingImageTokens: 0 })
          return
        }

        set({ remainingImageTokens: data.imageTokens || 0 })
      },

      decrementWords: async () => {
        const supabase = createClientComponentClient()
        const { data: userResult } = await supabase.auth.getUser()
        const userId = userResult?.user?.id
        if (!userId) return

        const { data, error } = await supabase
          .from("user_profiles")
          .select("tokens")
          .eq("id", userId)
          .single()

        if (error) {
          console.error("Error refreshing tokens:", error.message)
          return
        }

        set({ remainingWords: data.tokens ?? 0 })
        notifyTokensChanged()
      },

      decrementImageTokens: async () => {
        const supabase = createClientComponentClient()
        const { data: userResult } = await supabase.auth.getUser()
        const userId = userResult?.user?.id
        if (!userId) return

        const { data, error } = await supabase
          .from("PurchasedToken")
          .select("imageTokens")
          .eq("userId", userId)
          .single()

        if (error) {
          set({ remainingImageTokens: 0 })
          return
        }

        set({ remainingImageTokens: data.imageTokens || 0 })
        notifyTokensChanged()
      },

      setRemainingWords: (value) => set({ remainingWords: value }),
      setRemainingImageTokens: (value) => set({ remainingImageTokens: value }),

      // guestTokens deliberately preserved on logout — they represent the
      // visitor's remaining free trial and should persist across sessions.
      clearTokens: () => {
        set({ remainingWords: 0, remainingImageTokens: 0 })
      },
    }),
    {
      name: "token-storage",
    }
  )
)

/**
 * Helper for client tool pages: attach the current Supabase access token
 * as a Bearer header so the API route can authenticate and atomically
 * deduct on the server.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClientComponentClient()
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Tool pages call this after a successful run so the nav (and any other
 * subscribed component) can refresh the token balance display.
 */
export const TOKENS_CHANGED_EVENT = "plagiacheck:tokens-changed"

export function notifyTokensChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(TOKENS_CHANGED_EVENT))
}
