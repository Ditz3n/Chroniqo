// src/app/api/users/search/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }, // Don't search for oneself
        OR: [
          { messagingPermission: "ALL" },
          {
            messagingPermission: "ONLY_FRIENDS",
            friendships: { some: { friendId: session.user.id } },
          },
        ],
        AND: [
          {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarEmoji: true,
        avatarBgColor: true,
        headerImage: true,
        headerEmoji: true,
        headerBgColor: true,
        emailVerified: true,
      },

      take: 10,
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[User Search API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
