import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Log the request method and path
    console.log(`Middleware processing: ${request.method} ${request.nextUrl.pathname}`);
    
    if (request.nextUrl.pathname.startsWith('/api/webhook/stripe')) {
        console.log('Skipping middleware for Stripe webhook path');
        return NextResponse.next();
    }

    // Get the response
    const response = NextResponse.next()
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    return response
}

// Change your matcher to be more specific - exclude the Stripe webhook path entirely
export const config = {
    matcher: [
        '/api/:path*',
        '/((?!api/webhook/stripe).*)'
    ],
}