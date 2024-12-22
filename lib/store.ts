import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TokenStore {
  remainingWords: number
  setRemainingWords: (words: number) => void
  decrementWords: (amount: number) => void
}

export const useTokenStore = create<TokenStore>()(
  persist(
    (set) => ({
      remainingWords: 1000, // Start with 1000 words
      setRemainingWords: (words) => set({ remainingWords: words }),
      decrementWords: (amount) => 
        set((state) => ({ 
          remainingWords: Math.max(0, state.remainingWords - amount) 
        })),
    }),
    {
      name: 'token-storage',
    }
  )
)

