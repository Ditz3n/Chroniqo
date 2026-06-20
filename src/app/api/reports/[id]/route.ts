// src/app/api/reports/[id]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        targetPost: { select: { communityId: true } },
        targetComment: {
          select: { post: { select: { communityId: true } } },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const communityId =
      report.targetCommunityId ??
      report.targetPost?.communityId ??
      report.targetComment?.post?.communityId;

    if (communityId) {
      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: { userId: session.user.id, communityId },
        },
      });
      const hasModerationRole =
        membership?.status === "ACCEPTED" &&
        ["MODERATOR", "ADMIN", "OWNER"].includes(membership?.role ?? "");

      const globalUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (!hasModerationRole && globalUser?.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.report.delete({ where: { id } });

    return NextResponse.json({ message: "Report dismissed" }, { status: 200 });
  } catch (error) {
    console.error("[Report DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
