// src/app/api/admin/reports/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all global reports and resolve responsible user IDs
    const globalReports =
      (await prisma.report.findMany({
        where: { targetCommunityId: null },
        select: {
          targetUserId: true,
          targetPost: { select: { authorId: true } },
          targetComment: { select: { authorId: true } },
        },
      })) || [];

    const userReportCounts: Record<string, number> = {};
    for (const report of globalReports) {
      const responsibleUserId =
        report.targetUserId ||
        report.targetPost?.authorId ||
        report.targetComment?.authorId;

      if (responsibleUserId) {
        userReportCounts[responsibleUserId] =
          (userReportCounts[responsibleUserId] || 0) + 1;
      }
    }

    // 2. Fetch community report counts
    const communityReportsData = await prisma.report.groupBy({
      by: ["targetCommunityId"],
      where: {
        targetCommunityId: { not: null },
        targetUserId: null,
        targetPostId: null,
        targetCommentId: null,
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const reportedUserIds = Object.keys(userReportCounts);

    // 3. Resolve target entities to get names/images and latest dailyStatus
    const [users, communities, activeMutes, dailyStatuses] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: reportedUserIds } },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          emailVerified: true,
        },
      }),
      prisma.community.findMany({
        where: {
          id: {
            in: communityReportsData.map((r) => r.targetCommunityId as string),
          },
        },
        select: {
          id: true,
          name: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          isPrivate: true,
          isActive: true,
          bannedUntil: true,
        },
      }),
      prisma.globalMute.findMany({
        where: {
          userId: { in: reportedUserIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { userId: true, expiresAt: true },
      }),
      prisma.dailyStatus.findMany({
        where: { userId: { in: reportedUserIds } },
        orderBy: [{ userId: "asc" }, { date: "desc" }],
        distinct: ["userId"],
        select: { userId: true, value: true },
      }),
    ]);

    const muteByUserId = new Map(
      activeMutes.map((mute) => [mute.userId, mute.expiresAt]),
    );

    // 4. Map aggregated data
    const moodByUserId = new Map(
      dailyStatuses.map((ds) => [ds.userId, ds.value]),
    );
    const reportedUsers = users
      .map((user) => ({
        user,
        reportCount: userReportCounts[user.id] || 0,
        mutedUntil: muteByUserId.get(user.id) ?? null,
        dailyStatusValue: moodByUserId.get(user.id) ?? null,
      }))
      .sort((a, b) => b.reportCount - a.reportCount);

    const reportedCommunities = communityReportsData
      .map((r) => {
        const c = communities.find((comm) => comm.id === r.targetCommunityId);
        if (!c) return null;
        const isSuspended = c.isActive === false;
        const hasActiveTimedSuspension =
          !!c.bannedUntil && new Date(c.bannedUntil) > new Date();
        return {
          community: {
            id: c.id,
            name: c.name,
            image: c.image,
            avatarEmoji: c.avatarEmoji,
            avatarBgColor: c.avatarBgColor,
            isPrivate: c.isPrivate,
          },
          reportCount: r._count.id,
          isSuspended,
          suspendedUntil: isSuspended
            ? hasActiveTimedSuspension
              ? c.bannedUntil
              : null
            : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      { reportedUsers, reportedCommunities },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin Reports GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
