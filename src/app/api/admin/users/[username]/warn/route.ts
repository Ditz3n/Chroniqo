// src/app/api/admin/users/[username]/warn/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const toI18nPayload = (key: string, params: Record<string, string> = {}) =>
  JSON.stringify({ key, params });

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot warn yourself" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Only count non-suppressed reports
      const reportCount = await tx.report.count({
        where: { targetUserId: targetUser.id, isSuppressed: false },
      });

      // Cap UI notifications at 3
      const existingWarnings = await tx.notification.findMany({
        where: { userId: targetUser.id, type: "WARNING" },
        orderBy: { createdAt: "asc" },
      });

      if (existingWarnings.length >= 3) {
        const toDeleteCount = existingWarnings.length - 2;
        const toDeleteIds = existingWarnings
          .slice(0, toDeleteCount)
          .map((w) => w.id);

        await tx.notification.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }

      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: "WARNING",
          title: toI18nPayload("topNavbar.system_action_title"),
          message: toI18nPayload("topNavbar.admin_warning_message", {
            count: reportCount.toString(),
          }),
        },
      });

      // Log the warning in the Admin history
      await tx.adminWarning.create({
        data: {
          adminId: session.user.id,
          targetUserId: targetUser.id,
        },
      });
    });

    return NextResponse.json({ message: "Warning sent" }, { status: 200 });
  } catch (error) {
    console.error("[Admin Warn User Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
