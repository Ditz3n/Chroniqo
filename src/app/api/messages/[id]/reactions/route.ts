// src/app/api/messages/[id]/reactions/route.ts
import { auth } from "@/auth";
import { reactionSchema } from "@/lib/dtos/chat.dto";
import { toggleMessageReaction } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await request.json();

    const parsedData = reactionSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const result = await toggleMessageReaction(
      session.user.id,
      messageId,
      parsedData.data.emoji,
    );

    return NextResponse.json(
      { message: "Reaction processed", ...result },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Message Reaction POST Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      msg.includes("access denied") || msg.includes("not found") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
