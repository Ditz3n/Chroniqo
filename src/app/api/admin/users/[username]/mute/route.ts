// src/app/api/admin/users/[username]/mute/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const toI18nPayload = (key: string, params: Record<string, string> = {}) =>
  JSON.stringify({ key, params });

const muteSchema = z.object({
  reason: z.string().optional(),
  durationHours: z.number().nullable().optional(),
});

// GET - returns the current active mute record for this user (null if not muted)
export async function GET(
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
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const mute = await prisma.globalMute.findUnique({
      where: { userId: targetUser.id },
    });

    const now = new Date();
    const isActive = mute && (!mute.expiresAt || mute.expiresAt > now);

    return NextResponse.json({ mute: isActive ? mute : null });
  } catch (error) {
    console.error("[Admin User Mute GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - creates or replaces a global mute for the target user
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
      // Allow empty body - defaults to permanent mute with no reason
    }

    const parsed = muteSchema.safeParse(payload);
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
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot mute yourself" },
        { status: 400 },
      );
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "You cannot mute another admin" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.globalMute.upsert({
        where: { userId: targetUser.id },
        update: { reason: cleanReason, expiresAt, updatedAt: new Date() },
        create: { userId: targetUser.id, reason: cleanReason, expiresAt },
      });

      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: "SYSTEM",
          title: toI18nPayload("topNavbar.global_mute_title"),
          message: cleanReason
            ? toI18nPayload("topNavbar.global_mute_message_with_reason", {
                reason: cleanReason,
              })
            : toI18nPayload("topNavbar.global_mute_message"),
        },
      });
    });

    return NextResponse.json(
      { message: "User muted globally" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin User Mute POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - removes a global mute and notifies the user
export async function DELETE(
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
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.globalMute.deleteMany({ where: { userId: targetUser.id } });

      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: "SYSTEM",
          title: toI18nPayload("topNavbar.global_unmute_title"),
          message: toI18nPayload("topNavbar.global_unmute_message"),
        },
      });
    });

    return NextResponse.json(
      { message: "User unmuted globally" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin User Mute DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
