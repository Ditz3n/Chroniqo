// src/app/api/users/[username]/posts/route.ts
import { auth } from "@/auth";
import { getProfilePosts } from "@/services/feed.service";
import { SortOption } from "@/types/app-types";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username } = await params;
    const { searchParams } = new URL(request.url);

    const tab = searchParams.get("tab") || "posts";
    const sort = (searchParams.get("sort") as SortOption) || "new";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const posts = await getProfilePosts(
      username,
      session.user.id,
      tab,
      sort,
      page,
    );
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Profile Posts GET Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Access denied" ? 403 : 500 },
    );
  }
}
