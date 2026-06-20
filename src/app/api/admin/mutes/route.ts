// src/app/api/admin/mutes/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const extendSchema = z.object({
  id: z.string(),
  durationHours: z.number().nullable(),
});

// GET - list all active global mutes (for the admin "Muted" tab)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const mutes = await prisma.globalMute.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            image: true,
            email: true,
            avatarEmoji: true,
            avatarBgColor: true,
            emailVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ mutes }, { status: 200 });
  } catch (error) {
    console.error("[Admin Mutes GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - extend a mute's expiry by id (mirrors /api/admin/bans PATCH)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = extendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { id, durationHours } = parsed.data;
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    await prisma.globalMute.update({
      where: { id },
      data: { expiresAt, updatedAt: new Date() },
    });

    return NextResponse.json({ message: "Mute extended" }, { status: 200 });
  } catch (error) {
    console.error("[Admin Mutes PATCH Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - revoke a mute by its id (mirrors /api/admin/bans DELETE)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.globalMute.delete({ where: { id } });

    return NextResponse.json({ message: "Mute revoked" }, { status: 200 });
  } catch (error) {
    console.error("[Admin Mutes DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
