import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface TokenStore {
  remainingWords: number
  remainingImageTokens: number
  fetchRemainingWords: (userId: string) => Promise<void>
  fetchImageTokens: (userId: string) => Promise<void>
  decrementWords: (amount: number) => Promise<void>
  decrementImageTokens: (amount: number) => Promise<void>
  clearTokens: () => void
}

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      remainingWords: 0,
      remainingImageTokens: 0,

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
          // No purchased tokens record yet — that's fine
          set({ remainingImageTokens: 0 })
          return
        }

        set({ remainingImageTokens: data.imageTokens || 0 })
      },

      decrementWords: async (amount) => {
        set((state) => ({ remainingWords: Math.max(0, state.remainingWords - amount) }))

        const supabase = createClientComponentClient()
        const user = await supabase.auth.getUser()

        if (!user?.data?.user?.id) return

        // Read the already-decremented local state and sync to DB
        const newAmount = useTokenStore.getState().remainingWords

        const { error } = await supabase
          .from("user_profiles")
          .update({ tokens: newAmount })
          .eq("id", user.data.user.id)

        if (error) {
          console.error("Error updating tokens:", error.message)
        }
      },

      decrementImageTokens: async (amount) => {
        set((state) => ({ remainingImageTokens: Math.max(0, state.remainingImageTokens - amount) }))

        const supabase = createClientComponentClient()
        const user = await supabase.auth.getUser()

        if (!user?.data?.user?.id) return

        const newAmount = useTokenStore.getState().remainingImageTokens

        const { error } = await supabase
          .from("PurchasedToken")
          .update({ imageTokens: newAmount })
          .eq("userId", user.data.user.id)

        if (error) {
          console.error("Error updating image tokens:", error.message)
        }
      },

      clearTokens: () => {
        set({ remainingWords: 0, remainingImageTokens: 0 })
      },
    }),
    {
      name: "token-storage",
    }
  )
)
