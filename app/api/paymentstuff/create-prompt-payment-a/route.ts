import { NextResponse } from "next/server";
import Stripe from "stripe";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Handle preflight requests for CORS
export async function OPTIONS() {
    return NextResponse.json(null, {
        headers: {
            "Access-Control-Allow-Origin": "*", // Allows all origins (Change for security)
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

export async function GET(req: Request) {
    console.log("Incoming Request Headers:", req.headers);

    const referer = req.headers.get("referer");
    console.log("Referer Header:", referer);

    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get("locale") || "en";
        const price = searchParams.get("price");
        const email = searchParams.get("email");
        const tokenAmount = searchParams.get("tokenAmount")
        const tokenType = searchParams.get('tokenType')
        const userId = searchParams.get('userId')

        if (!price || !userId || !email) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (!referer?.startsWith(allowedOrigin!)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        console.log("Processing one-time checkout session...");

        const timestamp = Date.now();
        const verificationToken = generateCheckoutToken(userId, timestamp);

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "One-Time Purchase",
                    },
                    unit_amount: parseInt(price) * 100, // Convert price to cents
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: `https://plagiacheck.online/api/Redirect/success_prompt?locale=${locale}&amount=${price}&token_type=${tokenType}&token_amount=${tokenAmount}&userId=${userId}&token=${verificationToken}&timestamp=${timestamp}`,
            cancel_url: `https://plagiacheck.online/api/Redirect/canceled_prompt?locale=${locale}`,
        });

        console.log("✅ Redirecting user to Stripe Checkout:", session.url);

        return NextResponse.redirect(session.url!, { status: 303, 
            headers: {'Referrer-Policy': 'no-referrer'}
        }, );

    } catch (error) {
        console.error("❌ Error creating checkout session:", error);
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
    }
}
