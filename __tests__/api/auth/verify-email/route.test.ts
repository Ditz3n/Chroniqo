/**
 * @jest-environment node
 */

// __tests__/api/auth/verify-email/route.test.ts

/*
 * Tests for the email verification route.
 * Covers all redirect branches: missing token, valid token,
 * expired token, and any other unexpected error.
 */

import { GET } from "@/app/api/auth/verify-email/route";
import { verifyEmailToken } from "@/services/auth.service";

jest.mock("@/services/auth.service", () => ({
  verifyEmailToken: jest.fn(),
}));

const mockVerify = verifyEmailToken as jest.Mock;
const BASE_URL = "http://localhost";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_URL = BASE_URL;
});

function makeRequest(token?: string) {
  const url = token
    ? `${BASE_URL}/api/auth/verify-email?token=${token}`
    : `${BASE_URL}/api/auth/verify-email`;
  return new Request(url);
}

describe("GET /api/auth/verify-email", () => {
  it("redirects with verificationError=missing when no token is provided", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=missing");
  });

  it("redirects with emailVerified=true on a valid token", async () => {
    mockVerify.mockResolvedValue(true);

    const res = await GET(makeRequest("valid-token"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=success");
    expect(mockVerify).toHaveBeenCalledWith("valid-token");
  });

  it("redirects with verificationError=expired when the token has expired", async () => {
    mockVerify.mockRejectedValue(new Error("Token has expired"));

    const res = await GET(makeRequest("expired-token"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=expired");
  });

  it("redirects with verificationError=invalid on an unknown error", async () => {
    mockVerify.mockRejectedValue(new Error("Invalid token"));

    const res = await GET(makeRequest("garbage-token"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("status=invalid");
  });
});
