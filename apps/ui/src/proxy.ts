import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Proxy – API Reverse Proxy
 *
 * Proxies all /api/* and /health requests from the browser to the Go producer
 * backend.  This keeps the real backend URL out of client-side code and avoids
 * CORS issues during local development.
 *
 * Reference: https://nextjs.org/docs/messages/middleware-to-proxy
 */

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://localhost:8080'

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Build the upstream URL keeping the original path + query
  const upstream = new URL(`${pathname}${search}`, API_BACKEND_URL)

  return NextResponse.rewrite(upstream)
}

export const config = {
  matcher: ['/api/:path*', '/health'],
}
