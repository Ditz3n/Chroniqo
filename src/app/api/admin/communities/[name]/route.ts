// src/app/api/admin/communities/[name]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const toI18nPayload = (key: string, params: Record<string, string> = {}) =>
  JSON.stringify({ key, params });

const suspendCommunitySchema = z.object({
  reason: z.string().optional(),
  durationHours: z
    .number()
    .min(1, "Duration must be at least 1 hour")
    .optional(),
  action: z.enum(["suspend", "lift"]).default("suspend"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    let payload = {};
    try {
      payload = await request.json();
    } catch {}

    const parsed = suspendCommunitySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { reason, durationHours, action } = parsed.data;

    const community = await prisma.community.findUnique({
      where: { name: decodedName },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    const isLifting = action === "lift";
    const cleanReason = isLifting ? null : reason?.trim() || null;
    const bannedUntil = isLifting
      ? null
      : durationHours
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
        : null;

    if (!isLifting && !durationHours) {
      return NextResponse.json(
        { error: "Duration is required for suspensions" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.community.update({
        where: { id: community.id },
        data: {
          isActive: isLifting,
          banReason: cleanReason,
          bannedUntil,
        },
      });

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
            type: "SYSTEM",
            title: toI18nPayload("topNavbar.system_action_title"),
            message: isLifting
              ? toI18nPayload("topNavbar.community_reinstated", {
                  community: community.name,
                })
              : cleanReason
                ? toI18nPayload("topNavbar.community_suspended_with_reason", {
                    community: community.name,
                    reason: cleanReason,
                  })
                : toI18nPayload("topNavbar.community_suspended", {
                    community: community.name,
                  }),
          })),
        });
      }
    });

    return NextResponse.json(
      { message: "Community suspension updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin Comm Suspend POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete Community entirely
export async function DELETE(
  request: Request,
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
      select: { id: true, name: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    let reason: string | undefined;
    try {
      const payload = (await request.json()) as { reason?: string };
      reason = payload?.reason?.trim();
    } catch {}

    await prisma.$transaction(async (tx) => {
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
            type: "SYSTEM",
            title: toI18nPayload("topNavbar.system_action_title"),
            message: reason
              ? toI18nPayload("topNavbar.community_deleted_with_reason", {
                  community: community.name,
                  reason,
                })
              : toI18nPayload("topNavbar.community_deleted", {
                  community: community.name,
                }),
          })),
        });
      }

      await tx.community.delete({
        where: { id: community.id },
      });
    });

    return NextResponse.json({ message: "Community deleted" }, { status: 200 });
  } catch (error) {
    console.error("[Admin Comm DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
