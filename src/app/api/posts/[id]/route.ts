// src/app/api/posts/[id]/route.ts
import { auth } from "@/auth";
import { deletePost, getPostById } from "@/services/post.service";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const post = await getPostById(session.user.id, id);

    return NextResponse.json({ post }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      {
        status: msg.includes("not found")
          ? 404
          : msg.includes("Access denied")
            ? 403
            : 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    let reason: string | undefined;
    try {
      const payload = (await request.json()) as { reason?: string };
      if (typeof payload?.reason === "string") {
        reason = payload.reason;
      }
    } catch {
      // Ignore empty/invalid JSON for callers that don't send a body.
    }

    await deletePost(session.user.id, id, reason);

    return NextResponse.json({ message: "Post deleted" }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 403 : 500 },
    );
  }
}
