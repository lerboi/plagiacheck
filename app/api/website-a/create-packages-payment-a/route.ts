import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Change to GET method to handle the redirect from Website A
export async function GET(req: Request) {
    const url = new URL(req.url);
    const priceId = url.searchParams.get('priceId');
    const email = url.searchParams.get('email');
    const locale = url.searchParams.get('locale');

    if (!priceId || !email || !locale) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

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

        // Perform the redirect from Website B
        return NextResponse.redirect(session.url!, 303);
    } catch (error) {
        console.error("Error creating checkout session:", error)
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
    }
}