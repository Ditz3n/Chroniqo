/**
 * @jest-environment node
 */

// __tests__/api/admin/users/username/ban/route.test.ts

/*
 * This test suite validates the functionality of the Admin Ban User API endpoint.
 * It ensures that only authenticated ADMIN users can access the endpoint and that the banning logic
 * correctly creates a global ban, notifies reporters, deletes the user, and sends a ban email.
 * The tests mock the authentication mechanism, Prisma database interactions, and email sending to isolate the API logic.
 */

import { POST } from "@/app/api/admin/users/[username]/ban/route";
import { auth } from "@/auth";
import { sendBanEmail } from "@/lib/mail";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient, User } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/mail", () => ({
  sendBanEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/prisma");
jest.mock("@/lib/upstash", () => ({
  setBanFlag: jest.fn().mockResolvedValue(undefined),
  clearBanFlag: jest.fn().mockResolvedValue(undefined),
  redis: {},
  rateLimiter: {},
}));

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

const setTransactionMock = <T extends object>(tx: T) => {
  (prismaDeepMock.$transaction as unknown as jest.Mock).mockImplementation(
    async (callback: (trx: T) => Promise<unknown>) => callback(tx),
  );
};

describe("Admin Global Ban User API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockAdminSession: Session = {
    user: { id: "admin-1", role: "ADMIN" },
    expires: new Date().toISOString(),
  } as Session;
  const params = Promise.resolve({ username: "bad_guy" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not an ADMIN", async () => {
    mockedAuth.mockResolvedValue({ user: { role: "USER" } });
    const req = new Request("https://chroniqo.com/api", { method: "POST" });
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("should execute transaction to ban, notify reporters, and delete user", async () => {
    mockedAuth.mockResolvedValue(mockAdminSession);
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "bad@guy.com",
      locale: "en",
    } as unknown as User);

    const mockTx = {
      globalBan: { upsert: jest.fn() },
      session: { deleteMany: jest.fn() },
      report: {
        findMany: jest.fn().mockResolvedValue([{ reporterId: "reporter1" }]),
        deleteMany: jest.fn(),
      },
      notification: { createMany: jest.fn() },
    };
    setTransactionMock(mockTx);

    const req = new Request("https://chroniqo.com/api", {
      method: "POST",
      body: JSON.stringify({ reason: "Trolling" }),
    });

    const res = await POST(req, { params });
    expect(res.status).toBe(200);

    expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    expect(mockTx.globalBan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: "bad@guy.com",
          reason: "Trolling",
        }),
      }),
    );
    expect(mockTx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "reporter1",
          type: "SYSTEM",
          title: expect.stringContaining("topNavbar.system_action_title"),
          message: expect.stringContaining(
            "topNavbar.reported_user_banned_message",
          ),
        },
      ],
    });
    expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
    expect(sendBanEmail).toHaveBeenCalledWith(
      "bad@guy.com",
      "en",
      "Trolling",
      null,
    );
  });
});
