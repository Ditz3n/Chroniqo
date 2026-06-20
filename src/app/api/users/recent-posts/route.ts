// src/app/api/users/recent-posts/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils/time";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recentRecords = await prisma.recentPost.findMany({
      where: { userId: session.user.id },
      orderBy: { visitedAt: "desc" },
      take: 10,
      include: {
        post: {
          include: {
            community: {
              select: {
                name: true,
                image: true,
                avatarEmoji: true,
                avatarBgColor: true,
              },
            },
            author: {
              select: {
                username: true,
                image: true,
                avatarEmoji: true,
                avatarBgColor: true,
                emailVerified: true,
              },
            },
            _count: { select: { comments: true, supportedBy: true } },
          },
        },
      },
    });

    const recentPosts = recentRecords
      // Filter out posts that might have been hidden/deleted but still have a record somehow
      .filter((record) => record.post)
      .map((record) => {
        const p = record.post;

        // Extract media for the thumbnail if available
        let media;
        const meta = (p.metadata as Record<string, unknown>) || {};

        if (
          p.type === "image" &&
          Array.isArray(meta.images) &&
          meta.images.length > 0
        ) {
          media = { kind: "image", url: String(meta.images[0]) };
        } else if (p.type === "youtube" && typeof meta.videoId === "string") {
          media = {
            kind: "youtube",
            url: `https://img.youtube.com/vi/${meta.videoId}/hqdefault.jpg`,
          };
        } else if (
          p.type === "video" &&
          typeof meta.thumbnailUrl === "string"
        ) {
          media = {
            kind: "video",
            url: meta.thumbnailUrl,
            duration:
              typeof meta.duration === "number"
                ? formatVideoDuration(meta.duration)
                : "0:00",
          };
        } else if (p.type === "link" && typeof meta.metaImage === "string") {
          media = {
            kind: "link",
            url: meta.metaImage,
            siteName:
              typeof meta.siteName === "string" ? meta.siteName : "Link",
          };
        }

        return {
          id: p.id,
          community: p.community?.name || "Profile",
          communityImage: p.community?.image,
          communityEmoji: p.community?.avatarEmoji,
          communityBgColor: p.community?.avatarBgColor,
          authorUsername: p.author?.username,
          authorImage: p.author?.image,
          authorEmoji: p.author?.avatarEmoji,
          authorBgColor: p.author?.avatarBgColor,
          authorEmailVerified: p.author?.emailVerified ?? null,
          timeAgo: timeAgo(record.visitedAt),
          title: p.title,
          likes: p._count.supportedBy,
          comments: p._count.comments,
          media,
        };
      });

    return NextResponse.json({ recentPosts }, { status: 200 });
  } catch (error) {
    console.error("[RecentPosts GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.recentPost.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[RecentPosts DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper for formatting duration inline
function formatVideoDuration(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
