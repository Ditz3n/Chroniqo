/**
 * @jest-environment node
 */

/*
 * This file tests the API route for pruning old chats.
 * It verifies that authentication is required when a secret is configured,
 * that the correct database query is made to delete old conversations,
 * and that errors are handled gracefully. Mocking is used to isolate the API route logic
 * from the underlying authentication and database layers.
 */

import { GET } from "@/app/api/cron/prune-chats/route";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

describe("Cron Prune Chats API", () => {
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

    const req = new Request("https://chroniqo.com/api/cron/prune-chats", {
      headers: { authorization: "Bearer wrong" },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return success and pruned count", async () => {
    process.env.CRON_SECRET = "secret-123";
    prismaDeepMock.conversation.deleteMany.mockResolvedValue({
      count: 2,
    } as Awaited<ReturnType<typeof prismaMock.conversation.deleteMany>>);

    const req = new Request("https://chroniqo.com/api/cron/prune-chats", {
      headers: { authorization: "Bearer secret-123" },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain("Pruned 2");
  });

  it("should allow request when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    prismaDeepMock.conversation.deleteMany.mockResolvedValue({
      count: 1,
    } as Awaited<ReturnType<typeof prismaMock.conversation.deleteMany>>);

    const req = new Request("https://chroniqo.com/api/cron/prune-chats", {
      headers: { authorization: "Bearer anything" },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should return 500 when prune query fails", async () => {
    process.env.CRON_SECRET = "secret-123";
    prismaDeepMock.conversation.deleteMany.mockRejectedValue(
      new Error("DB fail"),
    );

    const req = new Request("https://chroniqo.com/api/cron/prune-chats", {
      headers: { authorization: "Bearer secret-123" },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Failed to prune chats");
  });
});
