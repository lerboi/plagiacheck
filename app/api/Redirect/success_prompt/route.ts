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
  const userId = searchParams.get("userId");
  const paymentId = createId();
  const token = searchParams.get("token");
  const timestamp = searchParams.get("timestamp");
  const sessionId = searchParams.get("session_id");

  // Verify the request is legitimate
  if (!userId || !originalAmount || !timestamp || !token || !sessionId) {
    return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
  }

  // Check if the timestamp is within a reasonable window (e.g., 1 hour)
  const timestampNum = parseInt(timestamp);
  if (Date.now() - timestampNum > 360000) { // 1 hour in milliseconds
    return NextResponse.redirect("https://www.plagiacheck.online");
  }

  // Regenerate the token and verify it matches
  const expectedToken = generateCheckoutToken(userId, timestampNum);
  if (token !== expectedToken) {
    return NextResponse.redirect("https://www.plagiacheck.online");
  }

  try {
    // Retrieve the Stripe Checkout Session to get the final amount
    const session = await stripe.checkout.sessions.retrieve(sessionId!, {
      expand: ['line_items']
    });

    // Get the final amount paid (in cents, convert to dollars)
    const finalAmount = (session.amount_total! / 100).toFixed(2);

    // Check if the token exists and is not used
    const { data, error } = await supabase
      .from("OneTimeToken")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (error || !data) {
      return NextResponse.redirect("https://www.plagiacheck.online");
    }

    // Mark token as used
    await supabase
      .from("OneTimeToken")
      .update({ used: true })
      .eq("token", token);

    // Create Payment table entry first with final amount
    const { error: paymentError } = await supabase.from("Payment").insert({
      id: paymentId,
      subscriptionId: null,
      userId: userId,
      amount: finalAmount,
      status: "succeeded",
      paymentType: "token",
      expiryStatus: false,
    });

    if (paymentError) {
      throw new Error("Failed to record payment: " + JSON.stringify(paymentError));
    }

    // Check if a ref_code exists in the URL parameters
    const refCode = searchParams.get("ref_code");
    if (refCode) {
      // Check if ref_code exists in the Affiliates table
      const { data: affiliateData, error: affiliateError } = await supabase
        .from("Affiliates")
        .select("id, total_sales, total_sales_amount, total_earned")
        .eq("ref_code", refCode)
        .single();

      if (affiliateError || !affiliateData) {
        console.warn("Invalid or non-existent ref_code:", refCode);
      } else {
        const affiliateId = affiliateData.id;

        // Update the Payment entry to include the referrer_id
        const { error: paymentUpdateError } = await supabase
          .from("Payment")
          .update({ referrer_id: affiliateId })
          .eq("id", paymentId);
        if (paymentUpdateError) {
          console.error("Failed to update Payment with referrer_id:", paymentUpdateError);
        }

        // Calculate commission as 20% of the final payment amount
        const paymentAmount = parseFloat(finalAmount);
        const commission = paymentAmount * 0.20;

        // Calculate new totals for the affiliate
        const newTotalSales = (affiliateData.total_sales || 0) + 1;
        const newTotalSalesAmount = (parseFloat(affiliateData.total_sales_amount) || 0) + paymentAmount;
        const newTotalEarned = (parseFloat(affiliateData.total_earned) || 0) + commission;

        // Update the Affiliates table with the new totals
        const { error: affiliateUpdateError } = await supabase
          .from("Affiliates")
          .update({
            total_sales: newTotalSales,
            total_sales_amount: newTotalSalesAmount,
            total_earned: newTotalEarned,
          })
          .eq("id", affiliateId);
        if (affiliateUpdateError) {
          console.error("Failed to update affiliate record:", affiliateUpdateError);
        }
      }
    }

    const redirectUrl = `${url}/${locale}/Redirects/success-tokens?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&userId=${userId}`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
      status: 302, // Temporary redirect
    });

  } catch (error) {
    console.error('Error processing successful payment:', error);
    return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
  }
}