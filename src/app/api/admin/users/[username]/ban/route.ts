// src/app/api/admin/users/[username]/ban/route.ts
import { auth } from "@/auth";
import { sendBanEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { setBanFlag } from "@/lib/upstash";
import { NextResponse } from "next/server";
import { z } from "zod";

const toI18nPayload = (key: string, params: Record<string, string> = {}) =>
  JSON.stringify({ key, params });

const globalBanSchema = z.object({
  reason: z.string().optional(),
  durationHours: z.number().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    let payload = {};

    try {
      payload = await request.json();
    } catch {
      // Ignore empty body
    }

    const parsed = globalBanSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { reason, durationHours } = parsed.data;
    const cleanReason = reason?.trim() || null;
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot ban yourself" },
        { status: 400 },
      );
    }

    // Destructure after all null/self-ban guards - TypeScript narrowing is fully resolved here
    const {
      id: targetUserId,
      email: targetEmail,
      locale: targetLocale,
      username: targetUsername,
    } = targetUser;

    await prisma.$transaction(async (tx) => {
      await tx.globalBan.upsert({
        where: { email: targetEmail },
        update: {
          reason: cleanReason,
          userId: targetUserId,
          expiresAt,
          isActive: true,
        },
        create: {
          email: targetEmail,
          userId: targetUserId,
          reason: cleanReason,
          expiresAt,
          isActive: true,
        },
      });
      await tx.session.deleteMany({ where: { userId: targetUserId } });

      const userReports = await tx.report.findMany({
        where: {
          targetCommunityId: null,
          OR: [
            { targetUserId },
            { targetPost: { authorId: targetUserId } },
            { targetComment: { authorId: targetUserId } },
          ],
        },
        select: { reporterId: true },
      });
      const reporterIds = [...new Set(userReports.map((r) => r.reporterId))];

      await tx.report.deleteMany({
        where: {
          targetCommunityId: null,
          OR: [
            { targetUserId },
            { targetPost: { authorId: targetUserId } },
            { targetComment: { authorId: targetUserId } },
          ],
        },
      });

      if (reporterIds.length > 0) {
        await tx.notification.createMany({
          data: reporterIds.map((reporterId) => ({
            userId: reporterId,
            type: "SYSTEM",
            title: toI18nPayload("topNavbar.system_action_title"),
            message: toI18nPayload("topNavbar.reported_user_banned_message", {
              user: targetUsername || "Unknown",
            }),
          })),
        });
      }
    });

    setBanFlag(targetUserId).catch((err) =>
      console.error("Failed to set ban flag in Redis:", err),
    );

    sendBanEmail(targetEmail, targetLocale, cleanReason, expiresAt).catch(
      (err) => console.error("Failed to send ban email:", err),
    );

    return NextResponse.json(
      { message: "User banned globally" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Global Ban POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
