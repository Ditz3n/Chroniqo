/**
 * @jest-environment node
 */

// __tests__/api/cron/prune-unverified-users.test.ts

/*
 * Tests the cron route for pruning unverified ghost accounts.
 * Verifies authentication gating, correct deletion query construction,
 * and graceful error handling - mirroring the prune-chats test structure.
 */

import { GET } from "@/app/api/cron/prune-unverified-users/route";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

describe("Cron Prune Unverified Users API", () => {
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("should return 401 when secret is configured and header is invalid", async () => {
    process.env.CRON_SECRET = "secret-123";

    const req = new Request(
      "https://chroniqo.com/api/cron/prune-unverified-users",
      { headers: { authorization: "Bearer wrong" } },
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return success and pruned count when users are deleted", async () => {
    process.env.CRON_SECRET = "secret-123";
    prismaDeepMock.user.deleteMany.mockResolvedValue({ count: 3 });

    const req = new Request(
      "https://chroniqo.com/api/cron/prune-unverified-users",
      { headers: { authorization: "Bearer secret-123" } },
    );

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("3");
  });

  it("should delete only unverified, non-OAuth, non-dummy users older than 24 hours", async () => {
    process.env.CRON_SECRET = "secret-123";
    prismaDeepMock.user.deleteMany.mockResolvedValue({ count: 0 });

    const req = new Request(
      "https://chroniqo.com/api/cron/prune-unverified-users",
      { headers: { authorization: "Bearer secret-123" } },
    );

    await GET(req);

    const callArgs = prismaDeepMock.user.deleteMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      signupVerified: null,
      accounts: { none: {} },
      isDummy: false,
    });
    // Cutoff date must be approximately 24h in the past
    const cutoff = callArgs?.where?.createdAt as { lte: Date };
    const cutoffMs = cutoff.lte.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    expect(cutoffMs).toBeLessThanOrEqual(Date.now() - twentyFourHours + 5000);
    expect(cutoffMs).toBeGreaterThanOrEqual(
      Date.now() - twentyFourHours - 5000,
    );
  });

  it("should allow request when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    prismaDeepMock.user.deleteMany.mockResolvedValue({ count: 0 });

    const req = new Request(
      "https://chroniqo.com/api/cron/prune-unverified-users",
      { headers: { authorization: "Bearer anything" } },
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should return 500 when the delete query fails", async () => {
    process.env.CRON_SECRET = "secret-123";
    prismaDeepMock.user.deleteMany.mockRejectedValue(new Error("DB fail"));

    const req = new Request(
      "https://chroniqo.com/api/cron/prune-unverified-users",
      { headers: { authorization: "Bearer secret-123" } },
    );

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to prune unverified users");
  });
});
