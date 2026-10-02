// Keeps an Anione user on one live Stripe subscription per package.
//
// A user whose renewal failed (Package PAST_DUE) can buy the same package again, which
// creates a second Stripe subscription. Unless the old one is canceled, Stripe keeps
// retrying its unpaid invoice and can end up charging the user for both.
//
// The Stripe and Supabase clients are passed in so this logic can be exercised with
// fakes; route files cannot export helpers of their own.

// Returns true only when Stripe confirms the subscription is canceled. Never throws.
export async function ensureSubscriptionCanceled(stripe, subscriptionId, userId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Package.stripeSubscriptionId can be typed in by an admin. Never cancel a
        // subscription that Stripe says belongs to somebody else.
        if (subscription.metadata?.userId && subscription.metadata.userId !== userId) {
            console.error(`Subscription ${subscriptionId} belongs to another user. Not canceling.`);
            return false;
        }

        if (subscription.status !== 'canceled') {
            await stripe.subscriptions.cancel(subscriptionId);
            console.log(`Canceled Stripe subscription ${subscriptionId}`);
        }

        return true;
    } catch (error) {
        console.error(`Error canceling Stripe subscription ${subscriptionId}:`, error.message);
        return false;
    }
}

// Called after a new subscription is paid for: cancels the user's PAST_DUE subscriptions
// for the same package. A Package is only marked CANCELED once Stripe confirms, so a
// failed Stripe call leaves it PAST_DUE for handleFailedPayment to retry. Never throws,
// so it cannot interfere with allocating the new purchase.
export async function cancelSupersededPackages(stripe, supabase, userId, packageName, newSubscriptionId) {
    try {
        const { data: stalePackages, error } = await supabase
            .from('Package')
            .select('id, stripeSubscriptionId')
            .eq('userId', userId)
            .eq('packageName', packageName)
            .eq('status', 'PAST_DUE')
            .not('stripeSubscriptionId', 'is', null)
            .neq('stripeSubscriptionId', newSubscriptionId);

        if (error) {
            console.error('Error fetching superseded packages:', error);
            return;
        }

        for (const stalePackage of stalePackages || []) {
            const canceled = await ensureSubscriptionCanceled(stripe, stalePackage.stripeSubscriptionId, userId);
            if (!canceled) continue;

            const { error: updateError } = await supabase
                .from('Package')
                .update({ status: 'CANCELED' })
                .eq('id', stalePackage.id);

            if (updateError) {
                console.error(`Error marking superseded package ${stalePackage.id} as CANCELED:`, updateError);
            } else {
                console.log(`Package ${stalePackage.id} superseded by subscription ${newSubscriptionId}. Marked as CANCELED.`);
            }
        }
    } catch (error) {
        console.error('Error in cancelSupersededPackages:', error.message);
    }
}

// True when the user has a different subscription for the same package that Stripe
// reports as live. Admin-granted packages (no stripeSubscriptionId) and rows whose
// subscription is no longer live in Stripe do not count. Never throws.
export async function hasOtherLiveSubscription(stripe, supabase, userId, packageName, subscriptionId) {
    try {
        const { data: activePackages, error } = await supabase
            .from('Package')
            .select('id, stripeSubscriptionId')
            .eq('userId', userId)
            .eq('packageName', packageName)
            .eq('status', 'ACTIVE')
            .not('stripeSubscriptionId', 'is', null)
            .neq('stripeSubscriptionId', subscriptionId);

        if (error) {
            console.error('Error fetching other active packages:', error);
            return false;
        }

        for (const activePackage of activePackages || []) {
            try {
                const other = await stripe.subscriptions.retrieve(activePackage.stripeSubscriptionId);
                const belongsToUser = !other.metadata?.userId || other.metadata.userId === userId;

                if (belongsToUser && (other.status === 'active' || other.status === 'trialing')) {
                    return true;
                }
            } catch (retrieveError) {
                console.error(`Error retrieving subscription ${activePackage.stripeSubscriptionId}:`, retrieveError.message);
            }
        }

        return false;
    } catch (error) {
        console.error('Error in hasOtherLiveSubscription:', error.message);
        return false;
    }
}

// True when the user still holds an ACTIVE package other than the given one. Errs
// towards true: wrongly keeping a paying user's voice minutes is the cheaper mistake.
export async function hasOtherActivePackage(supabase, userId, packageId) {
    try {
        const { data, error } = await supabase
            .from('Package')
            .select('id')
            .eq('userId', userId)
            .eq('status', 'ACTIVE')
            .neq('id', packageId)
            .limit(1);

        if (error) {
            console.error('Error checking for other active packages:', error);
            return true;
        }

        return data.length > 0;
    } catch (error) {
        console.error('Error in hasOtherActivePackage:', error.message);
        return true;
    }
}
