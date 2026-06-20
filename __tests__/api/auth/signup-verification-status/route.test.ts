/**
 * @jest-environment node
 */

// __tests__/api/auth/signup-verification-status/route.test.ts

/*
 * Tests the polling endpoint that returns the current signup verification
 * status for an authenticated user. Verifies authentication gating,
 * correct DB query shape, and response payload structure.
 */

import { GET } from "@/app/api/auth/signup-verification-status/route";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { User } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;
const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("GET /api/auth/signup-verification-status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns verified false and null tokenCreatedAt when not yet verified", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    prismaDeepMock.user.findUnique.mockResolvedValue({
      signupVerified: null,
      signupVerificationToken: null,
    } as unknown as User);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(false);
    expect(json.tokenCreatedAt).toBeNull();
  });

  it("returns verified true when signupVerified is set", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    prismaDeepMock.user.findUnique.mockResolvedValue({
      signupVerified: new Date(),
      signupVerificationToken: null,
    } as unknown as User);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
  });

  it("returns tokenCreatedAt when an active token exists", async () => {
    const tokenDate = new Date("2025-01-01T12:00:00Z");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    prismaDeepMock.user.findUnique.mockResolvedValue({
      signupVerified: null,
      signupVerificationToken: { createdAt: tokenDate },
    } as unknown as User);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verified).toBe(false);
    expect(new Date(json.tokenCreatedAt)).toEqual(tokenDate);
  });
});
