// src/proxy.ts
import { rateLimiter } from "@/lib/upstash";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const locales = ["da", "en"];
const defaultLocale = "da";

function getLocale(request: NextRequest): string {
  // 1. Check if the user has a saved language preference in cookies
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Fall back to browser headers if no cookie is set
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang && acceptLang.includes("en")) {
    return "en";
  }

  // 3. Default to Danish
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Edge Rate Limiting for Auth Routes ONLY (Fail Fast Principle)
  if (pathname.startsWith("/api/auth")) {
    // Extract IP address from headers (fallback to 127.0.0.1 for local development)
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    try {
      const { success, limit, reset, remaining } = await rateLimiter.limit(ip);

      if (!success) {
        console.warn(`[Proxy] Auth rate limit exceeded for IP: ${ip}`);
        return NextResponse.json(
          { error: "Too Many Requests" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            },
          },
        );
      }
    } catch (error) {
      // Fail closed: if Redis is unreachable, deny the request rather than
      // letting an unprotected auth route through. This matters most when
      // nobody is around to notice Redis went down in the first place.
      console.error("[Proxy] Rate limiting error:", error);
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 },
      );
    }
  }

  // 2. Bypass Locale Routing for all API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 3. Locale Routing for non-API routes
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    // Forward the full URL (including query string) so server component layouts
    // can build accurate callbackUrl redirects without losing query params
    const response = NextResponse.next();
    response.headers.set("x-url", request.url);
    return response;
  }

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(request.nextUrl);
  // Ensure the cookie is set for future visits
  response.cookies.set("NEXT_LOCALE", locale, { path: "/" });

  return response;
}

export const config = {
  // Run the proxy on all routes except Next.js internals, favicon, SVG assets, and sounds.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|sounds).*)"],
};
