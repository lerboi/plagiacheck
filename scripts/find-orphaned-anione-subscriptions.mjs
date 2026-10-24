// Lists Anione package subscriptions that Stripe can still charge but whose Anione
// account has been deleted. Read-only: it never cancels or refunds anything.
//
// Run from the repo root with the production env vars:
//   node --env-file=.env.local scripts/find-orphaned-anione-subscriptions.mjs
//
// Needs STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL2 and SUPABASE_KEY.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const ANIONE_PACKAGE_TYPES = ['200Image', '1000Image'];
// Statuses in which Stripe may still create or collect invoices.
const LIVE_STATUSES = ['active', 'past_due', 'unpaid', 'trialing', 'paused'];

const { STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL2, SUPABASE_KEY } = process.env;
if (!STRIPE_SECRET_KEY || !NEXT_PUBLIC_SUPABASE_URL2 || !SUPABASE_KEY) {
    console.error('Missing STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL2 or SUPABASE_KEY.');
    process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL2, SUPABASE_KEY);

async function rowExists(table, column, value) {
    const { data, error } = await supabase.from(table).select('id').eq(column, value).limit(1);
    if (error) throw new Error(`${table} lookup failed for ${value}: ${error.message}`);
    return data.length > 0;
}

const orphans = [];
let checked = 0;

for (const status of LIVE_STATUSES) {
    for await (const subscription of stripe.subscriptions.list({ status, limit: 100 })) {
        const { userId, tokenType } = subscription.metadata || {};
        if (!userId || !ANIONE_PACKAGE_TYPES.includes(tokenType)) continue;

        checked++;
        if (await rowExists('Package', 'stripeSubscriptionId', subscription.id)) continue;
        if (await rowExists('User', 'id', userId)) continue;

        orphans.push({
            subscription: subscription.id,
            status: subscription.status,
            userId,
            tokenType,
            customer: subscription.customer,
            currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
        });
    }
}

console.log(`Checked ${checked} live Anione package subscriptions.`);
console.log(`Found ${orphans.length} belonging to deleted accounts:`);
if (orphans.length > 0) console.table(orphans);
