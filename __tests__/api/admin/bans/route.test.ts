/**
 * @jest-environment node
 */

// __tests__/api/admin/bans/route.test.ts

/*
 * This test suite focuses on the PATCH method of the /api/admin/bans route,
 * which is responsible for extending the duration of an existing global ban.
 * It verifies that only admins can access the endpoint, that the payload is validated,
 * and that the ban's expiration is correctly updated in the database.
 */

import { PATCH } from "@/app/api/admin/bans/route";
import { auth } from "@/auth";
import { DeepMockProxy } from "jest-mock-extended";

import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    globalBan: {
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("Global Bans API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedPrisma = prisma as DeepMockProxy<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH /api/admin/bans", () => {
    it("should return 403 if user is not admin", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "USER" } });
      const req = new Request("https://chroniqo.com/api/admin/bans", {
        method: "PATCH",
        body: JSON.stringify({ id: "1", durationHours: 24 }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it("should return 400 for invalid payload", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "ADMIN" } });
      const req = new Request("https://chroniqo.com/api/admin/bans", {
        method: "PATCH",
        body: JSON.stringify({ id: "" }), // missing durationHours entirely
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("should update ban successfully and set new expiration", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "ADMIN" } });
      const req = new Request("https://chroniqo.com/api/admin/bans", {
        method: "PATCH",
        body: JSON.stringify({ id: "ban-123", durationHours: 24 }),
      });

      mockedPrisma.globalBan.update.mockResolvedValue({
        id: "ban-123",
        email: "test@example.com",
        expiresAt: new Date(),
        reason: null,
        deleteToken: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDummy: false,
        isActive: true,
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockedPrisma.globalBan.update).toHaveBeenCalledWith({
        where: { id: "ban-123" },
        data: { expiresAt: expect.any(Date), isActive: true },
      });
    });

    it("should set expiration to null when extending to permanent", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "ADMIN" } });
      const req = new Request("https://chroniqo.com/api/admin/bans", {
        method: "PATCH",
        body: JSON.stringify({ id: "ban-123", durationHours: null }),
      });

      mockedPrisma.globalBan.update.mockResolvedValue({
        id: "ban-123",
        email: "test@example.com",
        expiresAt: null,
        reason: null,
        deleteToken: null,
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDummy: false,
        isActive: true,
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockedPrisma.globalBan.update).toHaveBeenCalledWith({
        where: { id: "ban-123" },
        data: { expiresAt: null, isActive: true },
      });
    });
  });
});
