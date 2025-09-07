import { NextResponse } from "next/server";
import Stripe from "stripe";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken"
import { createClient } from "@supabase/supabase-js";

// Function to convert INR to USD
async function convertINRtoUSD(inrAmount: number): Promise<number> {
    try {
      return Math.round(inrAmount * 0.012);
    } catch (error) {
      console.error('Error converting currency:', error);
      const fallbackRate = 0.012;
      return Math.round(inrAmount * fallbackRate);
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function GET(req: Request) {
    console.log("Incoming Request Headers:", req.headers);

    const referer = req.headers.get("referer");
    console.log("Referer Header:", referer);

    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    try {
        const { searchParams } = new URL(req.url);
        const locale = searchParams.get("locale") || "en";
        const priceId = searchParams.get("priceId");
        const email = searchParams.get("email");
        const tokenAmount = searchParams.get("tokenAmount")
        const tokenPrice = searchParams.get("tokenPrice")
        const tokenType = searchParams.get('tokenType')
        const userId = searchParams.get('userId')
        const currency = searchParams.get('currency') || "usd"
        const refCode = searchParams.get('ref_code')
        const voucher = searchParams.get('voucher')  

        if (!userId || !priceId || !email || !tokenPrice) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (!referer?.startsWith(allowedOrigin!)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const priceAmount = parseInt(tokenPrice);
        let convertedAmount = priceAmount;

        // Only convert the amount for the success URL if currency is INR
        if (currency.toLowerCase() === 'inr') {
            console.log('Converting INR to USD for success URL:', priceAmount);
            convertedAmount = await convertINRtoUSD(priceAmount);
            console.log('Converted amount in USD:', convertedAmount);
        }

        console.log("Processing checkout session...");

        const timestamp = Date.now();
        const verificationToken = generateCheckoutToken(userId, timestamp);

        //create one time token
        const { error } = await supabase.from("OneTimeToken").insert([
            { token: verificationToken, user_id: userId }
        ]);

        // Build success_url with optional ref_code
        let successUrl = `https://plagiacheck.online/api/Redirect/success_package?locale=${locale}&amount=${convertedAmount}&token_type=${tokenType}&token_amount=${tokenAmount}&userId=${userId}&session_id={CHECKOUT_SESSION_ID}&token=${verificationToken}&timestamp=${timestamp}`;
        
        // Add ref_code to success_url if it exists
        if (refCode) {
            successUrl += `&ref_code=${refCode}`;
            console.log("Including ref_code in success URL:", refCode);
        }

        let promoId
        // Add voucher to success_url if it exists
        if (voucher) {
            successUrl += `&voucher=${voucher}`;
            console.log("Including voucher in success URL:", voucher);
            const promotionCodes = await stripe.promotionCodes.list({
                code: voucher
                });
            promoId = promotionCodes.data[0].id;
        }

        // Add discount if voucher exists, otherwise allow promotion codes
        if (voucher && promoId) {
            const session = await stripe.checkout.sessions.create({
                customer_email: email,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                discounts: [{
                    promotion_code: promoId
                }],
                success_url: successUrl,
                cancel_url: `https://plagiacheck.online/api/Redirect/canceled_package?locale=${locale}&token=${verificationToken}&timestamp=${timestamp}&userId=${userId}`,
                subscription_data: {
                    metadata: {
                        userId: userId,
                        tokenAmount: tokenAmount,
                        tokenType: tokenType
                    }
                }
            });
            console.log("Pre-applying voucher:", voucher);
            console.log("✅ Stripe session created:", session.url);
            return NextResponse.redirect(session.url!, { status: 303, headers: {'Referrer-Policy': 'no-referrer'} });
        } else {
            const session = await stripe.checkout.sessions.create({
                customer_email: email,
                line_items: [{ price: priceId, quantity: 1 }],
                mode: "subscription",
                allow_promotion_codes: true,
                success_url: successUrl,
                cancel_url: `https://plagiacheck.online/api/Redirect/canceled_package?locale=${locale}&token=${verificationToken}&timestamp=${timestamp}&userId=${userId}`,
                subscription_data: {
                    metadata: {
                        userId: userId,
                        tokenAmount: tokenAmount,
                        tokenType: tokenType
                    }
                }
            });
            console.log("✅ Stripe session created:", session.url);
            return NextResponse.redirect(session.url!, { status: 303, headers: {'Referrer-Policy': 'no-referrer'} });
        }
    }
    catch (error) {
        console.error("❌ Error creating checkout session:", error);
        return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
    }
}