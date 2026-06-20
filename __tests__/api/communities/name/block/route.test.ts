/**
 * @jest-environment node
 */

// __tests__/api/communities/name/block/route.test.ts

/*
 * This file tests the POST and DELETE methods for the community blocking API.
 * It verifies that unauthenticated requests fail, users cannot block communities they own without transferring ownership,
 * and that blocking correctly triggers a transaction to create the block record.
 * Unblocking simply deletes the BlockedCommunity record.
 */

import { DELETE, POST } from "@/app/api/communities/[name]/block/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

type CommunityFindUniqueResult = Awaited<
  ReturnType<typeof prismaMock.community.findUnique>
>;
type CommunityMemberFindUniqueResult = Awaited<
  ReturnType<typeof prismaMock.communityMember.findUnique>
>;
type BlockedCommunityDeleteResult = Awaited<
  ReturnType<typeof prismaMock.blockedCommunity.delete>
>;

const setTransactionMock = <T extends object>(tx: T) => {
  (prismaDeepMock.$transaction as unknown as jest.Mock).mockImplementation(
    async (callback: (trx: T) => Promise<unknown>) => callback(tx),
  );
};

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Community Block API Routes", () => {
  const mockedAuth = auth as jest.Mock;

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

  const params = Promise.resolve({ name: "TestCommunity" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/communities/[name]/block", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "POST",
        },
      );
      const res = await POST(req, { params });
      expect(res.status).toBe(401);
    });

    it("should return 404 if community does not exist", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.community.findUnique.mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "POST",
        },
      );
      const res = await POST(req, { params });
      expect(res.status).toBe(404);
    });

    it("should return 400 if user is OWNER and there are other members", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
      } as unknown as CommunityFindUniqueResult);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue({
        role: "OWNER",
      } as unknown as CommunityMemberFindUniqueResult);
      prismaDeepMock.communityMember.count.mockResolvedValue(2);

      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "POST",
        },
      );
      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe(
        "Transfer ownership before blocking the community.",
      );
    });

    it("should execute transaction to block community successfully", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
      } as unknown as CommunityFindUniqueResult);
      prismaDeepMock.communityMember.findUnique.mockResolvedValue(null); // Not a member

      const hiddenDeleteMany = jest.fn().mockResolvedValue({ count: 1 });

      setTransactionMock({
        hiddenCommunity: { deleteMany: hiddenDeleteMany },
        blockedCommunity: { upsert: jest.fn().mockResolvedValue({}) },
        community: { delete: jest.fn().mockResolvedValue({}) },
        communityMember: { delete: jest.fn().mockResolvedValue({}) },
      });

      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "POST",
        },
      );
      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.blocked).toBe(true);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
      expect(hiddenDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          communityId: "comm-1",
        },
      });
    });
  });

  describe("DELETE /api/communities/[name]/block", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "DELETE",
        },
      );
      const res = await DELETE(req, { params });
      expect(res.status).toBe(401);
    });

    it("should return 404 if community does not exist", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.community.findUnique.mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "DELETE",
        },
      );
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
    });

    it("should delete the block record successfully", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
      } as unknown as CommunityFindUniqueResult);
      prismaDeepMock.blockedCommunity.delete.mockResolvedValue({
        userId: "user-1",
        communityId: "comm-1",
        createdAt: new Date(),
      } as unknown as BlockedCommunityDeleteResult);

      const req = new Request(
        "https://chroniqo.com/api/communities/TestCommunity/block",
        {
          method: "DELETE",
        },
      );
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.blocked).toBe(false);
      expect(prismaDeepMock.blockedCommunity.delete).toHaveBeenCalledWith({
        where: {
          userId_communityId: {
            userId: "user-1",
            communityId: "comm-1",
          },
        },
      });
    });
  });
});
