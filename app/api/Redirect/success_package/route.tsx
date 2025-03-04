import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const url = process.env.url;

export async function GET(req: Request) {
    // Get URL query parameters
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en"; 
    const originalAmount = searchParams.get("amount");
    const token_type = searchParams.get("token_type");
    const token_amount = searchParams.get("token_amount");
    const userId = searchParams.get('userId');
    const ref_code = searchParams.get('ref_code');
    const paymentId = createId();
    const sessionId = searchParams.get("session_id"); 
    const token = searchParams.get("token");
    const timestamp = searchParams.get("timestamp");

    // Verify the request is legitimate
    if (!userId || !originalAmount || !timestamp || !token || !sessionId) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // Check if the timestamp is within a reasonable window (e.g., 1 hour)
    const timestampNum = parseInt(timestamp);
    if (Date.now() - timestampNum > 3600000) { // 1 hour in milliseconds
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    // Regenerate the token and verify it matches
    const expectedToken = generateCheckoutToken(userId, timestampNum);
    if (token !== expectedToken) {
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    try {
        // Retrieve the Stripe Checkout Session to get the final amount
        const session = await stripe.checkout.sessions.retrieve(sessionId!, {
            expand: ['line_items']
        });

        // Get the final amount paid (in cents, convert to dollars)
        const finalAmount = (session.amount_total! / 100).toFixed(2);
        const subscriptionId = session.subscription as string;

        // Check if the token exists and is not used
        const { data, error } = await supabase
            .from("OneTimeToken")
            .select("*")
            .eq("token", token)
            .eq("used", false)
            .single();

        if (error || !data) {
            return NextResponse.redirect('https://www.plagiacheck.online');
        }

        // Mark token as used
        await supabase
            .from("OneTimeToken")
            .update({ used: true })
            .eq("token", token);

        // Validate `ref_code` and get `affiliates.id`
        let referrerId = null;

        if (ref_code) {
            const { data: affiliate, error: affiliateError } = await supabase
                .from("Affiliates")
                .select("id")
                .eq("ref_code", ref_code)
                .single();

            if (affiliateError || !affiliate) {
                console.warn("Invalid referral code:", ref_code);
            } else {
                referrerId = affiliate.id;
            }
        }

        // Create Payment Entry with final amount
        const { error: paymentError } = await supabase
            .from('Payment')
            .insert({
                id: paymentId,
                subscriptionId: null,
                userId: userId,
                amount: finalAmount, 
                status: 'succeeded',
                paymentType: 'Packages',
                expiryStatus: false,
                referrer_id: referrerId,
            });

        if (paymentError) {
            throw new Error('Failed to record payment' + JSON.stringify(paymentError));
        }

        // Update Affiliates Table if `ref_code` exists
        if (referrerId) {
            const commission = parseFloat(finalAmount) * 0.20; // 20% of the final amount

            // Fetch current affiliate data
            const { data: affiliateData, error: fetchError } = await supabase
                .from("Affiliates")
                .select("total_sales, total_sales_amount, total_earned")
                .eq("id", referrerId)
                .single();

            if (fetchError || !affiliateData) {
                console.error("Error fetching affiliate data:", fetchError);
                return NextResponse.json({ error: "Failed to retrieve affiliate data." }, { status: 500 });
            }

            // Calculate new values based on final amount
            const newTotalSales = affiliateData.total_sales + 1;
            const newTotalSalesAmount = parseFloat(affiliateData.total_sales_amount) + parseFloat(finalAmount);
            const newTotalEarned = parseFloat(affiliateData.total_earned) + commission;

            // Update the Affiliates table
            const { error: updateError } = await supabase
                .from("Affiliates")
                .update({
                    total_sales: newTotalSales,
                    total_sales_amount: newTotalSalesAmount,
                    total_earned: newTotalEarned
                })
                .eq("id", referrerId);

            if (updateError) {
                console.error("Error updating affiliate earnings:", updateError);
                return NextResponse.json({ error: "Failed to update affiliate earnings." }, { status: 500 });
            }
        }

        // Construct the dynamic redirect URL with final amount
        const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}&userId=${userId}`;

        // Redirect to the localized success page
        return NextResponse.redirect(redirectUrl, {
            status: 302, // Temporary redirect
        });

    } catch (error) {
        console.error('Error processing successful payment:', error);
        return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
    }
}