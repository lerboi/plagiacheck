import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { endOfMonth, isSameDay, addMonths, isBefore } from 'date-fns';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Add logging utility
const logSuccess = async (operation, details) => {
    const { error } = await supabase
        .from('OperationLogs')
        .insert({
            operation,
            details,
            timestamp: new Date().toISOString()
        });

    if (error) console.error('Logging error:', error);
};

// Add new helper function for handling failed subscriptions
async function handleFailedSubscription(subscription) {
    console.log('Handling failed subscription:', subscription.id);
    
    try {
        // Cancel the Stripe subscription
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        
        // Update subscription status in database
        const { error: updateError } = await supabase
            .from('Subscription')
            .update({ 
                isActive: false,
                status: 'CANCELED'
            })
            .eq('id', subscription.id);

        if (updateError) throw updateError;

        // Log the cancellation
        await logSuccess('subscription_canceled', {
            subscriptionId: subscription.id,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            reason: 'payment_failure'
        });

    } catch (error) {
        console.error('Error handling failed subscription:', error);
        throw error;
    }
}

// Token allocation handler
async function handleTokenAllocation(userId, tier, action = 'add') {
    const textTokens = tier === 'PLUS' ? 1000 : 4000;
    const imageTokens = tier === 'PLUS' ? 100 : 400;
    
    // Get current user data
    const { data: userData, error: userError } = await supabase
        .from('User')
        .select('textTokens, imageTokens')
        .eq('id', userId)
        .single();

    if (userError) throw userError;

    const multiplier = action === 'add' ? 1 : -1;
    const newTextTokens = userData.textTokens + (textTokens * multiplier);
    const newImageTokens = userData.imageTokens + (imageTokens * multiplier);

    const { error: updateError } = await supabase
        .from('User')
        .update({
            textTokens: newTextTokens,
            imageTokens: newImageTokens
        })
        .eq('id', userId);

    if (updateError) throw updateError;

    return { textTokens, imageTokens };
}

export async function GET(req) {
    console.log('Cron job endpoint hit');

    try {
        // 1. Check for expired tokens and update accordingly
        const { data: expiredTokens, error: expiredTokensError } = await supabase
            .from('SubscriptionToken')
            .select(`
                *,
                subscription:Subscription!inner(
                    id,
                    userId,
                    tier,
                    stripeSubscriptionId,
                    status
                )
            `)
            .lt('expiryDate', new Date().toISOString());

        if (expiredTokensError) throw expiredTokensError;

        for (const token of expiredTokens || []) {
            try {
                if (token.subscription.status === 'ACTIVE') {
                    // Verify Stripe subscription status
                    const stripeSubscription = await stripe.subscriptions.retrieve(
                        token.subscription.stripeSubscriptionId
                    );

                    if (stripeSubscription.status === 'active') {
                        // Renewal logic
                        const tokenAllocation = await handleTokenAllocation(
                            token.subscription.userId,
                            token.subscription.tier
                        );

                        // Update token expiry
                        const { error: tokenUpdateError } = await supabase
                            .from('SubscriptionToken')
                            .update({
                                textTokens: tokenAllocation.textTokens,
                                imageTokens: tokenAllocation.imageTokens,
                                expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                            })
                            .eq('id', token.id);

                        if (tokenUpdateError) throw tokenUpdateError;

                        await logSuccess('token_renewal', {
                            subscriptionId: token.subscription.id,
                            userId: token.subscription.userId,
                            tokenAllocation
                        });
                    } else {
                        // Handle inactive Stripe subscription
                        await handleFailedSubscription(token.subscription);
                    }
                } else {
                    // Remove tokens for inactive subscriptions
                    await handleTokenAllocation(
                        token.subscription.userId,
                        token.subscription.tier,
                        'remove'
                    );

                    // Delete the expired token
                    const { error: deleteError } = await supabase
                        .from('SubscriptionToken')
                        .delete()
                        .eq('id', token.id);

                    if (deleteError) throw deleteError;
                }
            } catch (error) {
                console.error('Error processing expired token:', error);
                continue;
            }
        }

        // 2. Check for package renewals
        const { data: packagesData, error: packagesFetchError } = await supabase
            .from('Package')
            .select(`
                id,
                userId,
                packageName,
                expiryDate,
                stripeSubscriptionId
            `)
            .eq('expiryDate', new Date().toISOString().split('T')[0]);

        if (packagesFetchError) throw packagesFetchError;

        for (const package_ of packagesData || []) {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(
                    package_.stripeSubscriptionId
                );

                if (stripeSubscription.status === 'active') {
                    const imageTokenAmount = package_.packageName === '200Image' ? 200 : 1000;

                    // Update or create PurchasedToken
                    const { data: existingToken, error: fetchError } = await supabase
                        .from('PurchasedToken')
                        .select('*')
                        .eq('userId', package_.userId)
                        .single();

                    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

                    if (existingToken) {
                        const { error } = await supabase
                            .from('PurchasedToken')
                            .update({
                                imageTokens: existingToken.imageTokens + imageTokenAmount
                            })
                            .eq('id', existingToken.id);

                        if (error) throw error;
                    } else {
                        const { error } = await supabase
                            .from('PurchasedToken')
                            .insert({
                                userId: package_.userId,
                                textTokens: 0,
                                imageTokens: imageTokenAmount
                            });

                        if (error) throw error;
                    }

                    // Update package expiry
                    const newExpiryDate = addMonths(new Date(package_.expiryDate), 1);
                    const { error: updateError } = await supabase
                        .from('Package')
                        .update({ expiryDate: newExpiryDate.toISOString() })
                        .eq('id', package_.id);

                    if (updateError) throw updateError;

                    await logSuccess('package_renewal', {
                        packageId: package_.id,
                        userId: package_.userId,
                        imageTokens: imageTokenAmount
                    });
                }
            } catch (error) {
                console.error('Error processing package renewal:', error);
                continue;
            }
        }

        // Log overall success
        await logSuccess('cron_job_complete', {
            processedExpiredTokens: expiredTokens?.length || 0,
            processedPackages: packagesData?.length || 0
        });

        return NextResponse.json({
            message: 'Cron job completed successfully',
            details: {
                processedExpiredTokens: expiredTokens?.length || 0,
                processedPackages: packagesData?.length || 0
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

// Stripe webhook handler
export async function POST(req) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    try {
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
            case 'invoice.payment_succeeded':
                await handleSuccessfulPayment(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                await handleFailedPayment(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionCancellation(event.data.object);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 400 }
        );
    }
}

// Webhook event handlers
async function handleSuccessfulPayment(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { data: subData } = await supabase
        .from('Subscription')
        .select('*')
        .eq('stripeSubscriptionId', subscription.id)
        .single();

    if (subData) {
        // Handle subscription payment
        await handleTokenAllocation(subData.userId, subData.tier);
        await logSuccess('payment_success', {
            subscriptionId: subData.id,
            invoiceId: invoice.id
        });
    } else {
        // Handle package payment
        const { data: packageData } = await supabase
            .from('Package')
            .select('*')
            .eq('stripeSubscriptionId', subscription.id)
            .single();

        if (packageData) {
            const imageTokens = packageData.packageName === '200Image' ? 200 : 1000;
            await handleTokenAllocation(packageData.userId, null, 'add');
            await logSuccess('package_payment_success', {
                packageId: packageData.id,
                invoiceId: invoice.id,
                imageTokens
            });
        }
    }
}

async function handleFailedPayment(invoice) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { data: subData } = await supabase
        .from('Subscription')
        .select('*')
        .eq('stripeSubscriptionId', subscription.id)
        .single();

    if (subData) {
        await handleFailedSubscription(subData);
    }
}

async function handleSubscriptionCancellation(subscription) {
    const { data: subData } = await supabase
        .from('Subscription')
        .select('*')
        .eq('stripeSubscriptionId', subscription.id)
        .single();

    if (subData) {
        await handleFailedSubscription(subData);
    }
}