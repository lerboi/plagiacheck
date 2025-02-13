import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { wordCount, price } = await request.json()

  try {
    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Custom Plan - ${wordCount} words`,
              description: `Custom word count package for ${wordCount} words`,
            },
            unit_amount: Math.round(price * 100), // Stripe expects the amount in cents, ensure it's rounded
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://www.plagiacheck.online/success`,
      cancel_url: `https://www.plagiacheck.online/pricing`,
    })

    return NextResponse.json({
      url: session.url, // Return the URL instead of just the session ID
      sessionId: session.id,
    })
  } catch (err: any) {
    console.error("Stripe session creation error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}