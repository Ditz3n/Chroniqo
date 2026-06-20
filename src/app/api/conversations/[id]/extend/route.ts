// src/app/api/conversations/[id]/extend/route.ts
import { auth } from "@/auth";
import { extendConversationSchema } from "@/lib/dtos/chat.dto";
import { extendConversation } from "@/services/chat.service";
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

    const { id } = await params;
    const body = await request.json();
    const parsed = extendConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const conversation = await extendConversation(
      session.user.id,
      id,
      parsed.data.durationHours,
    );

    return NextResponse.json(
      {
        message: "Conversation extended successfully",
        expiresAt: conversation.expiresAt,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Conversation Extend Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("access denied") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
