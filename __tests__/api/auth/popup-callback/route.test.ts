// __tests__/api/auth/popup-callback/route.test.ts

/*
 * Tests for GET /api/auth/popup-callback.
 * The handler has four branches:
 *   1. banned=true query param      -> postMessage HTML containing OAUTH_BANNED payload
 *   2. Active session ban in DB     -> postMessage HTML containing OAUTH_BANNED payload
 *   3. showRemember=true            -> remember-me interstitial HTML page
 *   4. Fallback (no showRemember)   -> postMessage HTML with google-auth-success payload
 *
 * Cookies and Prisma are mocked; the HTML string is asserted via res.text()
 * since the handler returns text/html rather than JSON.
 */

import { GET } from "@/app/api/auth/popup-callback/route";
import { prisma as prismaMock } from "@/lib/prisma";
import { cookies } from "next/headers";

jest.mock("@/lib/prisma");
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Helper to build a GET Request for the popup-callback endpoint
function makeRequest(params: Record<string, string>): Request {
  const url = new URL("https://chroniqo.com/api/auth/popup-callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString());
}

// Reusable cookies mock that returns no session token
function mockNoSessionCookies() {
  (cookies as jest.Mock).mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  });
}

// Reusable cookies mock that returns a session token
function mockSessionCookies(token = "test-session-token") {
  (cookies as jest.Mock).mockResolvedValue({
    get: jest.fn().mockImplementation((name: string) => {
      if (name === "next-auth.session-token") return { value: token };
      return undefined;
    }),
  });
}

describe("GET /api/auth/popup-callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Branch 1: banned=true in query string (OAuth ban redirect)
  describe("Case 1 - banned=true query param", () => {
    it("should return HTML with OAUTH_BANNED payload and not query Prisma", async () => {
      const req = makeRequest({
        banned: "true",
        token: "delete-token-abc",
        reason: "TOS Violation",
        expires: "2099-01-01T00:00:00.000Z",
        dataAlreadyDeleted: "false",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/html");

      // postMessage payload must contain the ban type and forwarded params
      expect(html).toContain("OAUTH_BANNED");
      expect(html).toContain("delete-token-abc");
      expect(html).toContain("TOS Violation");

      // Prisma must never be called - the handler exits early
      expect(prismaMock.session.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.globalBan.findFirst).not.toHaveBeenCalled();
    });

    it("should correctly set dataAlreadyDeleted=true when the flag is present", async () => {
      const req = makeRequest({
        banned: "true",
        token: "",
        reason: "",
        expires: "",
        dataAlreadyDeleted: "true",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(html).toContain("true"); // dataAlreadyDeleted
    });
  });

  // Branch 2: active ban found for the authenticated session's email
  describe("Case 2 - active ban in session", () => {
    it("should return OAUTH_BANNED HTML when the session user has an active ban", async () => {
      mockSessionCookies();

      (prismaMock.session.findUnique as jest.Mock).mockResolvedValue({
        user: { email: "banned@example.com" },
      });

      (prismaMock.globalBan.findFirst as jest.Mock).mockResolvedValue({
        deleteToken: "ban-delete-token",
        reason: "Repeated abuse",
        expiresAt: null,
        userId: "user-123",
      });

      const req = makeRequest({ showRemember: "true", locale: "en" });

      const res = await GET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain("OAUTH_BANNED");
      expect(html).toContain("ban-delete-token");
      expect(html).toContain("Repeated abuse");

      // Must NOT fall through to the remember-me page
      expect(html).not.toContain("remember_me_title");
      expect(html).not.toContain("Remember me on this device");
    });

    it("should skip the ban check and proceed when there is no session token", async () => {
      mockNoSessionCookies();

      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      // No session token means the DB ban check is skipped entirely
      expect(prismaMock.session.findUnique).not.toHaveBeenCalled();

      // Should fall through to the remember-me page
      expect(html).toContain("Yes, keep me logged in");
    });

    it("should skip the ban check when the session has no user email", async () => {
      mockSessionCookies();

      (prismaMock.session.findUnique as jest.Mock).mockResolvedValue({
        user: { email: null },
      });

      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(prismaMock.globalBan.findFirst).not.toHaveBeenCalled();
      expect(html).toContain("Yes, keep me logged in");
    });
  });

  // Branch 3: showRemember=true - remember-me interstitial
  describe("Case 3 - showRemember=true", () => {
    beforeEach(() => {
      mockNoSessionCookies();
    });

    it("should return the remember-me HTML page in English", async () => {
      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/html");
      expect(html).toContain("Remember me on this device?");
      expect(html).toContain("Yes, keep me logged in");
      expect(html).toContain("No thanks");
      expect(html).toContain("submitChoice");
      expect(html).toContain("google-auth-success");
    });

    it("should return the remember-me HTML page in Danish", async () => {
      const req = makeRequest({
        showRemember: "true",
        locale: "da",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(html).toContain("Husk mig på denne enhed?");
      expect(html).toContain("Ja, hold mig logget ind");
      expect(html).toContain("Nej tak");
    });

    it("should apply dark-mode colours when theme=dark", async () => {
      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "dark",
      });

      const res = await GET(req);
      const html = await res.text();

      // Dark background token
      expect(html).toContain("#121212"); // --background dark
      // Dark card token
      expect(html).toContain("#1e1e1e"); // --surface-opaque dark
    });

    it("should apply light-mode colours when theme=light", async () => {
      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      // Light background token
      expect(html).toContain("#f7f7f5"); // --background light
      // Light card token
      expect(html).toContain("#eeede9"); // --surface light
    });

    it("should default to light theme when theme param is absent or invalid", async () => {
      const req = makeRequest({ showRemember: "true", locale: "en" });

      const res = await GET(req);
      const html = await res.text();

      expect(html).toContain("#f7f7f5"); // --background light
    });

    it("should include the fade-slide-in animation keyframe", async () => {
      const req = makeRequest({
        showRemember: "true",
        locale: "en",
        theme: "light",
      });

      const res = await GET(req);
      const html = await res.text();

      expect(html).toContain("fadeSlideIn");
      expect(html).toContain("cubic-bezier");
    });
  });

  // Branch 4: fallback - showRemember not set
  describe("Case 4 - fallback (no showRemember)", () => {
    it("should return the generic success postMessage HTML", async () => {
      mockNoSessionCookies();

      const req = makeRequest({});

      const res = await GET(req);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain("google-auth-success");
      expect(html).toContain("rememberMe: false");
      expect(html).toContain("Authentication successful");
    });
  });
});
