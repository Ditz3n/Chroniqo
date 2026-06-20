// src/app/api/drafts/[id]/route.ts
import { auth } from "@/auth";
import { deleteDraft } from "@/services/post.service";
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

    const { id } = await params;
    await deleteDraft(session.user.id, id);

    return NextResponse.json({ message: "Draft deleted" }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Drafts DELETE Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Unauthorized")
      ? 403
      : msg.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
