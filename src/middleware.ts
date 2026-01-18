/**
 * Next.js Middleware for Authentication
 *
 * Protects routes requiring authentication and handles redirects.
 * Runs on the edge runtime for Cloudflare Workers compatibility.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/login/mfa",
  "/track",
  "/api/auth",
  "/api/health",
  "/api/inbound",
  "/api/tickets/track",
];

/** Static file extensions to ignore */
const STATIC_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
];

/**
 * Checks if a path is a public route that doesn't require authentication.
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches and prefix matches
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

/**
 * Checks if a path is a static file request.
 */
function isStaticFile(pathname: string): boolean {
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Checks if a path is a Next.js internal route.
 */
function isNextInternal(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname.startsWith("/__next");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (isStaticFile(pathname) || isNextInternal(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, check for session cookie
  // Better Auth uses '__Secure-servdesk.session_token' in production (HTTPS)
  // or 'servdesk.session_token' in development (HTTP)
  const sessionCookie =
    request.cookies.get("__Secure-servdesk.session_token") ||
    request.cookies.get("servdesk.session_token") ||
    request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    // No session, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists, allow the request
  // Note: Full session validation happens in the API route/page
  // The middleware just does a quick cookie check for performance
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
