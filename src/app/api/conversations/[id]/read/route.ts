// src/app/api/conversations/[id]/read/route.ts
import { auth } from "@/auth";
import { markConversationAsRead } from "@/services/chat.service";
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
    const resolvedParams = await params;
    await markConversationAsRead(session.user.id, resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Read Receipt Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
