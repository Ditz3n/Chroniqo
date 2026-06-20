// src/app/api/users/requests/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTodayUTC } from "@/lib/utils/mood-ring";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: session.user.id, status: "PENDING" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            avatarEmoji: true,
            avatarBgColor: true,
            dailyStatuses: {
              where: { date: getTodayUTC() },
              take: 1,
              select: { value: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
