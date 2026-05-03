import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { getUserFromRequest } from "@/lib/server-auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const RETURN_URL = "https://www.plagiacheck.online/billing"

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("billing-portal profile fetch error:", profileError)
    return NextResponse.json(
      { error: "Could not load your account." },
      { status: 500 }
    )
  }

  let customerId = profile?.stripe_customer_id as string | null | undefined

  // If we don't have a stored customer id but we do have a paid subscription
  // record, fall back to looking it up by email.
  if (!customerId && user.email) {
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      }
    } catch (err) {
      console.error("billing-portal stripe customer lookup error:", err)
    }
  }

  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer found for your account. Make a purchase first or contact support.",
      },
      { status: 404 }
    )
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: RETURN_URL,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("billing-portal session creation error:", err)
    return NextResponse.json(
      { error: err?.message || "Could not open the billing portal." },
      { status: 500 }
    )
  }
}
