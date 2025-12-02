import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function POST(req: Request) {
    try {
        const { userId, packageId, stripeSubscriptionId } = await req.json();

        if (!userId || !packageId || !stripeSubscriptionId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        // Verify package exists and belongs to user with PAST_DUE status
        const { data: packageData, error: packageError } = await supabase
            .from("Package")
            .select("id, userId, status, stripeSubscriptionId, paymentFailureCount")
            .eq("id", packageId)
            .eq("userId", userId)
            .single();

        if (packageError || !packageData) {
            return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }

        if (packageData.status !== "PAST_DUE") {
            return NextResponse.json({ error: "Package is not past due" }, { status: 400 });
        }

        if (packageData.stripeSubscriptionId !== stripeSubscriptionId) {
            return NextResponse.json({ error: "Subscription ID mismatch" }, { status: 400 });
        }

        // Retrieve the Stripe subscription
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        // Get the latest invoice
        const latestInvoiceId = subscription.latest_invoice as string;
        if (!latestInvoiceId) {
            return NextResponse.json({ error: "No invoice found for subscription" }, { status: 400 });
        }

        const invoice = await stripe.invoices.retrieve(latestInvoiceId);

        // Check if invoice is already paid
        if (invoice.status === "paid") {
            // Update package status in database
            await supabase
                .from("Package")
                .update({ 
                    status: "ACTIVE",
                    paymentFailureCount: 0,
                    pastDueSince: null
                })
                .eq("id", packageId);

            return NextResponse.json({ 
                success: true, 
                status: "ACTIVE",
                message: "Invoice was already paid"
            });
        }

        // Attempt to pay the invoice
        let paidInvoice;
        try {
            paidInvoice = await stripe.invoices.pay(latestInvoiceId);
        } catch (stripeError: any) {
            console.error("Stripe payment error:", stripeError);

            // Map Stripe error to user-friendly message
            let errorCode = "generic";
            let errorMessage = "Payment failed. Please try again or contact support.";

            if (stripeError.code) {
                errorCode = stripeError.code;
                
                switch (stripeError.code) {
                    case "card_declined":
                        errorMessage = "Your card was declined. Please try a different payment method.";
                        break;
                    case "insufficient_funds":
                        errorMessage = "Insufficient funds. Please use a different card.";
                        break;
                    case "expired_card":
                        errorMessage = "Your card has expired. Please update your payment method.";
                        break;
                    case "authentication_required":
                        errorMessage = "Additional authentication is required. Please contact your bank.";
                        break;
                    default:
                        errorMessage = stripeError.message || errorMessage;
                }
            }

            // Increment payment failure count
            await supabase
                .from("Package")
                .update({ 
                    paymentFailureCount: packageData.paymentFailureCount ? packageData.paymentFailureCount + 1 : 1
                })
                .eq("id", packageId);

            return NextResponse.json({ 
                success: false,
                error: errorCode,
                message: errorMessage,
                packageStatus: "PAST_DUE"
            }, { status: 400 });
        }

        // Payment successful - update package status
        // The webhook will handle token allocation, so we just update the status
        await supabase
            .from("Package")
            .update({ 
                status: "ACTIVE",
                paymentFailureCount: 0,
                pastDueSince: null
            })
            .eq("id", packageId);

        return NextResponse.json({ 
            success: true,
            status: "ACTIVE",
            message: "Payment successful"
        });

    } catch (error: any) {
        console.error("Error in retry-subscription-payment:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            message: error.message 
        }, { status: 500 });
    }
}