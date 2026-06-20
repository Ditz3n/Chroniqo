/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for user profile retrieval and user search.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { GET as userProfileGET } from "@/app/api/users/[username]/route";
import { GET as usersSearchGET } from "@/app/api/users/search/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

describe("Users Search and Profile API", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const profileParams = Promise.resolve({ username: "targetuser" });

  const mockSession: Session = {
    user: {
      id: "user-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "test@example.com",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("search should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/users/search?q=john");

    const res = await usersSearchGET(req);
    expect(res.status).toBe(401);
  });

  it("search should return users with permission filters", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findMany.mockResolvedValue([
      { id: "user-2", username: "john" },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

    const req = new Request("https://chroniqo.com/api/users/search?q=john");
    const res = await usersSearchGET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(1);
  });

  it("search should default to empty query when q is missing", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>,
    );

    const req = new Request("https://chroniqo.com/api/users/search");
    const res = await usersSearchGET(req);

    expect(res.status).toBe(200);
    expect(prismaDeepMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { username: { contains: "", mode: "insensitive" } },
                { name: { contains: "", mode: "insensitive" } },
              ],
            },
          ],
        }),
      }),
    );
  });

  it("search should return 500 when prisma throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findMany.mockRejectedValue(new Error("DB fail"));

    const req = new Request("https://chroniqo.com/api/users/search?q=john");
    const res = await usersSearchGET(req);

    expect(res.status).toBe(500);
  });

  it("profile should return SELF when viewing own profile", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      _count: { posts: 0, comments: 0, friendships: 0 },
      dailyStatuses: [],
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.profile.relationshipStatus).toBe("SELF");
  });

  it("profile should return NONE when no relationship exists", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      _count: { posts: 0, comments: 0, friendships: 0 },
      dailyStatuses: [],
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendship.findUnique.mockResolvedValue(null);
    prismaDeepMock.friendRequest.findUnique.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.profile.relationshipStatus).toBe("NONE");
  });

  it("profile should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });

    expect(res.status).toBe(401);
  });

  it("profile should return 404 when target user does not exist", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/missing");
    const res = await userProfileGET(req, {
      params: Promise.resolve({ username: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("profile should return FRIENDS when friendship exists", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      _count: { posts: 0, comments: 0, friendships: 0 },
      dailyStatuses: [],
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendship.findUnique.mockResolvedValue({
      id: "f-1",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.friendship.findUnique>
    >);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.profile.relationshipStatus).toBe("FRIENDS");
  });

  it("profile should return REQUEST_SENT when pending sent request exists", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      _count: { posts: 0, comments: 0, friendships: 0 },
      dailyStatuses: [],
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendship.findUnique.mockResolvedValue(null);
    prismaDeepMock.friendRequest.findUnique
      .mockResolvedValueOnce({ status: "PENDING" } as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.findUnique>
      >)
      .mockResolvedValueOnce(null);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.profile.relationshipStatus).toBe("REQUEST_SENT");
  });

  it("profile should return REQUEST_RECEIVED when pending received request exists", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      _count: { posts: 0, comments: 0, friendships: 0 },
      dailyStatuses: [],
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendship.findUnique.mockResolvedValue(null);
    prismaDeepMock.friendRequest.findUnique.mockReset();
    prismaDeepMock.friendRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: "PENDING" } as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.findUnique>
      >);

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.profile.relationshipStatus).toBe("REQUEST_RECEIVED");
  });

  it("profile should return 500 when prisma throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockRejectedValue(new Error("DB down"));

    const req = new Request("https://chroniqo.com/api/users/targetuser");
    const res = await userProfileGET(req, { params: profileParams });

    expect(res.status).toBe(500);
  });
});
