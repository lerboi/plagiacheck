import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function POST(req: Request) {
  try {
    const { stripeSubscriptionId, packageId } = await req.json()

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: "Stripe subscription ID is required" }, { status: 400 })
    }

    // Cancel the subscription immediately
    const subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    // If a packageId was provided, update the Package table in Supabase
    if (packageId) {
      const { error: updateError } = await supabase
        .from("Package")
        .update({ status: "CANCELED" })
        .eq("id", packageId);

      if (updateError) {
        console.error("Error updating package status:", updateError)
        return NextResponse.json({ error: "Failed to update package status" }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "Subscription cancelled successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    })
  } catch (error) {
    console.error("Error cancelling subscription:", error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
