import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth } = NextAuth(authConfig);

// Define protected routes and their required roles
const protectedRoutes = {
  "/dashboard": ["BRAND", "ADMIN"],
  "/tasks": ["BRAND", "ADMIN"],
  "/billing": ["BRAND", "ADMIN"],
};

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as { role?: string } | undefined)?.role;

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

  // 3. If logged in, redirect away from the auth page
  if (isLoggedIn && nextUrl.pathname === "/auth") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/dashboard/:path*", "/tasks/:path*", "/billing/:path*", "/auth/:path*", "/embed/:path*"],
};
