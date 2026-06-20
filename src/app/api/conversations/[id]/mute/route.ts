// src/app/api/conversations/[id]/mute/route.ts
import { auth } from "@/auth";
import { toggleConversationMute } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (typeof body.isMuted !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const resolvedParams = await params;
    await toggleConversationMute(
      session.user.id,
      resolvedParams.id,
      body.isMuted,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Toggle Mute Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
