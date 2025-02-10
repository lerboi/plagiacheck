// Website B API Route
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: Request) {
    try {
        // Parse URL parameters
        const url = new URL(req.url)
        const priceId = url.searchParams.get('priceId')
        const email = url.searchParams.get('email')
        const locale = url.searchParams.get('locale')

        // Validate parameters
        if (!priceId || !email || !locale) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            )
        }

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

        // Perform the redirect
        return NextResponse.redirect(session.url!, 303)

    } catch (error) {
        console.error("Error creating checkout session:", error)
        return NextResponse.json(
            { error: "Error creating checkout session" },
            { status: 500 }
        )
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}