/**
 * @jest-environment node
 */

// __tests__/api/communities/route.test.ts

/*
 * This file tests the API routes for communities overview and creation.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { GET, POST } from "@/app/api/communities/route";
import { auth } from "@/auth";
import {
  createCommunity,
  getCommunitiesOverview,
} from "@/services/community.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/community.service");

describe("Communities API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetOverview = getCommunitiesOverview as jest.MockedFunction<
    typeof getCommunitiesOverview
  >;
  const mockedCreateCommunity = createCommunity as jest.MockedFunction<
    typeof createCommunity
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/communities", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 200 and overview data on success", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetOverview.mockResolvedValue({
        recommended: [],
        all: [],
        joined: [],
        hidden: [],
      } as unknown as Awaited<ReturnType<typeof getCommunitiesOverview>>);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.recommended).toEqual([]);
      expect(json.all).toEqual([]);
      expect(mockedGetOverview).toHaveBeenCalledWith("user-1");
    });

    it("should return 500 on service error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetOverview.mockRejectedValue(new Error("DB fail"));

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/communities", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Test", category: "chronic" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if Zod validation fails", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/communities", {
        method: "POST",
        // Name too short, category invalid
        body: JSON.stringify({ name: "A", category: "invalid_cat" }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedCreateCommunity).not.toHaveBeenCalled();
    });

    it("should return 409 if community name is already taken", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateCommunity.mockRejectedValue(
        new Error("Community name is already taken"),
      );

      const req = new Request("https://chroniqo.com/api/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Existing_Name", category: "chronic" }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toBe("Community name is already taken");
    });

    it("should return 201 and create the community", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const mockCommunity = { id: "c1", name: "Valid_Name" };
      mockedCreateCommunity.mockResolvedValue(
        mockCommunity as Awaited<ReturnType<typeof createCommunity>>,
      );

      const req = new Request("https://chroniqo.com/api/communities", {
        method: "POST",
        body: JSON.stringify({
          name: "Valid_Name",
          description: "Test desc",
          category: "physical",
          isPrivate: false,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe("Community created successfully");
      expect(json.community.id).toBe("c1");
      expect(mockedCreateCommunity).toHaveBeenCalledWith("user-1", {
        name: "Valid_Name",
        description: "Test desc",
        category: "physical",
        isPrivate: false,
      });
    });

    it("should return 500 on unexpected service error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateCommunity.mockRejectedValue(new Error("Unexpected failure"));

      const req = new Request("https://chroniqo.com/api/communities", {
        method: "POST",
        body: JSON.stringify({ name: "Valid_Name", category: "chronic" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
