// __tests__/api/communities/name/members/userId/ban/route.test.ts

/*
 * This file tests the POST and DELETE methods for the community banning API.
 * It verifies that unauthenticated requests fail and that banning/unbanning
 * correctly calls the respective service functions with the right parameters.
 * The tests mock the auth function to simulate authenticated and unauthenticated states,
 * and mock the community service functions to verify they are called as expected.
 */

import {
  DELETE as BAN_DELETE,
  POST as BAN_POST,
} from "@/app/api/communities/[name]/members/[userId]/ban/route";
import { auth } from "@/auth";
import { banMember, unbanMember } from "@/services/community.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("Community Ban API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /ban", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost");

      const res = await BAN_POST(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(401);
    });

    it("should call banMember and return 200 on success", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin1" } });
      (banMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ durationHours: 24, reason: "Spam" }),
      });

      const res = await BAN_POST(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(200);
      expect(banMember).toHaveBeenCalledWith(
        "test",
        "u1",
        "admin1",
        24,
        "Spam",
      );
    });
  });

  describe("DELETE /ban", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost", { method: "DELETE" });

      const res = await BAN_DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(401);
    });

    it("should call unbanMember and return 200 on success", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin1" } });
      (unbanMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("http://localhost", { method: "DELETE" });
      const res = await BAN_DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(200);
      expect(unbanMember).toHaveBeenCalledWith("test", "u1", "admin1");
    });
  });
});
