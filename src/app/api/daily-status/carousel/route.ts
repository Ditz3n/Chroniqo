// src/app/api/daily-status/carousel/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get today's UTC midnight date to match how statuses are stored
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    const statuses = await prisma.dailyStatus.findMany({
      where: {
        date: today,
        userId: { not: session.user.id }, // Don't show own status in the carousel
        user: {
          friendships: {
            some: { friendId: session.user.id }, // Only show friends' statuses
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            avatarEmoji: true,
            avatarBgColor: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Limit carousel size for performance
    });

    return NextResponse.json({ statuses }, { status: 200 });
  } catch (error) {
    console.error("[Carousel GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
