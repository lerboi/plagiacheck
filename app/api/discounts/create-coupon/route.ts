import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function generateRandomCode(length = 6) {
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
    const { percentOff } = await req.json();

    if (!percentOff || typeof percentOff !== "number") {
      return NextResponse.json({ error: "Missing or invalid percentOff." }, { status: 400 });
    }

    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: "once"
    });

    const code = generateRandomCode();

    // Calculate expiry date (3 days from now)
    const expiresAt = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60); // 3 days in seconds

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: expiresAt, // Set the expiry date on the promotion code
    });

    return NextResponse.json({
      success: true,
      promotionCode: promoCode.code,
      couponId: coupon.id
    }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://www.anione.me",
        "Referrer-Policy": "no-referrer"
      }
    });

  } catch (error: any) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
