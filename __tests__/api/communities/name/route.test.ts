/**
 * @jest-environment node
 */

// __tests__/api/communities/name/route.test.ts

/*
 * This file tests the API routes for community details, updates, and deletion.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { DELETE, GET, PUT } from "@/app/api/communities/[name]/route";
import { auth } from "@/auth";
import {
  deleteCommunity,
  getCommunityByName,
  updateCommunity,
} from "@/services/community.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("Community Detail API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGet = getCommunityByName as jest.MockedFunction<
    typeof getCommunityByName
  >;
  const mockedUpdate = updateCommunity as jest.MockedFunction<
    typeof updateCommunity
  >;
  const mockedDelete = deleteCommunity as jest.MockedFunction<
    typeof deleteCommunity
  >;

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

  const params = Promise.resolve({ name: "TestComm" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET(
        new Request("https://chroniqo.com/api/communities/TestComm"),
        { params },
      );
      expect(res.status).toBe(401);
    });

    it("should return 404 if not found", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGet.mockRejectedValue(new Error("Community not found"));
      const res = await GET(
        new Request("https://chroniqo.com/api/communities/TestComm"),
        { params },
      );
      expect(res.status).toBe(404);
    });

    it("should return 200 and community data", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGet.mockResolvedValue({
        id: "c1",
        name: "TestComm",
      } as unknown as Awaited<ReturnType<typeof getCommunityByName>>);

      const res = await GET(
        new Request("https://chroniqo.com/api/communities/TestComm"),
        { params },
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.community.id).toBe("c1");
    });
  });

  describe("PUT", () => {
    it("should return 400 on invalid payload", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/communities/TestComm", {
        method: "PUT",
        body: JSON.stringify({ category: "invalid_category" }),
      });
      const res = await PUT(req, { params });
      expect(res.status).toBe(400);
    });

    it("should return 403 on unauthorized update attempt", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedUpdate.mockRejectedValue(new Error("Unauthorized: Only admins"));

      const req = new Request("https://chroniqo.com/api/communities/TestComm", {
        method: "PUT",
        body: JSON.stringify({ isPrivate: true }),
      });
      const res = await PUT(req, { params });
      expect(res.status).toBe(403);
    });

    it("should return 200 on successful update", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedUpdate.mockResolvedValue({
        id: "c1",
        isPrivate: true,
      } as unknown as Awaited<ReturnType<typeof updateCommunity>>);

      const req = new Request("https://chroniqo.com/api/communities/TestComm", {
        method: "PUT",
        body: JSON.stringify({ isPrivate: true }),
      });
      const res = await PUT(req, { params });
      expect(res.status).toBe(200);
      expect(mockedUpdate).toHaveBeenCalledWith("TestComm", "user-1", {
        isPrivate: true,
      });
    });
  });

  describe("DELETE", () => {
    it("should return 403 on unauthorized delete attempt", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedDelete.mockRejectedValue(new Error("Unauthorized: Only admins"));

      const req = new Request("https://chroniqo.com/api/communities/TestComm", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(403);
    });

    it("should return 200 on successful delete", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedDelete.mockResolvedValue({ success: true });

      const req = new Request("https://chroniqo.com/api/communities/TestComm", {
        method: "DELETE",
      });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);
      expect(mockedDelete).toHaveBeenCalledWith("TestComm", "user-1");
    });
  });
});
