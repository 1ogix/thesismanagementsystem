import { NextRequest, NextResponse } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  student: ["/student"],
  adviser: ["/adviser"],
  panel: ["/panel"],
  admin: ["/admin"],
};

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionRole = request.cookies.get("tms-role")?.value;

  // Not authenticated — redirect to login
  if (!sessionRole) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Check role-based access
  for (const [role, prefixes] of Object.entries(ROLE_ROUTES)) {
    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix) && sessionRole !== role && sessionRole !== "admin") {
        return NextResponse.redirect(new URL(`/${sessionRole}`, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
