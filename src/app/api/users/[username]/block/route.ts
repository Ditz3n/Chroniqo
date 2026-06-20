// src/app/api/users/[username]/block/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    const targetUser = await prisma.user.findUnique({ where: { username } });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 },
      );
    }

    // Perform the block and sever all ties in a transaction
    await prisma.$transaction([
      // Create block (upsert to handle if it somehow already exists)
      prisma.globalBlock.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId: targetUser.id,
          },
        },
        update: {},
        create: {
          blockerId: session.user.id,
          blockedId: targetUser.id,
        },
      }),
      // Delete friendships
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId: session.user.id, friendId: targetUser.id },
            { userId: targetUser.id, friendId: session.user.id },
          ],
        },
      }),
      // Delete friend requests
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: targetUser.id },
            { senderId: targetUser.id, receiverId: session.user.id },
          ],
        },
      }),
    ]);

    return NextResponse.json({ message: "User blocked" }, { status: 200 });
  } catch (error) {
    console.error("[Block User POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    const targetUser = await prisma.user.findUnique({ where: { username } });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.globalBlock.deleteMany({
      where: {
        blockerId: session.user.id,
        blockedId: targetUser.id,
      },
    });

    return NextResponse.json({ message: "User unblocked" }, { status: 200 });
  } catch (error) {
    console.error("[Block User DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
