// src/app/api/users/[username]/comments/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "new";

    // Apply sorting logic
    const getSortConfig = () => {
      if (sort === "top" || sort === "best" || sort === "hot") {
        return { supportedBy: { _count: "desc" as const } };
      }
      if (sort === "old") return { createdAt: "asc" as const };
      return { createdAt: "desc" as const }; // "new" is default
    };

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch the user's comments, omitting soft-deleted ones
    const comments = await prisma.comment.findMany({
      where: { authorId: user.id },
      orderBy: getSortConfig(),
      take: 50, // MVP limit
      include: {
        author: { select: { username: true } },
        post: {
          select: {
            id: true,
            title: true,
            community: { select: { name: true, image: true } },
            author: { select: { username: true } },
          },
        },
      },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error("[Profile Comments GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
