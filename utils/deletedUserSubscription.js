// Stops billing Anione package subscriptions whose user account has been deleted.
//
// Deleting an Anione account also deletes the user's Package rows, so later webhook
// events for that subscription find nothing to update. Unless the subscription is
// canceled, Stripe keeps retrying and renewing it and charges a card for an account
// that no longer exists.
//
// The Stripe and Supabase clients are passed in so this logic can be exercised with
// fakes; route files cannot export helpers of their own.

const ANIONE_PACKAGE_TYPES = ['200Image', '1000Image'];

// True only when the subscription belongs to an Anione user that no longer exists.
// Returns false on any lookup error, so the caller falls back to its normal handling.
async function isDeletedUserSubscription(supabase, subscription) {
    const userId = subscription.metadata?.userId;
    const tokenType = subscription.metadata?.tokenType;

    // Only Anione package subscriptions carry this metadata. Plagiacheck's own
    // subscriptions share this Stripe account and webhook and must never match.
    if (!userId || !ANIONE_PACKAGE_TYPES.includes(tokenType)) {
        return false;
    }

    // A Package row still points at this subscription. Its userId may differ from the
    // metadata, because User.id changes when a Google account is linked.
    const { data: packages, error: packageError } = await supabase
        .from('Package')
        .select('id')
        .eq('stripeSubscriptionId', subscription.id)
        .limit(1);

    if (packageError || !packages) {
        console.error(`Error checking Package for subscription ${subscription.id}:`, packageError);
        return false;
    }

    if (packages.length > 0) {
        return false;
    }

    // The user still exists, for example a new subscriber whose first payment failed
    // before their Package row was created.
    const { data: users, error: userError } = await supabase
        .from('User')
        .select('id')
        .eq('id', userId)
        .limit(1);

    if (userError || !users) {
        console.error(`Error checking User ${userId} for subscription ${subscription.id}:`, userError);
        return false;
    }

    return users.length === 0;
}

// For an invoice event on a subscription whose Anione user has been deleted: cancels
// the subscription. A payment this invoice took is not refunded automatically; it is
// logged so it can be reviewed and refunded by hand. Returns true when the event was
// handled this way, false when the caller should carry on as normal. Never throws.
export async function handleDeletedUserSubscription(stripe, supabase, subscription, invoice) {
    try {
        if (!(await isDeletedUserSubscription(supabase, subscription))) {
            return false;
        }

        const userId = subscription.metadata.userId;
        console.error(`[DELETED_USER_SUBSCRIPTION] Subscription ${subscription.id} (invoice ${invoice.id}) belongs to deleted user ${userId}. Canceling.`);

        if (subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
            try {
                await stripe.subscriptions.cancel(subscription.id);
                console.log(`[DELETED_USER_SUBSCRIPTION] Canceled subscription ${subscription.id}`);
            } catch (cancelError) {
                console.error(`[DELETED_USER_SUBSCRIPTION] Failed to cancel subscription ${subscription.id}. Cancel it manually:`, cancelError.message);
            }
        }

        if (invoice.status === 'paid' && invoice.amount_paid > 0) {
            console.error(`[DELETED_USER_SUBSCRIPTION] Invoice ${invoice.id} took a payment of ${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase() ?? ''} after the account was deleted. Not refunded automatically; review and refund it by hand.`);
        }

        return true;
    } catch (error) {
        console.error('Error in handleDeletedUserSubscription:', error.message);
        return false;
    }
}
