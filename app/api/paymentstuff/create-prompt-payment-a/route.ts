import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Handle preflight requests for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Allows all origins (Change for security)
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

    // Retrieve ref_code from query parameters
    const refCode = searchParams.get("ref_code");

    if (!price || !userId || !email) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!referer?.startsWith(allowedOrigin!)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("Processing one-time checkout session...");

    const timestamp = Date.now();
    const verificationToken = generateCheckoutToken(userId, timestamp);

    // Create one-time token
    const { error } = await supabase.from("OneTimeToken").insert([
      { token: verificationToken, user_id: userId }
    ]);

    // Build the base success URL
    const baseSuccessUrl = `https://plagiacheck.online/api/Redirect/success_prompt?locale=${locale}&amount=${price}&token_type=${tokenType}&token_amount=${tokenAmount}&userId=${userId}&token=${verificationToken}&timestamp=${timestamp}`;

    // If refCode exists, append it to the success URL
    const successUrl = refCode ? `${baseSuccessUrl}&ref_code=${refCode}` : baseSuccessUrl;

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "One-Time Purchase",
          },
          unit_amount: parseInt(price) * 100,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `https://plagiacheck.online/api/Redirect/canceled_prompt?locale=${locale}&token=${verificationToken}&timestamp=${timestamp}&userId=${userId}`,
    });

    console.log("✅ Redirecting user to Stripe Checkout:", session.url);

    return NextResponse.redirect(session.url!, {
      status: 303,
      headers: { "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
  }
}
