// __tests__/utils/search-mappers.test.ts

/*
 * Tests for the mapSearchApiPostToPost mapper exported from use-search-results.ts.
 * Covers all 6 post type branches, anonymous author masking, isAuthor detection,
 * and the poll isClosed calculation.
 */

import { mapSearchApiPostToPost } from "@/app/[locale]/(protected)/search/(hooks)/use-search-results";
import { SearchApiPost } from "@/types/app-types";

// Isolate the mapper from hook machinery and time variance
jest.mock("swr", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/utils/time", () => ({ timeAgo: jest.fn(() => "2h") }));
jest.mock("@/lib/cache-keys", () => ({
  cacheKeys: {
    search: {
      suggest: jest.fn(),
      global: jest.fn(),
      community: jest.fn(),
      user: jest.fn(),
      globalSection: jest.fn(),
    },
  },
}));

// Base factory

const makePost = (overrides: Partial<SearchApiPost> = {}): SearchApiPost => ({
  id: "post-1",
  authorId: "author-1",
  communityId: "comm-1",
  isAnonymous: false,
  type: "text",
  title: "Test Post",
  content: "Some body text",
  metadata: {},
  createdAt: "2024-06-01T10:00:00.000Z",
  author: { id: "author-1", name: "Alice", username: "alice", image: null },
  community: { id: "comm-1", name: "MentalWellness", image: null },
  _count: { comments: 3, supportedBy: 5 },
  supports: 5,
  comments: 3,
  userSupported: false,
  isSaved: false,
  isHidden: false,
  isPinned: false,
  ...overrides,
});

// Base fields

describe("mapSearchApiPostToPost - base fields", () => {
  it("should map shared fields correctly", () => {
    const result = mapSearchApiPostToPost(makePost(), "viewer-1");

    expect(result.id).toBe("post-1");
    expect(result.title).toBe("Test Post");
    expect(result.timeAgo).toBe("2h");
    expect(result.supports).toBe(5);
    expect(result.comments).toBe(3);
    expect(result.community).toBe("MentalWellness");
    expect(result.isAuthor).toBe(false);
    expect(result.userSupported).toBe(false);
  });

  it("should set isAuthor=true when viewerId matches authorId", () => {
    const result = mapSearchApiPostToPost(
      makePost({ authorId: "viewer-1" }),
      "viewer-1",
    );
    expect(result.isAuthor).toBe(true);
  });

  it("should set community to Profile when communityId is null", () => {
    const result = mapSearchApiPostToPost(
      makePost({ communityId: null, community: null }),
      "viewer-1",
    );
    expect(result.community).toBe("Profile");
  });
});

// Anonymous masking

describe("mapSearchApiPostToPost - anonymous masking", () => {
  it("should mask author as Anonymous for anonymous posts", () => {
    const result = mapSearchApiPostToPost(
      makePost({ isAnonymous: true }),
      "viewer-1",
    );
    expect(result.author).toBe("Anonymous");
    expect(result.authorUsername).toBe("anonymous");
  });

  it("should reveal author when viewer is the author of an anonymous post", () => {
    // The API already handles this - isAnonymous=false for own posts
    const result = mapSearchApiPostToPost(
      makePost({ isAnonymous: false, authorId: "viewer-1" }),
      "viewer-1",
    );
    expect(result.author).toBe("Alice");
    expect(result.authorUsername).toBe("alice");
  });
});

// Type branches

describe("mapSearchApiPostToPost - type=text", () => {
  it("should map content as body", () => {
    const result = mapSearchApiPostToPost(makePost({ type: "text" }), "v");
    expect(result.type).toBe("text");
    if (result.type === "text") {
      expect(result.body).toBe("Some body text");
    }
  });

  it("should default body to empty string when content is null", () => {
    const result = mapSearchApiPostToPost(
      makePost({ type: "text", content: null }),
      "v",
    );
    if (result.type === "text") {
      expect(result.body).toBe("");
    }
  });
});

describe("mapSearchApiPostToPost - type=image", () => {
  it("should extract images array from metadata", () => {
    const result = mapSearchApiPostToPost(
      makePost({
        type: "image",
        metadata: { images: ["https://a.com/1.jpg", "https://a.com/2.jpg"] },
      }),
      "v",
    );
    expect(result.type).toBe("image");
    if (result.type === "image") {
      expect(result.images).toEqual([
        "https://a.com/1.jpg",
        "https://a.com/2.jpg",
      ]);
    }
  });

  it("should default to empty array when metadata has no images", () => {
    const result = mapSearchApiPostToPost(
      makePost({ type: "image", metadata: {} }),
      "v",
    );
    if (result.type === "image") {
      expect(result.images).toEqual([]);
    }
  });
});

describe("mapSearchApiPostToPost - type=video", () => {
  it("should extract video fields from metadata", () => {
    const result = mapSearchApiPostToPost(
      makePost({
        type: "video",
        metadata: {
          videoUrl: "https://cdn.com/v.mp4",
          thumbnailUrl: "https://cdn.com/t.jpg",
          duration: 42,
        },
      }),
      "v",
    );
    expect(result.type).toBe("video");
    if (result.type === "video") {
      expect(result.videoUrl).toBe("https://cdn.com/v.mp4");
      expect(result.thumbnailUrl).toBe("https://cdn.com/t.jpg");
      expect(result.duration).toBe(42);
    }
  });
});

describe("mapSearchApiPostToPost - type=youtube", () => {
  it("should extract videoId from metadata", () => {
    const result = mapSearchApiPostToPost(
      makePost({ type: "youtube", metadata: { videoId: "dQw4w9WgXcQ" } }),
      "v",
    );
    expect(result.type).toBe("youtube");
    if (result.type === "youtube") {
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    }
  });
});

describe("mapSearchApiPostToPost - type=link", () => {
  it("should extract all link metadata fields", () => {
    const result = mapSearchApiPostToPost(
      makePost({
        type: "link",
        metadata: {
          url: "https://example.com",
          siteName: "Example",
          metaTitle: "Page Title",
          metaDescription: "A description",
          metaImage: "https://example.com/og.jpg",
        },
      }),
      "v",
    );
    expect(result.type).toBe("link");
    if (result.type === "link") {
      expect(result.url).toBe("https://example.com");
      expect(result.siteName).toBe("Example");
      expect(result.metaTitle).toBe("Page Title");
    }
  });
});

describe("mapSearchApiPostToPost - type=poll", () => {
  it("should mark poll as closed when closesAt is in the past", () => {
    const result = mapSearchApiPostToPost(
      makePost({
        type: "poll",
        metadata: {
          options: [{ id: "o1", text: "Yes", votes: 5 }],
          closesAt: "2020-01-01T00:00:00.000Z", // Past date
          totalVotes: 5,
          userVote: null,
        },
      }),
      "v",
    );
    expect(result.type).toBe("poll");
    if (result.type === "poll") {
      expect(result.isClosed).toBe(true);
      expect(result.options).toHaveLength(1);
      expect(result.totalVotes).toBe(5);
      expect(result.userVote).toBeNull();
    }
  });

  it("should mark poll as open when closesAt is in the future", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = mapSearchApiPostToPost(
      makePost({
        type: "poll",
        metadata: {
          options: [],
          closesAt: futureDate,
          totalVotes: 0,
          userVote: "o1",
        },
      }),
      "v",
    );
    if (result.type === "poll") {
      expect(result.isClosed).toBe(false);
      expect(result.userVote).toBe("o1");
    }
  });

  it("should fall back to empty options array when metadata.options is missing", () => {
    const result = mapSearchApiPostToPost(
      makePost({ type: "poll", metadata: {} }),
      "v",
    );
    if (result.type === "poll") {
      expect(result.options).toEqual([]);
    }
  });
});

// Unknown type fallback

describe("mapSearchApiPostToPost - unknown type", () => {
  it("should fall back to text post for an unrecognised type", () => {
    const result = mapSearchApiPostToPost(
      makePost({ type: "unknown_future_type" }),
      "v",
    );
    expect(result.type).toBe("text");
  });
});
