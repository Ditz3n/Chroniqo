// __tests__/api/users/username/block/route.test.ts

/*
 * This file tests the POST and DELETE methods for the user blocking API.
 * It verifies that unauthenticated requests fail, users cannot block themselves,
 * and that blocking correctly triggers a transaction to sever friendships.
 * Unblocking simply deletes the GlobalBlock record.
 */

import { DELETE, POST } from "@/app/api/users/[username]/block/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma");

describe("POST & DELETE /api/users/[username]/block", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST (Block User)", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api");

      const res = await POST(req, {
        params: Promise.resolve({ username: "target" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 404 if target user does not exist", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api");
      const res = await POST(req, {
        params: Promise.resolve({ username: "unknown" }),
      });

      expect(res.status).toBe(404);
    });

    it("should return 400 if user tries to block themselves", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user1",
      });

      const req = new Request("https://chroniqo.com/api");
      const res = await POST(req, {
        params: Promise.resolve({ username: "myself" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Cannot block yourself");
    });

    it("should return 200 and execute transaction to block and sever friendships", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: "target1",
      });
      (prismaMock.$transaction as jest.Mock).mockResolvedValue([]);

      const req = new Request("https://chroniqo.com/api");
      const res = await POST(req, {
        params: Promise.resolve({ username: "target" }),
      });

      expect(res.status).toBe(200);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe("DELETE (Unblock User)", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api");

      const res = await DELETE(req, {
        params: Promise.resolve({ username: "target" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 404 if target user does not exist", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api");
      const res = await DELETE(req, {
        params: Promise.resolve({ username: "unknown" }),
      });

      expect(res.status).toBe(404);
    });

    it("should return 200 and delete the block record", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: "target1",
      });
      (prismaMock.globalBlock.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const req = new Request("https://chroniqo.com/api");
      const res = await DELETE(req, {
        params: Promise.resolve({ username: "target" }),
      });

      expect(res.status).toBe(200);
      expect(prismaMock.globalBlock.deleteMany).toHaveBeenCalledWith({
        where: {
          blockerId: "user1",
          blockedId: "target1",
        },
      });
    });
  });
});
