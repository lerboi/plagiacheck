import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN
const PRODUCTION_ORIGIN = "https://www.plagiacheck.online"

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null

  // Exact-match allow list. ALLOWED_ORIGIN can be a comma-separated list.
  const configured = (ALLOWED_ORIGIN || PRODUCTION_ORIGIN)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  if (configured.includes(requestOrigin)) return requestOrigin

  // Allow any localhost origin for local development.
  try {
    const url = new URL(requestOrigin)
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return requestOrigin
    }
  } catch {
    // ignore malformed origin
  }

  return null
}

export function middleware(request: NextRequest) {
  // Stripe webhook receives a signed raw body — never touch it.
  if (request.nextUrl.pathname.startsWith("/api/webhook/stripe")) {
    return NextResponse.next()
  }

  // Only attach CORS headers to API responses; same-origin page navigations
  // do not need them and adding wildcards there is just noise.
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const requestOrigin = request.headers.get("origin")
  const allowed = resolveAllowedOrigin(requestOrigin)

  // Handle CORS preflight explicitly.
  if (request.method === "OPTIONS") {
    const headers = new Headers()
    if (allowed) {
      headers.set("Access-Control-Allow-Origin", allowed)
      headers.set("Vary", "Origin")
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      headers.set("Access-Control-Max-Age", "86400")
    }
    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", allowed)
    response.headers.set("Vary", "Origin")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  }
  return response
}

export const config = {
  matcher: ["/api/:path*"],
}
