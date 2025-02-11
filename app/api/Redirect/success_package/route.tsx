import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const url = process.env.url

export async function GET(req: Request) {
    // Get URL query parameters
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en"; // Default to "en" if locale is missing
    const amount = searchParams.get("amount")
    const token_type = searchParams.get("token_type")
    const token_amount = searchParams.get("token_amount")
    const userId = searchParams.get('userId')
    const paymentId = createId();
    const sessionId = searchParams.get("session_id"); 
    const session = await stripe.checkout.sessions.retrieve(sessionId!);
    const subscriptionId = session.subscription as string;
    const token = searchParams.get("token");
    const timestamp = searchParams.get("timestamp");

    // Verify the request is legitimate
    if (!userId || !amount || !timestamp || !token) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // Check if the timestamp is within a reasonable window (e.g., 1 hour)
    const timestampNum = parseInt(timestamp);
    if (Date.now() - timestampNum > 360000) { // 1 hour in milliseconds
        return NextResponse.json({ error: "Link expired" }, { status: 400 });
    }

    // Regenerate the token and verify it matches
    const expectedToken = generateCheckoutToken(userId, timestampNum);
    if (token !== expectedToken) {
        return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
    }

    //Create Payment entry first
    const { error: paymentError } = await supabase
        .from('Payment')
        .insert({
            id: paymentId,
            subscriptionId: null,
            userId: userId,
            amount: amount,
            status: 'succeeded',
            paymentType: 'Packages',
            expiryStatus: false
        });

    if (paymentError) {
        throw new Error('Failed to record payment' + JSON.stringify(paymentError));
    }

    // Construct the dynamic redirect URL
    const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${amount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}&userId=${userId}`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302, // Temporary redirect
    });
}
