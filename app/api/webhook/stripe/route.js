import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { format, addMonths, isLastDayOfMonth, lastDayOfMonth } from 'date-fns';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tokenExpiryDate = addMonths(new Date(), 1);

export const config = {
    api: {
        bodyParser: false,
    },
};

async function logSuccess(operation, details) {
    const { error } = await supabase
        .from('OperationLogs')
        .insert({
            operation,
            details,
            timestamp: new Date().toISOString()
        });

    if (error) console.error('Logging error:', error);
};

async function handleFailedPayment(invoice) {
    console.log(`Processing failed payment for invoice: ${invoice.id}`);
    try {
        // Extract subscription ID from the invoice
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            console.error('No subscription ID found in invoice:', invoice.id);
            return;
        }

        // Retrieve the subscription object using the Stripe API
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Access metadata from the subscription object
        const { metadata } = subscription;

        if (!metadata || !metadata.userId) {
            console.error('Missing userId in metadata for subscription:', subscription.id);
            return;
        }

        const { userId } = metadata;

        // Get the Package record
        const { data: packageData } = await supabase
            .from('Package')
            .select('*')
            .eq('userId', userId)
            .eq('stripeSubscriptionId', subscriptionId)
            .single();

        if (!packageData) {
            console.error(`No Package found for userId: ${userId} and subscription: ${subscriptionId}`);
            return;
        }

        // Check for consecutive failures
        const invoices = await stripe.invoices.list({
            subscription: subscriptionId,
            limit: 3,
            status: 'open'
        });

        // If we have 2 or more consecutive failed payments
        if (invoices.data.length >= 2) {
            console.log(`Detected ${invoices.data.length} consecutive failed payments for subscription: ${subscriptionId}`);

            // Update package status to CANCELED
            const { error: updateError } = await supabase
                .from('Package')
                .update({
                    status: 'CANCELED',
                    isActive: false
                })
                .eq('id', packageData.id);

            if (updateError) {
                console.error('Error updating package status:', updateError);
                throw updateError;
            }

            await logSuccess('package_canceled_consecutive_failures', {
                packageId: packageData.id,
                userId: userId,
                subscriptionId: subscriptionId,
                consecutiveFailures: invoices.data.length
            });

            console.log(`Package ${packageData.id} has been marked as CANCELED due to consecutive payment failures`);
        } else {
            // Just update the status to match Stripe's status
            const { error: updateError } = await supabase
                .from('Package')
                .update({
                    status: subscription.status.toUpperCase()
                })
                .eq('id', packageData.id);

            if (updateError) {
                console.error('Error updating package status:', updateError);
                throw updateError;
            }

            await logSuccess('package_payment_failed', {
                packageId: packageData.id,
                invoiceId: invoice.id,
                stripeStatus: subscription.status,
                attemptCount: invoice.attempt_count,
                nextPaymentAttempt: invoice.next_payment_attempt
            });

            console.log(`Updated Package ${packageData.id} status to ${subscription.status.toUpperCase()}`);
        }
    } catch (error) {
        console.error('Error in handleFailedPayment:', error.message);
        throw error;
    }
}

async function handleTokenAllocation(userId, tokenType) {
    console.log(`Allocating tokens for user ${userId} with token type: ${tokenType}`);

    try {
        // First, check if the package is active
        const { data: packageData, error: packageError } = await supabase
            .from('Package')
            .select('*')
            .eq('userId', userId)
            .single();

        if (packageError) {
            console.error('Error fetching package data:', packageError);
            throw packageError;
        }

        // If package is CANCELED, cancel the subscription and don't add tokens
        if (packageData && packageData.status === 'CANCELED') {
            console.log(`Package for user ${userId} is CANCELED. Canceling subscription and skipping token allocation.`);

            // Cancel the Stripe subscription if it exists
            if (packageData.stripeSubscriptionId) {
                await stripe.subscriptions.cancel(packageData.stripeSubscriptionId);
                console.log(`Canceled Stripe subscription: ${packageData.stripeSubscriptionId}`);
            }

            await logSuccess('token_allocation_skipped', {
                userId: userId,
                packageId: packageData.id,
                reason: 'Package status is CANCELED'
            });

            return { skipped: true, reason: 'Package is canceled' };
        }

        let imageTokensToAdd = 0;

        // Determine the number of tokens to add based on the tokenType
        if (tokenType === '200Image') {
            imageTokensToAdd = 200;
        } else if (tokenType === '1000Image') {
            imageTokensToAdd = 1000;
        } else {
            console.error(`Unknown token type: ${tokenType}`);
            return { error: 'Unknown token type' };
        }

        // Get current user data from PurchasedToken table
        const { data: tokenData, error: tokenError } = await supabase
            .from('PurchasedToken')
            .select('imageTokens')
            .eq('userId', userId)
            .single();

        if (tokenError) {
            // If no record exists, create one
            if (tokenError.code === 'PGRST116') {
                console.log(`No existing token record for user ${userId}, creating new record`);
                const { data, error: insertError } = await supabase
                    .from('PurchasedToken')
                    .insert({
                        userId: userId,
                        imageTokens: imageTokensToAdd
                    })
                    .select();

                if (insertError) {
                    console.error('Error creating token record:', insertError);
                    throw insertError;
                }

                console.log(`Created token record with ${imageTokensToAdd} imageTokens`);
            } else {
                console.error('Error fetching token data:', tokenError);
                throw tokenError;
            }
        } else {
            // Update existing record
            const newImageTokens = (tokenData.imageTokens || 0) + imageTokensToAdd;

            const { error: updateError } = await supabase
                .from('PurchasedToken')
                .update({
                    imageTokens: newImageTokens
                })
                .eq('userId', userId);

            if (updateError) {
                console.error('Error updating token data:', updateError);
                throw updateError;
            }

            console.log(`Successfully added ${imageTokensToAdd} imageTokens. New total: ${newImageTokens}`);
        }

        // Calculate the new expiry date (exactly one month from now)
        const currentDate = new Date();
        let newExpiryDate = addMonths(currentDate, 1);

        // Handle edge cases for months with different number of days
        if (isLastDayOfMonth(currentDate)) {
            // If today is the last day of the month, set to last day of next month
            newExpiryDate = lastDayOfMonth(newExpiryDate);
        }

        // Update the Package table with the new expiry date
        const { error: packageUpdateError } = await supabase
            .from('Package')
            .update({
                expiryDate: newExpiryDate.toISOString(),
                status: 'ACTIVE'
            })
            .eq('userId', userId);

        if (packageUpdateError) {
            console.error('Error updating package expiry date:', packageUpdateError);
            throw packageUpdateError;
        }

        console.log(`Updated package expiryDate to ${newExpiryDate.toISOString()} for user ${userId}`);

        return { imageTokens: imageTokensToAdd, expiryDate: newExpiryDate };
    } catch (error) {
        console.error('Error in handleTokenAllocation:', error.message);
        throw error;
    }
}

async function handleSuccessfulPayment(invoice) {
    console.log('Processing successful payment for invoice:', invoice.id);

    try {
        // Extract subscription ID from the invoice
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            console.error('No subscription ID found in invoice:', invoice.id);
            return;
        }

        console.log(`Retrieving subscription details for: ${subscriptionId}`);

        // Retrieve the subscription object using the Stripe API
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Access metadata from the subscription object
        const { metadata } = subscription;

        if (!metadata || !metadata.userId || !metadata.tokenType) {
            console.error('Missing required metadata in subscription:', subscription.id);
            return;
        }

        const { userId, tokenType } = metadata;
        console.log(`Processing token allocation for user: ${userId}, token type: ${tokenType}`);

        // Allocate tokens based on the metadata
        const tokenResult = await handleTokenAllocation(userId, tokenType);

        // If token allocation was skipped, don't log success
        if (tokenResult.skipped) {
            console.log(`Token allocation was skipped: ${tokenResult.reason}`);
            return;
        }

        // Log the successful operation
        await logSuccess('payment_success', {
            invoiceId: invoice.id,
            subscriptionId: subscription.id,
            userId: userId,
            tokenType: tokenType,
            tokensAdded: tokenResult.imageTokens,
            newExpiryDate: tokenResult.expiryDate
        });

        console.log('Successfully processed payment and allocated tokens');
    } catch (error) {
        console.error('Error in handleSuccessfulPayment:', error.message);
        throw error;
    }
}

//-------------------------------------------------- For Stripe --------------------------------------------------

export async function OPTIONS() {
    console.log('OPTIONS request received for Stripe webhook');

    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function POST(req) {
    console.log('Webhook POST received at:', new Date().toISOString());

    // Log all headers to help diagnose issues
    const headers = Object.fromEntries([...req.headers.entries()]);
    console.log('Webhook request headers:', JSON.stringify(headers));

    const body = await req.text();
    console.log('Webhook body preview:', body.substring(0, 200) + '...');

    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
        console.error('Missing Stripe-Signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    try {
        // Verify we have the secret
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
            return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
        }

        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log('Successfully verified Stripe signature for event:', event.type);

        // Log every event type we receive
        console.log('Processing Stripe webhook event:', event.type, 'id:', event.id);

        switch (event.type) {
            case 'invoice.paid':
                const invoice = event.data.object;
                const billingReason = invoice.billing_reason;

                if (billingReason === 'subscription_create') {
                    // Just log the customer ID if it's a new subscription
                    console.log(`New subscription created for customer: ${invoice.customer}`);
                } else if (billingReason === 'subscription_cycle') {
                    // Handle recurring payment
                    console.log('Processing recurring subscription payment');
                    await handleSuccessfulPayment(invoice);
                } else {
                    console.log(`Unhandled billing reason: ${billingReason}`);
                }
                break;

            case 'invoice.payment_failed':
                await handleFailedPayment(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                console.log(`Invoice succeeded for customer: ${event.data.object.customer}`);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionCancellation(event.data.object);
                break;

            case 'invoice.finalized':
                console.log('Received invoice.finalized event', event.data.object.id);
                break;

            case 'checkout.session.completed':
                console.log('Received checkout.session.completed event', event.data.object.id);
                break;

            case 'payment_intent.succeeded':
                console.log('Received payment_intent.succeeded event', event.data.object.id);
                break;

            case 'payment_intent.payment_failed':
                console.log('Received payment_intent.payment_failed event', event.data.object.id);
                break;

            case 'customer.subscription.updated':
                console.log('Received customer.subscription.updated event', event.data.object.id);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error.message, error.stack);
        return NextResponse.json(
            { error: 'Webhook handler failed', details: error.message },
            { status: 400 }
        );
    }
}

async function handleSubscriptionCancellation(subscription) {
    // This is called when Stripe has definitively canceled the subscription
    // after multiple failed attempts or manual cancellation

    try {
        // Access metadata from the subscription object
        const { metadata } = subscription;

        if (!metadata || !metadata.userId) {
            console.error('Missing userId in metadata for subscription:', subscription.id);

            // Fallback to looking up by stripeSubscriptionId
            const { data: packageData } = await supabase
                .from('Package')
                .select('*')
                .eq('stripeSubscriptionId', subscription.id)
                .single();

            if (packageData) {
                const { error: updateError } = await supabase
                    .from('Package')
                    .update({
                        status: 'CANCELED'
                    })
                    .eq('id', packageData.id);

                if (updateError) throw updateError;

                await logSuccess('package_canceled', {
                    packageId: packageData.id,
                    stripeSubscriptionId: subscription.id,
                    reason: subscription.cancellation_details?.reason || 'unknown'
                });
            }

            return;
        }

        const { userId } = metadata;

        // Update package status
        const { data: packageData, error: packageError } = await supabase
            .from('Package')
            .select('*')
            .eq('userId', userId)
            .eq('stripeSubscriptionId', subscription.id)
            .single();

        if (packageError) {
            console.error('Error fetching package data:', packageError);
            return;
        }

        const { error: updateError } = await supabase
            .from('Package')
            .update({
                isActive: false,
                status: 'CANCELED'
            })
            .eq('id', packageData.id);

        if (updateError) throw updateError;

        await logSuccess('package_canceled', {
            packageId: packageData.id,
            userId: userId,
            stripeSubscriptionId: subscription.id,
            reason: subscription.cancellation_details?.reason || 'unknown'
        });

        console.log(`Package ${packageData.id} has been marked as CANCELED due to subscription cancellation`);

    } catch (error) {
        console.error('Error in handleSubscriptionCancellation:', error.message);
        throw error;
    }
}