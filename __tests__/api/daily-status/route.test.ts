/**
 * @jest-environment node
 *
 * This file must run in the Node environment rather than the default jsdom environment.
 * The API route handlers import from next/server (NextRequest, NextResponse), which
 * requires Web API globals (Request, Response, etc.) available in Node 20 but not
 * in jsdom. Without this directive the suite fails with
 * "ReferenceError: Request is not defined".
 */

// __tests__/api/daily-status/route.test.ts

/*
 * This file tests the API routes for daily status management,
 * specifically the POST /api/daily-status route for creating/updating today's status
 * and the GET /api/daily-status/today route for retrieving today's status.
 * The tests ensure that authentication is required, input validation works correctly,
 * and that the service functions are called with the expected parameters.
 * Mocking is used to isolate the API route logic from the underlying service and database layers.
 */

import { POST } from "@/app/api/daily-status/route";
import { GET } from "@/app/api/daily-status/today/route";
import { auth } from "@/auth";
import {
  getTodayStatus,
  upsertDailyStatus,
} from "@/services/daily-status.service";
import type { Session } from "next-auth";

// Provide a factory so Jest never loads the real auth.ts, which imports
// @auth/prisma-adapter (an ESM-only package that Jest cannot parse).
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/services/daily-status.service");

describe("Daily Status API Routes", () => {
  // Cast auth as a generic jest.Mock to avoid the 'never' inference issue
  const mockedAuth = auth as jest.Mock;
  const mockedUpsert = upsertDailyStatus as jest.MockedFunction<
    typeof upsertDailyStatus
  >;
  const mockedGetToday = getTodayStatus as jest.MockedFunction<
    typeof getTodayStatus
  >;

  // Helper to create a valid mock session
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

  describe("POST /api/daily-status", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/daily-status", {
        method: "POST",
        body: JSON.stringify({ value: 3 }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 400 if Zod validation fails (e.g., value out of bounds)", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/daily-status", {
        method: "POST",
        // Value 5 is invalid, scale is 0-4
        body: JSON.stringify({ value: 5 }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it("should return 201 and call the service on valid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const mockDbResponse = {
        id: "status-1",
        value: 3,
        note: "Doing well",
        userId: "user-1",
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedUpsert.mockResolvedValue(mockDbResponse);

      const req = new Request("https://chroniqo.com/api/daily-status", {
        method: "POST",
        body: JSON.stringify({ value: 3, note: "Doing well" }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe("Status saved");
      expect(mockedUpsert).toHaveBeenCalledWith("user-1", {
        value: 3,
        note: "Doing well",
      });
    });
  });

  describe("GET /api/daily-status/today", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 200 and hasRegistered: false if no status exists today", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetToday.mockResolvedValue(null);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.hasRegistered).toBe(false);
      expect(json.status).toBeNull();
    });

    it("should return 200 and the status object if registered today", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const mockStatus = {
        id: "status-1",
        value: 2,
        note: null,
        userId: "user-1",
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedGetToday.mockResolvedValue(mockStatus);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.hasRegistered).toBe(true);
      expect(json.status.id).toBe("status-1");
    });

    it("should return 500 when today-status service throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetToday.mockRejectedValue(new Error("DB fail"));

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
