// src/app/api/user/mute-status/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Lightweight endpoint polled by the navbar and create page to gate posting UI.
// Only selects expiresAt - no PII leak beyond what the session already holds.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const globalMute = await prisma.globalMute.findUnique({
      where: { userId: session.user.id },
      select: { expiresAt: true },
    });

    const now = new Date();
    const isMuted =
      !!globalMute && (!globalMute.expiresAt || globalMute.expiresAt > now);

    return NextResponse.json({
      isMuted,
      expiresAt: isMuted ? (globalMute.expiresAt?.toISOString() ?? null) : null,
    });
  } catch (error) {
    console.error("[User Mute Status GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
