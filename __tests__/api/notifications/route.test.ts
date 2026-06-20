/**
 * @jest-environment node
 */

// __tests__/api/notifications/route.test.ts

/*
 * This test suite verifies the functionality of the notifications API routes.
 * It tests both the GET and DELETE endpoints for proper authentication,
 * authorization, and data handling.
 * Mocking is used to isolate the route logic from the actual database and authentication layers.
 */

import { DELETE } from "@/app/api/notifications/[id]/route";
import { GET } from "@/app/api/notifications/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { Notification, PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Notifications API Routes", () => {
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

  beforeEach(() => jest.clearAllMocks());

  describe("GET /api/notifications", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should fetch notifications successfully", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.notification.findMany.mockResolvedValue([
        { id: "n1", type: "WARNING" },
      ] as unknown as Notification[]);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.notifications).toHaveLength(1);
      expect(prismaDeepMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });
  });

  describe("DELETE /api/notifications/[id]", () => {
    const params = Promise.resolve({ id: "n1" });

    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/notifications/n1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(401);
    });

    it("should return 404 if notification doesn't exist or isn't owned by user", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.notification.findUnique.mockResolvedValue({
        userId: "different-user",
      } as unknown as Notification);

      const req = new Request("https://chroniqo.com/api/notifications/n1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
    });

    it("should delete notification successfully", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.notification.findUnique.mockResolvedValue({
        userId: "user-1",
      } as unknown as Notification);
      prismaDeepMock.notification.delete.mockResolvedValue(
        {} as unknown as Notification,
      );

      const req = new Request("https://chroniqo.com/api/notifications/n1", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.notification.delete).toHaveBeenCalledWith({
        where: { id: "n1" },
      });
    });
  });
});
