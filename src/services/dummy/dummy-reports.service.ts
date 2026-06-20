// src/services/dummy/dummy-reports.service.ts
import { prisma } from "@/lib/prisma";
import { Community, Post, User } from "@prisma/client";
import { DUMMY_BAN, DUMMY_REPORT_REASONS } from "./data";

export async function generateDummyReports(
  users: User[],
  communities: Community[],
  posts: Post[],
) {
  console.log("[Dummy Generator] Generating exhaustive reports and bans...");
  if (users.length < 3 || communities.length < 1 || posts.length < 2) return;

  const reporter = users[0];
  const targetUser = users[1];
  const community = communities[0];

  const communityPost = posts.find((p) => p.communityId !== null);
  const profilePost = posts.find((p) => p.communityId === null);

  const communityComment = await prisma.comment.findFirst({
    where: { postId: communityPost?.id, isDummy: true },
  });
  const profileComment = await prisma.comment.findFirst({
    where: { postId: profilePost?.id, isDummy: true },
  });

  const reportsToCreate = [];

  // ==========================================
  // GLOBAL REPORTS (No targetCommunityId)
  // ==========================================

  // 1. Reporting a user via the Report user button
  reportsToCreate.push({
    reporterId: reporter.id,
    targetUserId: targetUser.id,
    reason: DUMMY_REPORT_REASONS.USER_BIO,
    isDummy: true,
  });

  if (profilePost) {
    // 2. Reporting a post created by the user on their own profile
    reportsToCreate.push({
      reporterId: reporter.id,
      targetPostId: profilePost.id,
      reason: DUMMY_REPORT_REASONS.PROFILE_POST_SPAM,
      isDummy: true,
    });
    // 3. Reporting the user FROM their post on their own profile
    reportsToCreate.push({
      reporterId: reporter.id,
      targetUserId: profilePost.authorId,
      targetPostId: profilePost.id,
      reason: DUMMY_REPORT_REASONS.USER_FROM_PROFILE_POST,
      isDummy: true,
    });
  }

  if (profileComment) {
    // 4. Reporting a comment written by the user on their own profile post
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommentId: profileComment.id,
      reason: DUMMY_REPORT_REASONS.PROFILE_COMMENT_OFFENSIVE,
      isDummy: true,
    });
    // 5. Reporting the user FROM their own comment on their own profile post
    reportsToCreate.push({
      reporterId: reporter.id,
      targetUserId: profileComment.authorId,
      targetCommentId: profileComment.id,
      reason: DUMMY_REPORT_REASONS.USER_FROM_PROFILE_COMMENT,
      isDummy: true,
    });
  }

  if (communityPost) {
    // 6. Reporting a post created by the user inside a community (GLOBAL escalations)
    reportsToCreate.push({
      reporterId: reporter.id,
      targetPostId: communityPost.id,
      reason: DUMMY_REPORT_REASONS.COMMUNITY_POST_MISINFORMATION,
      isDummy: true,
    });
    // 7. Reporting the user FROM their post inside a community (GLOBAL)
    reportsToCreate.push({
      reporterId: reporter.id,
      targetUserId: communityPost.authorId,
      targetPostId: communityPost.id,
      reason: DUMMY_REPORT_REASONS.USER_FROM_COMMUNITY_POST,
      isDummy: true,
    });
  }

  if (communityComment) {
    // 8. Reporting a comment written by the user inside a community (GLOBAL)
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommentId: communityComment.id,
      reason: DUMMY_REPORT_REASONS.COMMUNITY_COMMENT_HATE,
      isDummy: true,
    });
    // 9. Reporting the user FROM their comment inside a community (GLOBAL)
    reportsToCreate.push({
      reporterId: reporter.id,
      targetUserId: communityComment.authorId,
      targetCommentId: communityComment.id,
      reason: DUMMY_REPORT_REASONS.USER_FROM_COMMUNITY_COMMENT,
      isDummy: true,
    });
  }

  // ==========================================
  // COMMUNITY REPORTS (Includes targetCommunityId)
  // ==========================================

  if (communityPost) {
    // 10. Reporting the user's post inside a community to moderators
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommunityId: community.id,
      targetPostId: communityPost.id,
      reason: DUMMY_REPORT_REASONS.MOD_POST_RULE_BREAK,
      isDummy: true,
    });
    // 11. Reporting the user FROM their post inside a community to moderators
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommunityId: community.id,
      targetUserId: communityPost.authorId,
      targetPostId: communityPost.id,
      reason: DUMMY_REPORT_REASONS.MOD_USER_FROM_POST,
      isDummy: true,
    });
  }

  if (communityComment) {
    // 12. Reporting the user's comment inside a community to moderators
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommunityId: community.id,
      targetCommentId: communityComment.id,
      reason: DUMMY_REPORT_REASONS.MOD_COMMENT_UNSUPPORTIVE,
      isDummy: true,
    });
    // 13. Reporting the user FROM their comment inside a community to moderators
    reportsToCreate.push({
      reporterId: reporter.id,
      targetCommunityId: community.id,
      targetUserId: communityComment.authorId,
      targetCommentId: communityComment.id,
      reason: DUMMY_REPORT_REASONS.MOD_USER_FROM_COMMENT,
      isDummy: true,
    });
  }

  // 14. Reporting the community itself
  reportsToCreate.push({
    reporterId: reporter.id,
    targetCommunityId: community.id,
    reason: DUMMY_REPORT_REASONS.COMMUNITY_TOXIC,
    isDummy: true,
  });

  // Execute all reports
  await prisma.report.createMany({
    data: reportsToCreate,
  });

  // Global Ban Generation (For the new Banned Users tab)
  const existingBan = await prisma.globalBan.findUnique({
    where: { email: DUMMY_BAN.email },
  });

  if (!existingBan) {
    await prisma.globalBan.create({
      data: {
        email: DUMMY_BAN.email,
        reason: DUMMY_BAN.reason,
        expiresAt: new Date(
          Date.now() + DUMMY_BAN.durationDays * 24 * 3600 * 1000,
        ),
        isDummy: true,
      },
    });
  }
}
