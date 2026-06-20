// __tests__/api/communities/name/members/userId/mute/route.test.ts

/*
 * This file tests the POST and DELETE methods for the community muting API.
 * It verifies that unauthenticated requests fail and that muting/unmuting
 * correctly calls the respective service functions with the right parameters.
 * The tests mock the auth function to simulate authenticated and unauthenticated states,
 * and mock the community service functions to verify they are called as expected.
 */

import {
  DELETE as MUTE_DELETE,
  POST as MUTE_POST,
} from "@/app/api/communities/[name]/members/[userId]/mute/route";
import { auth } from "@/auth";
import { muteMember, unmuteMember } from "@/services/community.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("Community Mute API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /mute", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost", { method: "POST" });

      const res = await MUTE_POST(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(401);
    });

    it("should call muteMember and return 200 on success", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin1" } });
      (muteMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ durationHours: null, reason: "Spam" }),
      });

      const res = await MUTE_POST(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(200);
      expect(muteMember).toHaveBeenCalledWith(
        "test",
        "u1",
        "admin1",
        null,
        "Spam",
      );
    });
  });

  describe("DELETE /mute", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost", { method: "DELETE" });

      const res = await MUTE_DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(401);
    });

    it("should call unmuteMember and return 200 on success", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin1" } });
      (unmuteMember as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request("http://localhost", { method: "DELETE" });
      const res = await MUTE_DELETE(req, {
        params: Promise.resolve({ name: "test", userId: "u1" }),
      });

      expect(res.status).toBe(200);
      expect(unmuteMember).toHaveBeenCalledWith("test", "u1", "admin1");
    });
  });
});
