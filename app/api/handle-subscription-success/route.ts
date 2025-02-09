import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Update user's subscription status in your database
    const { error } = await supabase
      .from("user_profiles")
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: "active",
        plan: session.metadata?.planName,
      })
      .eq("id", session.metadata?.userId);

    if (error) {
      console.error("Error updating user subscription:", error);
      return NextResponse.redirect(new URL("/pricing?error=update_failed", req.url));
    }

    // ✅ Redirect to absolute URL
    return NextResponse.redirect(new URL("/subscription-success", req.url));
  } catch (error) {
    console.error("Error handling subscription success:", error);
    return NextResponse.redirect(new URL("/pricing?error=process_failed", req.url));
  }
}
