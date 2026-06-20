/**
 * @jest-environment node
 */

// __tests__/api/search/route.test.ts

/*
 * Tests for the universal search API route.
 * Covers auth guard, Zod validation, all four type modes (suggest, global,
 * community, user), the section parameter for single-category deep results,
 * and error handling.
 */

import { GET } from "@/app/api/search/route";
import { auth } from "@/auth";
import {
  searchCommunities,
  searchPostsByCommunity,
  searchPostsByUser,
  searchPostsGlobal,
  searchUsers,
} from "@/services/search.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/search.service");

describe("Search API Route", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedSearchUsers = searchUsers as jest.MockedFunction<
    typeof searchUsers
  >;
  const mockedSearchCommunities = searchCommunities as jest.MockedFunction<
    typeof searchCommunities
  >;
  const mockedSearchPostsGlobal = searchPostsGlobal as jest.MockedFunction<
    typeof searchPostsGlobal
  >;
  const mockedSearchPostsByCommunity =
    searchPostsByCommunity as jest.MockedFunction<
      typeof searchPostsByCommunity
    >;
  const mockedSearchPostsByUser = searchPostsByUser as jest.MockedFunction<
    typeof searchPostsByUser
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

  const mockUsers = [
    { id: "u1", name: "Alice", username: "alice", image: null },
  ];
  const mockCommunities = [
    {
      id: "c1",
      name: "Health",
      image: null,
      headerImage: null,
      _count: { members: 5 },
    },
  ];
  const mockPosts = [{ id: "p1", title: "Test post", type: "text" }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSearchUsers.mockResolvedValue(
      mockUsers as Awaited<ReturnType<typeof searchUsers>>,
    );
    mockedSearchCommunities.mockResolvedValue(
      mockCommunities as Awaited<ReturnType<typeof searchCommunities>>,
    );
    mockedSearchPostsGlobal.mockResolvedValue(
      mockPosts as Awaited<ReturnType<typeof searchPostsGlobal>>,
    );
    mockedSearchPostsByCommunity.mockResolvedValue(
      mockPosts as Awaited<ReturnType<typeof searchPostsByCommunity>>,
    );
    mockedSearchPostsByUser.mockResolvedValue(
      mockPosts as Awaited<ReturnType<typeof searchPostsByUser>>,
    );
  });

  const makeRequest = (params: Record<string, string> = {}) => {
    const url = new URL("https://chroniqo.com/api/search");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new Request(url.toString());
  };

  // Auth guard

  it("should return 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const res = await GET(makeRequest({ q: "test", type: "global" }));
    expect(res.status).toBe(401);
  });

  // Empty query

  it("should return empty arrays for a blank query without calling any service", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ q: "   ", type: "global" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ users: [], communities: [], posts: [] });
    expect(mockedSearchUsers).not.toHaveBeenCalled();
  });

  // type=suggest

  it("should call searchUsers and searchCommunities in parallel for type=suggest", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ q: "health", type: "suggest" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchUsers).toHaveBeenCalledWith("health", "user-1", 5);
    expect(mockedSearchCommunities).toHaveBeenCalledWith("health", 5);
    expect(mockedSearchPostsGlobal).not.toHaveBeenCalled();
    expect(json.users).toEqual(mockUsers);
    expect(json.communities).toEqual(mockCommunities);
  });

  // type=global overview

  it("should call all three search functions for type=global without section", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ q: "pain", type: "global" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchUsers).toHaveBeenCalledWith("pain", "user-1", 5);
    expect(mockedSearchCommunities).toHaveBeenCalledWith("pain", 5);
    expect(mockedSearchPostsGlobal).toHaveBeenCalledWith("pain", "user-1", 10);
    expect(json.users).toEqual(mockUsers);
    expect(json.communities).toEqual(mockCommunities);
    expect(json.posts).toEqual(mockPosts);
  });

  // type=global with section

  it("should fetch only users with limit 20 for section=users", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(
      makeRequest({ q: "alice", type: "global", section: "users" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchUsers).toHaveBeenCalledWith("alice", "user-1", 20);
    expect(mockedSearchCommunities).not.toHaveBeenCalled();
    expect(mockedSearchPostsGlobal).not.toHaveBeenCalled();
    expect(json.users).toEqual(mockUsers);
    expect(json.communities).toEqual([]);
    expect(json.posts).toEqual([]);
  });

  it("should fetch only communities with limit 20 for section=communities", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(
      makeRequest({ q: "health", type: "global", section: "communities" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchCommunities).toHaveBeenCalledWith("health", 20);
    expect(mockedSearchUsers).not.toHaveBeenCalled();
    expect(mockedSearchPostsGlobal).not.toHaveBeenCalled();
    expect(json.communities).toEqual(mockCommunities);
    expect(json.users).toEqual([]);
    expect(json.posts).toEqual([]);
  });

  it("should fetch only posts with limit 20 for section=posts", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(
      makeRequest({ q: "fatigue", type: "global", section: "posts" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchPostsGlobal).toHaveBeenCalledWith(
      "fatigue",
      "user-1",
      20,
    );
    expect(mockedSearchUsers).not.toHaveBeenCalled();
    expect(mockedSearchCommunities).not.toHaveBeenCalled();
    expect(json.posts).toEqual(mockPosts);
    expect(json.users).toEqual([]);
    expect(json.communities).toEqual([]);
  });

  // type=community

  it("should return 400 for type=community without scope", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ q: "fatigue", type: "community" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("scope is required");
    expect(mockedSearchPostsByCommunity).not.toHaveBeenCalled();
  });

  it("should call searchPostsByCommunity with correct args for type=community", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(
      makeRequest({ q: "fatigue", type: "community", scope: "MentalWellness" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchPostsByCommunity).toHaveBeenCalledWith(
      "fatigue",
      "MentalWellness",
      "user-1",
    );
    expect(json.posts).toEqual(mockPosts);
  });

  // type=user

  it("should return 400 for type=user without scope", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(makeRequest({ q: "hello", type: "user" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("scope is required");
    expect(mockedSearchPostsByUser).not.toHaveBeenCalled();
  });

  it("should call searchPostsByUser with correct args for type=user", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const res = await GET(
      makeRequest({ q: "hello", type: "user", scope: "alice" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockedSearchPostsByUser).toHaveBeenCalledWith(
      "hello",
      "alice",
      "user-1",
    );
    expect(json.posts).toEqual(mockPosts);
  });

  // Error handling

  it("should return 500 when a service function throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedSearchUsers.mockRejectedValue(new Error("DB failure"));

    const res = await GET(makeRequest({ q: "test", type: "global" }));
    expect(res.status).toBe(500);
  });
});
