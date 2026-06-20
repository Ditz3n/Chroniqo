/**
 * @jest-environment node
 */

// __tests__/api/users/username/warn/route.test.ts

/*
 * This test suite verifies the functionality of the POST API route for warning users.
 * It checks for proper authentication, validation of the payload, and the creation
 * of a warning notification. Mocking is used to isolate the route logic from the
 * actual database and authentication layers.
 */

import { POST } from "@/app/api/users/[username]/warn/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient, User } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");
const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

const setTransactionMock = <T extends object>(tx: T) => {
  (prismaDeepMock.$transaction as unknown as jest.Mock).mockImplementation(
    async (callback: (trx: T) => Promise<unknown>) => callback(tx),
  );
};

describe("Warn User API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockSession: Session = {
    user: {
      id: "mod-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "mod@example.com",
    },
    expires: new Date().toISOString(),
  };
  const params = Promise.resolve({ username: "bad-user" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/users/bad-user/warn", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("should return 400 on invalid payload", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const req = new Request("https://chroniqo.com/api/users/bad-user/warn", {
      method: "POST",
      body: JSON.stringify({ reason: "No community name" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("should return 404 if target user is not found", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/bad-user/warn", {
      method: "POST",
      body: JSON.stringify({ communityName: "Test", reason: "Spam" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("should execute transaction to cap warnings at 3 and create a new warning", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "target-user-id",
    } as unknown as User);

    const mockTx = {
      notification: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: "warn-1" },
            { id: "warn-2" },
            { id: "warn-3" },
          ]), // User already has 3 warnings
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };

    setTransactionMock(mockTx);

    const req = new Request("https://chroniqo.com/api/users/bad-user/warn", {
      method: "POST",
      body: JSON.stringify({
        communityName: "TestComm",
        reason: "Spam behavior",
        postTitle: "My Post Title",
      }),
    });

    const res = await POST(req, { params });
    expect(res.status).toBe(200);

    expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    // It should delete the oldest to make room (3 - 2 = 1 to delete)
    expect(mockTx.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["warn-1"] } },
    });

    expect(mockTx.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "target-user-id",
        type: "WARNING",
        title: expect.stringContaining('"key":"topNavbar.warning_title"'),
        message: expect.stringContaining(
          '"key":"topNavbar.warning_message_post"',
        ),
      },
    });
    expect(mockTx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: expect.stringContaining('"community":"TestComm"'),
        message: expect.stringContaining('"post":"My Post Title"'),
      }),
    });
  });
});
