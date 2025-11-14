import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "https://www.anione.me",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Referrer-Policy": "no-referrer"
    },
  });
}

export async function POST(req: Request) {
  try {
    const { userId, percentOff } = await req.json();

    if (!userId || !percentOff || typeof percentOff !== "number") {
      return NextResponse.json({ error: "Missing or invalid parameters." }, { status: 400 });
    }

    // Check if user already has an active first-time voucher
    const { data: existingVoucher, error: checkError } = await supabase
      .from('Vouchers')
      .select('code, expires_at')
      .eq('created_for_user_id', userId)
      .eq('auto', true)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingVoucher && !checkError) {
      console.log('Returning existing voucher for user:', userId);
      return NextResponse.json({
        success: true,
        code: existingVoucher.code,
        existing: true
      }, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://www.anione.me",
          "Referrer-Policy": "no-referrer"
        }
      });
    }

    // Generate new voucher
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: "once"
    });

    const code = generateRandomCode(8);

    // Calculate expiry date (1 day from now)
    const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 1 day in seconds

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: expiresAt,
    });

    // Add entry to Vouchers table in Supabase
    const { error: supabaseError } = await supabase
      .from('Vouchers')
      .insert({
        code: promoCode.code,
        created_for_user_id: userId,
        is_active: true,
        description: 'First-time offer - 20% off',
        auto: true,
        expires_at: new Date(expiresAt * 1000).toISOString(),
        percent_off: percentOff,
        amount_off: null,
        type: 'tokenDiscount'
      });

    if (supabaseError) {
      console.error("Error inserting voucher into Supabase:", supabaseError);
      throw new Error("Failed to create voucher in database");
    }

    console.log('Created new first-time voucher for user:', userId);

    return NextResponse.json({
      success: true,
      code: promoCode.code,
      existing: false
    }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://www.anione.me",
        "Referrer-Policy": "no-referrer"
      }
    });

  } catch (error: any) {
    console.error("Error creating first-time coupon:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}