/**
 * @jest-environment node
 */

// __tests__/api/users/settings/security/route.test.ts

/*
 * Tests for the settings security route.
 * GET: returns emailVerified and hasPassword flags.
 * POST: resends the verification email, enforces the 5-minute rate limit,
 * and rejects already-verified accounts.
 */

import { GET, POST } from "@/app/api/users/settings/security/route";
import { auth } from "@/auth";
import { sendEmailVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateEmailVerificationToken } from "@/services/auth.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/mail", () => ({ sendEmailVerificationEmail: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    emailVerificationToken: { findFirst: jest.fn() },
    passwordResetToken: { findFirst: jest.fn() },
  },
}));
jest.mock("@/services/auth.service", () => ({
  generateEmailVerificationToken: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockFindUser = prisma.user.findUnique as jest.Mock;
const mockFindToken = prisma.emailVerificationToken.findFirst as jest.Mock;
const mockGenToken = generateEmailVerificationToken as jest.Mock;
const mockSendEmail = sendEmailVerificationEmail as jest.Mock;
const mockFindVerifToken = prisma.emailVerificationToken.findFirst as jest.Mock;
const mockFindPasswordResetToken = prisma.passwordResetToken
  .findFirst as jest.Mock;
const mockFindPasswordToken = prisma.passwordResetToken.findFirst as jest.Mock;

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/users/settings/security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockFindUser.mockResolvedValue({
    emailVerified: null,
    hashedPassword: "hashed_pw",
    email: "test@example.com",
    locale: "da",
  });
  mockFindToken.mockResolvedValue(null);
  mockFindVerifToken.mockResolvedValue(null);
  mockFindPasswordResetToken.mockResolvedValue(null);
  mockFindPasswordToken.mockResolvedValue(null);

  mockGenToken.mockResolvedValue({ token: "generated-token" });
  mockSendEmail.mockResolvedValue(undefined);
});

describe("GET /api/users/settings/security", () => {
  it("returns emailVerified: false and hasPassword: true for an unverified user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      emailVerified: false,
      resendCooldown: false,
      resendCooldownExpiresAt: null,
      passwordResetPending: false,
      passwordResetExpiresAt: null,
    });
  });

  it("returns emailVerified: true when emailVerified is set", async () => {
    mockFindUser.mockResolvedValue({
      emailVerified: new Date(),
      hashedPassword: "hashed_pw",
    });

    const res = await GET();
    const json = await res.json();

    expect(json.emailVerified).toBe(true);
  });

  it("returns resendCooldown: true when a token was issued within 5 minutes", async () => {
    mockFindVerifToken.mockResolvedValue({ id: "recent-tok" });

    const res = await GET();
    const json = await res.json();

    expect(json.resendCooldown).toBe(true);
  });

  it("returns passwordResetPending: true when a reset token is active", async () => {
    mockFindPasswordToken.mockResolvedValue({
      id: "tok-1",
      expires: new Date(Date.now() + 3600_000),
    });

    const res = await GET();
    const json = await res.json();

    expect(json.passwordResetPending).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 404 when the user no longer exists", async () => {
    mockFindUser.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
  });
});

describe("POST /api/users/settings/security - resend verification", () => {
  it("sends a new verification email and returns 200", async () => {
    const res = await POST(makePostRequest({ action: "resend-verification" }));

    expect(res.status).toBe(200);
    expect(mockGenToken).toHaveBeenCalledWith("user-1", "test@example.com");
    expect(mockSendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "generated-token",
      "da",
    );
  });

  it("returns 400 if the email is already verified", async () => {
    mockFindUser.mockResolvedValue({
      emailVerified: new Date(),
      email: "test@example.com",
      locale: "da",
    });

    const res = await POST(makePostRequest({ action: "resend-verification" }));

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 429 and does not send when a token was issued within 5 minutes", async () => {
    mockFindToken.mockResolvedValue({ id: "recent-tok" });

    const res = await POST(makePostRequest({ action: "resend-verification" }));

    expect(res.status).toBe(429);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makePostRequest({ action: "resend-verification" }));

    expect(res.status).toBe(401);
  });

  it("returns 400 on an invalid action value", async () => {
    const res = await POST(makePostRequest({ action: "not-a-real-action" }));

    expect(res.status).toBe(400);
  });
});
