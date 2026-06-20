/**
 * @jest-environment node
 */

// __tests__/api/communities/name/reports/route.test.ts

/*
 * This file tests the API route for fetching reports in a community.
 * It verifies that authentication is required, that the user has the necessary
 * permissions, and that the correct database queries are made to retrieve the reports.
 * Mocking is used to isolate the API route logic from the underlying authentication
 * and database layers.
 */

import { GET } from "@/app/api/communities/[name]/reports/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient, User } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

type CommunityWithMembers = Awaited<
  ReturnType<typeof prismaMock.community.findUnique>
>;

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");
const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Community Reports API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockSession: Session = {
    user: {
      id: "user-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "test@example.com",
    },
    expires: new Date().toISOString(),
  };
  const params = Promise.resolve({ name: "TestComm" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/reports",
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("should return 404 if community does not exist", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.community.findUnique.mockResolvedValue(null);

    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/reports",
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("should return 403 if user lacks moderation access", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.community.findUnique.mockResolvedValue({
      id: "comm-1",
      members: [{ role: "USER" }], // User does not have MODERATOR/ADMIN/OWNER role
    } as unknown as CommunityWithMembers);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      role: "USER",
    } as unknown as User);

    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/reports",
    );
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
  });

  it("should return 200 and fetch reports if user has access", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.community.findUnique.mockResolvedValue({
      id: "comm-1",
      members: [{ role: "MODERATOR" }],
    } as unknown as CommunityWithMembers);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      role: "USER",
    } as unknown as User);

    prismaDeepMock.report.findMany
      .mockResolvedValueOnce([]) // postReports
      .mockResolvedValueOnce([]) // commentReports
      .mockResolvedValueOnce([]); // memberReports

    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/reports",
    );
    const res = await GET(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.postReports).toEqual([]);
    expect(json.commentReports).toEqual([]);
    expect(json.memberReports).toEqual([]);
    expect(prismaDeepMock.report.findMany).toHaveBeenCalledTimes(3);
  });
});
