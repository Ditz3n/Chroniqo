/**
 * @jest-environment node
 */

// __tests__/api/reports/route.test.ts

/*
 * This file tests the GET and POST methods for the reports API.
 * It verifies that unauthenticated requests fail, validation works correctly,
 * and that the correct database operations are attempted for creating/updating reports.
 */

import { GET, POST } from "@/app/api/reports/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

type BaseReportTx = {
  report: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

type ReportBlockTx = BaseReportTx & {
  globalBlock: {
    upsert: jest.Mock;
  };
  friendship: {
    deleteMany: jest.Mock;
  };
  friendRequest: {
    deleteMany: jest.Mock;
  };
};

const setTransactionMock = <T extends object>(tx: T) => {
  (prismaDeepMock.$transaction as unknown as jest.Mock).mockImplementation(
    async (callback: (trx: T) => Promise<unknown>) => callback(tx),
  );
};

describe("Reports API Routes", () => {
  const mockedAuth = auth as jest.Mock;

  const mockSession: Session = {
    user: {
      id: "reporter-user-id",
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

  describe("GET /api/reports", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/reports?targetType=USER&targetId=123",
      );
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if targetType or targetId are missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request(
        "https://chroniqo.com/api/reports?targetType=USER",
      );
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("should return existing report reason if found", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const mockReport = {
        id: "report-1",
        reporterId: "reporter-user-id",
        reason: "Previous report reason",
        isSuppressed: false,
        targetUserId: null,
        targetCommunityId: null,
        targetPostId: "post-1",
        targetCommentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDummy: false,
      };
      prismaDeepMock.report.findFirst.mockResolvedValue(mockReport);

      const req = new Request(
        "https://chroniqo.com/api/reports?targetType=POST&targetId=post-1",
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.report.reason).toBe("Previous report reason");
      expect(prismaDeepMock.report.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reporterId: "reporter-user-id",
            targetPostId: "post-1",
          }),
        }),
      );
    });
  });

  describe("POST /api/reports", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/reports", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if validation fails (e.g. reason too short)", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "USER",
          targetId: "target-id",
          reason: "short", // Fails Zod validation
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 if user tries to report themselves", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "USER",
          targetId: "reporter-user-id", // Same as session user ID
          reason: "This is a valid long enough reason.",
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBe("Cannot report yourself");
    });

    it("should execute transaction to create a new report", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      // Simulate no existing report found inside the transaction
      const mockTx: BaseReportTx = {
        report: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "report-1" }),
          update: jest.fn(),
        },
      };

      setTransactionMock(mockTx);

      const req = new Request("https://chroniqo.com/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "USER",
          targetId: "bad-user",
          reason: "This user is breaking the rules.",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
      expect(mockTx.report.findFirst).toHaveBeenCalled();
      expect(mockTx.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: "reporter-user-id",
            targetUserId: "bad-user",
          }),
        }),
      );
      expect(mockTx.report.update).not.toHaveBeenCalled();
    });

    it("should execute transaction to upsert and block user if requested", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      // Mock the transaction callback to capture and verify tx operations
      const mockTx: ReportBlockTx = {
        report: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: "report-1" }),
          update: jest.fn(),
        },
        globalBlock: {
          upsert: jest.fn().mockResolvedValue({
            blockerId: "reporter-user-id",
            blockedId: "bad-user",
          }),
        },
        friendship: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        friendRequest: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };

      setTransactionMock(mockTx);

      const req = new Request("https://chroniqo.com/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "USER",
          targetId: "bad-user",
          reason: "This user is breaking the rules.",
          blockUser: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();

      // Assert that the transaction operations were called
      expect(mockTx.report.create).toHaveBeenCalled();
      expect(mockTx.globalBlock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            blockerId_blockedId: {
              blockerId: "reporter-user-id",
              blockedId: "bad-user",
            },
          },
        }),
      );
      expect(mockTx.friendship.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
      expect(mockTx.friendRequest.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
    });
  });
});
