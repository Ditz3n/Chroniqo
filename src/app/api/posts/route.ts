// src/app/api/posts/route.ts
import { auth } from "@/auth";
import { createPostSchema } from "@/lib/dtos/post.dto";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/services/post.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = createPostSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const now = new Date();

    // Block globally muted users from creating any post
    const globalMute = await prisma.globalMute.findUnique({
      where: { userId: session.user.id },
      select: { expiresAt: true },
    });
    if (globalMute && (!globalMute.expiresAt || globalMute.expiresAt > now)) {
      return NextResponse.json(
        { error: "You are currently muted and cannot create posts." },
        { status: 403 },
      );
    }

    // Block community-muted users from posting in that specific community
    if (parsedData.data.communityId) {
      const communityMute = await prisma.communityMute.findFirst({
        where: {
          userId: session.user.id,
          communityId: parsedData.data.communityId,
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

    const post = await createPost(session.user.id, parsedData.data);

    return NextResponse.json(
      { message: "Post created successfully", post },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[Posts POST Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      msg.includes("Unauthorized") || msg.includes("must be an accepted member")
        ? 403
        : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
