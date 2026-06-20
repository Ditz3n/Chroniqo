// src/app/api/communities/[name]/posts/route.ts
import { auth } from "@/auth";
import { getCommunityPosts } from "@/services/feed.service";
import { SortOption } from "@/types/app-types";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") as SortOption) || "new";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const posts = await getCommunityPosts(
      name,
      session.user.id,
      sort,
      page,
      10,
      session.user.role,
    );

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Community Posts GET Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Access denied" ? 403 : 500 },
    );
  }
}
