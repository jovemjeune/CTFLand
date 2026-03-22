import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * Next.js App Router (file-based `app/`) — not react-router.
 * Reduce stale HTML/RSC when switching between `next dev` and `next start` during local testing.
 */
export function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Only in dev: avoid the browser holding stale HTML/RSC while iterating.
  if (process.env.NODE_ENV !== "development") {
    return res
  }

  const isStaticAsset =
    request.nextUrl.pathname.startsWith("/_next/static") ||
    request.nextUrl.pathname.startsWith("/_next/image") ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$/i.test(request.nextUrl.pathname)

  if (!isStaticAsset) {
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0",
    )
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
