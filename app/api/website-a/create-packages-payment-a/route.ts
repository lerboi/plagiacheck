import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Define allowed origins (Update this for security)
const allowedOrigins = ["http://localhost:3000", "https://website-a.com"];

export async function OPTIONS() {
    // Handle preflight requests for CORS
    return NextResponse.json(null, {
        headers: {
            "Access-Control-Allow-Origin": "*", // Allows all origins (Change to specific origins for security)
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get("locale") || "en";
        const priceId = searchParams.get("priceId");
        const email = searchParams.get("email");

        if (!priceId || !email) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        console.log("Processing checkout session on Website B...");

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `https://plagiacheck.online/api/Redirect/success_payment?locale=${locale}`,
            cancel_url: `https://plagiacheck.online/api/Redirect/canceled_payment?locale=${locale}`,
        });

        console.log("Stripe session created:", session.url);

        const response = NextResponse.json({ redirectUrl: session.url }, { status: 200 });

        // ✅ Add CORS headers to allow requests from Website A
        response.headers.set("Access-Control-Allow-Origin", "*"); // Change * to specific origin for security
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type");

        return response;
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
    }
}
