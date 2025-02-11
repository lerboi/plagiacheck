import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const url = process.env.url

export async function GET(req: Request) {
    // Get URL query parameters
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en"; 
    const amount = searchParams.get("amount")
    const token_type = searchParams.get("token_type")
    const token_amount = searchParams.get("token_amount")
    const userId = searchParams.get('userId')
    const paymentId = createId();

    //Create Payment table entry first
    const { error: paymentError } = await supabase
        .from('Payment')
        .insert({
            id: paymentId,
            subscriptionId: null,
            userId: userId,
            amount: amount,
            status: 'succeeded',
            paymentType: 'token',
            expiryStatus: false
        });

    if (paymentError) {
        throw new Error('Failed to record payment: ' + JSON.stringify(paymentError));
    }

    // Construct the dynamic redirect URL
    const redirectUrl = `${url}/${locale}/Redirects/success-tokens?amount=${amount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&userId=${userId}`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302, // Temporary redirect
    });
}
