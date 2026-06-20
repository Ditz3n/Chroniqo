/**
 * @jest-environment node
 */

// __tests__/api/feed/route.test.ts

/*
 * This file tests the API routes for the user feed and community posts.
 * It ensures that unauthenticated requests are blocked, and that valid
 * requests successfully call the appropriate service functions.
 */

import { GET as communityPostsGet } from "@/app/api/communities/[name]/posts/route";
import { GET as userFeedGet } from "@/app/api/feed/route";
import { auth } from "@/auth";
import { getCommunityPosts, getUserFeed } from "@/services/feed.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/feed.service");

describe("Feed API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetCommunityPosts = getCommunityPosts as jest.MockedFunction<
    typeof getCommunityPosts
  >;
  const mockedGetUserFeed = getUserFeed as jest.MockedFunction<
    typeof getUserFeed
  >;

  const mockSession = { user: { id: "user-1" } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/feed", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/feed");
      const res = await userFeedGet(req);
      expect(res.status).toBe(401);
    });

    it("should return 200 and posts with default pagination", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetUserFeed.mockResolvedValue([
        { id: "post-1" },
      ] as unknown as Awaited<ReturnType<typeof getUserFeed>>);

      const req = new Request("https://chroniqo.com/api/feed?sort=hot");
      const res = await userFeedGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.posts).toHaveLength(1);
      expect(mockedGetUserFeed).toHaveBeenCalledWith("user-1", "hot", 1);
    });
  });

  describe("GET /api/communities/[name]/posts", () => {
    it("should return 403 on Access denied from service", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetCommunityPosts.mockRejectedValue(new Error("Access denied"));

      const req = new Request(
        "https://chroniqo.com/api/communities/test/posts",
      );
      const res = await communityPostsGet(req, {
        params: Promise.resolve({ name: "test" }),
      });

      expect(res.status).toBe(403);
    });
  });
});
