// src/app/api/comments/[id]/route.ts
import { auth } from "@/auth";
import { updateCommentSchema } from "@/lib/dtos/comment.dto";
import {
  getIsolatedCommentThread,
  softDeleteComment,
  updateComment,
} from "@/services/comment.service";
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
    const commentThread = await getIsolatedCommentThread(id, session.user.id);

    return NextResponse.json({ commentThread }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("not found") ? 404 : 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );

    const updated = await updateComment(session.user.id, id, parsed.data);
    return NextResponse.json({ comment: updated }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      {
        status:
          msg === "Unauthorized" ? 403 : msg.includes("not found") ? 404 : 500,
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
      if (typeof payload?.reason === "string") reason = payload.reason;
    } catch {
      // No body is OK - author deletion sends no reason --- IGNORE ---
    }

    await softDeleteComment(session.user.id, id, reason);

    return NextResponse.json({ message: "Comment deleted" }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 403 : 500 },
    );
  }
}
