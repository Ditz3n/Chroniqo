// src/app/api/communities/[name]/members/route.ts
import { auth } from "@/auth";
import { getCommunityMembers } from "@/services/community.service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const members = await getCommunityMembers(name, session.user.id);

    return NextResponse.json({ members }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Unauthorized")
      ? 403
      : msg.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
