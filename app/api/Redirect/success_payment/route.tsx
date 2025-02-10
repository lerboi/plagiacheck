import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // Get URL query parameters
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "en"; // Default to "en" if locale is missing

    // Construct the dynamic redirect URL
    const redirectUrl = `https://anione.me/${locale}/Redirects/success-packages`;

    // Redirect to the localized success page
    return NextResponse.redirect(redirectUrl, {
        status: 302, // Temporary redirect
    });
}
