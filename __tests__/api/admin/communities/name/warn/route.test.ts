/**
 * @jest-environment node
 */

// __tests__/api/admin/communities/name/warn/route.test.ts

/*
 * This test suite verifies the functionality of the POST /api/admin/communities/[name]/warn API route.
 * It checks for proper authentication, community existence, and the warning process for community leaders.
 */

import { POST } from "@/app/api/admin/communities/[name]/warn/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { Community, PrismaClient } from "@prisma/client";
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

describe("Admin Warn Community API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockAdminSession: Session = {
    user: { id: "admin-1", role: "ADMIN" },
    expires: new Date().toISOString(),
  } as Session;
  const params = Promise.resolve({ name: "TestComm" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if not ADMIN", async () => {
    mockedAuth.mockResolvedValue({ user: { role: "USER" } });
    const req = new Request("https://chroniqo.com/api", { method: "POST" });
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("should warn community leaders", async () => {
    mockedAuth.mockResolvedValue(mockAdminSession);
    prismaDeepMock.community.findUnique.mockResolvedValue({
      id: "c1",
      name: "TestComm",
    } as unknown as Community);

    const mockTx = {
      report: { count: jest.fn().mockResolvedValue(5) },
      communityMember: {
        findMany: jest.fn().mockResolvedValue([{ userId: "leader1" }]),
      },
      notification: { createMany: jest.fn() },
      adminWarning: { create: jest.fn() },
    };
    setTransactionMock(mockTx);

    const req = new Request("https://chroniqo.com/api", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(200);

    expect(mockTx.report.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetCommunityId: "c1", isSuppressed: false },
      }),
    );
    expect(mockTx.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "leader1",
          type: "WARNING",
          title: expect.stringContaining("system_action_title"),
          message: expect.stringContaining("admin_warning_message_community"),
        },
      ],
    });
    expect(mockTx.adminWarning.create).toHaveBeenCalledWith({
      data: { adminId: "admin-1", targetCommunityId: "c1" },
    });
  });
});
