// src/app/api/conversations/[id]/deletion/route.ts
import { auth } from "@/auth";
import {
  cancelConversationDeletion,
  scheduleConversationDeletion,
} from "@/services/chat.service";
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

    // Safe extraction for Next.js 15+
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await scheduleConversationDeletion(session.user.id, id);

    return NextResponse.json(
      { message: "Deletion scheduled" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await cancelConversationDeletion(session.user.id, id);

    return NextResponse.json(
      { message: "Deletion cancelled" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
