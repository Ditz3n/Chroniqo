/**
 * @jest-environment node
 *
 * This file must run in the Node environment rather than the default jsdom environment.
 * next/server (used by NextRequest) requires Web API globals (Request, Response, etc.)
 * that are available in Node 20 but not in jsdom. Without this directive, the test
 * suite fails with "ReferenceError: Request is not defined".
 */

// __tests__/middleware/proxy.test.ts

/*
 * This file tests src/proxy.ts. @upstash/ratelimit is mocked via @/lib/upstash
 * to isolate proxy logic and avoid real Redis calls in CI.
 * NextResponse is also spied on so redirects, JSON responses, and flow control
 * (NextResponse.next) can be asserted directly.
 */

import { rateLimiter } from "@/lib/upstash";
import { proxy } from "@/proxy";
import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/upstash", () => ({
  rateLimiter: {
    limit: jest.fn(),
  },
}));

describe("Locale Proxy Middleware", () => {
  const mockedLimit = rateLimiter.limit as jest.MockedFunction<
    typeof rateLimiter.limit
  >;

  const nextSpy = jest.spyOn(NextResponse, "next");
  const redirectSpy = jest.spyOn(NextResponse, "redirect");
  const jsonSpy = jest.spyOn(NextResponse, "json");

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 10_000,
      pending: Promise.resolve(),
    });
  });

  it("should not redirect if URL already contains a supported locale", async () => {
    const req = new NextRequest(new URL("https://chroniqo.com/da/feed"));
    const res = await proxy(req);

    // NextResponse.next() doesn't have a status of 307 (redirect)
    expect(res.status).not.toBe(307);
    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(mockedLimit).not.toHaveBeenCalled();
  });

  it("should redirect to default locale (da) if no locale is present and no cookie exists", async () => {
    const req = new NextRequest(new URL("https://chroniqo.com/feed"));
    // Mock headers to prevent falling back to English based on accept-language
    req.headers.set("accept-language", "da-DK,da;q=0.9");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://chroniqo.com/da/feed");
    // Ensure the cookie is set to 'da'
    expect(res.headers.get("set-cookie")).toContain("NEXT_LOCALE=da");
    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(mockedLimit).not.toHaveBeenCalled();
  });

  it("should respect the NEXT_LOCALE cookie if present", async () => {
    const req = new NextRequest(new URL("https://chroniqo.com/feed"));
    req.cookies.set("NEXT_LOCALE", "en");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://chroniqo.com/en/feed");
    expect(mockedLimit).not.toHaveBeenCalled();
  });

  it("should use English when accept-language includes en and no locale cookie exists", async () => {
    const req = new NextRequest(new URL("https://chroniqo.com/feed"));
    req.headers.set("accept-language", "en-US,en;q=0.9");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://chroniqo.com/en/feed");
    expect(res.headers.get("set-cookie")).toContain("NEXT_LOCALE=en");
    expect(mockedLimit).not.toHaveBeenCalled();
  });

  it("should apply rate limiting to API routes and continue on success", async () => {
    mockedLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 18,
      reset: 123456,
      pending: Promise.resolve(),
    });

    const req = new NextRequest(
      new URL("https://chroniqo.com/api/auth/login"),
      {
        headers: {
          "x-forwarded-for": "203.0.113.1",
        },
      },
    );

    const res = await proxy(req);

    expect(mockedLimit).toHaveBeenCalledWith("203.0.113.1");
    expect(nextSpy).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("should return 429 for API routes when rate limit is exceeded", async () => {
    mockedLimit.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: 999999,
      pending: Promise.resolve(),
    });

    const req = new NextRequest(
      new URL("https://chroniqo.com/api/auth/login"),
      {
        headers: {
          "x-forwarded-for": "203.0.113.2",
        },
      },
    );

    const res = await proxy(req);
    const payload = await res.json();

    expect(res.status).toBe(429);
    expect(payload.error).toBe("Too Many Requests");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("20");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("999999");
    expect(jsonSpy).toHaveBeenCalledTimes(1);
  });

  it("should fail closed and reject API requests when rate limiter throws", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedLimit.mockRejectedValue(new Error("Redis unavailable"));

    const req = new NextRequest(new URL("https://chroniqo.com/api/auth/login"));

    const res = await proxy(req);
    const payload = await res.json();

    expect(mockedLimit).toHaveBeenCalledWith("127.0.0.1");
    expect(nextSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
    expect(payload.error).toBe("Service temporarily unavailable");
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
