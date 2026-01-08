import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const url = process.env.url;

// Helper function to wait for Payment record to be created by webhook
async function waitForPayment(paymentId: string, maxRetries = 10, delayMs = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await supabase
      .from('Payment')
      .select('id')
      .eq('id', paymentId)
      .single();
    
    if (data && !error) {
      console.log(`Payment ${paymentId} found after ${i + 1} attempts`);
      return true;
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.warn(`Payment ${paymentId} not found after ${maxRetries} attempts`);
  return false;
}

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
  const refCode = searchParams.get("ref_code");

  // Verify the request is legitimate
  if (!userId || !originalAmount || !timestamp || !sessionId) {
    return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
  }

  // Check if the timestamp is within a reasonable window (20 minutes)
  const timestampNum = parseInt(timestamp);
  if (Date.now() - timestampNum > 1200000) {
    return NextResponse.redirect("https://www.plagiacheck.online");
  }

  try {
    // Get payment_intent from session for affiliate update
    let paymentId: string | null = null;
    
    if (refCode) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId!);
        
        // Handle payment_intent as either string or object
        if (typeof session.payment_intent === 'string') {
          paymentId = session.payment_intent;
        } else if (session.payment_intent && typeof session.payment_intent === 'object') {
          paymentId = session.payment_intent.id;
        }
        
        if (paymentId) {
          // Wait for webhook to create Payment record
          await waitForPayment(paymentId);
        }
      } catch (error) {
        console.error('Error retrieving session for affiliate update:', error);
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

    // ========== UPDATE AFFILIATE DATA ==========
    if (refCode && paymentId) {
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
        const paymentAmount = parseFloat(originalAmount);
        const commission = paymentAmount * commissionRate;

        // Update Payment record with referrer_id
        const { error: paymentUpdateError } = await supabase
          .from("Payment")
          .update({ referrer_id: affiliateId })
          .eq("id", paymentId);
        
        if (paymentUpdateError) {
          console.error("Failed to update Payment with referrer_id:", paymentUpdateError);
        } else {
          console.log(`Updated Payment ${paymentId} with referrer_id: ${affiliateId}`);
        }

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

    // Discord webhook
    fetch('https://anione.me/api/discord/webhook', {
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

    console.log(`✅ Processed affiliate and voucher for token purchase. Redirecting user.`);

    const redirectUrl = `${url}/${locale}/Redirects/success-tokens?amount=${originalAmount}&token_type=${token_type}&token_amount=${token_amount}&userId=${userId}`;

    return NextResponse.redirect(redirectUrl, {
      status: 302,
    });

  } catch (error) {
    console.error('Error in success_prompt route:', error);
    return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
  }
}