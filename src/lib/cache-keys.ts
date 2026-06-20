// src/lib/cache-keys.ts

/**
 * Cache Key Factory
 *
 * Centralized location for all SWR cache key patterns used throughout the app.
 * This makes cache URLs type-safe and easily refactorable in one place.
 *
 * Usage:
 * - Generate keys: cacheKeys.posts.byId(postId)
 * - Check patterns: cacheKeys.posts.isPostKey(key)
 * - Mutate cache: mutate((key) => cacheKeys.posts.matchesPattern(key))
 */

export const cacheKeys = {
  posts: {
    feed: (sort: string = "new", page: number = 1) =>
      `/api/feed?sort=${sort}&page=${page}`,
    feedPattern: () => "/api/feed?",
    byId: (postId: string) => `/api/posts/${postId}`,
    byIdPattern: (postId: string) => `/api/posts/${postId}`,
    byIdCommentsPattern: (postId: string) => `/api/posts/${postId}/comments`,
    byIdComments: (postId: string, page: number = 1) =>
      `/api/posts/${postId}/comments?page=${page}`,

    // Checkers
    isFeedKey: (key: string) => key.includes("/api/feed?"),
    isPostKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/posts/") &&
      !key.includes("/comments"),
    isPostCommentKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/posts/") &&
      key.includes("/comments"),
    isPostListKey: (key: string) =>
      typeof key === "string" &&
      (key.includes("/api/feed?") ||
        (key.includes("/api/communities/") && key.includes("/posts?")) ||
        (key.includes("/api/users/") && key.includes("/posts?"))),
    isProfilePostListKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/users/") &&
      key.includes("/posts?"),
  },

  comments: {
    byId: (commentId: string) => `/api/comments/${commentId}`,
    byIdPattern: (commentId: string) => `/api/comments/${commentId}`,
    byIdThread: (commentId: string, page: number = 1) =>
      `/api/comments/${commentId}?page=${page}`,

    // Checkers
    isCommentKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/comments/") &&
      !key.includes("/posts/"),
    matchesCommentId: (key: string, commentId: string) =>
      typeof key === "string" && key.includes(`/api/comments/${commentId}`),
  },

  communities: {
    byName: (name: string, sort: string = "new", page: number = 1) =>
      `/api/communities/${encodeURIComponent(name)}/posts?sort=${sort}&page=${page}`,
    byNamePattern: (name: string) =>
      `/api/communities/${encodeURIComponent(name)}/posts?`,
    reports: (name: string) =>
      `/api/communities/${encodeURIComponent(name)}/reports`,

    // Checkers
    isCommunityPostKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/communities/") &&
      key.includes("/posts?"),
    matchesCommunityName: (key: string, name: string) =>
      typeof key === "string" &&
      key.includes(`/api/communities/${encodeURIComponent(name)}`),
  },

  users: {
    posts: (
      username: string,
      tab: string = "posts",
      sort: string = "new",
      page: number = 1,
    ) => `/api/users/${username}/posts?tab=${tab}&sort=${sort}&page=${page}`,
    postsPattern: (username: string) => `/api/users/${username}/posts?`,
    profile: (username: string) => `/api/users/${username}/profile`,
    reports: (username: string) => `/api/admin/reports/users/${username}`,

    // Checkers
    isUserPostKey: (key: string) =>
      typeof key === "string" &&
      key.includes("/api/users/") &&
      key.includes("/posts?"),
    matchesUserProfile: (key: string, username: string) =>
      typeof key === "string" && key.includes(`/api/users/${username}`),
  },

  search: {
    suggest: (q: string) =>
      `/api/search?q=${encodeURIComponent(q)}&type=suggest`,
    global: (q: string) => `/api/search?q=${encodeURIComponent(q)}&type=global`,
    globalSection: (q: string, section: string) =>
      `/api/search?q=${encodeURIComponent(q)}&type=global&section=${section}`,
    community: (q: string, name: string) =>
      `/api/search?q=${encodeURIComponent(q)}&type=community&scope=${encodeURIComponent(name)}`,
    user: (q: string, username: string) =>
      `/api/search?q=${encodeURIComponent(q)}&type=user&scope=${encodeURIComponent(username)}`,
  },

  minigames: {
    byId: (id: string) => `/api/minigames/${id}`,
    conversationActive: (conversationId: string) =>
      `/api/conversations/${conversationId}/minigames`,
    history: (opponentId: string) => `/api/minigames/history/${opponentId}`,
  },

  // Utility functions for cache invalidation
  matchesPattern: (key: string, pattern: string | RegExp): boolean => {
    if (typeof pattern === "string") {
      return typeof key === "string" && key.includes(pattern);
    }
    return typeof key === "string" && pattern.test(key);
  },

  /**
   * Create a predicate function for SWR mutate cache invalidation
   * Usage: mutate(cacheKeys.invalidatePattern("/api/posts/123/comments"))
   */
  invalidatePattern: (pattern: string) => (key: unknown) =>
    typeof key === "string" && key.includes(pattern),

  /**
   * Create a predicate for multiple patterns (OR logic)
   * Usage: mutate(cacheKeys.invalidatePatterns(["/api/posts/123/comments", "/api/comments/456"]))
   */
  invalidatePatterns: (patterns: string[]) => (key: unknown) =>
    typeof key === "string" && patterns.some((p) => key.includes(p)),
};
