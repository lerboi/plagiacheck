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
  const token = searchParams.get("token");
  const timestamp = searchParams.get("timestamp");
  const sessionId = searchParams.get("session_id");
  const voucher = searchParams.get("voucher");

  // Verify the request is legitimate
  if (!userId || !originalAmount || !timestamp || !sessionId) {
    return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
  }

  // Check if the timestamp is within a reasonable window (e.g., 1 hour)
  const timestampNum = parseInt(timestamp);
  if (Date.now() - timestampNum > 1200000) { // 20 minutes in milliseconds
    return NextResponse.redirect("https://www.plagiacheck.online");
  }

  try {
    // Retrieve the Stripe Checkout Session to get the final amount
    const session = await stripe.checkout.sessions.retrieve(sessionId!, {
      expand: ['line_items']
    });

    // Get the final amount paid (in cents, convert to dollars)
    const finalAmount = (session.amount_total! / 100).toFixed(2);
    const paymentId = session.payment_intent as string;

    if (!paymentId) {
      console.error('No payment intent found in session');
      return NextResponse.redirect("https://www.plagiacheck.online", { status: 302 });
    }

    // ========== IDEMPOTENCY CHECK ==========
    // Check if Payment already exists
    const { data: existingPayment, error: checkError } = await supabase
      .from('Payment')
      .select('id, expiryStatus')
      .eq('id', paymentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing payment:', checkError);
      throw new Error('Database error while checking payment');
    }

    if (existingPayment) {
      console.log(`Payment ${paymentId} already processed. Redirecting to success page.`);
      const redirectUrl = `${url}/${locale}/Redirects/success-tokens?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&userId=${userId}`;
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    // ========== CREATE PAYMENT RECORD ==========
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
      console.error('Failed to create payment:', paymentError);
      throw new Error("Failed to record payment: " + JSON.stringify(paymentError));
    }

    // ========== ADD TOKENS ==========
    const tokenAmountInt = parseInt(token_amount!);
    
    // Check if user already has tokens
    const { data: existingToken, error: existingTokenError } = await supabase
      .from('PurchasedToken')
      .select('textTokens, imageTokens')
      .eq('userId', userId)
      .single();

    if (existingTokenError && existingTokenError.code !== 'PGRST116') {
      console.error('Error checking existing tokens:', existingTokenError);
      throw new Error('Failed to check existing tokens');
    }

    if (existingToken) {
      // Update existing tokens
      const updates = token_type === 'text' 
        ? { textTokens: existingToken.textTokens + tokenAmountInt }
        : { imageTokens: existingToken.imageTokens + tokenAmountInt };
      
      const { error: updateError } = await supabase
        .from('PurchasedToken')
        .update(updates)
        .eq('userId', userId);

      if (updateError) {
        console.error('Error updating tokens:', updateError);
        throw new Error('Failed to update tokens');
      }

      console.log(`Updated ${token_type} tokens for user ${userId}: +${tokenAmountInt}`);
    } else {
      // Create new token record
      const { error: insertError } = await supabase
        .from('PurchasedToken')
        .insert({
          userId: userId,
          textTokens: token_type === 'text' ? tokenAmountInt : 0,
          imageTokens: token_type === 'image' ? tokenAmountInt : 0,
        });

      if (insertError) {
        console.error('Error inserting tokens:', insertError);
        throw new Error('Failed to create token record');
      }

      console.log(`Created new token record for user ${userId}: ${tokenAmountInt} ${token_type}`);
    }

    // ========== UPDATE AFFILIATE DATA ==========
    const refCode = searchParams.get("ref_code");
    if (refCode) {
        const { data: affiliateData, error: affiliateError } = await supabase
        .from("Affiliates")
        .select("id, total_sales, total_sales_amount, total_earned, commission")
        .eq("ref_code", refCode)
        .single();

      if (affiliateError || !affiliateData) {
        console.warn("Invalid or non-existent ref_code:", refCode);
      } else {
        const affiliateId = affiliateData.id;
        const commissionRate = (affiliateData.commission || 20) / 100;

        // Update the Payment entry to include the referrer_id
        const { error: paymentUpdateError } = await supabase
            .from("Payment")
            .update({ referrer_id: affiliateId })
            .eq("id", paymentId);
        
        if (paymentUpdateError) {
            console.error("Failed to update Payment with referrer_id:", paymentUpdateError);
        }

        const paymentAmount = parseFloat(finalAmount);
        const commission = paymentAmount * commissionRate;

        const newTotalSales = (affiliateData.total_sales || 0) + 1;
        const newTotalSalesAmount = (parseFloat(affiliateData.total_sales_amount) || 0) + paymentAmount;
        const newTotalEarned = (parseFloat(affiliateData.total_earned) || 0) + commission;

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
        } else {
          console.log(`Updated affiliate ${affiliateId}: +$${commission.toFixed(2)}`);
        }
      }
    }

    // ========== HANDLE VOUCHER ==========
    if (voucher) {
      try {
          console.log("Processing voucher usage:", voucher);
          
          const { data: voucherData, error: voucherError } = await supabase
              .from('Vouchers')
              .select('auto, created_for_user_id')
              .eq('code', voucher)
              .eq('is_active', true)
              .maybeSingle();
          
          if (!voucherError && voucherData?.auto) {
              const { error: updateError } = await supabase
                  .from('Vouchers')
                  .update({ is_active: false })
                  .eq('code', voucher);
              
              if (updateError) {
                  console.error("Error disabling auto voucher:", updateError);
              } else {
                  console.log("Auto-generated voucher disabled:", voucher);
              }

              if (voucherData.created_for_user_id) {
                  const { error: userUpdateError } = await supabase
                      .from('User')
                      .update({ firstTimeOfferUsed: true })
                      .eq('id', voucherData.created_for_user_id);
                  
                  if (userUpdateError) {
                      console.error("Error marking first-time offer as used:", userUpdateError);
                  } else {
                      console.log("First-time offer marked as used for user:", voucherData.created_for_user_id);
                  }
              }
          }
        } catch (voucherProcessingError) {
            console.error("Error processing voucher usage:", voucherProcessingError);
        }
    }

    // ========== MARK PAYMENT AS PROCESSED ==========
    const { error: markProcessedError } = await supabase
      .from('Payment')
      .update({ expiryStatus: true })
      .eq('id', paymentId);

    if (markProcessedError) {
      console.error('Error marking payment as processed:', markProcessedError);
      // Don't throw - tokens were added successfully
    }

    // Discord webhook
    fetch('http://localhost:3000/api/discord/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-discord-api-key': process.env.DISCORD_API_KEY!
      },
      body: JSON.stringify({
        user_id: userId,
        event: 'payment.success'
      })
    }).catch(error => {
      console.log('Discord webhook notification failed:', error);
    });

    console.log(`✅ Successfully processed token purchase for user ${userId}: ${tokenAmountInt} ${token_type} tokens`);

    const redirectUrl = `${url}/${locale}/Redirects/success-tokens?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&userId=${userId}`;

    return NextResponse.redirect(redirectUrl, {
      status: 302,
    });

  } catch (error) {
    console.error('Error processing successful payment:', error);
    return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
  }
}