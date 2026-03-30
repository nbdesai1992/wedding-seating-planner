import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];

// Static file / API patterns to skip
const SKIP_PATTERNS = [
  /^\/_next/,
  /^\/api/,
  /^\/favicon/,
  /\.\w+$/, // files with extensions
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static/internal routes
  if (SKIP_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (set by client-side)
  // Note: Since we use localStorage for token storage (client-side),
  // the middleware primarily handles initial page load redirects.
  // We use a cookie mirror approach: the auth context sets a cookie
  // alongside localStorage so the middleware can read it.
  const token = request.cookies.get("auth_token")?.value;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Unauthenticated user trying to access protected route
  if (!token && !isPublicRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access auth pages — redirect to dashboard
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Root redirect: send to dashboard if authenticated, login if not
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
