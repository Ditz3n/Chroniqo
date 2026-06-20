// src/app/api/reports/route.ts
import { auth } from "@/auth";
import { submitReportSchema } from "@/lib/dtos/report.dto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const communityContextId = searchParams.get("communityContextId");
    const postContextId = searchParams.get("postContextId");
    const commentContextId = searchParams.get("commentContextId");

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: "targetType and targetId are required" },
        { status: 400 },
      );
    }

    // Build query based on target type with strict isolation
    const whereClause: Record<string, string | null> = {
      reporterId: session.user.id,
    };

    if (targetType === "USER") {
      whereClause.targetUserId = targetId;
      whereClause.targetCommunityId = communityContextId ?? null;
      whereClause.targetPostId = postContextId ?? null;
      whereClause.targetCommentId = commentContextId ?? null;
    } else if (targetType === "COMMUNITY") {
      whereClause.targetCommunityId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetPostId = null;
      whereClause.targetCommentId = null;
    } else if (targetType === "POST") {
      whereClause.targetPostId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetCommentId = null;
      whereClause.targetCommunityId = communityContextId ?? null;
    } else if (targetType === "COMMENT") {
      whereClause.targetCommentId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetPostId = null;
      whereClause.targetCommunityId = communityContextId ?? null;
    } else {
      return NextResponse.json(
        { error: "Invalid targetType" },
        { status: 400 },
      );
    }

    const report = await prisma.report.findFirst({
      where: whereClause,
      select: { reason: true },
    });

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error("[GET Report Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const {
      targetType,
      targetId,
      communityContextId,
      postContextId,
      commentContextId,
      reason,
      blockUser,
    } = parsed.data;

    // Prevent self-reporting
    if (targetType === "USER" && targetId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot report yourself" },
        { status: 400 },
      );
    }

    if (targetType === "POST") {
      const post = await prisma.post.findUnique({ where: { id: targetId } });
      if (post?.authorId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot report your own post" },
          { status: 400 },
        );
      }
    }

    if (targetType === "COMMENT") {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
      });
      if (comment?.authorId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot report your own comment" },
          { status: 400 },
        );
      }
    }

    // Build the query to check for existing reports with strict isolation
    const whereClause: Record<string, string | null> = {
      reporterId: session.user.id,
    };

    // Strictly typed using Prisma's generated types
    const createData: Prisma.ReportUncheckedCreateInput = {
      reporterId: session.user.id,
      reason,
    };

    if (targetType === "USER") {
      whereClause.targetUserId = targetId;
      whereClause.targetCommunityId = communityContextId ?? null;
      whereClause.targetPostId = postContextId ?? null;
      whereClause.targetCommentId = commentContextId ?? null;

      createData.targetUserId = targetId;
      if (communityContextId) createData.targetCommunityId = communityContextId;
      if (postContextId) createData.targetPostId = postContextId;
      if (commentContextId) createData.targetCommentId = commentContextId;
    } else if (targetType === "COMMUNITY") {
      whereClause.targetCommunityId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetPostId = null;
      whereClause.targetCommentId = null;

      createData.targetCommunityId = targetId;
    } else if (targetType === "POST") {
      whereClause.targetPostId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetCommentId = null;
      whereClause.targetCommunityId = communityContextId ?? null;

      createData.targetPostId = targetId;
      if (communityContextId) createData.targetCommunityId = communityContextId;
    } else if (targetType === "COMMENT") {
      whereClause.targetCommentId = targetId;
      whereClause.targetUserId = null;
      whereClause.targetPostId = null;
      whereClause.targetCommunityId = communityContextId ?? null;

      createData.targetCommentId = targetId;
      if (communityContextId) createData.targetCommunityId = communityContextId;
    }

    // Wrap operations in a transaction, especially if blocking a user simultaneously
    await prisma.$transaction(async (tx) => {
      const existingReport = await tx.report.findFirst({
        where: whereClause,
      });

      if (existingReport) {
        // Upsert behavior: Update the existing report reason
        await tx.report.update({
          where: { id: existingReport.id },
          data: { reason },
        });
      } else {
        // Create new report
        await tx.report.create({
          data: createData,
        });
      }

      // Handle simultaneous user block if requested
      if (blockUser && targetType === "USER") {
        await tx.globalBlock.upsert({
          where: {
            blockerId_blockedId: {
              blockerId: session.user.id,
              blockedId: targetId,
            },
          },
          update: {},
          create: { blockerId: session.user.id, blockedId: targetId },
        });

        // Sever ties immediately when blocking
        await tx.friendship.deleteMany({
          where: {
            OR: [
              { userId: session.user.id, friendId: targetId },
              { userId: targetId, friendId: session.user.id },
            ],
          },
        });

        await tx.friendRequest.deleteMany({
          where: {
            OR: [
              { senderId: session.user.id, receiverId: targetId },
              { senderId: targetId, receiverId: session.user.id },
            ],
          },
        });
      }
    });

    return NextResponse.json(
      { message: "Report submitted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST Report Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
