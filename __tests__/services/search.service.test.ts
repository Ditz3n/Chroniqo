// __tests__/services/search.service.test.ts

/*
 * Tests for the search service functions.
 * Covers user/community/post search, anonymous post inclusion, scoped
 * post queries, and the bulk supports count aggregation pattern.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  searchCommunities,
  searchPostsByCommunity,
  searchPostsByUser,
  searchPostsGlobal,
  searchUsers,
} from "@/services/search.service";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");
jest.mock("@/services/feed.service", () => ({
  // Returns metadata unchanged so mapper tests stay focused on structure
  scrubMetadata: jest.fn((_type: string, metadata: unknown) => metadata),
}));

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

// Mock factories

const buildDbUser = (overrides = {}) => ({
  id: "user-1",
  name: "Alice",
  username: "alice",
  image: null,
  headerImage: null,
  dailyStatuses: [{ value: 2 }],
  _count: { friendships: 3 },
  ...overrides,
});

const buildDbCommunity = (overrides = {}) => ({
  id: "comm-1",
  name: "MentalWellness",
  image: null,
  headerImage: null,
  _count: { members: 12 },
  ...overrides,
});

const buildDbPost = (overrides = {}) => ({
  id: "post-1",
  authorId: "user-1",
  communityId: "comm-1",
  isAnonymous: false,
  type: "text",
  title: "Living with fatigue",
  content: "Some content here",
  metadata: null,
  createdAt: new Date("2024-06-01T10:00:00.000Z"),
  updatedAt: new Date("2024-06-01T10:00:00.000Z"),
  isDummy: false,
  author: {
    id: "user-1",
    name: "Alice",
    username: "alice",
    image: null,
    anonymousIdentities: [],
  },
  community: { id: "comm-1", name: "MentalWellness", image: null },
  supportedBy: [],
  _count: { comments: 3, supportedBy: 7 },
  ...overrides,
});

// searchUsers

describe("searchUsers", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return users with stats excluding the viewer", async () => {
    prismaDeepMock.user.findMany.mockResolvedValue([
      buildDbUser(),
    ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

    prismaDeepMock.friendship.findMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof prismaMock.friendship.findMany>
      >,
    );

    prismaDeepMock.postSupport.findMany.mockResolvedValue([
      { post: { authorId: "user-1" } },
      { post: { authorId: "user-1" } },
    ] as unknown as Awaited<
      ReturnType<typeof prismaMock.postSupport.findMany>
    >);

    const results = await searchUsers("alice", "viewer-id", 5);

    expect(prismaDeepMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "viewer-id" },
        }),
      }),
    );

    expect(results).toHaveLength(1);
    expect(results[0].stats?.friends).toBe(3);
    expect(results[0].stats?.supports).toBe(2);
    expect(results[0].currentMood).toEqual({ value: 2 });
    expect(results[0].headerImage).toBeNull();
  });

  it("should return empty array when no users match", async () => {
    prismaDeepMock.user.findMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>,
    );

    const results = await searchUsers("zzz_nobody", "viewer-id", 5);

    expect(results).toEqual([]);
    // postSupport query must be skipped - no user IDs to aggregate for
    expect(prismaDeepMock.postSupport.findMany).not.toHaveBeenCalled();
  });

  it("should return 0 supports when user has no supported posts", async () => {
    prismaDeepMock.user.findMany.mockResolvedValue([
      buildDbUser({ id: "user-2" }),
    ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

    prismaDeepMock.friendship.findMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof prismaMock.friendship.findMany>
      >,
    );

    prismaDeepMock.postSupport.findMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof prismaMock.postSupport.findMany>
      >,
    );

    const results = await searchUsers("alice", "viewer-id", 5);
    expect(results[0].stats?.supports).toBe(0);
  });
});

// searchCommunities

describe("searchCommunities", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return only active communities matching the query", async () => {
    prismaDeepMock.community.findMany.mockResolvedValue([
      buildDbCommunity(),
    ] as unknown as Awaited<ReturnType<typeof prismaMock.community.findMany>>);

    const results = await searchCommunities("mental", 5);

    expect(prismaDeepMock.community.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("MentalWellness");
  });

  it("should return empty array when nothing matches", async () => {
    prismaDeepMock.community.findMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof prismaMock.community.findMany>
      >,
    );

    const results = await searchCommunities("zzznomatch", 5);
    expect(results).toEqual([]);
  });
});

//  searchPostsGlobal

describe("searchPostsGlobal", () => {
  afterEach(() => jest.clearAllMocks());

  it("should include anonymous posts (masking happens client-side)", async () => {
    const anonPost = buildDbPost({ isAnonymous: true });
    prismaDeepMock.post.findMany.mockResolvedValue([
      anonPost,
    ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

    const results = await searchPostsGlobal("fatigue", "viewer-id", 10);

    // No isAnonymous filter on the query
    expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isAnonymous: false }),
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].isAnonymous).toBe(true);
  });

  it("should map post fields to the correct transport shape", async () => {
    prismaDeepMock.post.findMany.mockResolvedValue([
      buildDbPost(),
    ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

    const results = await searchPostsGlobal("fatigue", "viewer-id", 10);

    expect(results[0]).toMatchObject({
      id: "post-1",
      title: "Living with fatigue",
      type: "text",
      supports: 7,
      comments: 3,
      userSupported: false,
      isSaved: false,
      isHidden: false,
      isPinned: false,
    });
    expect(typeof results[0].createdAt).toBe("string");
  });

  it("should set userSupported=true when viewer is in supportedBy", async () => {
    const post = buildDbPost({
      supportedBy: [{ userId: "viewer-id", postId: "post-1" }],
    });
    prismaDeepMock.post.findMany.mockResolvedValue([post] as unknown as Awaited<
      ReturnType<typeof prismaMock.post.findMany>
    >);

    const results = await searchPostsGlobal("fatigue", "viewer-id", 10);
    expect(results[0].userSupported).toBe(true);
  });
});

// searchPostsByCommunity

describe("searchPostsByCommunity", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return empty array when community does not exist", async () => {
    prismaDeepMock.community.findUnique.mockResolvedValue(null);

    const results = await searchPostsByCommunity(
      "fatigue",
      "Unknown",
      "viewer-id",
    );

    expect(results).toEqual([]);
    expect(prismaDeepMock.post.findMany).not.toHaveBeenCalled();
  });

  it("should query posts scoped to the community", async () => {
    prismaDeepMock.community.findUnique.mockResolvedValue({
      id: "comm-1",
      name: "MentalWellness",
    } as unknown as Awaited<
      ReturnType<typeof prismaMock.community.findUnique>
    >);

    prismaDeepMock.post.findMany.mockResolvedValue([
      buildDbPost(),
    ] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>);

    const results = await searchPostsByCommunity(
      "fatigue",
      "MentalWellness",
      "viewer-id",
    );

    expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ communityId: "comm-1" }),
      }),
    );
    expect(results).toHaveLength(1);
  });
});

// searchPostsByUser

describe("searchPostsByUser", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return empty array when user does not exist", async () => {
    prismaDeepMock.user.findUnique.mockResolvedValue(null);

    const results = await searchPostsByUser("hello", "ghost_user", "viewer-id");
    expect(results).toEqual([]);
    expect(prismaDeepMock.post.findMany).not.toHaveBeenCalled();
  });

  it("should include anonymous posts when viewer is the profile owner", async () => {
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "viewer-id",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

    prismaDeepMock.post.findMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>,
    );

    await searchPostsByUser("hello", "alice", "viewer-id");

    expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isAnonymous: false }),
      }),
    );
  });

  it("should exclude anonymous posts when viewer is not the profile owner", async () => {
    prismaDeepMock.user.findUnique.mockResolvedValue({
      id: "target-user",
    } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

    prismaDeepMock.post.findMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prismaMock.post.findMany>>,
    );

    await searchPostsByUser("hello", "alice", "viewer-id");

    expect(prismaDeepMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isAnonymous: false }),
      }),
    );
  });

  describe("searchUsers - daily status privacy", () => {
    afterEach(() => jest.clearAllMocks());

    it("should expose currentMood for a public profile", async () => {
      prismaDeepMock.user.findMany.mockResolvedValue([
        buildDbUser({ isPrivate: false }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

      // Viewer is not a friend
      prismaDeepMock.friendship.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findMany>
        >,
      );
      prismaDeepMock.postSupport.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.postSupport.findMany>
        >,
      );

      const results = await searchUsers("alice", "viewer-id", 5);

      // Public profile: mood is always visible regardless of friendship
      expect(results[0].currentMood).toEqual({ value: 2 });
    });

    it("should hide currentMood for a private profile when viewer is not a friend", async () => {
      prismaDeepMock.user.findMany.mockResolvedValue([
        buildDbUser({ isPrivate: true }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

      // No friendship record
      prismaDeepMock.friendship.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findMany>
        >,
      );
      prismaDeepMock.postSupport.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.postSupport.findMany>
        >,
      );

      const results = await searchUsers("alice", "viewer-id", 5);

      // Private profile + no friendship → null
      expect(results[0].currentMood).toBeNull();
    });

    it("should expose currentMood for a private profile when viewer is a confirmed friend", async () => {
      prismaDeepMock.user.findMany.mockResolvedValue([
        buildDbUser({ id: "user-1", isPrivate: true }),
      ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);

      // Bilateral friendship record exists
      prismaDeepMock.friendship.findMany.mockResolvedValue([
        { userId: "viewer-id", friendId: "user-1" },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.friendship.findMany>
      >);
      prismaDeepMock.postSupport.findMany.mockResolvedValue(
        [] as unknown as Awaited<
          ReturnType<typeof prismaMock.postSupport.findMany>
        >,
      );

      const results = await searchUsers("alice", "viewer-id", 5);

      // Private profile + confirmed friend → mood visible
      expect(results[0].currentMood).toEqual({ value: 2 });
    });
  });
});
