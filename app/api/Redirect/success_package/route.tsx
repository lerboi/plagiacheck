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
    const userId = searchParams.get('userId');
    const ref_code = searchParams.get('ref_code');
    const sessionId = searchParams.get("session_id"); 
    const token = searchParams.get("token");
    const timestamp = searchParams.get("timestamp");
    const voucher = searchParams.get("voucher");

    // Verify the request is legitimate
    if (!userId || !originalAmount || !timestamp || !sessionId) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // Check if the timestamp is within a reasonable window (20 minutes)
    const timestampNum = parseInt(timestamp);
    if (Date.now() - timestampNum > 1200000) {
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    try {
        // Get payment_intent from session for affiliate update
        let paymentId: string | null = null;
        
        if (ref_code) {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId!, {
                    expand: ['subscription']
                });
                
                // Handle subscription as either string or object
                let subscriptionId: string | null = null;
                if (typeof session.subscription === 'string') {
                    subscriptionId = session.subscription;
                } else if (session.subscription && typeof session.subscription === 'object') {
                    subscriptionId = session.subscription.id;
                }
                
                if (subscriptionId) {
                    const invoices = await stripe.invoices.list({
                        subscription: subscriptionId,
                        limit: 1,
                        status: 'paid'
                    });

                    const initialInvoice = invoices.data[0];
                    if (initialInvoice) {
                        // Handle payment_intent as either string or object
                        if (typeof initialInvoice.payment_intent === 'string') {
                            paymentId = initialInvoice.payment_intent;
                        } else if (initialInvoice.payment_intent && typeof initialInvoice.payment_intent === 'object') {
                            paymentId = initialInvoice.payment_intent.id;
                        }
                        
                        if (paymentId) {
                            // Wait for webhook to create Payment record
                            await waitForPayment(paymentId);
                        }
                    }
                }
            } catch (error) {
                console.error('Error retrieving session/invoice for affiliate update:', error);
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

        // ========== UPDATE AFFILIATES ==========
        if (ref_code && paymentId) {
            const { data: affiliateData, error: fetchError } = await supabase
                .from("Affiliates")
                .select("id, total_sales, total_sales_amount, total_earned, commission")
                .eq("ref_code", ref_code)
                .single();

            if (fetchError || !affiliateData) {
                console.error("Error fetching affiliate data:", fetchError);
            } else {
                const commissionRate = (affiliateData.commission || 0) / 100;
                const commission = parseFloat(originalAmount) * commissionRate;

                // Update Payment record with referrer_id
                const { error: paymentUpdateError } = await supabase
                    .from("Payment")
                    .update({ referrer_id: affiliateData.id })
                    .eq("id", paymentId);
                
                if (paymentUpdateError) {
                    console.error("Failed to update Payment with referrer_id:", paymentUpdateError);
                } else {
                    console.log(`Updated Payment ${paymentId} with referrer_id: ${affiliateData.id}`);
                }

                const newTotalSales = affiliateData.total_sales + 1;
                const newTotalSalesAmount = parseFloat(affiliateData.total_sales_amount) + parseFloat(originalAmount);
                const newTotalEarned = parseFloat(affiliateData.total_earned) + commission;

                const { error: updateError } = await supabase
                    .from("Affiliates")
                    .update({
                        total_sales: newTotalSales,
                        total_sales_amount: newTotalSalesAmount,
                        total_earned: newTotalEarned
                    })
                    .eq("id", affiliateData.id);

                if (updateError) {
                    console.error("Error updating affiliate earnings:", updateError);
                } else {
                    console.log(`Updated affiliate ${affiliateData.id}: +$${commission.toFixed(2)}`);
                }
            }
        }

        // Discord Webhook
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

        console.log(`✅ Processed affiliate and voucher for package purchase. Redirecting user.`);

        // Construct the dynamic redirect URL
        const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${originalAmount}&token_type=${token_type}&token_amount=${token_amount}&userId=${userId}`;

        // Redirect to the localized success page
        return NextResponse.redirect(redirectUrl, {
            status: 302,
        });

    } catch (error) {
        console.error('Error in success_package route:', error);
        return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
    }
}