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
    const sessionId = searchParams.get("session_id"); 
    const token = searchParams.get("token");
    const timestamp = searchParams.get("timestamp");
    const voucher = searchParams.get("voucher");

    // Verify the request is legitimate
    if (!userId || !originalAmount || !timestamp || !sessionId) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // Check if the timestamp is within a reasonable window (e.g., 1 hour)
    const timestampNum = parseInt(timestamp);
    if (Date.now() - timestampNum > 1200000) { // 20 minutes in milliseconds
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    try {
        // Retrieve the Stripe Checkout Session to get the final amount
        const session = await stripe.checkout.sessions.retrieve(sessionId!, {
            expand: ['line_items']
        });

        const finalAmount = (session.amount_total! / 100).toFixed(2);
        const subscriptionId = session.subscription as string;

        let paymentId: string | null = null;
        let invoiceId: string | null = null;

        const invoices = await stripe.invoices.list({
            subscription: subscriptionId,
            limit: 1,
            status: 'paid'
        });

        const initialInvoice = invoices.data[0];

        // **CRITICAL CHECK 2: Extract Payment Intent or use Invoice ID as fallback**
        if (initialInvoice) {
            invoiceId = initialInvoice.id;
            if (initialInvoice.payment_intent) {
                paymentId = initialInvoice.payment_intent as string;

            } else if (initialInvoice.amount_due === 0 && initialInvoice.status === 'paid') {
                // Fallback: Use Invoice ID as Payment ID for $0.00 invoices
                paymentId = initialInvoice.id;
                console.log(`Initial invoice was $0.00. Using Invoice ID ${paymentId} as Payment record ID.`);
            }
        }

        if (!paymentId) {
            console.error('No payment intent found in session');
            return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
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
            const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}&userId=${userId}`;
            return NextResponse.redirect(redirectUrl, { status: 302 });
        }

        // Validate `ref_code` and get `affiliates.id` and commission
        let referrerId = null;
        let commissionRate = 0;

        if (ref_code) {
            const { data: affiliate, error: affiliateError } = await supabase
                .from("Affiliates")
                .select("id, commission")
                .eq("ref_code", ref_code)
                .single();

            if (affiliateError || !affiliate) {
                console.warn("Invalid referral code:", ref_code);
            } else {
                referrerId = affiliate.id;
                commissionRate = (affiliate.commission || 0) / 100;
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

        // ========== CREATE PAYMENT RECORD ==========
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
            console.error('Failed to create payment:', paymentError);
            throw new Error('Failed to record payment' + JSON.stringify(paymentError));
        }

        // ========== CREATE PACKAGE RECORD ==========
        // Calculate expiry date (1 month from now)
        const now = new Date();
        let expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        
        // Handle invalid dates (e.g., Jan 31 -> Feb 31 should become Feb 28/29)
        if (expiryDate.getMonth() !== (now.getMonth() + 1) % 12) {
            expiryDate = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 0);
        }

        const { error: packageError } = await supabase
            .from('Package')
            .insert({
                userId: userId,
                packageName: token_type,
                expiryDate: expiryDate.toISOString(),
                status: 'ACTIVE',
                startDate: now.toISOString(),
                stripeSubscriptionId: subscriptionId,
                paymentFailureCount: 0
            });

        if (packageError) {
            console.error('Error creating package:', packageError);
            throw new Error('Failed to create package');
        }

        console.log(`Created package for user ${userId}: ${token_type}, expires ${expiryDate.toISOString()}`);

        // ========== ADD INITIAL TOKENS ==========
        const tokensToAdd = token_type === '200Image' ? 200 : 1000;

        const { data: existingToken, error: existingTokenError } = await supabase
            .from('PurchasedToken')
            .select('imageTokens')
            .eq('userId', userId)
            .single();

        if (existingTokenError && existingTokenError.code !== 'PGRST116') {
            console.error('Error checking existing tokens:', existingTokenError);
            throw new Error('Failed to check existing tokens');
        }

        if (existingToken) {
            // Update existing tokens
            const { error: updateError } = await supabase
                .from('PurchasedToken')
                .update({ imageTokens: existingToken.imageTokens + tokensToAdd })
                .eq('userId', userId);

            if (updateError) {
                console.error('Error updating tokens:', updateError);
                throw new Error('Failed to update tokens');
            }

            console.log(`Updated image tokens for user ${userId}: +${tokensToAdd}`);
        } else {
            // Create new token record
            const { error: insertError } = await supabase
                .from('PurchasedToken')
                .insert({
                    userId: userId,
                    textTokens: 0,
                    imageTokens: tokensToAdd,
                });

            if (insertError) {
                console.error('Error inserting tokens:', insertError);
                throw new Error('Failed to create token record');
            }

            console.log(`Created new token record for user ${userId}: ${tokensToAdd} image tokens`);
        }

        // Discord Webhook
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

        // ========== UPDATE AFFILIATES ==========
        if (referrerId) {
            const commission = parseFloat(finalAmount) * commissionRate;

            const { data: affiliateData, error: fetchError } = await supabase
                .from("Affiliates")
                .select("total_sales, total_sales_amount, total_earned")
                .eq("id", referrerId)
                .single();

            if (fetchError || !affiliateData) {
                console.error("Error fetching affiliate data:", fetchError);
            } else {
                const newTotalSales = affiliateData.total_sales + 1;
                const newTotalSalesAmount = parseFloat(affiliateData.total_sales_amount) + parseFloat(finalAmount);
                const newTotalEarned = parseFloat(affiliateData.total_earned) + commission;

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
                } else {
                    console.log(`Updated affiliate ${referrerId}: +$${commission.toFixed(2)}`);
                }
            }
        }

        // ========== MARK PAYMENT AS PROCESSED ==========
        const { error: markProcessedError } = await supabase
            .from('Payment')
            .update({ expiryStatus: true })
            .eq('id', paymentId);

        if (markProcessedError) {
            console.error('Error marking payment as processed:', markProcessedError);
            // Don't throw - package and tokens were added successfully
        }

        console.log(`✅ Successfully processed package purchase for user ${userId}: ${token_type}`);

        // Construct the dynamic redirect URL with final amount
        const redirectUrl = `${url}/${locale}/Redirects/success-packages?amount=${finalAmount}&token_type=${token_type}&token_amount=${token_amount}&payment_id=${paymentId}&stripeSubscriptionId=${subscriptionId}&userId=${userId}`;

        // Redirect to the localized success page
        return NextResponse.redirect(redirectUrl, {
            status: 302,
        });

    } catch (error) {
        console.error('Error processing successful payment:', error);
        return NextResponse.redirect('https://www.plagiacheck.online', { status: 302 });
    }
}