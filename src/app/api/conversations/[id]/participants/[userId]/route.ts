// src/app/api/conversations/[id]/participants/[userId]/route.ts
import { auth } from "@/auth";
import { updateParticipantSchema } from "@/lib/dtos/chat.dto";
import {
  removeParticipant,
  updateParticipantNickname,
} from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const body = await request.json();
    const parsedData = updateParticipantSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const updated = await updateParticipantNickname(
      session.user.id,
      id,
      userId,
      parsedData.data,
    );
    return NextResponse.json({ participant: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    await removeParticipant(session.user.id, id, userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
