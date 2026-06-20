// src/app/api/messages/[id]/route.ts
import { auth } from "@/auth";
import { softDeleteMessage } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safe extraction for Next.js 15+
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 },
      );
    }

    await softDeleteMessage(session.user.id, id);

    return NextResponse.json({ message: "Message deleted" }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("only delete your own") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
