// src/app/api/admin/communities/[name]/warn/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const toI18nPayload = (key: string, params: Record<string, string> = {}) =>
  JSON.stringify({ key, params });

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const community = await prisma.community.findUnique({
      where: { name: decodedName },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get non-suppressed reports count
      const reportCount = await tx.report.count({
        where: { targetCommunityId: community.id, isSuppressed: false },
      });

      // 2. Notify all leaders
      const leaders = await tx.communityMember.findMany({
        where: {
          communityId: community.id,
          role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
        },
        select: { userId: true },
      });

      if (leaders.length > 0) {
        await tx.notification.createMany({
          data: leaders.map((leader) => ({
            userId: leader.userId,
            type: "WARNING",
            title: toI18nPayload("topNavbar.system_action_title"),
            message: toI18nPayload(
              "topNavbar.admin_warning_message_community",
              {
                community: community.name,
                count: reportCount.toString(),
              },
            ),
          })),
        });
      }

      // 3. Log the action
      await tx.adminWarning.create({
        data: {
          adminId: session.user.id,
          targetCommunityId: community.id,
        },
      });
    });

    return NextResponse.json({ message: "Warning sent" }, { status: 200 });
  } catch (error) {
    console.error("[Admin Comm Warn POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
