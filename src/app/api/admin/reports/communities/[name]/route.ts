// src/app/api/admin/reports/communities/[name]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const targetCommunity = await prisma.community.findUnique({
      where: { name: decodedName },
      select: {
        id: true,
        name: true,
        image: true,
        avatarEmoji: true,
        avatarBgColor: true,
        isPrivate: true,
        isActive: true,
        bannedUntil: true,
        banReason: true,
      },
    });

    if (!targetCommunity) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    const [reports, warnings] = await Promise.all([
      prisma.report.findMany({
        where: {
          targetCommunityId: targetCommunity.id,
          targetUserId: null,
          targetPostId: null,
          targetCommentId: null,
        },
        include: {
          reporter: {
            select: { id: true, username: true, name: true, image: true },
          },
          targetPost: {
            select: {
              id: true,
              title: true,
              community: { select: { name: true } },
              author: { select: { username: true } },
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
                  author: { select: { username: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.adminWarning.findMany({
        where: { targetCommunityId: targetCommunity.id },
        include: {
          admin: { select: { username: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json(
      { targetCommunity, reports, warnings },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin Comm Reports GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const targetCommunity = await prisma.community.findUnique({
      where: { name: decodedName },
      select: { id: true },
    });

    if (!targetCommunity) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    await prisma.report.deleteMany({
      where: {
        targetCommunityId: targetCommunity.id,
        targetUserId: null,
        targetPostId: null,
        targetCommentId: null,
      },
    });

    return NextResponse.json(
      { message: "All reports cleared" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Admin Comm Reports DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
