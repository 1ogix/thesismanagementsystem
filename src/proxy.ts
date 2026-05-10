import { NextRequest, NextResponse } from "next/server";
import {
  getAllowedRoutePrefixes,
  getDefaultDashboardRoute,
} from "@/lib/roles";
import { UserRole } from "@/types";

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionRole = request.cookies.get("tms-role")?.value as UserRole | undefined;

  // Not authenticated — redirect to login
  if (!sessionRole) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Check role-based access
  const protectedPrefixes = ["/student", "/adviser", "/panel", "/admin", "/tech-admin"];
  const requestedProtected = protectedPrefixes.find((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!requestedProtected) {
    return NextResponse.next();
  }

  const allowedPrefixes = getAllowedRoutePrefixes(sessionRole);
  const isAllowed = sessionRole === "admin"
    || sessionRole === "tech_admin"
    || allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isAllowed) {
    return NextResponse.redirect(
      new URL(getDefaultDashboardRoute(sessionRole), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
