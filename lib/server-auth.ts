import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null

  const token = auth.slice(7).trim()
  if (!token) return null

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null

  return data.user
}
