import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const priceId = url.searchParams.get('priceId')
    const planName = url.searchParams.get('planName')
    
    if (!priceId || !planName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `https://www.plagiacheck.online/api/handle-subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.plagiacheck.online/pricing`,
      metadata: {
        planName: planName,
      },
    })

    console.log("Redirecting to:", session.url)
    
    // Clean redirect response
    return NextResponse.redirect(session.url!, 303)
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}