/**
 * @jest-environment node
 */

// __tests__/api/auth/verify-signup/route.test.ts

/*
 * Tests the signup email verification route.
 * Verifies redirect behaviour for missing, invalid, expired, and valid tokens,
 * ensuring the route delegates correctly to the auth service and never leaks
 * token validation logic into the HTTP layer.
 */

import { GET } from "@/app/api/auth/verify-signup/route";
import { verifySignupToken } from "@/services/auth.service";

jest.mock("@/services/auth.service", () => ({
  verifySignupToken: jest.fn(),
}));

const mockVerifySignupToken = verifySignupToken as jest.Mock;

describe("GET /api/auth/verify-signup", () => {
  const BASE_URL = "https://chroniqo.com";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = BASE_URL;
  });

  it("redirects to missing status when no token query param is provided", async () => {
    const req = new Request(`${BASE_URL}/api/auth/verify-signup`);

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=missing");
  });

  it("redirects to success when token is valid", async () => {
    mockVerifySignupToken.mockResolvedValue(true);

    const req = new Request(
      `${BASE_URL}/api/auth/verify-signup?token=valid-token`,
    );

    const res = await GET(req);

    expect(mockVerifySignupToken).toHaveBeenCalledWith("valid-token");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=success");
  });

  it("redirects to expired status when token has expired", async () => {
    mockVerifySignupToken.mockRejectedValue(new Error("Token has expired"));

    const req = new Request(
      `${BASE_URL}/api/auth/verify-signup?token=expired-token`,
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=expired");
  });

  it("redirects to invalid status when token does not exist", async () => {
    mockVerifySignupToken.mockRejectedValue(new Error("Invalid token"));

    const req = new Request(
      `${BASE_URL}/api/auth/verify-signup?token=bad-token`,
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=invalid");
  });

  it("redirects to invalid status for unexpected service errors", async () => {
    mockVerifySignupToken.mockRejectedValue(new Error("Unexpected DB error"));

    const req = new Request(
      `${BASE_URL}/api/auth/verify-signup?token=any-token`,
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=invalid");
  });
});
