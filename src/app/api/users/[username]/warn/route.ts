// src/app/api/users/[username]/warn/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const toI18nPayload = (key: string, params: Record<string, string>) =>
  JSON.stringify({ key, params });

const warnSchema = z.object({
  communityName: z.string().min(1),
  reason: z.string().min(1),
  postTitle: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    const body = await request.json();
    const parsed = warnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch existing warnings for this user
      const existingWarnings = await tx.notification.findMany({
        where: { userId: targetUser.id, type: "WARNING" },
        orderBy: { createdAt: "asc" }, // Oldest first
      });

      // 2. If they have 3 or more warnings, delete the oldest one(s) to make room for the new one (cap at 3)
      if (existingWarnings.length >= 3) {
        const toDeleteCount = existingWarnings.length - 2; // Keep the 2 newest, making room for the 3rd
        const toDeleteIds = existingWarnings
          .slice(0, toDeleteCount)
          .map((w) => w.id);

        await tx.notification.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }

      const trimmedReason = parsed.data.reason.trim().replace(/[.\s]+$/, "");
      const warningMessage = parsed.data.postTitle
        ? toI18nPayload("topNavbar.warning_message_post", {
            post: parsed.data.postTitle,
            reason: trimmedReason,
          })
        : toI18nPayload("topNavbar.warning_message_community", {
            community: parsed.data.communityName,
            reason: trimmedReason,
          });

      // 3. Create the new warning notification
      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: "WARNING",
          title: toI18nPayload("topNavbar.warning_title", {
            community: parsed.data.communityName,
          }),
          message: warningMessage,
        },
      });
    });

    return NextResponse.json({ message: "Warning sent" }, { status: 200 });
  } catch (error) {
    console.error("[Warn User POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
