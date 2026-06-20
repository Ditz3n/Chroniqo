// src/app/api/posts/[id]/comments/route.ts
import { auth } from "@/auth";
import { createCommentSchema } from "@/lib/dtos/comment.dto";
import { prisma } from "@/lib/prisma";
import { createComment, getPostComments } from "@/services/comment.service";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Extract sort parameter from URL
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") as "new" | "top" | "old") || "new";

    // Pass sort to the service
    const comments = await getPostComments(id, session.user.id, sort);

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsedData = createCommentSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const now = new Date();

    // Block globally muted users from commenting on any post
    const globalMute = await prisma.globalMute.findUnique({
      where: { userId: session.user.id },
      select: { expiresAt: true },
    });
    if (globalMute && (!globalMute.expiresAt || globalMute.expiresAt > now)) {
      return NextResponse.json(
        { error: "You are currently muted and cannot comment." },
        { status: 403 },
      );
    }

    // Fetch the post to resolve its community for the community mute check
    const post = await prisma.post.findUnique({
      where: { id },
      select: { communityId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Block community-muted users from commenting in that community
    if (post.communityId) {
      const communityMute = await prisma.communityMute.findFirst({
        where: {
          userId: session.user.id,
          communityId: post.communityId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true },
      });
      if (communityMute) {
        return NextResponse.json(
          { error: "You are muted in this community." },
          { status: 403 },
        );
      }
    }

    const comment = await createComment(session.user.id, id, parsedData.data);
    return NextResponse.json(
      { message: "Comment created", comment },
      { status: 201 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
