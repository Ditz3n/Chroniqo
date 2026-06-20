/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for user friend requests.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import {
  DELETE as userFriendDELETE,
  POST as userFriendPOST,
} from "@/app/api/users/[username]/friend/route";
import { PUT as userRequestPUT } from "@/app/api/users/requests/[id]/route";
import { GET as usersRequestsGET } from "@/app/api/users/requests/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

describe("Users Friend and Request API", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const friendParams = Promise.resolve({ username: "targetuser" });
  const requestParams = Promise.resolve({ id: "req-1" });

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

  it("friend POST should create request if valid", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendRequest.findFirst.mockResolvedValue(null);
    prismaDeepMock.friendRequest.create.mockResolvedValue(
      {} as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.create>
      >,
    );

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "POST",
      },
    );
    const res = await userFriendPOST(req, { params: friendParams });

    expect(res.status).toBe(200);
    expect(prismaDeepMock.friendRequest.create).toHaveBeenCalled();
  });

  it("friend POST should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "POST",
      },
    );
    const res = await userFriendPOST(req, { params: friendParams });

    expect(res.status).toBe(401);
  });

  it("friend POST should return 404 when target user does not exist", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/unknown/friend", {
      method: "POST",
    });
    const res = await userFriendPOST(req, {
      params: Promise.resolve({ username: "unknown" }),
    });

    expect(res.status).toBe(404);
  });

  it("friend POST should return 400 when adding yourself", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-1",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

    const req = new Request("https://chroniqo.com/api/users/self/friend", {
      method: "POST",
    });
    const res = await userFriendPOST(req, {
      params: Promise.resolve({ username: "self" }),
    });

    expect(res.status).toBe(400);
  });

  it("friend POST should return 400 when request already exists", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendRequest.findFirst.mockResolvedValue({
      id: "fr-1",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.friendRequest.findFirst>
    >);

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "POST",
      },
    );
    const res = await userFriendPOST(req, { params: friendParams });

    expect(res.status).toBe(400);
  });

  it("friend POST should return 500 on unexpected error", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockRejectedValue(new Error("DB fail"));

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "POST",
      },
    );
    const res = await userFriendPOST(req, { params: friendParams });

    expect(res.status).toBe(500);
  });

  it("friend DELETE should remove requests and friendships", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "user-2",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
    prismaDeepMock.friendRequest.deleteMany.mockResolvedValue(
      {} as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.deleteMany>
      >,
    );
    prismaDeepMock.friendship.deleteMany.mockResolvedValue(
      {} as unknown as Awaited<
        ReturnType<typeof prismaMock.friendship.deleteMany>
      >,
    );

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "DELETE",
      },
    );
    const res = await userFriendDELETE(req, { params: friendParams });

    expect(res.status).toBe(200);
  });

  it("friend DELETE should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "DELETE",
      },
    );
    const res = await userFriendDELETE(req, { params: friendParams });

    expect(res.status).toBe(401);
  });

  it("friend DELETE should return 404 when target user does not exist", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/unknown/friend", {
      method: "DELETE",
    });
    const res = await userFriendDELETE(req, {
      params: Promise.resolve({ username: "unknown" }),
    });

    expect(res.status).toBe(404);
  });

  it("friend DELETE should return 500 on unexpected error", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockRejectedValue(new Error("DB fail"));

    const req = new Request(
      "https://chroniqo.com/api/users/targetuser/friend",
      {
        method: "DELETE",
      },
    );
    const res = await userFriendDELETE(req, { params: friendParams });

    expect(res.status).toBe(500);
  });

  it("requests GET should return pending requests", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findMany.mockResolvedValue([
      { id: "req-1" },
    ] as unknown as Awaited<
      ReturnType<typeof prismaMock.friendRequest.findMany>
    >);

    const res = await usersRequestsGET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.requests).toHaveLength(1);
  });

  it("requests GET should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await usersRequestsGET();

    expect(res.status).toBe(401);
  });

  it("requests GET should return 500 on unexpected error", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findMany.mockRejectedValue(
      new Error("DB fail"),
    );

    const res = await usersRequestsGET();

    expect(res.status).toBe(500);
  });

  it("requests PUT should accept and create friendships", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findUnique.mockResolvedValue({
      id: "req-1",
      receiverId: "user-1",
      senderId: "user-2",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.friendRequest.findUnique>
    >);
    prismaDeepMock.$transaction.mockResolvedValue([
      {},
      {},
      {},
    ] as unknown as Awaited<ReturnType<typeof prismaMock.$transaction>>);

    const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
      method: "PUT",
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    const res = await userRequestPUT(req, { params: requestParams });

    expect(res.status).toBe(200);
    expect(prismaDeepMock.friendship.create).toHaveBeenCalledTimes(2);
  });

  it("requests PUT should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
      method: "PUT",
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    const res = await userRequestPUT(req, { params: requestParams });

    expect(res.status).toBe(401);
  });

  it("requests PUT should return 404 when request does not belong to user", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findUnique.mockResolvedValue({
      id: "req-1",
      receiverId: "another-user",
      senderId: "user-2",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.friendRequest.findUnique>
    >);

    const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
      method: "PUT",
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    const res = await userRequestPUT(req, { params: requestParams });

    expect(res.status).toBe(404);
  });

  it("requests PUT should decline and delete request", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findUnique.mockResolvedValue({
      id: "req-1",
      receiverId: "user-1",
      senderId: "user-2",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.friendRequest.findUnique>
    >);
    prismaDeepMock.friendRequest.delete.mockResolvedValue(
      {} as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.delete>
      >,
    );

    const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
      method: "PUT",
      body: JSON.stringify({ action: "DECLINE" }),
    });
    const res = await userRequestPUT(req, { params: requestParams });

    expect(res.status).toBe(200);
    expect(prismaDeepMock.friendRequest.delete).toHaveBeenCalledWith({
      where: { id: "req-1" },
    });
  });

  it("requests PUT should return 500 on unexpected error", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.friendRequest.findUnique.mockRejectedValue(
      new Error("DB fail"),
    );

    const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
      method: "PUT",
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    const res = await userRequestPUT(req, { params: requestParams });

    expect(res.status).toBe(500);
  });
});
