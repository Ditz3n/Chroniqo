// src/app/api/conversations/[id]/join/route.ts
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { joinCommunityChat } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await joinCommunityChat(session.user.id, id);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
