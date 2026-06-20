/**
 * @jest-environment node
 */

// __tests__/api/admin/reports/route.test.ts

/*
 * This test suite validates the functionality of the Admin Global Reports Overview API endpoint.
 * It ensures that only authenticated ADMIN users can access the endpoint and that the aggregation logic
 * for reported users and communities works correctly.
 * The tests mock the authentication mechanism and Prisma database interactions to isolate the API logic.
 */

import { GET } from "@/app/api/admin/reports/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { Community, PrismaClient, User } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Admin Global Reports Overview API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockAdminSession: Session = {
    user: {
      id: "admin-1",
      onboarded: true,
      hasPassword: true,
      role: "ADMIN",
      email: "admin@example.com",
    },
    expires: new Date().toISOString(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("should return 401 if user is not an ADMIN", async () => {
    mockedAuth.mockResolvedValue({ user: { role: "USER" } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("should aggregate reports successfully for an ADMIN", async () => {
    mockedAuth.mockResolvedValue(mockAdminSession);

    prismaDeepMock.report.findMany.mockResolvedValue([
      { targetUserId: "u1", targetPost: null, targetComment: null },
      {
        targetUserId: null,
        targetPost: { authorId: "u1" },
        targetComment: null,
      },
      {
        targetUserId: null,
        targetPost: null,
        targetComment: { authorId: "u1" },
      },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.report.findMany>>);

    prismaDeepMock.report.groupBy.mockResolvedValue([
      { targetCommunityId: "c1", _count: { id: 5 } },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.report.groupBy>>);

    prismaDeepMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        username: "bad_user",
        name: "Bad User",
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        headerEmoji: null,
        headerBgColor: null,
      },
    ] as unknown as User[]);
    prismaDeepMock.community.findMany.mockResolvedValue([
      {
        id: "c1",
        name: "bad_comm",
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        headerEmoji: null,
        headerBgColor: null,
        isPrivate: false,
        isActive: true,
        bannedUntil: null,
      },
    ] as unknown as Community[]);
    prismaDeepMock.globalMute.findMany.mockResolvedValue([
      // No active mutes for this test user
      // { userId: "u1", expiresAt: null },
    ]);

    prismaDeepMock.dailyStatus.findMany.mockResolvedValue([
      // No daily status for this test user
      // { userId: "u1", value: null },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reportedUsers).toHaveLength(1);
    expect(json.reportedUsers[0].reportCount).toBe(3);
    expect(json.reportedCommunities).toHaveLength(1);
    expect(json.reportedCommunities[0].reportCount).toBe(5);
  });
});
