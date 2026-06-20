/**
 * @jest-environment node
 */

// __tests__/api/auth/resend-signup-verification/route.test.ts

/*
 * Tests the resend signup verification endpoint.
 * Covers authentication gating, the already-verified guard,
 * the server-side 60-second cooldown, and the happy-path resend flow.
 */

import { POST } from "@/app/api/auth/resend-signup-verification/route";
import { sendSignupVerificationEmail } from "@/lib/mail";
import { prisma as prismaMock } from "@/lib/prisma";
import { generateSignupVerificationToken } from "@/services/auth.service";
import type { PrismaClient } from "@prisma/client";
import { User } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/mail");
jest.mock("@/services/auth.service", () => ({
  generateSignupVerificationToken: jest.fn(),
}));

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
const mockGenerateToken = generateSignupVerificationToken as jest.Mock;
const mockSendEmail = sendSignupVerificationEmail as jest.Mock;

describe("POST /api/auth/resend-signup-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user record does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("returns 400 when the user is already verified", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    prismaDeepMock.user.findUnique.mockResolvedValue({
      email: "test@example.com",
      locale: "da",
      signupVerified: new Date(),
      signupVerificationToken: null,
    } as unknown as User);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Already verified");
  });

  it("returns 429 when the resend cooldown has not elapsed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // Token created 10 seconds ago - within the 60-second cooldown
    const recentCreatedAt = new Date(Date.now() - 10_000);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      email: "test@example.com",
      locale: "da",
      signupVerified: null,
      signupVerificationToken: { createdAt: recentCreatedAt },
    } as unknown as User);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.retryAfterSeconds).toBeGreaterThan(0);
    expect(mockGenerateToken).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("generates a new token and sends the email when cooldown has elapsed", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // Token created 90 seconds ago - past the 60-second cooldown
    const staleCreatedAt = new Date(Date.now() - 90_000);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      email: "test@example.com",
      locale: "en",
      signupVerified: null,
      signupVerificationToken: { createdAt: staleCreatedAt },
    } as unknown as User);

    const mockTokenRecord = {
      id: "svt-1",
      userId: "user-1",
      email: "test@example.com",
      token: "fresh-token-uuid",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    mockGenerateToken.mockResolvedValue(mockTokenRecord);
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockGenerateToken).toHaveBeenCalledWith(
      "user-1",
      "test@example.com",
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "test@example.com",
      "fresh-token-uuid",
      "en",
    );
  });

  it("also resends when no prior token exists (first-time returning user)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    prismaDeepMock.user.findUnique.mockResolvedValue({
      email: "new@example.com",
      locale: "da",
      signupVerified: null,
      signupVerificationToken: null,
    } as unknown as User);

    mockGenerateToken.mockResolvedValue({
      id: "svt-2",
      userId: "user-1",
      email: "new@example.com",
      token: "brand-new-token",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalled();
  });
});
