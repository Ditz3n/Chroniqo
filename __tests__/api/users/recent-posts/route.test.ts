/**
 * @jest-environment node
 */

// __tests__/api/users/recent-posts/route.test.ts

/*
 * This file tests the API routes for fetching and deleting recent posts.
 * It ensures that unauthenticated requests are blocked, data maps to the UI
 * correctly (including media type handling), and clearing history works.
 */

import { DELETE, GET } from "@/app/api/users/recent-posts/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { TEST_IDS } from "../../../utils/test-constants";
import { createMockSession } from "../../../utils/test-utils";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recentPost: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("Recent Posts API Route", () => {
  const mockedAuth = auth as jest.Mock;
  const mockSession: Session = createMockSession({ id: TEST_IDS.user });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/users/recent-posts", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 500 on database error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      (prisma.recentPost.findMany as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });

    it("should return formatted recent posts mapped from the database", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const mockDbRecords = [
        {
          userId: TEST_IDS.user,
          postId: TEST_IDS.post,
          visitedAt: new Date(),
          post: {
            id: TEST_IDS.post,
            title: "Test Image Post",
            type: "image",
            community: { name: "chronic" },
            author: { username: "tester" },
            metadata: { images: ["https://example.com/image.jpg"] },
            _count: { comments: 5, supportedBy: 10 },
          },
        },
      ];

      (prisma.recentPost.findMany as jest.Mock).mockResolvedValue(
        mockDbRecords,
      );

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.recentPosts).toHaveLength(1);
      expect(json.recentPosts[0]).toMatchObject({
        id: TEST_IDS.post,
        community: "chronic",
        authorUsername: "tester",
        title: "Test Image Post",
        likes: 10,
        comments: 5,
        media: { kind: "image", url: "https://example.com/image.jpg" },
      });
      // Ensure timeAgo formatted string exists
      expect(typeof json.recentPosts[0].timeAgo).toBe("string");
    });

    it("should default to Profile and null media if no community or valid metadata", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const mockDbRecords = [
        {
          userId: TEST_IDS.user,
          postId: TEST_IDS.post,
          visitedAt: new Date(),
          post: {
            id: TEST_IDS.post,
            title: "Text profile post",
            type: "text",
            community: null,
            author: { username: "tester" },
            metadata: {}, // Empty metadata
            _count: { comments: 0, supportedBy: 0 },
          },
        },
      ];

      (prisma.recentPost.findMany as jest.Mock).mockResolvedValue(
        mockDbRecords,
      );

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.recentPosts[0].community).toBe("Profile");
      expect(json.recentPosts[0].media).toBeUndefined();
    });
  });

  describe("DELETE /api/users/recent-posts", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it("should return 500 on database error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      (prisma.recentPost.deleteMany as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );

      const res = await DELETE();
      expect(res.status).toBe(500);
    });

    it("should delete all recent posts for the user and return 200", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      (prisma.recentPost.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const res = await DELETE();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(prisma.recentPost.deleteMany).toHaveBeenCalledWith({
        where: { userId: TEST_IDS.user },
      });
    });
  });
});
