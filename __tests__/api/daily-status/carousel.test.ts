// __tests__/api/daily-status-carousel.test.ts

/*
 * This file tests the API route for retrieving daily statuses for the carousel.
 * It verifies that authentication is required, that the correct database query is made,
 * and that errors are handled gracefully. Mocking is used to isolate the API route logic
 * from the underlying authentication and database layers.
 */

import { GET } from "@/app/api/daily-status/carousel/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma");

describe("Daily Status Carousel API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

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

  describe("GET /api/daily-status/carousel", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 200 and a list of statuses excluding the current user", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const mockStatuses = [
        {
          id: "status-2",
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: "user-2",
          value: 4,
          note: "Great day!",
          date: new Date(),
        },
      ];

      prismaDeepMock.dailyStatus.findMany.mockResolvedValue(mockStatuses);

      const res = await GET();
      const json = await res.json();
      const expectedStatuses = JSON.parse(JSON.stringify(mockStatuses));

      expect(res.status).toBe(200);
      expect(json.statuses).toEqual(expectedStatuses);

      // Ensure the query excluded the current user
      expect(prismaDeepMock.dailyStatus.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: "user-1" },
            user: {
              friendships: {
                some: { friendId: "user-1" },
              },
            },
          }),
        }),
      );
    });

    it("should return 500 on database failure", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.dailyStatus.findMany.mockRejectedValue(
        new Error("DB Error"),
      );

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
