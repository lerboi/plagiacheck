import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CORS headers
  const response = NextResponse.next()
  response.headers.set("Access-Control-Allow-Origin", "*")  // Allow all origins, change this to specific origins if needed
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")  // Allowed methods
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")  // Allowed headers

  // Handling OPTIONS request for preflight request (CORS)
  if (req.method === "OPTIONS") {
    return response
  }

  const { priceId, email } = await req.json()

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `https://anione.me/en/Redirects/success-packages`,
      cancel_url: `https://anione.me/en/Pricing`,
    })
    console.log(session.id)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}
