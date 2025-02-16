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
    const amount = searchParams.get("amount");
    const token_type = searchParams.get("token_type");
    const token_amount = searchParams.get("token_amount");
    const userId = searchParams.get('userId');
    const ref_code = searchParams.get('ref_code'); // ✅ Step 1: Capture ref_code
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
    if (Date.now() - timestampNum > 3600000) { // 1 hour in milliseconds
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    // Regenerate the token and verify it matches
    const expectedToken = generateCheckoutToken(userId, timestampNum);
    if (token !== expectedToken) {
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

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

    // **Step 2: Validate `ref_code` and get `affiliates.id`**
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

    // **Step 3: Create Payment Entry**
    const { error: paymentError } = await supabase
        .from('Payment')
        .insert({
            id: paymentId,
            subscriptionId: null,
            userId: userId,
            amount: amount,
            status: 'succeeded',
            paymentType: 'Packages',
            expiryStatus: false,
            referrer_id: referrerId // ✅ Step 3: Store referrer in Payment table
        });

    if (paymentError) {
        throw new Error('Failed to record payment' + JSON.stringify(paymentError));
    }

    // **Step 4: Update Affiliates Table if `ref_code` exists**
    if (referrerId) {
        const commission = parseFloat(amount) * 0.20; // 20% of the purchase amount
    
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
    
        // Calculate new values
        const newTotalSales = affiliateData.total_sales + 1;
        const newTotalSalesAmount = parseFloat(affiliateData.total_sales_amount) + parseFloat(amount);
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
    

    // Construct the dynamic redirect URL
    const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${amount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}&userId=${userId}`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302, // Temporary redirect
    });
}
