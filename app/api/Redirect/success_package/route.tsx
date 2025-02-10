import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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
    const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${amount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302, // Temporary redirect
    });
}
