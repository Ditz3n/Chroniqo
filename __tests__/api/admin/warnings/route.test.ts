/**
 * @jest-environment node
 */

// __tests__/api/admin/warnings/route.test.ts

/*
 * This file tests the admin warnings deletion API routes.
 * It checks authentication, error handling, and correct deletion logic for warnings.
 * Prisma and auth are mocked to isolate API logic.
 */

import { DELETE as deleteCommunityWarnings } from "@/app/api/admin/communities/[name]/warnings/route";
import { DELETE as deleteUserWarnings } from "@/app/api/admin/users/[username]/warnings/route";
import { DELETE as deleteSingleWarning } from "@/app/api/admin/warnings/[id]/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import {
  AdminWarning,
  Community,
  Prisma,
  PrismaClient,
  User,
} from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Admin Warnings Deletion API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockAdminSession: Session = {
    user: { id: "admin-1", role: "ADMIN" },
    expires: new Date().toISOString(),
  } as Session;

  beforeEach(() => jest.clearAllMocks());

  describe("DELETE /api/admin/warnings/[id]", () => {
    const params = Promise.resolve({ id: "warn-1" });

    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteSingleWarning(req, { params });
      expect(res.status).toBe(401);
    });

    it("should delete a specific warning successfully", async () => {
      mockedAuth.mockResolvedValue(mockAdminSession);
      prismaDeepMock.adminWarning.delete.mockResolvedValue(
        {} as unknown as AdminWarning,
      );

      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteSingleWarning(req, { params });
      expect(res.status).toBe(200);
      expect(prismaDeepMock.adminWarning.delete).toHaveBeenCalledWith({
        where: { id: "warn-1" },
      });
    });
  });

  describe("DELETE /api/admin/users/[username]/warnings", () => {
    const params = Promise.resolve({ username: "bad_guy" });

    it("should return 404 if user not found", async () => {
      mockedAuth.mockResolvedValue(mockAdminSession);
      prismaDeepMock.user.findUnique.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteUserWarnings(req, { params });
      expect(res.status).toBe(404);
    });

    it("should clear all warnings for a user", async () => {
      mockedAuth.mockResolvedValue(mockAdminSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-123",
      } as unknown as User);
      prismaDeepMock.adminWarning.deleteMany.mockResolvedValue({
        count: 2,
      } as Prisma.BatchPayload);

      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteUserWarnings(req, { params });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.adminWarning.deleteMany).toHaveBeenCalledWith({
        where: { targetUserId: "user-123" },
      });
    });
  });

  describe("DELETE /api/admin/communities/[name]/warnings", () => {
    const params = Promise.resolve({ name: "bad_comm" });

    it("should return 404 if community not found", async () => {
      mockedAuth.mockResolvedValue(mockAdminSession);
      prismaDeepMock.community.findUnique.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteCommunityWarnings(req, { params });
      expect(res.status).toBe(404);
    });

    it("should clear all warnings for a community", async () => {
      mockedAuth.mockResolvedValue(mockAdminSession);
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-123",
      } as unknown as Community);
      prismaDeepMock.adminWarning.deleteMany.mockResolvedValue({
        count: 2,
      } as Prisma.BatchPayload);

      const req = new Request("https://chroniqo.com/api", { method: "DELETE" });
      const res = await deleteCommunityWarnings(req, { params });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.adminWarning.deleteMany).toHaveBeenCalledWith({
        where: { targetCommunityId: "comm-123" },
      });
    });
  });
});
