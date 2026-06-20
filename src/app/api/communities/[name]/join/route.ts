// src/app/api/communities/[name]/join/route.ts
import { auth } from "@/auth";
import { toggleCommunityMembership } from "@/services/community.service";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const result = await toggleCommunityMembership(name, session.user.id);

    return NextResponse.json(
      { message: "Membership updated", status: result.status },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Community Join Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
