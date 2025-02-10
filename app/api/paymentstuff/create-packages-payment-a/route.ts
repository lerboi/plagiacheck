import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
    console.log("Incoming Request Headers:", req.headers);

    const referer = req.headers.get("referer");
    console.log("Referer Header:", referer);
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get("locale") || "en";
        const priceId = searchParams.get("priceId");
        const email = searchParams.get("email");
        const tokenAmount = searchParams.get("tokenAmount")
        const tokenPrice = searchParams.get("tokenPrice")
        const tokenType = searchParams.get('tokenType')
        const userId = searchParams.get('userId')

        if (!priceId || !email) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        console.log("Processing checkout session...");

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `https://plagiacheck.online/api/Redirect/success_package?locale=${locale}&amount=${tokenPrice}&token_type=${tokenType}&token_amount=${tokenAmount}&userId=${userId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://plagiacheck.online/api/Redirect/canceled_package?locale=${locale}`,
            subscription_data: {
                metadata: {
                    userId: userId,
                    tokenAmount: tokenAmount,
                    tokenType: tokenType
                }
            }
        });

        console.log("✅ Stripe session created:", session.url);

        return NextResponse.redirect(session.url!, { status: 303, 
            headers: {'Referrer-Policy': 'no-referrer'}
        }, );
    } catch (error) {
        console.error("❌ Error creating checkout session:", error);
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
    }
}