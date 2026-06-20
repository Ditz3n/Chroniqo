// src/app/api/users/[username]/friend/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Get friends list + sent requests for a user
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username } = await params;
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Private profiles: only the owner or existing friends can see the list
    if (targetUser.isPrivate && targetUser.id !== session.user.id) {
      const friendship = await prisma.friendship.findUnique({
        where: {
          userId_friendId: { userId: session.user.id, friendId: targetUser.id },
        },
      });
      if (!friendship)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isOwnProfile = targetUser.id === session.user.id;

    const [friendships, receivedRequests, sentRequests, blockedRecords] =
      await Promise.all([
        prisma.friendship.findMany({
          where: { userId: targetUser.id },
          include: {
            friend: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                bio: true,
                avatarBgColor: true,
                avatarEmoji: true,
                emailVerified: true,
                dailyStatuses: {
                  orderBy: { date: "desc" },
                  take: 1,
                  select: { value: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        isOwnProfile
          ? prisma.friendRequest.findMany({
              where: { receiverId: session.user.id, status: "PENDING" },
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    bio: true,
                    avatarBgColor: true,
                    avatarEmoji: true,
                    emailVerified: true,
                    dailyStatuses: {
                      orderBy: { date: "desc" },
                      take: 1,
                      select: { value: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        isOwnProfile
          ? prisma.friendRequest.findMany({
              where: { senderId: session.user.id, status: "PENDING" },
              include: {
                receiver: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    bio: true,
                    avatarBgColor: true,
                    avatarEmoji: true,
                    emailVerified: true,
                    dailyStatuses: {
                      orderBy: { date: "desc" },
                      take: 1,
                      select: { value: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        isOwnProfile
          ? prisma.globalBlock.findMany({
              where: { blockerId: session.user.id },
              include: {
                blocked: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    bio: true,
                    avatarBgColor: true,
                    avatarEmoji: true,
                    emailVerified: true,
                    dailyStatuses: {
                      orderBy: { date: "desc" },
                      take: 1,
                      select: { value: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

    return NextResponse.json(
      {
        friends: friendships.map((f) => f.friend),
        receivedRequests,
        sentRequests,
        blockedUsers: blockedRecords.map((b) => b.blocked),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Send a friend request
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username } = await params;
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (targetUser.id === session.user.id)
      return NextResponse.json(
        { error: "Cannot add yourself" },
        { status: 400 },
      );

    // Check if the target user has blocked the requester
    const blockedByThem = await prisma.globalBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: targetUser.id,
          blockedId: session.user.id,
        },
      },
    });

    if (blockedByThem) {
      // Pretend user doesn't exist
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the requester has blocked the target user
    const blockedByMe = await prisma.globalBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetUser.id,
        },
      },
    });

    if (blockedByMe) {
      return NextResponse.json(
        { error: "You must unblock this user first" },
        { status: 400 },
      );
    }

    // Check existing
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: session.user.id },
        ],
      },
    });

    if (existing)
      return NextResponse.json(
        { error: "Request already exists" },
        { status: 400 },
      );

    await prisma.friendRequest.create({
      data: {
        senderId: session.user.id,
        receiverId: targetUser.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ message: "Request sent" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Remove friend or cancel request
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username } = await params;
    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Delete requests
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: session.user.id },
        ],
      },
    });

    // Delete friendships (both directions)
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: session.user.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: session.user.id },
        ],
      },
    });

    return NextResponse.json(
      { message: "Removed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
