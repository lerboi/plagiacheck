import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const { priceId, planName } = await req.json()

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/api/handle-subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      metadata: {
        planName: planName,
      },
    })

    console.log("Redirecting to:", session.url)

    // The key difference is returning a real redirect response
    // Don't include any other data or headers in this response
    return NextResponse.redirect(session.url!, 303)
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}