import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

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

export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  console.log("Incoming Request Headers:", req.headers);

  const referer = req.headers.get("referer");
  console.log("Referer Header:", referer);

  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en";
    const price = searchParams.get("price");
    const email = searchParams.get("email");
    const tokenAmount = searchParams.get("tokenAmount");
    const tokenType = searchParams.get("tokenType");
    const userId = searchParams.get("userId");
    const currency = searchParams.get('currency') || "usd";
    const refCode = searchParams.get("ref_code");
    const voucher = searchParams.get('voucher');

    if (!price || !userId || !email) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!referer?.startsWith(allowedOrigin!)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const priceAmount = parseInt(price);
    let convertedAmount = priceAmount;

    // Only convert the amount for the success URL if currency is INR
    if (currency.toLowerCase() === 'inr') {
      console.log('Converting INR to USD for success URL:', priceAmount);
      convertedAmount = await convertINRtoUSD(priceAmount);
      console.log('Converted amount in USD:', convertedAmount);
    }

    console.log("Processing one-time checkout session...");

    const timestamp = Date.now();
    const verificationToken = generateCheckoutToken(userId, timestamp);

    const { error } = await supabase.from("OneTimeToken").insert([
      { token: verificationToken, user_id: userId }
    ]);

    // Use converted amount only in the success URL
    const baseSuccessUrl = `https://plagiacheck.online/api/Redirect/success_prompt?locale=${locale}&amount=${convertedAmount}&token_type=${tokenType}&token_amount=${tokenAmount}&userId=${userId}&token=${verificationToken}&timestamp=${timestamp}&session_id={CHECKOUT_SESSION_ID}`;

    let successUrl = baseSuccessUrl;

    // Add ref_code if exists
    if (refCode) {
        successUrl += `&ref_code=${refCode}`;
    }

    let promoId
    // Add voucher if exists
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
          line_items: [{
              price_data: {
                  currency: currency.toLowerCase(), 
                  product_data: {
                      name: "One-Time Purchase",
                  },
                  unit_amount: priceAmount * 100, 
              },
              quantity: 1,
          }],
          mode: "payment",
          discounts: [{
              promotion_code: promoId
          }],
          success_url: successUrl,
          cancel_url: `https://plagiacheck.online/api/Redirect/canceled_prompt?locale=${locale}&token=${verificationToken}&timestamp=${timestamp}&userId=${userId}`,
      });
      console.log("Pre-applying voucher:", voucher);
      console.log("✅ Redirecting user to Stripe Checkout:", session.url);
      return NextResponse.redirect(session.url!, { status: 303, headers: { "Referrer-Policy": "no-referrer" } });
    } 
    else {
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            line_items: [{
                price_data: {
                    currency: currency.toLowerCase(), 
                    product_data: {
                        name: "One-Time Purchase",
                    },
                    unit_amount: priceAmount * 100, 
                },
                quantity: 1,
            }],
            mode: "payment",
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: `https://plagiacheck.online/api/Redirect/canceled_prompt?locale=${locale}&token=${verificationToken}&timestamp=${timestamp}&userId=${userId}`,
        });
        console.log("✅ Redirecting user to Stripe Checkout:", session.url);
        return NextResponse.redirect(session.url!, { status: 303, headers: { "Referrer-Policy": "no-referrer" } });
    }
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
  }
}