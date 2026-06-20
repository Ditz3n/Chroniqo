// src/app/api/communities/[name]/hide/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const community = await prisma.community.findUnique({
      where: { name: decodeURIComponent(name) },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    const blocked = await prisma.blockedCommunity.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
    });

    if (blocked) {
      return NextResponse.json(
        { error: "Blocked communities cannot be hidden" },
        { status: 400 },
      );
    }

    const existing = await prisma.hiddenCommunity.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
    });

    if (existing) {
      // Unhide
      await prisma.hiddenCommunity.delete({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
      });
      return NextResponse.json({ hidden: false }, { status: 200 });
    } else {
      // Hide
      await prisma.hiddenCommunity.create({
        data: {
          userId: session.user.id,
          communityId: community.id,
        },
      });
      return NextResponse.json({ hidden: true }, { status: 200 });
    }
  } catch (error) {
    console.error("[Community Hide Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
