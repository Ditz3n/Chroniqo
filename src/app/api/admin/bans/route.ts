// src/app/api/admin/bans/route.ts
import { auth } from "@/auth";
import { sendUnbanEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { clearBanFlag } from "@/lib/upstash";
import { NextResponse } from "next/server";
import { z } from "zod";

const extendBanSchema = z.object({
  id: z.string().min(1),
  durationHours: z.number().nullable(),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const [bans, previousBans] = await Promise.all([
      prisma.globalBan.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
        },
      }),
      // Cap at 50 to keep response size bounded - oldest revoked bans are least relevant
      prisma.globalBan.findMany({
        where: { isActive: false },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          user: {
            select: {
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ bans, previousBans });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch bans" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = extendBanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { id, durationHours } = parsed.data;
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    const updatedBan = await prisma.globalBan.update({
      where: { id },
      data: { expiresAt, isActive: true },
    });

    return NextResponse.json({ success: true, ban: updatedBan });
  } catch (error) {
    console.error("[Extend Ban Error]:", error);
    return NextResponse.json(
      { error: "Failed to extend ban" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const ban = await prisma.globalBan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, locale: true } },
      },
    });

    if (!ban || !ban.user?.email) {
      return NextResponse.json(
        { error: "Ban or user not found" },
        { status: 404 },
      );
    }

    await prisma.globalBan.update({
      where: { id },
      data: { isActive: false, deleteToken: null },
    });

    // Clear the Redis flag so the user's active sessions are not signed out
    if (ban.user.id) {
      await clearBanFlag(ban.user.id);
    }

    sendUnbanEmail(ban.user.email, ban.user.locale || "en").catch((err) =>
      console.error("Failed to send unban email:", err),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to revoke ban" },
      { status: 500 },
    );
  }
}
