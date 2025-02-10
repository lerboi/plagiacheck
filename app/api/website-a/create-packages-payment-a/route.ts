import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

        console.log("Redirecting to Stripe:", session.url);

        // Website B now redirects the user to Stripe Checkout
        return NextResponse.redirect(session.url!, {
            status: 303, // Ensures a proper GET redirect
        });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
    }
}
