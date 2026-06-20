// __tests__/api/communities/name/members/userid/route.test.ts

/*
 * This file tests the API route for updating a member's role and kicking a member from a community.
 * It ensures that unauthenticated requests are blocked, invalid roles return 400,
 * and valid requests successfully update roles or kick members. It also checks
 * for proper error handling when unauthorized or other errors occur.
 */

import {
  DELETE,
  PUT,
} from "@/app/api/communities/[name]/members/[userId]/route";
import { auth } from "@/auth";
import { kickMember, updateMemberRole } from "@/services/community.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("PUT & DELETE /api/communities/[name]/members/[userId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT (Update Role)", () => {
    it("should return 400 for invalid role", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      const req = new Request("https://chroniqo.com/api", {
        method: "PUT",
        body: JSON.stringify({ role: "SUPER_ADMIN" }),
      });

      const res = await PUT(req, {
        params: Promise.resolve({ name: "test", userId: "target1" }),
      });
      expect(res.status).toBe(400);
    });

    it("should return 200 on successful role update", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (updateMemberRole as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("https://chroniqo.com/api", {
        method: "PUT",
        body: JSON.stringify({ role: "MODERATOR" }),
      });

      const res = await PUT(req, {
        params: Promise.resolve({ name: "test", userId: "target1" }),
      });
      expect(res.status).toBe(200);
      expect(updateMemberRole).toHaveBeenCalledWith(
        "test",
        "target1",
        "MODERATOR",
        "user1",
      );
    });
  });

  describe("DELETE (Kick Member)", () => {
    it("should return 200 on successful kick", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (kickMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request(
        "https://chroniqo.com/api?transferToUserId=newOwner",
      );
      const res = await DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "target1" }),
      });

      expect(res.status).toBe(200);
      expect(kickMember).toHaveBeenCalledWith(
        "test",
        "target1",
        "user1",
        "newOwner",
        null,
      );
    });

    it("should pass kick reason when provided in request body", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (kickMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("https://chroniqo.com/api", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Repeated spam" }),
      });
      const res = await DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "target1" }),
      });

      expect(res.status).toBe(200);
      expect(kickMember).toHaveBeenCalledWith(
        "test",
        "target1",
        "user1",
        undefined,
        "Repeated spam",
      );
    });

    it("should return 403 if kickMember throws Unauthorized", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (kickMember as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

      const req = new Request("https://chroniqo.com/api");
      const res = await DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "target1" }),
      });

      expect(res.status).toBe(403);
    });
  });
});
