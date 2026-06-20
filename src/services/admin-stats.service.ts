// src/services/admin-stats.service.ts
import { prisma } from "@/lib/prisma";
import { AdminStatsRange } from "@/types/app-types";

/**
 * Derives the current and previous period date boundaries for a given range.
 * All calculations use UTC to prevent timezone drift across Vercel regions.
 */
function getDateWindows(range: AdminStatsRange): {
  thisPeriodStart: Date;
  prevPeriodStart: Date;
  prevPeriodEnd: Date;
} {
  const now = new Date();

  switch (range) {
    case "today": {
      const thisPeriodStart = new Date(now);
      thisPeriodStart.setUTCHours(0, 0, 0, 0);
      const prevPeriodStart = new Date(thisPeriodStart);
      prevPeriodStart.setUTCDate(prevPeriodStart.getUTCDate() - 1);
      return {
        thisPeriodStart,
        prevPeriodStart,
        prevPeriodEnd: thisPeriodStart,
      };
    }
    case "week": {
      const thisPeriodStart = new Date(now);
      thisPeriodStart.setUTCDate(thisPeriodStart.getUTCDate() - 7);
      thisPeriodStart.setUTCHours(0, 0, 0, 0);
      const prevPeriodStart = new Date(now);
      prevPeriodStart.setUTCDate(prevPeriodStart.getUTCDate() - 14);
      prevPeriodStart.setUTCHours(0, 0, 0, 0);
      return {
        thisPeriodStart,
        prevPeriodStart,
        prevPeriodEnd: thisPeriodStart,
      };
    }
    case "month": {
      const thisPeriodStart = new Date(now);
      thisPeriodStart.setUTCDate(thisPeriodStart.getUTCDate() - 30);
      thisPeriodStart.setUTCHours(0, 0, 0, 0);
      const prevPeriodStart = new Date(now);
      prevPeriodStart.setUTCDate(prevPeriodStart.getUTCDate() - 60);
      prevPeriodStart.setUTCHours(0, 0, 0, 0);
      return {
        thisPeriodStart,
        prevPeriodStart,
        prevPeriodEnd: thisPeriodStart,
      };
    }
    case "year": {
      const thisPeriodStart = new Date(now);
      thisPeriodStart.setUTCFullYear(thisPeriodStart.getUTCFullYear() - 1);
      thisPeriodStart.setUTCHours(0, 0, 0, 0);
      const prevPeriodStart = new Date(now);
      prevPeriodStart.setUTCFullYear(prevPeriodStart.getUTCFullYear() - 2);
      prevPeriodStart.setUTCHours(0, 0, 0, 0);
      return {
        thisPeriodStart,
        prevPeriodStart,
        prevPeriodEnd: thisPeriodStart,
      };
    }
  }
}

export async function getPlatformStats(range: AdminStatsRange = "week") {
  const { thisPeriodStart, prevPeriodStart, prevPeriodEnd } =
    getDateWindows(range);

  const [
    totalUsers,
    newUsersThisPeriod,
    newUsersLastPeriod,
    onboardedUsers,
    totalPosts,
    postsThisPeriod,
    postsLastPeriod,
    totalComments,
    commentsThisPeriod,
    commentsLastPeriod,
    totalCommunities,
    activeCommunities,
    suspendedCommunities,
    newCommunitiesThisPeriod,
    activeBans,
    activeMutes,
    totalReports,
    suppressedReports,
  ] = await prisma.$transaction([
    // Users
    prisma.user.count({ where: { isDummy: false } }),
    prisma.user.count({
      where: { isDummy: false, createdAt: { gte: thisPeriodStart } },
    }),
    prisma.user.count({
      where: {
        isDummy: false,
        createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
      },
    }),
    prisma.user.count({ where: { isDummy: false, onboarded: true } }),

    // Posts
    prisma.post.count({ where: { isDummy: false } }),
    prisma.post.count({
      where: { isDummy: false, createdAt: { gte: thisPeriodStart } },
    }),
    prisma.post.count({
      where: {
        isDummy: false,
        createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
      },
    }),

    // Comments
    prisma.comment.count({ where: { isDummy: false } }),
    prisma.comment.count({
      where: { isDummy: false, createdAt: { gte: thisPeriodStart } },
    }),
    prisma.comment.count({
      where: {
        isDummy: false,
        createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
      },
    }),

    // Communities
    prisma.community.count({ where: { isDummy: false } }),
    prisma.community.count({ where: { isDummy: false, isActive: true } }),
    prisma.community.count({ where: { isDummy: false, isActive: false } }),
    prisma.community.count({
      where: { isDummy: false, createdAt: { gte: thisPeriodStart } },
    }),

    // Moderation
    prisma.globalBan.count({ where: { isActive: true } }),
    prisma.globalMute.count(),
    prisma.report.count({ where: { isDummy: false } }),
    prisma.report.count({ where: { isDummy: false, isSuppressed: true } }),
  ]);

  const pendingReports = totalReports - suppressedReports;

  // Runs separately so Prisma can fully infer the groupBy return type,
  // which $transaction cannot preserve for aggregation queries in Prisma v7.
  const moodGrouped = await prisma.dailyStatus.groupBy({
    by: ["value"],
    orderBy: { value: "asc" },
    where: {
      user: { isDummy: false },
      createdAt: { gte: thisPeriodStart },
    },
    _count: { value: true },
  });

  const moodTotal = moodGrouped.reduce((sum, row) => sum + row._count.value, 0);
  const moodDistribution = [0, 1, 2, 3, 4].map((v) => {
    const row = moodGrouped.find((r) => r.value === v);
    const count = row?._count.value ?? 0;
    return {
      value: v,
      count,
      percentage: moodTotal > 0 ? Math.round((count / moodTotal) * 100) : 0,
    };
  });

  const onboardingRate =
    totalUsers > 0 ? Math.round((onboardedUsers / totalUsers) * 100) : 0;

  return {
    users: {
      total: totalUsers,
      newThisPeriod: newUsersThisPeriod,
      newLastPeriod: newUsersLastPeriod,
      onboarded: onboardedUsers,
      onboardingRate,
    },
    content: {
      totalPosts,
      postsThisPeriod,
      postsLastPeriod,
      totalComments,
      commentsThisPeriod,
      commentsLastPeriod,
    },
    communities: {
      total: totalCommunities,
      active: activeCommunities,
      suspended: suspendedCommunities,
      newThisPeriod: newCommunitiesThisPeriod,
    },
    moderation: {
      activeBans,
      activeMutes,
      pendingReports,
      totalReports,
    },
    mood: {
      distribution: moodDistribution,
      total: moodTotal,
    },
  };
}
