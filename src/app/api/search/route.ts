// src/app/api/search/route.ts
import { auth } from "@/auth";
import {
  searchCommunities,
  searchPostsByCommunity,
  searchPostsByUser,
  searchPostsGlobal,
  searchUsers,
} from "@/services/search.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const searchQuerySchema = z.object({
  q: z.string().max(200).default(""),
  type: z.enum(["suggest", "global", "community", "user"]).default("suggest"),
  scope: z.string().max(100).optional(),
  section: z.enum(["users", "communities", "posts"]).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? "suggest",
      scope: searchParams.get("scope") ?? undefined,
      section: searchParams.get("section") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { q, type, scope, section } = parsed.data;
    const userId = session.user.id;
    const trimmedQuery = q.trim();

    // Return empty shells for blank queries so the client doesn't need to guard
    if (!trimmedQuery) {
      return NextResponse.json(
        { users: [], communities: [], posts: [] },
        { status: 200 },
      );
    }

    switch (type) {
      case "suggest": {
        const [users, communities] = await Promise.all([
          searchUsers(trimmedQuery, userId, 5),
          searchCommunities(trimmedQuery, 5),
        ]);
        return NextResponse.json({ users, communities }, { status: 200 });
      }

      case "global": {
        // Section mode: return a deeper list of one category only
        if (section === "users") {
          const users = await searchUsers(trimmedQuery, userId, 20);
          return NextResponse.json(
            { users, communities: [], posts: [] },
            { status: 200 },
          );
        }
        if (section === "communities") {
          const communities = await searchCommunities(trimmedQuery, 20);
          return NextResponse.json(
            { users: [], communities, posts: [] },
            { status: 200 },
          );
        }
        if (section === "posts") {
          const posts = await searchPostsGlobal(trimmedQuery, userId, 20);
          return NextResponse.json(
            { users: [], communities: [], posts },
            { status: 200 },
          );
        }
        // Default overview: capped counts for all three sections
        const [users, communities, posts] = await Promise.all([
          searchUsers(trimmedQuery, userId, 5),
          searchCommunities(trimmedQuery, 5),
          searchPostsGlobal(trimmedQuery, userId, 10),
        ]);
        return NextResponse.json(
          { users, communities, posts },
          { status: 200 },
        );
      }

      case "community": {
        if (!scope) {
          return NextResponse.json(
            { error: "scope is required for community search" },
            { status: 400 },
          );
        }
        const posts = await searchPostsByCommunity(trimmedQuery, scope, userId);
        return NextResponse.json({ posts }, { status: 200 });
      }

      case "user": {
        if (!scope) {
          return NextResponse.json(
            { error: "scope is required for user search" },
            { status: 400 },
          );
        }
        const posts = await searchPostsByUser(trimmedQuery, scope, userId);
        return NextResponse.json({ posts }, { status: 200 });
      }
    }
  } catch (error) {
    console.error("[Search API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
