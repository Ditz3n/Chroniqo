// src/services/dummy/data/reports.ts
export const DUMMY_REPORT_REASONS = {
  USER_BIO: "GLOBAL: Inappropriate profile bio.",
  PROFILE_POST_SPAM: "GLOBAL: Spam post on user profile.",
  USER_FROM_PROFILE_POST: "GLOBAL: User is spamming their profile.",
  PROFILE_COMMENT_OFFENSIVE: "GLOBAL: Offensive comment on profile post.",
  USER_FROM_PROFILE_COMMENT:
    "GLOBAL: User is leaving offensive comments on their profile.",
  COMMUNITY_POST_MISINFORMATION:
    "GLOBAL: Dangerous medical misinformation in community post.",
  USER_FROM_COMMUNITY_POST:
    "GLOBAL: User consistently spreads misinformation in communities.",
  COMMUNITY_COMMENT_HATE: "GLOBAL: Hate speech in community comment.",
  USER_FROM_COMMUNITY_COMMENT:
    "GLOBAL: User is attacking people in comments globally.",
  COMMUNITY_TOXIC: "GLOBAL: Community is unmoderated and toxic.",
  MOD_POST_RULE_BREAK: "COMMUNITY: Post breaks community rule #2.",
  MOD_USER_FROM_POST: "COMMUNITY: User is not following the subreddit vibe.",
  MOD_COMMENT_UNSUPPORTIVE: "COMMUNITY: Comment is unsupportive.",
  MOD_USER_FROM_COMMENT: "COMMUNITY: User is trolling in the comments.",
};

export const DUMMY_BAN = {
  email: "banned_dummy@chroniqo.com",
  reason: "Repeated violations of platform rules (Dummy).",
  durationDays: 7,
};
