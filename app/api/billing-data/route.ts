import { createClient } from "@supabase/supabase-js"
import { getUserFromRequest } from "@/lib/server-auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        // Forward the user's bearer token so RLS policies resolve to their user_id
        Authorization: req.headers.get("authorization") ?? "",
      },
    },
  })

  const [
    { data: payments, error: paymentError },
    { data: activePackage, error: packageError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("Payment")
      .select("id, amount, status, createdAt, paymentType")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(10),
    supabase
      .from("Package")
      .select("id, packageName, status, expiryDate, startDate")
      .eq("userId", user.id)
      .eq("status", "ACTIVE")
      .order("startDate", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle(),
  ])

  const errors: string[] = []
  if (paymentError) {
    console.error("billing-data payment error:", paymentError.message, paymentError.code)
    errors.push("payment history")
  }
  if (packageError && packageError.code !== "PGRST116") {
    console.error("billing-data package error:", packageError.message, packageError.code)
    errors.push("subscription")
  }
  if (profileError && profileError.code !== "PGRST116") {
    console.error("billing-data profile error:", profileError.message, profileError.code)
  }

  return Response.json({
    payments: payments ?? [],
    activePackage: activePackage ?? null,
    tokens: profile?.tokens ?? null,
    errors,
  })
}
