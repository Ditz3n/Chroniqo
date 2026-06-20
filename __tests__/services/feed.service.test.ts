// __tests__/services/feed.service.test.ts

/*
 * This file tests the feed service functions, particularly getCommunityPosts and getUserFeed.
 * It verifies that the service correctly handles access control for private communities,
 * masks anonymous posts for non-admin users, and excludes hidden communities from the user feed.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  getCommunityPosts,
  getProfilePosts,
  getUserFeed,
} from "@/services/feed.service";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Feed Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPost = {
    id: "post-1",
    communityId: "comm-1",
    authorId: "user-1",
    isAnonymous: false,
    type: "text",
    title: "Test post title",
    content: "Test content",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
    metadata: null,
    isDummy: false,
    author: {
      id: "user-1",
      name: "Alice",
      username: "alice",
      image: null,
      role: "USER" as const,
      communities: [],
      anonymousIdentities: [],
    },
    community: {
      id: "comm-1",
      name: "Test Community",
      image: null,
    },
    supportedBy: [],
    _count: { comments: 5, supportedBy: 0 },
  };

  const mockContext = {
    pinnedPostId: null,
    hiddenPosts: [],
    savedPosts: [],
  };

  describe("getCommunityPosts", () => {
    it("should throw if community does not exist", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue(null);

      await expect(
        getCommunityPosts("Missing", "user-123", "new", 1),
      ).rejects.toThrow("Community not found");
    });

    it("should throw if community is private and user is not accepted", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-private",
        name: "Private Comm",
        isPrivate: true,
        members: [{ status: "PENDING" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findUnique>
      >);

      await expect(
        getCommunityPosts("Private Comm", "user-123", "new", 1),
      ).rejects.toThrow("Access denied");
    });

    it("should return posts and mask author if anonymous and user is not admin", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        name: "Test Community",
        isPrivate: false,
        members: [{ role: "USER", status: "ACCEPTED" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue(
        mockContext as unknown as Awaited<
          ReturnType<typeof prismaMock.user.findUnique>
        >,
      );

      const anonPost = { ...mockPost, isAnonymous: true };
      prismaDeepMock.post.findMany.mockResolvedValue([
        anonPost,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "user-123",
        "new",
        1,
      );

      expect(posts).toHaveLength(1);
      expect(posts[0].author.username).toBe("anonymous");
      expect(posts[0].author.id).toBe("anon");
    });

    it("should NOT mask author if the viewer IS the author of the anonymous post", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        name: "Test Community",
        isPrivate: false,
        members: [{ role: "USER", status: "ACCEPTED" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue(
        mockContext as unknown as Awaited<
          ReturnType<typeof prismaMock.user.findUnique>
        >,
      );

      const anonPost = {
        ...mockPost,
        authorId: "user-123",
        isAnonymous: true,
      };
      prismaDeepMock.post.findMany.mockResolvedValue([
        anonPost,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "user-123",
        "new",
        1,
      );

      expect(posts[0].author.username).toBe("alice"); // Author revealed to themselves
    });

    it("should NOT mask author if the viewer is friends with the anonymous author", async () => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        name: "Test Community",
        isPrivate: false,
        members: [{ role: "USER", status: "ACCEPTED" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue(
        mockContext as unknown as Awaited<
          ReturnType<typeof prismaMock.user.findUnique>
        >,
      );

      prismaDeepMock.friendship.findMany.mockResolvedValue([
        { userId: "user-123", friendId: "user-1" },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.friendship.findMany>
      >);

      const anonPost = { ...mockPost, authorId: "user-1", isAnonymous: true };
      prismaDeepMock.post.findMany.mockResolvedValue([
        anonPost,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "user-123",
        "new",
        1,
      );

      expect(posts[0].author.username).toBe("alice");
    });
  });

  describe("getUserFeed", () => {
    it("should exclude hidden communities and hidden posts from the feed", async () => {
      // Mock user is member of comm-1 and comm-2
      prismaDeepMock.communityMember.findMany.mockResolvedValue([
        { communityId: "comm-1", role: "USER" },
        { communityId: "comm-2", role: "USER" },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.communityMember.findMany>
      >);

      // Mock user has hidden comm-2
      prismaDeepMock.hiddenCommunity.findMany.mockResolvedValue([
        { communityId: "comm-2" }, // Hidden community
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.hiddenCommunity.findMany>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        pinnedPostId: null,
        hiddenPosts: [{ postId: "hidden-post-1" }],
        savedPosts: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.post.findMany.mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>,
      );

      await getUserFeed("user-123", "new", 1);

      // Verify the query only includes comm-1 and excludes hidden post
      expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { communityId: { in: ["comm-1"] } },
              { authorId: "user-123", communityId: null },
            ],
            id: { notIn: ["hidden-post-1"] },
          }),
        }),
      );
    });
  });

  describe("getProfilePosts", () => {
    it("should restrict access to saved and hidden tabs if viewer is not the profile owner", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "target-user",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      await expect(
        getProfilePosts("targetUser", "different-user", "saved", "new", 1),
      ).rejects.toThrow("Access denied");

      await expect(
        getProfilePosts("targetUser", "different-user", "hidden", "new", 1),
      ).rejects.toThrow("Access denied");
    });

    it("should exclude anonymous posts when viewing someone else's profile", async () => {
      prismaDeepMock.user.findUnique
        .mockResolvedValueOnce({
          id: "target-user",
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>)
        .mockResolvedValueOnce({
          pinnedPostId: null,
          hiddenPosts: [],
          savedPosts: [],
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.communityMember.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.communityMember.findMany>
        >,
      );

      prismaDeepMock.post.findMany.mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>,
      );

      await getProfilePosts("targetUser", "different-user", "posts", "new", 1);

      expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: "target-user",
            isAnonymous: false,
          }),
        }),
      );
    });
  });

  describe("role badge resolution", () => {
    const basePost = {
      id: "post-1",
      communityId: "comm-1",
      authorId: "user-1",
      isAnonymous: false,
      type: "text",
      title: "Test",
      content: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null,
      isDummy: false,
      community: { id: "comm-1", name: "Test Community", image: null },
      supportedBy: [],
      _count: { comments: 0, supportedBy: 0 },
    };

    const mockCtx = { pinnedPostId: null, hiddenPosts: [], savedPosts: [] };

    beforeEach(() => {
      prismaDeepMock.community.findUnique.mockResolvedValue({
        id: "comm-1",
        name: "Test Community",
        isPrivate: false,
        members: [{ role: "USER", status: "ACCEPTED" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findUnique>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue(
        mockCtx as unknown as Awaited<
          ReturnType<typeof prismaMock.user.findUnique>
        >,
      );
    });

    it("should include globalRole ADMIN on the author when author is a system admin", async () => {
      const post = {
        ...basePost,
        author: {
          id: "user-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "ADMIN" as const,
          communities: [],
          anonymousIdentities: [],
        },
      };
      prismaDeepMock.post.findMany.mockResolvedValue([
        post,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "viewer-1",
        "new",
        1,
      );

      expect(posts[0].author.globalRole).toBe("ADMIN");
    });

    it("should resolve communityRole for an elevated member posting in their community", async () => {
      const post = {
        ...basePost,
        author: {
          id: "user-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "USER" as const,
          communities: [{ communityId: "comm-1", role: "MODERATOR" as const }],
          anonymousIdentities: [],
        },
      };
      prismaDeepMock.post.findMany.mockResolvedValue([
        post,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "viewer-1",
        "new",
        1,
      );

      expect(posts[0].author.communityRole).toBe("MODERATOR");
    });

    it("should NOT set communityRole when the author has no elevated role in this community", async () => {
      const post = {
        ...basePost,
        author: {
          id: "user-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "USER" as const,
          communities: [{ communityId: "other-comm", role: "OWNER" as const }],
          anonymousIdentities: [],
        },
      };
      prismaDeepMock.post.findMany.mockResolvedValue([
        post,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "viewer-1",
        "new",
        1,
      );

      expect(posts[0].author.communityRole).toBeUndefined();
    });

    it("should strip role data entirely from anonymous posts masked to non-privileged viewers", async () => {
      const post = {
        ...basePost,
        isAnonymous: true,
        author: {
          id: "user-1",
          name: "Alice",
          username: "alice",
          image: null,
          role: "ADMIN" as const,
          communities: [{ communityId: "comm-1", role: "OWNER" as const }],
          anonymousIdentities: [],
        },
      };
      prismaDeepMock.post.findMany.mockResolvedValue([
        post,
      ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

      const posts = await getCommunityPosts(
        "Test Community",
        "viewer-99",
        "new",
        1,
      );

      expect(posts[0].author.id).toBe("anon");
      expect(
        (posts[0].author as Record<string, unknown>).globalRole,
      ).toBeUndefined();
      expect(
        (posts[0].author as Record<string, unknown>).communityRole,
      ).toBeUndefined();
    });
  });
});
