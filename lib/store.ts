import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface TokenStore {
  remainingWords: number
  fetchRemainingWords: (userId: string) => Promise<void>
  decrementWords: (amount: number) => Promise<void>
}

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      remainingWords: 0, // Initially set to 0, will be fetched from Supabase

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

      decrementWords: async (amount) => {
        set((state) => ({ remainingWords: Math.max(0, state.remainingWords - amount) }))

        const supabase = createClientComponentClient()
        const user = await supabase.auth.getUser()

        if (!user?.data?.user?.id) return

        const currentState = useTokenStore.getState()

        const { error } = await supabase
          .from("user_profiles")
          .update({ tokens: Math.max(0, currentState.remainingWords - amount) })
          .eq("id", user.data.user.id)

        if (error) {
          console.error("Error updating tokens:", error.message)
        }
      },
    }),
    {
      name: "token-storage",
    }
  )
)
