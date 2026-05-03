import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const IMAGE_TOKEN_COST = {
  imageToText: 1,
  chart: 2,
  infographic: 2,
  thumbnail: 2,
} as const

export function calculateTextTokenCost(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 6)
}

/**
 * Atomically deduct text tokens from a user. Returns the new balance,
 * or null if the user has insufficient tokens (or the row is missing).
 */
export async function deductTextTokens(
  userId: string,
  amount: number
): Promise<number | null> {
  if (amount <= 0) return null
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.rpc("decrement_user_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("deductTextTokens RPC error:", error.message)
    return null
  }
  return typeof data === "number" ? data : null
}

/**
 * Refund text tokens to a user (e.g. when the AI call fails after deduction).
 * Best-effort: errors are logged but not surfaced.
 */
export async function refundTextTokens(
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.rpc("refund_user_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("refundTextTokens RPC error:", error.message)
  }
}

export async function deductImageTokens(
  userId: string,
  amount: number
): Promise<number | null> {
  if (amount <= 0) return null
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.rpc("decrement_image_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("deductImageTokens RPC error:", error.message)
    return null
  }
  return typeof data === "number" ? data : null
}

export async function refundImageTokens(
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.rpc("refund_image_tokens", {
    p_user_id: userId,
    p_amount: amount,
  })
  if (error) {
    console.error("refundImageTokens RPC error:", error.message)
  }
}
