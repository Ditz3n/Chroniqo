// src/app/api/feed/route.ts
import { auth } from "@/auth";
import { getUserFeed } from "@/services/feed.service";
import { SortOption } from "@/types/app-types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") as SortOption) || "new";
    const page = parseInt(searchParams.get("page") || "1", 10);

    const posts = await getUserFeed(session.user.id, sort, page);

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Feed GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
