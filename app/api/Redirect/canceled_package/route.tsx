import { NextResponse } from "next/server";
import { generateCheckoutToken } from "@/utils/generateCheckoutToken";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);


export async function GET(req: Request) {
    // Get URL query parameters
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en"; // Default to "en" if locale is missing
    const userId = searchParams.get("userId")
    const timestamp = searchParams.get("timestamp")
    const token = searchParams.get("token")

    // Verify the request is legitimate
    if (!userId || !timestamp || !token) {
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    console.log('Request Legitimate...')

    // Check if the timestamp is within a reasonable window (e.g., 1 hour)
    const timestampNum = parseInt(timestamp);
    if (Date.now() - timestampNum > 3600000) { // 1 hour in milliseconds
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    // Check if the token exists and is not used
    const { data, error } = await supabase
    .from("OneTimeToken")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .single();

    if (error || !data) {
        console.log('Token invalid or already used...');
        return NextResponse.redirect('https://www.plagiacheck.online');
    }

    // Mark token as used
    await supabase
    .from("OneTimeToken")
    .update({ used: true })
    .eq("token", token);

    // Construct the dynamic redirect URL
    const redirectUrl = `https://anione.me/${locale}/Pricing`;

    console.log("❌ Stripe session canceled by user...");

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302
    });
}
