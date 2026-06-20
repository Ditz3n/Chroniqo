// src/app/api/conversations/[id]/route.ts
import { auth } from "@/auth";
import { updateConversationSchema } from "@/lib/dtos/chat.dto";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { updateConversation } from "@/services/chat.service";
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
    const parsedData = updateConversationSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const updated = await updateConversation(
      session.user.id,
      id,
      parsedData.data,
    );
    return NextResponse.json({ conversation: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: error instanceof ForbiddenError ? 403 : 400 },
    );
  }
}
