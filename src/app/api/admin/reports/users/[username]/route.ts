// src/app/api/admin/reports/users/[username]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    // Fetch user and latest dailyStatus value
    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarEmoji: true,
        avatarBgColor: true,
        emailVerified: true,
      },
    });

    // Fetch latest dailyStatus for mood ring
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const latestStatus = await prisma.dailyStatus.findFirst({
      where: { userId: targetUser.id },
      orderBy: { date: "desc" },
      select: { value: true },
    });
    const dailyStatusValue = latestStatus?.value ?? null;

    const [reports, warnings] = await Promise.all([
      prisma.report.findMany({
        where: {
          targetCommunityId: null, // Strictly Global
          OR: [
            { targetUserId: targetUser.id }, // Reports directly on the user
            { targetPost: { authorId: targetUser.id } }, // Reports on their posts
            { targetComment: { authorId: targetUser.id } }, // Reports on their comments
          ],
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              avatarEmoji: true,
              avatarBgColor: true,
              emailVerified: true,
            },
          },
          targetPost: {
            select: {
              id: true,
              title: true,
              community: { select: { name: true } },
              author: { select: { username: true, emailVerified: true } },
            },
          },
          targetComment: {
            select: {
              id: true,
              content: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  community: { select: { name: true } },
                  author: { select: { username: true, emailVerified: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Fetch the 10 most recent warnings
      prisma.adminWarning.findMany({
        where: { targetUserId: targetUser.id },
        include: {
          admin: {
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
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json(
      { targetUser, reports, warnings, dailyStatusValue },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin User Reports GET Error]:", error);
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

    await prisma.report.deleteMany({
      where: {
        targetCommunityId: null,
        OR: [
          { targetUserId: targetUser.id },
          { targetPost: { authorId: targetUser.id } },
          { targetComment: { authorId: targetUser.id } },
        ],
      },
    });

    return NextResponse.json(
      { message: "All reports cleared" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin User Reports DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
