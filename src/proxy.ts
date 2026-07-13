import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth } = NextAuth(authConfig);

// Define protected routes and their required roles
const protectedRoutes = {
  "/dashboard": ["BRAND", "ADMIN"],
  "/tasks": ["BRAND", "ADMIN"],
  "/notifications": ["BRAND", "ADMIN"],
  "/integrations": ["BRAND", "ADMIN"],
  "/analytics": ["BRAND", "ADMIN"],
  "/billing": ["BRAND", "ADMIN"],
};

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as { role?: string } | undefined)?.role;
  const onboarded = (req.auth?.user as { onboarded?: boolean } | undefined)?.onboarded;
  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");

  if (isLoggedIn && nextUrl.pathname === "/auth" && onboarded) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isOnboardingRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  if (isOnboardingRoute && onboarded) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Public routes — skip auth checks
  if (nextUrl.pathname === '/' || nextUrl.pathname.startsWith('/auth') || nextUrl.pathname.startsWith('/embed')) {
    return NextResponse.next();
  }

  // Find if the current path requires protection
  const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
    nextUrl.pathname.startsWith(route)
  )?.[1];

  // 1. If trying to access a protected route without being logged in
  if (requiredRoles && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", nextUrl));
  }

  // 2. If logged in but accessing a route without the required role
  if (requiredRoles && isLoggedIn && (!userRole || !requiredRoles.includes(userRole))) {
    // Redirect to unauthorized or fallback to their main dashboard
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (requiredRoles && isLoggedIn && onboarded === false) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }
  return NextResponse.next();
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/dashboard/:path*", "/tasks/:path*", "/notifications/:path*", "/integrations/:path*", "/analytics/:path*", "/billing/:path*", "/auth/:path*", "/onboarding/:path*", "/embed/:path*"],
};
