import { NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const { stripeSubscriptionId } = await req.json()

    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: "Stripe subscription ID is required" }, { status: 400 })
    }

    // Cancel the subscription at period end to avoid prorated charges
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // If you want to cancel immediately instead, use this:
    // const subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

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

