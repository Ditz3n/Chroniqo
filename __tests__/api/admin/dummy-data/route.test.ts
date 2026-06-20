/**
 * @jest-environment node
 */

// __tests__/api/admin/dummy-data/route.test.ts

/*
 * This file tests the dummy data admin API route.
 * It verifies authentication, lock/rate-limit behavior, and status payload structure.
 * Dummy generation services are mocked so tests remain fast and deterministic.
 */

import { GET, POST } from "@/app/api/admin/dummy-data/route";
import { auth } from "@/auth";
import { redis as redisMock } from "@/lib/upstash";

jest.mock("@/auth", () => ({ auth: jest.fn() }));

// Mock Redis
jest.mock("@/lib/upstash", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock next/server's `after` so it executes synchronously in tests
jest.mock("next/server", () => {
  const original = jest.requireActual("next/server");
  return {
    ...original,
    after: jest.fn((callback: () => void) => callback()),
  };
});

// Mock all dummy services to avoid running real logic during tests
jest.mock("@/services/dummy/dummy-users.service.ts", () => ({
  generateDummyUsers: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-communities.service.ts", () => ({
  generateDummyCommunities: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-posts.service.ts", () => ({
  generateDummyPosts: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-media-posts.service.ts", () => ({
  generateDummyMediaPosts: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-comments.service.ts", () => ({
  generateDummyComments: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-chats.service.ts", () => ({
  generateDummyChats: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-reports.service.ts", () => ({
  generateDummyReports: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/services/dummy/dummy-friends.service.ts", () => ({
  generateDummyFriends: jest.fn().mockResolvedValue([]),
}));

// Mock Prisma to handle the teardown step
jest.mock("@/lib/prisma", () => ({
  prisma: {
    messageReaction: { deleteMany: jest.fn().mockResolvedValue({}) },
    message: { deleteMany: jest.fn().mockResolvedValue({}) },
    conversation: { deleteMany: jest.fn().mockResolvedValue({}) },
    commentSupport: { deleteMany: jest.fn().mockResolvedValue({}) },
    comment: { deleteMany: jest.fn().mockResolvedValue({}) },
    postSupport: { deleteMany: jest.fn().mockResolvedValue({}) },
    post: { deleteMany: jest.fn().mockResolvedValue({}) },
    community: { deleteMany: jest.fn().mockResolvedValue({}) },
    dailyStatus: { deleteMany: jest.fn().mockResolvedValue({}) },
    report: { deleteMany: jest.fn().mockResolvedValue({}) },
    globalBan: { deleteMany: jest.fn().mockResolvedValue({}) },
    user: { deleteMany: jest.fn().mockResolvedValue({}) },
  },
}));

describe("Dummy Data API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedRedis = redisMock as jest.Mocked<typeof redisMock>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/dummy-data", () => {
    it("should return 403 if unauthenticated or not admin", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "USER" } });
      const res = await POST();
      expect(res.status).toBe(403);
    });

    it("should return 429 if the generator is currently locked", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "ADMIN", id: "admin-1" } });
      mockedRedis.get.mockResolvedValue(JSON.stringify({ adminName: "Admin" }));

      const res = await POST();
      expect(res.status).toBe(429);
      expect(mockedRedis.get).toHaveBeenCalledWith("dummy_gen_lock");
    });

    it("should return 202 and start generation if not locked", async () => {
      mockedAuth.mockResolvedValue({
        user: { role: "ADMIN", id: "admin-1", username: "adminuser" },
      });
      mockedRedis.get.mockResolvedValue(null);

      const res = await POST();
      expect(res.status).toBe(202);

      // Verify lock was set
      expect(mockedRedis.set).toHaveBeenCalledWith(
        "dummy_gen_lock",
        expect.stringContaining("adminuser"),
        expect.objectContaining({ ex: 86400 }),
      );

      // Verify progress was initialized
      expect(mockedRedis.set).toHaveBeenCalledWith(
        "dummy_gen_progress",
        expect.any(String),
      );
    });
  });

  describe("GET /api/admin/dummy-data", () => {
    it("should return 403 if unauthenticated or not admin", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("should return 200 with parsed lock and steps data", async () => {
      mockedAuth.mockResolvedValue({ user: { role: "ADMIN", id: "admin-1" } });

      const mockLock = { adminUsername: "testadmin", timestamp: 12345 };
      const mockSteps = [{ id: "cleanup", status: "loading" }];

      mockedRedis.get.mockImplementation(async (key) => {
        if (key === "dummy_gen_lock") return JSON.stringify(mockLock);
        if (key === "dummy_gen_progress") return JSON.stringify(mockSteps);
        return null;
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.isLocked).toBe(true);
      expect(data.lockData).toEqual(mockLock);
      expect(data.steps).toEqual(mockSteps);
    });
  });
});
