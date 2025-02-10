// Website B - API Route
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
    // First, handle the CORS preflight
    if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    const { priceId, email, locale } = await req.json()

    try {
        console.log("Endpoint received..")
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `https://plagiacheck.online/api/Redirect/success_payment?locale=${locale}`,
            cancel_url: `https://plagiacheck.online/api/Redirect/canceled_payment?locale=${locale}`,
        })

        // Create redirect response with CORS headers
        const response = NextResponse.redirect(session.url!, 303)
        
        // Add CORS headers to the redirect response
        response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.set('Vary', 'Origin')

        return response
    } catch (error) {
        console.error("Error creating checkout session:", error)
        
        // Return error response with CORS headers
        return new NextResponse(
            JSON.stringify({ error: "Error creating checkout session" }), 
            { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:3000',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            }
        )
    }
}