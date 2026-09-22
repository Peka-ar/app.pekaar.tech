import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/appwrite-config";

// Protected routes and their required roles.
// Role gating is enforced server-side per request by requirePrincipal() in the
// pages themselves (admin pages pass `roles: [Role.ADMIN]`); the edge middleware
// only gates on session-cookie presence because it cannot call the Appwrite API.
const protectedRoutes = {
  "/dashboard": ["BRAND", "ADMIN"],
  "/tasks": ["BRAND", "ADMIN"],
  "/notifications": ["BRAND", "ADMIN"],
  "/integrations": ["BRAND", "ADMIN"],
  "/analytics": ["BRAND", "ADMIN"],
  "/billing": ["BRAND", "ADMIN"],
  "/admin": ["ADMIN"],
};

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");

  if (isOnboardingRoute && !hasSession) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  // Public routes — skip auth checks
  if (nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/auth") || nextUrl.pathname.startsWith("/embed")) {
    return NextResponse.next();
  }

  // Find if the current path requires protection
  const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
    nextUrl.pathname.startsWith(route)
  )?.[1];

  // Protected route without a session cookie
  if (requiredRoles && !hasSession) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  return NextResponse.next();
}

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/dashboard/:path*", "/tasks/:path*", "/notifications/:path*", "/integrations/:path*", "/analytics/:path*", "/billing/:path*", "/admin/:path*", "/auth/:path*", "/onboarding/:path*", "/embed/:path*"],
};