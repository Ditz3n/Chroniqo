// __tests__/utils/test-constants.ts

/*
 * Centralized constants for tests to ensure consistency and avoid magic strings/numbers.
 * This includes test user IDs, emails, and any other static values used across multiple test files.
 * By using these constants, test data can easily be updated in one place and improve readability.
 */

export const TEST_IDS = {
  user: "user-1",
  otherUser: "other-user",
  conversation: "conv-123",
  message: "msg-123",
  post: "post-1",
  community: "comm-1",
  author: "author-1",
  draft: "draft-1",
} as const;

export const TEST_EMAILS = {
  default: "test@example.com",
  author: "author@test.com",
  banned: "banned@test.com",
} as const;
